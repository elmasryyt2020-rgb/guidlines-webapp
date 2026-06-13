import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import * as jose from "https://esm.sh/jose@5.2.4";

interface GuidelineChunk {
  file_name: string;
  content: string;
}

interface DBMessage {
  role: "user" | "assistant";
  content: string;
}

interface MindMapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    recommendations: string[];
    citations: Array<{
      document: string;
      section: string;
      text: string;
    }>;
  };
}

interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  style?: Record<string, any>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Global JWKS Cache
let cachedJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS(jwksUrl: string) {
  if (!cachedJWKS) {
    cachedJWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
  }
  return cachedJWKS;
}

function getClerkJwksUrl(publishableKey: string) {
  try {
    const parts = publishableKey.split("_");
    if (parts.length < 3) throw new Error("Invalid Clerk Publishable Key format");
    const base64Part = parts[2];
    const decoded = atob(base64Part);
    const domain = decoded.replace("$", "");
    return `https://${domain}/.well-known/jwks.json`;
  } catch (err) {
    throw new Error(`Failed to parse Clerk Publishable Key: ${err.message}`);
  }
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
    const clerkPubKey = Deno.env.get("CLERK_PUBLISHABLE_KEY");
    if (!clerkPubKey) {
      throw new Error("Missing CLERK_PUBLISHABLE_KEY secret in Deno env");
    }

    const jwksUrl = getClerkJwksUrl(clerkPubKey);
    const JWKS = getJWKS(jwksUrl);

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

    // Fetch conversation details to verify user owns it (Security check for BOLA / IDOR)
    const { data: convData } = await supabaseAdmin
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (!convData) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (convData.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: Access Denied" }), {
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

    const currentNodes: MindMapNode[] = (existingMap?.nodes || []) as MindMapNode[];
    const currentEdges: MindMapEdge[] = (existingMap?.edges || []) as MindMapEdge[];

    // Fetch last few messages for general context
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatContext = ((messages || []) as DBMessage[])
      .reverse()
      .map((m) => `${m.role === "user" ? "Doctor" : "Assistant"}: ${m.content}`)
      .join("\n");

    // Retrieve Guidelines Context for Brainstorming
    let searchQuery = "";
    if (nodeId) {
      const selectedNode = currentNodes.find((n) => n.id === nodeId);
      if (selectedNode) {
        searchQuery = `${selectedNode.data?.label || ""} ${selectedNode.data?.description || ""}`;
      }
    }
    if (!searchQuery && messages && messages.length > 0) {
      // Find the last user query in fetched history
      const lastUser = ((messages || []) as DBMessage[]).find(m => m.role === "user");
      if (lastUser) {
        searchQuery = lastUser.content;
      }
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
        guidelinesText = ((contextChunks || []) as GuidelineChunk[])
          .map((c) => `[Document: ${c.file_name}]\n${c.content}`)
          .join("\n\n---\n\n");
      }
    }

    const systemInstruction = `You are a clinical decision mindmap planner helping doctors map out clinical pathways.
Analyze the provided chat history and the current mindmap structure. Your task is to generate diagnostic, differential, test, or treatment steps based on the clinical guidelines context.

${nodeId ? `The user is specifically brainstorming starting from the node: "${nodeId}". Generate 1 to 3 new child nodes branching off of this parent node. Ensure their ids start with "brainstorm-".` : `Generate a cohesive diagnosis-action tree containing 4 to 8 nodes matching the session topic.`}

CRITICAL RULES:
1. You must output ONLY a valid raw JSON object. Do not wrap in markdown \`\`\`json blocks.
2. STRICTLY NO EMOJIS in any labels, descriptions, or recommendations.
3. Node position rules:
   - Symptoms go in column 1 (x: 50)
   - Differential Diagnoses go in column 2 (x: 320)
   - Diagnostic bedside/laboratory/imaging tests go in column 3 (x: 590)
   - Treatment plans go in column 4 (x: 860)
   - Stagger vertical coordinates (y) by increments of 150 (e.g. y: 50, 200, 350) based on node index to prevent overlaps.
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
    let newNodes: MindMapNode[] = (parsedPayload.nodes || []) as MindMapNode[];
    let newEdges: MindMapEdge[] = (parsedPayload.edges || []) as MindMapEdge[];

    let finalNodes: MindMapNode[] = [];
    let finalEdges: MindMapEdge[] = [];

    // If nodeId is provided, we merge these brainstormed nodes into the existing map to preserve historical data
    if (nodeId) {
      // Filter out duplicate node IDs
      const existingIds = new Set(currentNodes.map((n) => n.id));
      const filteredNewNodes = newNodes.filter((n) => !existingIds.has(n.id));
      
      finalNodes = [...currentNodes, ...filteredNewNodes];
      finalEdges = [...currentEdges, ...newEdges];
    } else {
      // Replace the map entirely (fresh layout)
      finalNodes = newNodes;
      finalEdges = newEdges;
    }

    // Save back to db
    const { error: upsertError } = await supabaseAdmin
      .from("mind_maps")
      .upsert({
        conversation_id: conversationId,
        nodes: finalNodes,
        edges: finalEdges,
        updated_at: new Date().toISOString(),
      }, { onConflict: "conversation_id" });

    if (upsertError) {
      throw new Error(`Failed to save brainstormed mindmap: ${upsertError.message}`);
    }

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
