import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

function decodeJwtClaims(token: string): { kid?: string; iss?: string; sub?: string } | null {
  try {
    const [headerB64, payloadB64] = token.split(".");
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    return { kid: header.kid, iss: payload.iss, sub: payload.sub };
  } catch {
    return null;
  }
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("MISSING_SECRET: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in Edge Function secrets.");
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the Supabase access token and extract the user id
    const tokenClaims = decodeJwtClaims(token);
    console.log(
      `[brainstorm] Auth attempt. Configured SUPABASE_URL: ${supabaseUrl}, token issuer: ${tokenClaims?.iss ?? "unknown"}, kid: ${tokenClaims?.kid ?? "unknown"}`
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      const detail = authError?.message ?? "Invalid or expired token";
      return new Response(
        JSON.stringify({
          error: `Unauthorized token: ${detail}. Ensure the Edge Function's SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY secrets belong to the same project that issued this token (issuer: ${tokenClaims?.iss ?? "unknown"}).`,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const userId = user.id;

    const body = await req.json();
    const { conversationId, nodeId } = body;
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Missing conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
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

${nodeId ? `The user is specifically brainstorming starting from the node: "${nodeId}". Generate 1 to 3 new child nodes branching off of this parent node. Ensure their ids start with "brainstorm-".` : `Generate a clinical decision TREE with 6 to 12 nodes matching the session topic.`}

CRITICAL STRUCTURE RULES — THIS IS A TREE, NOT A WEB:
1. The output is a STRICT TREE. Every non-root node has EXACTLY ONE parent. NO cross-links between siblings or cousins. NO node may have two incoming edges.
2. Flow direction: symptomNode -> diagnosisNode -> testNode -> treatmentNode.
   - ONE root symptomNode (the presenting complaint).
   - Multiple diagnosisNodes branch FROM the root symptomNode (differential diagnoses).
   - Each diagnosisNode has its OWN testNodes (diagnostic workup for that specific diagnosis).
   - Each testNode has its OWN treatmentNodes (treatment if that test confirms the diagnosis).
3. NEVER connect a node to a sibling. NEVER connect across branches. Each branch is independent.
   Example of CORRECT tree:
     symptom_1 -> diagnosis_1 -> test_1a -> treatment_1a
                               -> test_1b -> treatment_1b
                -> diagnosis_2 -> test_2a -> treatment_2a
   Example of WRONG graph (DO NOT DO THIS):
     diagnosis_1 -> test_2a (cross-link between branches)
     test_1a -> diagnosis_2 (backward link)
     treatment_1a -> test_1a (cycle)
4. Each edge connects a parent to its direct child. Source type must be exactly one rank above target type:
   symptomNode(rank 0) -> diagnosisNode(rank 1) -> testNode(rank 2) -> treatmentNode(rank 3).
5. STRICTLY NO EMOJIS in any labels, descriptions, or recommendations.
6. Node position rules:
   - Symptoms go in column 1 (x: 50)
   - Differential Diagnoses go in column 2 (x: 350)
   - Diagnostic tests go in column 3 (x: 650)
   - Treatment plans go in column 4 (x: 950)
   - Space nodes vertically by 180px per node within each column. Nodes under the same parent should be grouped vertically.
7. Self-check before output: count edges. It MUST equal (number of nodes - 1). If not, you have cross-links — remove them.

JSON Output Schema:
{
  "nodes": [
    {
      "id": "string (unique snake_case, e.g. symptom_1, diagnosis_1, test_2a)",
      "type": "symptomNode" | "diagnosisNode" | "testNode" | "treatmentNode",
      "position": { "x": number, "y": number },
      "data": {
        "label": "string (short clinical label)",
        "description": "string (max 1 sentence)",
        "recommendations": ["string"],
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
      "source": "string (must match a node id exactly)",
      "target": "string (must match a node id exactly)",
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

    // Call Gemini 3.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
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

    // If nodeId is provided, merge brainstormed nodes into the existing map
    if (nodeId) {
      const existingIds = new Set(currentNodes.map((n) => n.id));
      const filteredNewNodes = newNodes.filter((n) => !existingIds.has(n.id));
      finalNodes = [...currentNodes, ...filteredNewNodes];
      finalEdges = [...currentEdges, ...newEdges];
    } else {
      // Replace the map entirely (fresh layout)
      finalNodes = newNodes;
      finalEdges = newEdges;
    }

    // ---------------------------------------------------------------
    // Post-process: enforce strict tree structure
    // ---------------------------------------------------------------
    const typeOrder: Record<string, number> = {
      symptomNode: 0,
      diagnosisNode: 1,
      testNode: 2,
      treatmentNode: 3,
    };

    // 1. Strip edges with missing endpoints or wrong rank direction
    const nodeIdSet = new Set(finalNodes.map((n) => n.id));
    const nodeById = new Map(finalNodes.map((n) => [n.id, n]));
    finalEdges = finalEdges.filter((e) => {
      if (!nodeIdSet.has(e.source) || !nodeIdSet.has(e.target)) return false;
      // Only allow edges where source rank is exactly one less than target rank
      const srcRank = typeOrder[nodeById.get(e.source)!.type] ?? -1;
      const tgtRank = typeOrder[nodeById.get(e.target)!.type] ?? -1;
      return tgtRank === srcRank + 1;
    });

    // 2. Enforce single-parent: keep only the first edge into each target (tree, not DAG)
    const seenTargets = new Set<string>();
    finalEdges = finalEdges.filter((e) => {
      if (seenTargets.has(e.target)) return false;
      seenTargets.add(e.target);
      return true;
    });

    // 3. Deduplicate by source→target key
    const edgeKeySet = new Set<string>();
    finalEdges = finalEdges.filter((e) => {
      const key = `${e.source}->${e.target}`;
      if (edgeKeySet.has(key)) return false;
      edgeKeySet.add(key);
      return true;
    });

    // 4. Heal orphaned nodes (non-root nodes with no incoming edge)
    const nodesWithIncoming = new Set(finalEdges.map((e) => e.target));
    const rootCandidates = finalNodes.filter((n) => n.type === "symptomNode");

    for (const node of finalNodes) {
      if (nodesWithIncoming.has(node.id)) continue;
      const nodeRank = typeOrder[node.type] ?? 0;
      if (nodeRank === 0) continue; // root symptom nodes don't need incoming edges

      const expectedParentType = Object.keys(typeOrder).find(
        (t) => typeOrder[t] === nodeRank - 1
      );
      const candidates = finalNodes.filter(
        (n) => n.id !== node.id && n.type === expectedParentType
      );
      const parent = candidates.length > 0 ? candidates[0] : rootCandidates[0];

      if (parent) {
        finalEdges.push({
          id: `e-${parent.id}-${node.id}`,
          source: parent.id,
          target: node.id,
          style: { strokeWidth: 3, stroke: "#000" },
        });
        nodesWithIncoming.add(node.id);
      }
    }

    // 5. Re-layout positions to prevent overlaps — group children under their parent
    // Build parent→children map from the enforced tree edges
    const childrenOf: Record<string, string[]> = {};
    for (const e of finalEdges) {
      if (!childrenOf[e.source]) childrenOf[e.source] = [];
      childrenOf[e.source].push(e.target);
    }
    const columnX: Record<number, number> = { 0: 50, 1: 350, 2: 650, 3: 950 };
    let globalY = 50;
    // DFS layout: walk tree from roots, assign y sequentially so children group under parent
    const positioned = new Set<string>();
    function layoutSubtree(nodeId: string) {
      const node = nodeById.get(nodeId);
      if (!node || positioned.has(nodeId)) return;
      positioned.add(nodeId);
      const rank = typeOrder[node.type] ?? 0;
      node.position = { x: columnX[rank] ?? rank * 300, y: globalY };
      globalY += 180;
      for (const childId of childrenOf[nodeId] || []) {
        layoutSubtree(childId);
      }
    }
    // Start from root symptom nodes
    for (const root of rootCandidates) {
      layoutSubtree(root.id);
    }
    // Position any remaining unvisited nodes (shouldn't happen, but safety)
    for (const node of finalNodes) {
      if (!positioned.has(node.id)) {
        const rank = typeOrder[node.type] ?? 0;
        node.position = { x: columnX[rank] ?? rank * 300, y: globalY };
        globalY += 180;
        positioned.add(node.id);
      }
    }

    // Save back to db — use a manual check-then-insert/update to avoid
    // relying on ON CONFLICT (which requires a UNIQUE constraint).
    const { data: existingRecord } = await supabaseAdmin
      .from("mind_maps")
      .select("id")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    let saveError;
    if (existingRecord?.id) {
      const { error } = await supabaseAdmin
        .from("mind_maps")
        .update({
          nodes: finalNodes,
          edges: finalEdges,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id);
      saveError = error;
    } else {
      const { error } = await supabaseAdmin
        .from("mind_maps")
        .insert({
          conversation_id: conversationId,
          nodes: finalNodes,
          edges: finalEdges,
        });
      saveError = error;
    }

    if (saveError) {
      throw new Error(`Failed to save brainstormed mindmap: ${saveError.message}`);
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
