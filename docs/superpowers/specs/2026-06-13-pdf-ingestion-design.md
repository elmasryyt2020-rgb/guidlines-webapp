# Local PDF Ingestion Pipeline Design

This document details the design for the local PDF ingestion pipeline. The script scans the `./ENT` folder, parses PDF files, chunks the extracted text, generates vector embeddings using Gemini's `text-embedding-04` model (768 dimensions), and bulk-inserts them into the `guideline_chunks` table in Supabase.

---

## 1. Requirements & Specifications

- **Input Folder**: `./ENT` (relative to project root).
- **File Types**: PDF guidelines published by the Egyptian Ministry of Health.
- **Parsing Library**: `pdf-parse`.
- **Chunking Strategy**: 1,000 characters per chunk, with 200 characters overlap.
- **Embedding Generation**:
  - Model: `text-embedding-04`
  - Dimensions: 768
  - Library: `@google/genai` (official Google Gen AI SDK)
- **Database Storage**:
  - Table: `public.guideline_chunks`
  - Columns: `id` (uuid), `file_name` (text), `content` (text), `chunk_index` (integer), `embedding` (vector(768)), `created_at` (timestamptz).
- **Idempotency (Deduplication)**:
  - Check existing filenames in the database before starting.
  - Skip files that are already ingested.
- **Execution CLI**: `npx tsx scripts/ingest.ts` loading variables from `.env.local`.

---

## 2. Dependencies & Environment Variables

### Package.json Additions
- `dependencies`:
  - `@google/genai`: `^0.1.1`
  - `@supabase/supabase-js`: `^2.43.4`
  - `pdf-parse`: `^1.1.1`
- `devDependencies`:
  - `tsx`: `^4.19.1`
  - `@types/pdf-parse`: `^1.1.4`
- `scripts`:
  - `"ingest": "tsx scripts/ingest.ts"`

### Environment Setup
Create or reuse a `.env.local` file containing:
```env
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

---

## 3. Detailed Data Flow & Logic

### Step 1: Initialization & Env Checks
- Verify that `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` are defined in `process.env`. If any is missing, throw an error and terminate.
- Initialize the Supabase Client:
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  ```
- Initialize the Gemini Client:
  ```typescript
  import { GoogleGenAI } from '@google/genai';
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  ```

### Step 2: Idempotency Check
- Execute `SELECT DISTINCT file_name FROM public.guideline_chunks`.
- Map results to a `Set<string>` named `processedFiles`.
- Log the number of already processed files.

### Step 3: File Scanning
- Scan `./ENT` folder using Node `fs.promises.readdir`.
- Filter files ending with `.pdf`.

### Step 4: Text Extraction & Chunking
For each new PDF file:
1. Load file buffer using `fs.promises.readFile`.
2. Extract plain text using `pdfParse(buffer)`.
3. Normalize whitespaces.
4. Chunk text with sliding window:
   - Chunk size: `1000` characters.
   - Overlap: `200` characters.
   - Sliding step: `800` characters (1000 - 200).
   - If the text is shorter than 1,000 characters, it becomes a single chunk.

### Step 5: Embeddings Generation
- Batch chunks in arrays of up to 100 items (Gemini's embedding API supports multiple texts per request).
- Request embeddings using `ai.models.embedContent`:
  ```typescript
  const response = await ai.models.embedContent({
    model: 'text-embedding-04',
    contents: chunkTexts,
  });
  ```
- Verify dimensions: Ensure each returned embedding vector is an array of length exactly 768.

### Step 6: Supabase Bulk Insert
- Format records:
  ```typescript
  {
    file_name: fileName,
    content: chunkText,
    chunk_index: index,
    embedding: vectorValues
  }
  ```
- Bulk insert records into the database.
- Log progress (e.g. `Successfully ingested filename with N chunks`).

---

## 4. Error Handling & Edge Cases

- **Rate Limits**: Catch rate limit exceptions from the Gemini API and implement basic backoff/retry if necessary.
- **Malformed PDFs**: If a PDF fails to parse, log the error and skip that specific file without stopping the entire run.
- **Empty PDFs / Empty Chunks**: Ignore empty pages or chunks containing only whitespace.
- **Transaction Rollback**: If a batch insertion fails, log the error. The check-and-skip logic will ensure that subsequent runs will retry the file (since the file won't be fully inserted/marked as processed if chunk insertion failed, or we should handle atomic transactions if necessary. Filename-based skip is simple: if a file has *any* chunks in the DB, it is considered processed. If it failed midway, we should clean up its chunks first or delete partial records).
  - *Mitigation*: Before processing a file, delete any existing chunks matching `file_name` in the database to prevent orphaned/duplicate chunks if a previous run was aborted midway.

---

## 5. Verification Plan

### Manual Verification
1. Run `npm run ingest` and observe console logs.
2. Verify that files are processed, chunks are created, and embedding dimensions are validated.
3. Run the script again to verify that all files are skipped.
4. Query Supabase SQL Editor:
   ```sql
   SELECT file_name, count(*), min(chunk_index), max(chunk_index) 
   FROM public.guideline_chunks 
   GROUP BY file_name;
   ```
   Verify that counts are non-zero and match expectations.
