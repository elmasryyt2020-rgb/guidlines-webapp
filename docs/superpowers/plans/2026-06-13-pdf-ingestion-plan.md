# PDF Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js TypeScript CLI ingestion script (`scripts/ingest.ts`) that parses medical guidelines from `./ENT/*.pdf`, chunks the text, generates 768-dimensional embeddings using Gemini's `text-embedding-04` model, and bulk-inserts them into Supabase, with robust error handling and check-and-skip logic.

**Architecture:** The script parses PDFs using `pdf-parse`, splits them using a sliding character window (1000 size, 200 overlap), fetches embeddings from Gemini in parallelizable batches of up to 100 chunks, and performs Supabase bulk inserts. It deduplicates files by querying existing `file_name` entries in `guideline_chunks`.

**Tech Stack:** Node.js, TypeScript, `@supabase/supabase-js`, `@google/genai`, `pdf-parse`, `dotenv`, `tsx`

---

### Task 1: Package Dependencies and Scripts Configuration

**Files:**
- Modify: [package.json](file:///d:/guidlines%20webapp/package.json)

- [ ] **Step 1: Update package.json dependencies and scripts**
  Add `dotenv`, `@google/genai`, `@supabase/supabase-js`, `pdf-parse` to dependencies. Add `@types/pdf-parse` and `tsx` to devDependencies. Add the `ingest` script.

  Replace the content of `package.json`:
  ```json
  {
    "name": "guidlines-webapp",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "eslint",
      "typecheck": "tsc --noEmit",
      "validate": "npm run lint && npm run typecheck",
      "ingest": "tsx scripts/ingest.ts"
    },
    "dependencies": {
      "@google/genai": "^0.1.1",
      "@supabase/supabase-js": "^2.43.4",
      "@xyflow/react": "^12.11.0",
      "dotenv": "^16.4.5",
      "lucide-react": "^1.18.0",
      "next": "16.2.9",
      "pdf-parse": "^1.1.1",
      "react": "19.2.4",
      "react-dom": "19.2.4",
      "zustand": "^5.0.14"
    },
    "devDependencies": {
      "@tailwindcss/postcss": "^4",
      "@types/node": "^20",
      "@types/pdf-parse": "^1.1.4",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      "eslint": "^9",
      "eslint-config-next": "16.2.9",
      "tailwindcss": "^4",
      "tsx": "^4.19.1",
      "typescript": "^5"
    }
  }
  ```

- [ ] **Step 2: Run npm install**
  Run `npm install` to install the newly added dependencies.
  Run command: `npm install`
  Expected output: Complete installation of dependencies with no resolution errors.

---

### Task 2: Environment Variables Setup

**Files:**
- Create: [.env.local](file:///d:/guidlines%20webapp/.env.local)

- [ ] **Step 1: Check or create .env.local file**
  Add the required credentials if they are not already present.
  Ensure the following variables are defined in the file (use placeholders if writing a template, but make sure to use user's active variables if running):
  ```env
  SUPABASE_URL=your-supabase-url
  SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
  GEMINI_API_KEY=your-gemini-api-key
  ```

---

### Task 3: Ingestion Script Implementation

**Files:**
- Create: [scripts/ingest.ts](file:///d:/guidlines%20webapp/scripts/ingest.ts)

- [ ] **Step 1: Write the scripts/ingest.ts code**
  Write the full ingestion logic, handling file system scanning, text parsing, chunk splitting, embedding calls, and Supabase bulk inserts.

  Code implementation for `scripts/ingest.ts`:
  ```typescript
  import * as fs from 'fs';
  import * as path from 'path';
  import pdfParse from 'pdf-parse';
  import { createClient } from '@supabase/supabase-js';
  import { GoogleGenAI } from '@google/genai';
  import * as dotenv from 'dotenv';

  // Load environment variables from .env.local
  dotenv.config({ path: '.env.local' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.error('CRITICAL ERROR: Missing environment variables in .env.local');
    console.error('Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY are defined.');
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const ENT_DIR = path.join(process.cwd(), 'ENT');
  const CHUNK_SIZE = 1000;
  const OVERLAP = 200;
  const EMBEDDING_BATCH_SIZE = 100; // Gemini embeds up to 100 texts per API call

  interface GuidelineRecord {
    file_name: string;
    content: string;
    chunk_index: number;
    embedding: number[];
  }

  // Split text into overlapping chunks
  function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length <= chunkSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    const step = chunkSize - overlap;
    let i = 0;

    while (i < cleanText.length) {
      const chunk = cleanText.substring(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
      // If we reached the end of the text, break
      if (i + chunkSize >= cleanText.length) {
        break;
      }
      i += step;
    }

    return chunks;
  }

  async function getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-04',
        contents: texts,
      });

      if (!response.embeddings) {
        throw new Error('Embedding response did not contain embeddings array');
      }

      // Map response embeddings to list of values, verifying 768 dimensions
      return response.embeddings.map((e, index) => {
        if (!e.values || e.values.length !== 768) {
          throw new Error(`Invalid embedding dimension at index ${index}. Expected 768, got ${e.values?.length}`);
        }
        return e.values;
      });
    } catch (err: any) {
      console.error('Gemini Embedding API Error:', err.message || err);
      throw err;
    }
  }

  async function main() {
    console.log('--- STARTING CLINICAL GUIDELINE INGESTION PIPELINE ---');

    // 1. Fetch already ingested file names from the database
    console.log('Checking database for already ingested guidelines...');
    const { data: existingRecords, error: queryError } = await supabase
      .from('guideline_chunks')
      .select('file_name');

    if (queryError) {
      console.error('Database query error:', queryError.message);
      process.exit(1);
    }

    const processedFiles = new Set<string>();
    if (existingRecords) {
      existingRecords.forEach((r) => processedFiles.add(r.file_name));
    }
    console.log(`Found ${processedFiles.size} unique guidelines already processed in database.`);

    // 2. Scan ENT directory for PDF files
    if (!fs.existsSync(ENT_DIR)) {
      console.error(`ENT directory not found at: ${ENT_DIR}`);
      process.exit(1);
    }

    const files = fs.readdirSync(ENT_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files in ./ENT folder.`);

    const filesToProcess = files.filter((f) => !processedFiles.has(f));
    console.log(`Files to ingest: ${filesToProcess.length} (${files.length - filesToProcess.length} files will be skipped)`);

    if (filesToProcess.length === 0) {
      console.log('No new files to process. Ingestion complete!');
      process.exit(0);
    }

    // 3. Process each file
    for (const file of filesToProcess) {
      const filePath = path.join(ENT_DIR, file);
      console.log(`\nProcessing: "${file}"...`);

      try {
        // Clear any partial chunks that might have been uploaded on a failed run
        const { error: deleteError } = await supabase
          .from('guideline_chunks')
          .delete()
          .eq('file_name', file);

        if (deleteError) {
          console.warn(`Warning: Could not clear prior partial chunks for "${file}":`, deleteError.message);
        }

        const dataBuffer = fs.readFileSync(filePath);
        const parsedData = await pdfParse(dataBuffer);
        const text = parsedData.text;

        if (!text || text.trim().length === 0) {
          console.warn(`Skipping empty or unparseable PDF: "${file}"`);
          continue;
        }

        const chunks = chunkText(text, CHUNK_SIZE, OVERLAP);
        console.log(`Parsed "${file}" successfully. Created ${chunks.length} chunks.`);

        const recordsToInsert: GuidelineRecord[] = [];

        // Ingest chunks in batches to handle rate limits and API limits
        for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
          const chunkBatch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
          console.log(`Generating embeddings for chunks ${i + 1} to ${Math.min(i + EMBEDDING_BATCH_SIZE, chunks.length)}...`);
          
          const embeddings = await getEmbeddings(chunkBatch);

          for (let j = 0; j < chunkBatch.length; j++) {
            recordsToInsert.push({
              file_name: file,
              content: chunkBatch[j],
              chunk_index: i + j,
              embedding: embeddings[j],
            });
          }
        }

        // Bulk insert records to Supabase
        console.log(`Bulk inserting ${recordsToInsert.length} records into database...`);
        const { error: insertError } = await supabase
          .from('guideline_chunks')
          .insert(recordsToInsert);

        if (insertError) {
          throw new Error(`Database Insert Error: ${insertError.message}`);
        }

        console.log(`Successfully ingested: "${file}"`);
      } catch (err: any) {
        console.error(`ERROR processing "${file}":`, err.message || err);
        console.log(`Skipping file "${file}" and continuing...`);
      }
    }

    console.log('\n--- INGESTION PIPELINE RUN COMPLETE ---');
  }

  main().catch((err) => {
    console.error('Fatal error in pipeline runner:', err);
    process.exit(1);
  });
  ```

---

### Task 4: Ingest Verification

- [ ] **Step 1: Dry run/compile check**
  Verify the script compiles and runs check-and-skip logic.
  Run command: `npm run validate`
  Expected output: Compile verification success.

- [ ] **Step 2: Run ingestion script**
  Run script to process guideline PDFs.
  Run command: `npm run ingest`
  Expected output: Log outputs demonstrating:
  - Scanning DB and finding existing processed files.
  - Scanning directory and identifying files to process.
  - Generating batch embeddings via Gemini and validating 768 dimensions.
  - Bulk inserting into `guideline_chunks`.
  - Ingestion run complete.

- [ ] **Step 3: Run verify rerun**
  Run the script a second time.
  Run command: `npm run ingest`
  Expected output: The script runs, finds all files already processed, and finishes immediately with `No new files to process. Ingestion complete!`.
