-- Reset tables if they already exist from a previous version of the project
drop table if exists public.mind_maps cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.guideline_chunks cascade;

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create guideline_chunks table (for Gemini 768-dim embeddings)
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

-- 3. Create conversations table
create table public.conversations (
    id uuid default gen_random_uuid() primary key,
    user_id text not null, -- Stores Clerk user_id
    title text not null default 'New Conversation',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index user_id for faster lookup of user's conversations
create index conversations_user_id_idx on public.conversations(user_id);

-- 4. Create messages table
create table public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index conversation_id for faster message retrieval
create index messages_conversation_id_idx on public.messages(conversation_id);

-- 5. Create mind_maps table
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

-- 6. Helper function to update updated_at timestamps
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

-- 7. Stored SQL function for vector similarity search
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

-- 8. Enable Row Level Security (RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.mind_maps enable row level security;

-- 9. Create RLS policies using Clerk user_id matching
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
