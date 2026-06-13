import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';
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

if (
  SUPABASE_SERVICE_ROLE_KEY.startsWith('YOUR_') ||
  GEMINI_API_KEY.startsWith('YOUR_')
) {
  console.error('CRITICAL ERROR: Placeholder values detected in .env.local');
  console.error('Please update .env.local with your actual Supabase Service Role Key and Gemini API Key.');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ENT_DIR = path.join(process.cwd(), 'ENT');
const CHUNK_SIZE = 3000;
const OVERLAP = 500;
const EMBEDDING_BATCH_SIZE = 15; // Safe batch size to respect both RPM and daily limits

interface GuidelineRecord {
  file_name: string;
  content: string;
  chunk_index: number;
  embedding: number[];
}

// Split text into overlapping chunks
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  // Replace multiple whitespaces and newlines with a single space
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch embeddings using Gemini API with retry and backoff on rate limits (429)
async function getEmbeddings(texts: string[], retries = 5, delayMs = 60000): Promise<number[][]> {
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: 'models/gemini-embedding-2',
            content: {
              parts: [{ text }],
            },
            outputDimensionality: 768,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const resData = (await response.json()) as { embeddings?: { values: number[] }[] };

      if (!resData.embeddings || resData.embeddings.length !== texts.length) {
        throw new Error(`Embedding response did not contain the expected number of embeddings. Expected ${texts.length}, got ${resData.embeddings?.length}`);
      }

      return resData.embeddings.map((e, index) => {
        if (!e.values || e.values.length !== 768) {
          throw new Error(`Invalid embedding dimension at index ${index}. Expected 768, got ${e.values?.length}`);
        }
        return e.values;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && attempt < retries) {
        console.warn(`[Rate Limit] Gemini API rate limit hit. Sleeping for ${currentDelay / 1000}s before retry attempt ${attempt}/${retries}...`);
        await delay(currentDelay);
        currentDelay *= 1.5; // Exponential backoff
        continue;
      }
      console.error('Gemini Embedding API Error:', errMsg);
      throw err;
    }
  }
  throw new Error('Max retries exceeded for embedding generation');
}

async function fetchProcessedFiles(): Promise<Set<string>> {
  const processedFiles = new Set<string>();
  let start = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('guideline_chunks')
      .select('file_name')
      .range(start, start + limit - 1);

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    data.forEach((r: { file_name: string }) => processedFiles.add(r.file_name));

    if (data.length < limit) {
      hasMore = false;
    } else {
      start += limit;
    }
  }

  return processedFiles;
}

async function main() {
  console.log('=== STARTING CLINICAL GUIDELINE INGESTION PIPELINE ===');

  // 1. Fetch already ingested file names from the database
  console.log('Querying database for already ingested guideline chunks...');
  let processedFiles: Set<string>;
  try {
    processedFiles = await fetchProcessedFiles();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch already processed files:', errorMsg);
    process.exit(1);
  }
  console.log(`Found ${processedFiles.size} unique files in database.`);

  // 2. Scan ENT directory for PDF files
  if (!fs.existsSync(ENT_DIR)) {
    console.error(`ENT directory not found at: ${ENT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ENT_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files in "./ENT" folder.`);

  const filesToProcess = files.filter((f) => !processedFiles.has(f));
  console.log(`Files to process: ${filesToProcess.length} (${files.length - filesToProcess.length} files already processed will be skipped)`);

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
        console.warn(`Warning: Could not clear prior chunks for "${file}":`, deleteError.message);
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
        // Sleep 5 seconds to respect Gemini API rate limits
        await delay(5000);

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
      console.log(`Bulk inserting ${recordsToInsert.length} records into public.guideline_chunks...`);
      const { error: insertError } = await supabase
        .from('guideline_chunks')
        .insert(recordsToInsert);

      if (insertError) {
        throw new Error(`Database Insert Error: ${insertError.message}`);
      }

      console.log(`Successfully ingested: "${file}"`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`ERROR processing "${file}":`, errorMsg);
      console.log(`Skipping file "${file}" and continuing...`);
    }
  }

  console.log('\n=== INGESTION PIPELINE RUN COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal error in pipeline runner:', err);
  process.exit(1);
});
