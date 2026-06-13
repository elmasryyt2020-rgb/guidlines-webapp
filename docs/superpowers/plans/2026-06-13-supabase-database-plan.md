# Supabase Database Layer Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize Supabase configuration locally, write the schema migration, and prepare for remote cloud deployment.

**Architecture:** Initialize Supabase locally using the CLI, create a single initial migration script containing all table structures, indexes, RLS policies (using Clerk sub claim matching), triggers, and stored similarity search function, and provide the command workflow to deploy to a hosted cloud instance.

**Tech Stack:** Supabase CLI, PostgreSQL, pgvector.

---

## File Structure
- `supabase/config.toml` (Created by CLI init)
- `supabase/migrations/<timestamp>_init_schema.sql` (Created by CLI migration command)

---

### Task 1: Initialize Supabase locally

**Files:**
- Create: `supabase/config.toml` (indirectly via CLI initialization)

- [ ] **Step 1: Initialize Supabase**

Run the following command from the project root directory:
```bash
npx supabase init
```
Expected output:
```text
Generate vscode settings? [y/N]: N
Finished supabase init.
```

- [ ] **Step 2: Verify folder structure**

Check if the `supabase` directory is successfully created.
Run:
```powershell
Test-Path supabase
```
Expected output: `True`

- [ ] **Step 3: Commit initialization**
```bash
git add supabase/
git commit -m "chore: initialize supabase configuration"
```

---

### Task 2: Create and write database schema migration

**Files:**
- Create: `supabase/migrations/<timestamp>_init_schema.sql`

- [ ] **Step 1: Generate a new migration file**

Run the following command:
```bash
npx supabase migration new init_schema
```
Expected output:
```text
Created new migration at supabase/migrations/<timestamp>_init_schema.sql
```

- [ ] **Step 2: Insert the SQL schema**

Open the created `<timestamp>_init_schema.sql` file and write the complete SQL schema:

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create guideline_chunks table (for Gemini 768-dim embeddings)
create table public.guideline_chunks (
    id uuid default gen_random_uuid() primary key,
    file_name text not null,
    content text not null,
    chunk_index integer not null,
    embedding vector(768),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for vector similarity search (using HNSW and cosine distance)
create index guideline_chunks_embedding_idx 
on public.guideline_chunks 
using hnsw (embedding vector_cosine_ops);

-- Create conversations table
create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    title text not null default 'New Conversation',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index user_id for faster lookup of user's conversations
create index conversations_user_id_idx on public.conversations(user_id);

-- Create messages table
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index conversation_id for faster message retrieval
create index messages_conversation_id_idx on public.messages(conversation_id);

-- Create mind_maps table
create table public.mind_maps (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    nodes jsonb not null,
    edges jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index conversation_id for faster mind map retrieval
create index mind_maps_conversation_id_idx on public.mind_maps(conversation_id);

-- Helper function to update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Apply update triggers to conversations and mind_maps
create trigger set_conversations_updated_at
    before update on public.conversations
    for each row
    execute function public.handle_updated_at();

create trigger set_mind_maps_updated_at
    before update on public.mind_maps
    for each row
    execute function public.handle_updated_at();

-- Stored SQL function for vector similarity search
create or replace function public.match_guidelines (
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
returns table (
    id uuid,
    file_name text,
    content text,
    similarity float
)
language sql stable
as $$
    select
        guideline_chunks.id,
        guideline_chunks.file_name,
        guideline_chunks.content,
        1 - (guideline_chunks.embedding <=> query_embedding) as similarity
    from public.guideline_chunks
    where 1 - (guideline_chunks.embedding <=> query_embedding) > match_threshold
    order by (guideline_chunks.embedding <=> query_embedding) asc
    limit match_count;
$$;

-- Enable Row Level Security (RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.mind_maps enable row level security;

-- Create RLS policies using Clerk user_id matching
-- Conversations Policy
create policy "Users can manage their own conversations"
on public.conversations for all
using (auth.jwt() ->> 'sub' = user_id);

-- Messages Policy
create policy "Users can manage messages in their conversations"
on public.messages for all
using (
    conversation_id in (
        select id from public.conversations where user_id = auth.jwt() ->> 'sub'
    )
);

-- Mind Maps Policy
create policy "Users can manage mind maps in their conversations"
on public.mind_maps for all
using (
    conversation_id in (
        select id from public.conversations where user_id = auth.jwt() ->> 'sub'
    )
);
```

- [ ] **Step 3: Commit migration file**
Add the new migration file to git and commit it.
```bash
git add supabase/migrations/
git commit -m "feat: add initial supabase database schema migration"
```
