# Design Spec: Clerk Authentication & Supabase Edge Functions Integration

This document outlines the architecture, data flow, and code specifications to integrate Clerk Authentication and deploy Supabase Edge Functions for the Medical Guidelines Assistant.

## Overview
We are replacing mock client-side states with real authentication (Clerk) and real-time backend processing (Supabase Database + Edge Functions + Gemini API).

## 1. Clerk Authentication Integration
Clerk will serve as the authentication provider. We will protect the Next.js routes, establish a custom JWT template, and fetch the token client-side to authorize requests to Supabase and the Edge Functions.

### Clerk Provider & Middleware
* Wrap the app layout in `ClerkProvider` from `@clerk/nextjs`.
* Install `@clerk/nextjs` to manage the authentication session.
* Add a `middleware.ts` in the project root to protect access to `/chat` and `/api` paths.

### Custom JWT Template (supabase)
We configure a custom JWT template named `supabase` in the Clerk Dashboard:
```json
{
  "role": "authenticated",
  "sub": "{{user.id}}"
}
```
* **Why**: The `sub` claim maps to the Clerk User ID, allowing Supabase RLS to identify the owner using `auth.jwt() ->> 'sub'`.

---

## 2. Authenticated Supabase Client
We create a dynamic Supabase client helper that uses the Clerk session token for authentication:
```typescript
// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const getSupabaseClient = async (getToken: (options: { template: string }) => Promise<string | null>) => {
  const token = await getToken({ template: "supabase" });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      },
    }
  );
};
```

---

## 3. Supabase Edge Functions

### Chat Edge Function (`supabase/functions/chat/index.ts`)
* **Purpose**: Handles user clinical questions, performs vector search for relevant guidelines context, queries the history, calls Gemini 2.5 Flash for a streaming RAG response, and persists the dialogue.
* **Input**: POST `{ message: string, conversationId?: string }` + `Authorization: Bearer <clerk_jwt>`.
* **Output**: SSE text stream containing chunks of the assistant response. If a new conversation was created, it returns the generated ID in the `X-Conversation-Id` header.
* **Steps**:
  1. Verify Clerk JWT and extract user ID (`sub`).
  2. If `conversationId` is absent:
     - Create a conversation in `conversations` table.
     - Create a mind map row in `mind_maps` table.
  3. Call Gemini `text-embedding-04` to embed the user query.
  4. Call Supabase database function `match_guidelines` using the embedding to retrieve up to 5 guidelines chunks.
  5. Fetch the last 10 messages from the `messages` table for history.
  6. Insert the user's message into the `messages` table.
  7. Construct a system prompt containing guidelines context and a strict "NO EMOJIS" instruction.
  8. Stream from Gemini and pipe chunks to client while building the full string in memory.
  9. Save the full assistant response to the `messages` table upon completion.

### Brainstorm Edge Function (`supabase/functions/brainstorm/index.ts`)
* **Purpose**: Generates a mind map structure using React Flow formatted JSON nodes/edges from the conversation context.
* **Input**: POST `{ conversationId: string, nodeId?: string }` + `Authorization: Bearer <clerk_jwt>`.
* **Output**: JSON payload `{ nodes, edges }`.
* **Steps**:
  1. Verify Clerk JWT and extract user ID.
  2. Fetch conversation messages.
  3. Fetch the current mind map from the database.
  4. Run a vector search on the selected node's label (if `nodeId` is provided) or the last message (if new map) to obtain specific guidelines citations.
  5. Call Gemini 2.5 Flash with structured instructions to output a valid JSON object matching the React Flow nodes and edges schema.
  6. Layout nodes left-to-right (Symptom -> Diagnosis -> Test -> Treatment) with vertical spacing.
  7. Restrict model from outputting emojis.
  8. Clean and parse the response JSON.
  9. Upsert the new mind map structure into `mind_maps` and return it.

---

## 4. Next.js Client State Synchronization
We update the client-side state managers to fetch and persist data rather than relying on mocks.

### Zustand Chat Store (`lib/store.ts`)
* `fetchConversations(getToken)`: Loads active conversations list on app mount.
* `fetchMessages(conversationId, getToken)`: Loads history for the active conversation.
* `createNewConversation(title, userId, getToken)`: Persists a new conversation session to database.

### Zustand Mind Map Store (`lib/mindmapStore.ts`)
* `fetchMindMap(conversationId, getToken)`: Loads map layout from `mind_maps` table.
* `brainstormOnNode(conversationId, nodeId, getToken)`: Calls Edge Function `/brainstorm` to append AI-generated nodes.
* `regenerateMap(conversationId, getToken)`: Calls Edge Function `/brainstorm` without `nodeId` to generate a fresh map.
* `saveLayout(conversationId, getToken)`: Save current node positions (x, y) to database.

---

## Verification Plan
1. **Authentication Tests**: Access `/chat` without logging in (should redirect to Clerk sign-in).
2. **Chat Function Verification**: Query `/functions/v1/chat` and verify streaming behavior, DB inserts, and vector context embedding.
3. **Brainstorm Function Verification**: Trigger brainstorming and verify returning valid React Flow JSON, DB inserts, and node mapping.
4. **Layout Verification**: Move a node and click "Save Layout", refresh, and verify that the layout is correctly loaded.
