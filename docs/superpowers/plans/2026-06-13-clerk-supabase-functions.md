# Clerk Authentication & Supabase Edge Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the Next.js guidelines assistant using Clerk authentication and replace mock backend logic with real Deno Edge Functions (/chat and /brainstorm) connected to Supabase and Gemini.

**Architecture:** We use Clerk for user sign-in and session JWT token retrieval. We then initialize the client-side Supabase client with this JWT token to perform RLS-secured reads. To execute streaming RAG chat and mind map JSON brainstorming, we call Edge Functions with the Clerk JWT token in the Authorization header. The Edge Functions verify the JWT using Clerk's JWKS, run vector queries, interact with Gemini 2.5 Flash, and save history.

**Tech Stack:** Next.js (App Router), Clerk Auth, Supabase JS SDK, Deno, Gemini API (`gemini-2.5-flash`), Zustand, Tailwind CSS.

---

## File Structure

- `package.json` (Modify to add Clerk dependencies)
- `app/layout.tsx` (Modify to add `<ClerkProvider>`)
- `middleware.ts` (Create to protect `/chat` and `/api` paths)
- `app/page.tsx` (Modify to add sign-in flow)
- `lib/supabaseClient.ts` (Create to initialize client-side Supabase client with Clerk JWT)
- `supabase/functions/chat/index.ts` (Create /chat Edge Function for streaming RAG)
- `supabase/functions/brainstorm/index.ts` (Create /brainstorm Edge Function for React Flow generation)
- `lib/store.ts` (Modify chat store to sync with Supabase tables)
- `lib/mindmapStore.ts` (Modify mindmap store to sync with Supabase tables & call brainstorm function)
- `components/chat/ChatPanel.tsx` (Modify to fetch Edge Function stream)
- `components/mindmap/MindMapToolbar.tsx` (Modify toolbar buttons to call store sync actions)
- `components/mindmap/RecommendationDrawer.tsx` (Modify brainstorm button to call store sync actions)

---

### Task 1: Install Clerk and configure Next.js Layout/Middleware

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`
- Create: `middleware.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Install Clerk package**
Run:
```bash
npm install @clerk/nextjs
```

