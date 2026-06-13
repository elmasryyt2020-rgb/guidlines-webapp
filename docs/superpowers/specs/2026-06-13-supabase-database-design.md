# Supabase Database Schema & CLI Migration Design

This document details the database design for the Medical Guidelines Assistant. The schema supports vector-based document retrieval (RAG) using `pgvector` and `text-embedding-04` (768 dimensions), user chat sessions, and interactive mind map graph persistence.

---

## 1. Schema Specifications

### Enable Vector Extension
```sql
create extension if not exists vector;
```

### Table: `public.guideline_chunks`
Stores segmented clinical guidelines and their 768-dimensional embeddings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `primary key`, `default gen_random_uuid()` | Unique identifier for the chunk. |
| `file_name` | `text` | `not null` | Source PDF filename (e.g. `Acute Otitis Externa.pdf`). |
| `content` | `text` | `not null` | Plain text contents of the chunk. |
| `chunk_index` | `integer` | `not null` | Order of chunk within its source PDF. |
| `embedding` | `vector(768)` | | 768-dimensional text embedding. |
| `created_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Creation timestamp. |

#### Vector Search Index
```sql
create index guideline_chunks_embedding_idx 
on public.guideline_chunks 
using hnsw (embedding vector_cosine_ops);
```
*Note: We use the HNSW (Hierarchical Navigable Small World) index for fast cosine distance similarity queries.*

---

### Table: `public.conversations`
Manages doctor-assistant chat sessions. Keyed by Clerk's `user_id` mapped via JWT claims.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `primary key`, `default gen_random_uuid()` | Unique session identifier. |
| `user_id` | `text` | `not null` | Clerk User ID (`auth.jwt() ->> 'sub'`). |
| `title` | `text` | `not null default 'New Conversation'` | Display title of the thread. |
| `created_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Session creation time. |
| `updated_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Last activity update. |

---

### Table: `public.messages`
Tracks chronological logs of user queries and clinical chatbot responses.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `primary key`, `default gen_random_uuid()` | Unique message identifier. |
| `conversation_id` | `uuid` | `references conversations(id) on delete cascade not null` | Foreign key referencing the parent session. |
| `role` | `text` | `not null check (role in ('user', 'assistant'))` | Role of the message speaker. |
| `content` | `text` | `not null` | Content payload (markdown). |
| `created_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Message timestamp. |

---

### Table: `public.mind_maps`
Persists the React Flow diagram state (nodes and edges structured JSON) for a given session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `primary key`, `default gen_random_uuid()` | Unique mind map identifier. |
| `conversation_id` | `uuid` | `references conversations(id) on delete cascade not null` | Foreign key referencing the parent session. |
| `nodes` | `jsonb` | `not null` | Serialized React Flow nodes list. |
| `edges` | `jsonb` | `not null` | Serialized React Flow edges list. |
| `created_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Map creation time. |
| `updated_at` | `timestamp with time zone` | `default timezone('utc'::text, now()) not null` | Map last update time. |

---

## 2. Utility Functions & Triggers

### Timestamp Update Trigger
Ensures `updated_at` timestamps on `conversations` and `mind_maps` are updated automatically during updates.
```sql
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger set_conversations_updated_at
    before update on public.conversations
    for each row
    execute function public.handle_updated_at();

create trigger set_mind_maps_updated_at
    before update on public.mind_maps
    for each row
    execute function public.handle_updated_at();
```

### Vector Similarity Search Function (`match_guidelines`)
Provides the retrieval function for the RAG chatbot to search chunks matching a user query embedding.
```sql
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
```

---

## 3. Row Level Security (RLS)

All user-facing tables enforce RLS. To authenticate transactions, we check Clerk's user ID passed in the JWT.

### Enable RLS
```sql
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.mind_maps enable row level security;
```

### RLS Policies
```sql
-- Conversations: Direct matching against sub claim
create policy "Users can manage their own conversations"
on public.conversations for all
using (auth.jwt() ->> 'sub' = user_id);

-- Messages: Validated via sub claim of parent conversation owner
create policy "Users can manage messages in their conversations"
on public.messages for all
using (
    conversation_id in (
        select id from public.conversations where user_id = auth.jwt() ->> 'sub'
    )
);

-- Mind Maps: Validated via sub claim of parent conversation owner
create policy "Users can manage mind maps in their conversations"
on public.mind_maps for all
using (
    conversation_id in (
        select id from public.conversations where user_id = auth.jwt() ->> 'sub'
    )
);
```

---

## 4. Supabase CLI Setup & Cloud Deployment Guide

Follow these steps to deploy migrations to a hosted cloud instance on [Supabase](https://supabase.com/).

### Prerequisites
Install the Supabase CLI locally.
```bash
npm install supabase --save-dev
```

### Deployment Steps

1. **Initialize Supabase configuration locally**
   ```bash
   npx supabase init
   ```
   This creates the `./supabase` directory structure.

2. **Generate a new migration**
   ```bash
   npx supabase migration new init_schema
   ```
   This creates a file in `supabase/migrations/<timestamp>_init_schema.sql`.

3. **Write migration SQL**
   Copy the schema and policies into the generated file.

4. **Link to cloud Supabase project**
   Get your project reference code from the Supabase Dashboard URL (e.g. `https://supabase.com/dashboard/project/<project-ref>`).
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
   *Note: This command prompts for the database password you created when spinning up the Supabase project.*

5. **Deploy migrations to the cloud**
   Push local migration files up to the remote database:
   ```bash
   npx supabase db push
   ```