- [ ] **Step 2: Create Clerk middleware**
Create `middleware.ts` in the project root:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/chat(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.[\\w]+$).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Update `app/layout.tsx` with ClerkProvider**
Modify `app/layout.tsx` to wrap children in `<ClerkProvider>`:
```typescript
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: false,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Medical Guidelines Assistant",
  description: "Clinical assistant and mind-mapping system for Egyptian healthcare doctors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body className="antialiased font-sans bg-background text-foreground min-h-[100dvh]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Update home page `app/page.tsx` with Clerk authentication controls**
Modify `app/page.tsx`:
```typescript
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Heart } from "lucide-react";
import { SignInButton, SignOutButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-black font-sans py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 text-center">
        <header className="space-y-2">
          <div className="w-16 h-16 rounded-full border-[3px] border-black bg-lime-400 flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
            <ShieldCheck className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
            MOH Guidelines Assistant
          </h1>
          <p className="font-sans text-sm font-semibold text-black/70 leading-relaxed max-w-sm mx-auto">
            Clinical decision RAG assistant and diagnostics planner for Egyptian healthcare practitioners.
          </p>
        </header>

        <div className="pt-2">
          <SignedIn>
            <div className="space-y-4">
              <p className="font-sans text-sm font-bold text-black">
                Logged in as <span className="underline">{user?.emailAddresses[0]?.emailAddress}</span>
              </p>
              <Link
                href="/chat"
                className="press-effect w-full border-[3px] border-black bg-white p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150"
              >
                <span>Launch Clinician Dashboard</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Link>
              <div className="pt-2">
                <SignOutButton>
                  <button className="press-effect text-xs font-bold uppercase underline cursor-pointer hover:text-red-600">
                    Sign Out Account
                  </button>
                </SignOutButton>
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="press-effect w-full border-[3px] border-black bg-lime-400 p-4 font-display font-extrabold uppercase text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150"
              >
                <span>Sign In to Continue</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        <footer className="pt-4 border-t-2 border-black flex items-center justify-center gap-1.5 font-sans text-xs font-bold text-black/55 uppercase tracking-wide">
          Made for Doctors with <Heart className="w-3.5 h-3.5 text-fuchsia-500 fill-fuchsia-500" /> in Egypt
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build passes**
Run: `npm run typecheck`
Expected: Compile success.

---

### Task 2: Authenticated Supabase Client Setup

**Files:**
- Create: `lib/supabaseClient.ts`

- [ ] **Step 1: Write `lib/supabaseClient.ts`**
Create `lib/supabaseClient.ts` to initialize an authenticated Supabase client:
```typescript
import { createClient } from "@supabase/supabase-js";

export const getSupabaseClient = async (
  getToken: (options: { template: string }) => Promise<string | null>
) => {
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

### Task 3: Build Chat Edge Function

**Files:**
- Create: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Create Edge Function `/chat/index.ts`**
Write code to `supabase/functions/chat/index.ts` (Done in pre-flight, verify file contents are correct):
Verify file contents using:
```powershell
Get-Content -Path supabase/functions/chat/index.ts -TotalCount 20
```

- [ ] **Step 2: Verify `chat` Edge Function matches RAG guidelines**
Make sure there are no syntax errors and the code compiles in Deno.

---

### Task 4: Build Brainstorm Edge Function

**Files:**
- Create: `supabase/functions/brainstorm/index.ts`

- [ ] **Step 1: Write `supabase/functions/brainstorm/index.ts`**
Write the complete Deno brainstorm logic using `jose` for token verification, querying conversation context, vector searching context based on selected nodes or last message, calling Gemini REST API to output clean React Flow JSON, and saving it:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import * as jose from "https://esm.sh/jose@5.2.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getClerkJwksUrl(publishableKey: string) {
  const parts = publishableKey.split("_");
  if (parts.length < 3) return "";
  const base64Part = parts[2];
  const decoded = atob(base64Part);
  const domain = decoded.replace("$", "");
  return `https://${domain}/.well-known/jwks.json`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    const clerkPubKey = Deno.env.get("CLERK_PUBLISHABLE_KEY")!;
    const jwksUrl = getClerkJwksUrl(clerkPubKey);
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

    let verified;
    try {
      verified = await jose.jwtVerify(token, JWKS);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Unauthorized token: ${err.message}` }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = verified.payload.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token claims" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { conversationId, nodeId } = body;
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Missing conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch conversation details to verify user owns it
    const { data: convData } = await supabaseAdmin
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (!convData || convData.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing mindmap
    const { data: existingMap } = await supabaseAdmin
      .from("mind_maps")
      .select("nodes, edges")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    const currentNodes = existingMap?.nodes || [];
    const currentEdges = existingMap?.edges || [];

    // Fetch last few messages for general context
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatContext = (messages || [])
      .reverse()
      .map((m: any) => `${m.role === "user" ? "Doctor" : "Assistant"}: ${m.content}`)
      .join("\n");

    // Retrieve Guidelines Context for Brainstorming
    let searchQuery = "";
    if (nodeId) {
      const selectedNode = currentNodes.find((n: any) => n.id === nodeId);
      if (selectedNode) {
        searchQuery = `${selectedNode.data?.label || ""} ${selectedNode.data?.description || ""}`;
      }
    }
    if (!searchQuery && messages && messages.length > 0) {
      searchQuery = messages[0].content; // last user query
    }

    let guidelinesText = "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

    if (searchQuery) {
      // Get embedding
      const embedResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-04:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-04",
            content: { parts: [{ text: searchQuery }] },
          }),
        }
      );
      if (embedResponse.ok) {
        const embedData = await embedResponse.json();
        const embedding = embedData.embedding.values;
        // Search
        const { data: contextChunks } = await supabaseAdmin.rpc("match_guidelines", {
          query_embedding: embedding,
          match_threshold: 0.25,
          match_count: 3,
        });
        guidelinesText = (contextChunks || [])
          .map((c: any) => `[Document: ${c.file_name}]\n${c.content}`)
          .join("\n\n---\n\n");
      }
    }

    const systemInstruction = `You are a clinical decision mindmap planner helping doctors map out clinical pathways.
Analyze the provided chat history and the current mindmap structure. Your task is to generate diagnostic, differential, test, or treatment steps based on the clinical guidelines context.

${nodeId ? `The user is specifically brainstorming starting from the node: "${nodeId}". Generates child nodes off of this parent node.` : `Generate a cohesive diagnosis-action tree matching the session topic.`}

CRITICAL RULES:
1. You must output ONLY a valid raw JSON object. Do not wrap in markdown \`\`\`json blocks.
2. NO EMOJIS in any labels, descriptions, or recommendations.
3. Node position rules:
   - Symptoms go in column 1 (x: 50)
   - Differential Diagnoses go in column 2 (x: 320)
   - Diagnostic Bedside/Lab/Imaging Tests go in column 3 (x: 590)
   - Treatment Plans go in column 4 (x: 860)
   - Stagger vertical coordinates (y) by increments of 150 (e.g. y: 50, 200, 350) to prevent overlaps.
4. Edge formatting:
   - Connections must link from parent nodes to child nodes.
   - Set strokeWidth to 3 and stroke to "#000" in style.

JSON Output Schema:
{
  "nodes": [
    {
      "id": "string (unique identifier)",
      "type": "symptomNode" | "diagnosisNode" | "testNode" | "treatmentNode",
      "position": { "x": number, "y": number },
      "data": {
        "label": "string (short clinical label)",
        "description": "string (short details, max 1 sentence)",
        "recommendations": ["string (action item 1)", "string (action item 2)"],
        "citations": [
          {
            "document": "string (Egyptian MOH Guideline doc name)",
            "section": "string (section title/number)",
            "text": "string (supporting text excerpt)"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "e-[source]-[target]",
      "source": "string (parent node id)",
      "target": "string (child node id)",
      "style": { "strokeWidth": 3, "stroke": "#000" }
    }
  ]
}

---
CURRENT CHAT TRANSCRIPT:
${chatContext}

CURRENT MIND MAP STATE:
${JSON.stringify({ nodes: currentNodes, edges: currentEdges })}

OFFICIAL CLINICAL GUIDELINES CONTEXT:
${guidelinesText}
`;

    // Call Gemini 2.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemInstruction }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Failed to call Gemini brainstorm: ${await geminiResponse.text()}`);
    }

    const geminiResult = await geminiResponse.json();
    let responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean response if model wraps in codeblocks
    responseText = responseText.trim();
    if (responseText.startsWith("```")) {
      const match = responseText.match(/^(?:```[a-zA-Z]*\n)?([\s\S]*?)(?:\n```)?$/);
      if (match) responseText = match[1];
    }

    const parsedPayload = JSON.parse(responseText);
    let finalNodes = parsedPayload.nodes || [];
    let finalEdges = parsedPayload.edges || [];

    // If nodeId is provided, we merge these brainstormed nodes into the existing map to preserve historical data
    if (nodeId) {
      // Prevent duplicate node IDs
      const existingIds = new Set(currentNodes.map((n: any) => n.id));
      const filteredNewNodes = finalNodes.filter((n: any) => !existingIds.has(n.id));
      
      finalNodes = [...currentNodes, ...filteredNewNodes];
      finalEdges = [...currentEdges, ...finalEdges];
    }

    // Save back to db
    await supabaseAdmin
      .from("mind_maps")
      .upsert({
        conversation_id: conversationId,
        nodes: finalNodes,
        edges: finalEdges,
        updated_at: new Date().toISOString(),
      }, { onConflict: "conversation_id" });

    return new Response(JSON.stringify({ nodes: finalNodes, edges: finalEdges }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

### Task 5: Update Next.js Zustand stores to synchronize with Supabase

**Files:**
- Modify: `lib/store.ts`
- Modify: `lib/mindmapStore.ts`

- [ ] **Step 1: Update `lib/store.ts`**
Replace mock conversations & messages state with remote synchronization logic:
```typescript
"use client";

import { create } from "zustand";
import { getSupabaseClient } from "./supabaseClient";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  activePane: "chat" | "mindmap" | "split";
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePane: (pane: "chat" | "mindmap" | "split") => void;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  syncStatus: "synced" | "syncing" | "offline";
  
  fetchConversations: (getToken: any) => Promise<void>;
  fetchMessages: (conversationId: string, getToken: any) => Promise<void>;
  selectConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, content: string, isStreaming: boolean) => void;
  createNewConversation: (title: string, userId: string, getToken: any) => Promise<string>;
  setSyncStatus: (status: "synced" | "syncing" | "offline") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activePane: "split",
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActivePane: (pane) => set({ activePane: pane }),
}));

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  syncStatus: "synced",

  fetchConversations: async (getToken) => {
    set({ syncStatus: "syncing" });
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        updatedAt: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      set({ conversations: formatted, syncStatus: "synced" });
      
      // Select first conversation if none active
      if (formatted.length > 0 && !get().activeConversationId) {
        get().selectConversation(formatted[0].id);
      }
    } catch (err) {
      console.error(err);
      set({ syncStatus: "offline" });
    }
  },

  fetchMessages: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: formatted
        }
      }));
    } catch (err) {
      console.error("Fetch messages failed", err);
    }
  },

  selectConversation: (id) => set({ activeConversationId: id }),
  
  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMessages, message],
        },
      };
    }),

  updateLastMessage: (conversationId, content, isStreaming) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      if (currentMessages.length === 0) return {};
      const updated = [...currentMessages];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content,
        isStreaming,
      };
      return {
        messages: {
          ...state.messages,
          [conversationId]: updated,
        },
      };
    }),

  createNewConversation: async (title, userId, getToken) => {
    set({ syncStatus: "syncing" });
    const supabase = await getSupabaseClient(getToken);
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title, user_id: userId })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create conversation");
    }

    // Seed mind map
    await supabase.from("mind_maps").insert({ conversation_id: data.id, nodes: [], edges: [] });

    const newConv: Conversation = {
      id: data.id,
      title: data.title,
      updatedAt: "Just now",
    };

    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: data.id,
      messages: {
        ...state.messages,
        [data.id]: [],
      },
      syncStatus: "synced",
    }));

    return data.id;
  },

  setSyncStatus: (status) => set({ syncStatus: status }),
}));
```

- [ ] **Step 2: Update `lib/mindmapStore.ts`**
Replace local state with real Supabase / Edge Function brainstorming:
```typescript
"use client";

import { create } from "zustand";
import { 
  Node, 
  Edge, 
  NodeChange, 
  EdgeChange, 
  applyNodeChanges, 
  applyEdgeChanges 
} from "@xyflow/react";
import { getSupabaseClient } from "./supabaseClient";

export type NodeType = "symptom" | "diagnosis" | "test" | "treatment";

export interface GuidelineCitation {
  document: string;
  section: string;
  text: string;
}

export interface ClinicalNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  recommendations: string[];
  citations: GuidelineCitation[];
}

export interface MindMapState {
  nodes: Node<ClinicalNodeData>[];
  edges: Edge[];
  selectedNode: Node<ClinicalNodeData> | null;
  drawerOpen: boolean;
  toastMessage: string | null;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  
  fetchMindMap: (conversationId: string, getToken: any) => Promise<void>;
  selectNode: (nodeId: string) => void;
  closeDrawer: () => void;
  brainstormOnNode: (conversationId: string, nodeId: string, getToken: any) => Promise<void>;
  regenerateMap: (conversationId: string, getToken: any) => Promise<void>;
  clearMap: (conversationId: string, getToken: any) => Promise<void>;
  saveLayout: (conversationId: string, getToken: any) => Promise<void>;
  clearToast: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  drawerOpen: false,
  toastMessage: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<ClinicalNodeData>[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  fetchMindMap: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { data, error } = await supabase
        .from("mind_maps")
        .select("nodes, edges")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (error) throw error;
      set({
        nodes: data?.nodes || [],
        edges: data?.edges || [],
        selectedNode: null,
        drawerOpen: false
      });
    } catch (err) {
      console.error("Fetch mindmap failed", err);
    }
  },

  selectNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (node) {
      set({ selectedNode: node, drawerOpen: true });
    }
  },

  closeDrawer: () => {
    set({ drawerOpen: false, selectedNode: null });
  },

  brainstormOnNode: async (conversationId, nodeId, getToken) => {
    set({ toastMessage: "Brainstorming new pathways..." });
    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/brainstorm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, nodeId }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { nodes, edges } = await response.json();
      set({ nodes, edges, toastMessage: "Mind map expanded!" });

      // Focus the side drawer on the newly added child node, if any
      const parentNode = nodes.find((n: any) => n.id === nodeId);
      const newChild = nodes.find((n: any) => n.id.startsWith("brainstorm-") && !get().nodes.some(ex => ex.id === n.id));
      if (newChild) {
        set({ selectedNode: newChild, drawerOpen: true });
      }
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Brainstorming failed." });
    }
  },

  regenerateMap: async (conversationId, getToken) => {
    set({ toastMessage: "Regenerating mind map..." });
    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/brainstorm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { nodes, edges } = await response.json();
      set({ nodes, edges, selectedNode: null, drawerOpen: false, toastMessage: "New map generated." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Regeneration failed." });
    }
  },

  clearMap: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { error } = await supabase
        .from("mind_maps")
        .update({ nodes: [], edges: [] })
        .eq("conversation_id", conversationId);

      if (error) throw error;
      set({ nodes: [], edges: [], selectedNode: null, drawerOpen: false, toastMessage: "Map cleared." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Clear failed." });
    }
  },

  saveLayout: async (conversationId, getToken) => {
    try {
      const supabase = await getSupabaseClient(getToken);
      const { error } = await supabase
        .from("mind_maps")
        .upsert({
          conversation_id: conversationId,
          nodes: get().nodes,
          edges: get().edges,
          updated_at: new Date().toISOString(),
        }, { onConflict: "conversation_id" });

      if (error) throw error;
      set({ toastMessage: "Positions saved to database." });
    } catch (err) {
      console.error(err);
      set({ toastMessage: "Failed to save positions." });
    }
  },

  clearToast: () => set({ toastMessage: null })
}));
```

---

### Task 6: Update Next.js ChatPanel UI to use real Edge Function streaming

**Files:**
- Modify: `components/chat/ChatPanel.tsx`

- [ ] **Step 1: Update `components/chat/ChatPanel.tsx` to handle Edge Function streaming**
Rewrite `handleSendMessage` in `components/chat/ChatPanel.tsx` to use the `/chat` Edge Function with the Clerk JWT:
Modify code starting around line 50:
```typescript
  const { getToken } = useAuth(); // Clerk Auth Hook
  const { user } = useUser();

  const handleSendMessage = async (text: string) => {
    if (!user) return;
    
    // Clear existing stream if any
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // 1. Setup local variables
    const tempConvId = activeConversationId;

    // 2. Set DB SyncStatus as syncing
    setSyncStatus("syncing");

    // 3. Add Placeholder Assistant Message
    const assistantMessageId = `msg-reply-${Date.now()}`;

    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            conversationId: tempConvId || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Check if conversation ID changed (new conversation generated on server)
      const returnedConvId = response.headers.get("X-Conversation-Id");
      let activeId = tempConvId;

      if (returnedConvId && returnedConvId !== tempConvId) {
        activeId = returnedConvId;
        // Seed the conversation in store list
        await useChatStore.getState().fetchConversations(getToken);
        useChatStore.getState().selectConversation(activeId);
      }

      // Add user message to UI state immediately
      addMessage(activeId!, {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: "Just now",
      });

      // Add assistant placeholder
      addMessage(activeId!, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: "Just now",
        isStreaming: true,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulatedText += chunk;
        updateLastMessage(activeId!, accumulatedText, true);
      }

      // Finalize message stream
      updateLastMessage(activeId!, accumulatedText, false);
      setSyncStatus("synced");

      // Fetch mind map updates to sync if the map changes alongside the chat RAG
      await useMindMapStore.getState().fetchMindMap(activeId!, getToken);

    } catch (err) {
      console.error("Chat streaming failed", err);
      setSyncStatus("offline");
      addMessage(tempConvId || "error", {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "An error occurred while communicating with the medical assistant server.",
        timestamp: "Just now",
      });
    }
  };
```

Wait, we must import `useAuth` and `useUser` from `@clerk/nextjs` at the top of `components/chat/ChatPanel.tsx`:
```typescript
import { useAuth, useUser } from "@clerk/nextjs";
```

- [ ] **Step 2: Sync chats and mindmaps on mount / session change**
Add a `useEffect` inside `ChatPanel.tsx` (or a global dashboard wrapper) to fetch conversations and load messages when selected:
```typescript
  useEffect(() => {
    if (user) {
      useChatStore.getState().fetchConversations(getToken);
    }
  }, [user]);

  useEffect(() => {
    if (activeConversationId) {
      useChatStore.getState().fetchMessages(activeConversationId, getToken);
      useMindMapStore.getState().fetchMindMap(activeConversationId, getToken);
    }
  }, [activeConversationId]);
```

- [ ] **Step 3: Verify no type errors**
Run `npm run typecheck`
Expected: Compile success.

---

### Task 7: Update MindMap Canvas Toolbar & Drawer Controls

**Files:**
- Modify: `components/mindmap/MindMapToolbar.tsx`
- Modify: `components/mindmap/RecommendationDrawer.tsx`
- Modify: `components/ui/Sidebar.tsx` (Add sign out or user button)

- [ ] **Step 1: Update `components/mindmap/MindMapToolbar.tsx`**
Update toolbar actions to call the new Zustand functions with parameters:
```typescript
import { useAuth } from "@clerk/nextjs";
...
  const { getToken } = useAuth();
  const { activeConversationId } = useChatStore();
  const { regenerateMap, clearMap, saveLayout } = useMindMapStore();

  const handleRegenerate = () => {
    if (activeConversationId) regenerateMap(activeConversationId, getToken);
  };
  const handleClear = () => {
    if (activeConversationId) clearMap(activeConversationId, getToken);
  };
  const handleSave = () => {
    if (activeConversationId) saveLayout(activeConversationId, getToken);
  };
```

- [ ] **Step 2: Update `components/mindmap/RecommendationDrawer.tsx`**
Update the brainstorm action inside the drawer:
```typescript
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/lib/store";
...
  const { getToken } = useAuth();
  const { activeConversationId } = useChatStore();
  const { selectedNode, brainstormOnNode } = useMindMapStore();

  const handleBrainstorm = () => {
    if (activeConversationId && selectedNode) {
      brainstormOnNode(activeConversationId, selectedNode.id, getToken);
    }
  };
```

- [ ] **Step 3: Update `components/ui/Sidebar.tsx`**
Add the Clerk `<UserButton>` to the sidebar footer for quick profile management and logout:
```typescript
import { UserButton, useUser } from "@clerk/nextjs";
...
// Add UserButton in the sidebar footer layout:
  <div className="p-4 border-t-[3px] border-black flex items-center justify-between bg-yellow-400">
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/" />
      <span className="font-mono text-xs font-bold truncate max-w-[150px]">{user?.emailAddresses[0]?.emailAddress}</span>
    </div>
  </div>
```

---

## Verification Plan

### Automated Checks
- Run `npm run typecheck` to verify TypeScript compile-time correctness.
- Run `npm run lint` to confirm no syntactic/formatting problems.

### Manual Verification
1. Open the browser and visit `http://localhost:3000`. You should be redirected or prompted with the Clerk Sign-In dialog.
2. Sign in using your credentials.
3. Open a Vertigo or Otitis Media consultation. Verify that the RAG assistant answers using official document chunks and contains NO emojis.
4. Open the Clinical Mind Map, drag any node, and click "Save Layout". Refresh the page and verify that the node positions remain saved.
5. Select a node (e.g. Diagnosis) and click "Brainstorm on this". Verify that new child nodes are successfully returned by Gemini, rendered on the canvas, and connected correctly.
