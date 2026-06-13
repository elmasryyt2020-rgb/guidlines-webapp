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

// Helper: base64 decode to extract Clerk Jwks url from Publishable Key
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

    // Verify JWT using Clerk JWKS
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
    const { message, conversationId } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let activeConvId = conversationId;

    // 1. Resolve or Create Conversation
    if (activeConvId) {
      // Security Check: Verify BOLA / ownership
      const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("user_id")
        .eq("id", activeConvId)
        .maybeSingle();

      if (convError || !conv) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (conv.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Forbidden: Access denied to conversation" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Create new conversation
      const title = message.split(" ").slice(0, 5).join(" ") || "New consultation";
      const { data: convData, error: convError } = await supabaseAdmin
        .from("conversations")
        .insert({ title, user_id: userId })
        .select()
        .single();

      if (convError || !convData) {
        throw new Error(`Failed to create conversation: ${convError?.message}`);
      }
      activeConvId = convData.id;

      // Seed an empty mindmap for this conversation
      const { error: mapError } = await supabaseAdmin
        .from("mind_maps")
        .insert({ conversation_id: activeConvId, nodes: [], edges: [] });

      if (mapError) {
        console.error(`Failed to seed mind map: ${mapError.message}`);
      }
    }

    // 2. Fetch Embeddings for User Message
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const embedResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-04:embedContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-04",
          content: { parts: [{ text: message }] },
        }),
      }
    );

    if (!embedResponse.ok) {
      throw new Error(`Failed to generate embeddings: ${await embedResponse.text()}`);
    }
    const embedData = await embedResponse.json();
    const embedding = embedData.embedding.values;

    // 3. Perform match_guidelines Vector Search
    const { data: contextChunks, error: rpcError } = await supabaseAdmin.rpc(
      "match_guidelines",
      {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: 5,
      }
    );

    if (rpcError) {
      console.error(`Vector search error: ${rpcError.message}`);
    }

    const guidelinesContext = ((contextChunks || []) as GuidelineChunk[])
      .map((c) => `[Document: ${c.file_name}]\n${c.content}`)
      .join("\n\n---\n\n");

    // 4. Fetch last 10 messages from db
    const { data: dbHistory } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", activeConvId)
      .order("created_at", { ascending: true })
      .limit(10);

    // Write user's message to db
    await supabaseAdmin
      .from("messages")
      .insert({ conversation_id: activeConvId, role: "user", content: message });

    // 5. Construct Prompt & Call Gemini stream REST API
    const systemInstruction = `You are a medical guidelines assistant helping Egyptian healthcare doctors.
Use the following official guidelines from the Ministry of Health (MOH) of Egypt to answer the doctor's query.
Answer direct, professional, and clear. State recommendations clearly.
Citations must include the document name.
If you cannot find the answer in the provided MOH guidelines, clearly say "Based on clinical judgment (not official MOH guidelines):" and proceed with clinical guidance.

CRITICAL INSTRUCTIONS:
- You must structure responses with clean Markdown headers and bullet points.
- STRICTLY DO NOT USE EMOJIS anywhere in your responses. Use clean stroke symbols or bullet formatting.

---
RELEVANT GUIDELINES CONTEXT:
${guidelinesContext}
`;

    const contents = [];
    // System instruction passed inside first user prompt
    contents.push({
      role: "user",
      parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemInstruction}\n\nBegin conversation history.` }],
    });

    if (dbHistory && dbHistory.length > 0) {
      ((dbHistory || []) as DBMessage[]).forEach((msg) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Call Gemini stream API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Failed to call Gemini: ${await geminiResponse.text()}`);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = geminiResponse.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullResponseText = "";

    // Read SSE from Gemini in background
    (async () => {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textChunk) {
                  fullResponseText += textChunk;
                  // Stream back to client
                  await writer.write(encoder.encode(textChunk));
                }
              } catch (_) {
                // Ignore parsing errors for partial lines
              }
            }
          }
        }
        
        // Save assistant message to DB
        if (fullResponseText) {
          await supabaseAdmin
            .from("messages")
            .insert({ conversation_id: activeConvId, role: "assistant", content: fullResponseText });
        }
      } catch (err) {
        console.error("Stream reader error: ", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Conversation-Id": activeConvId,
        "Access-Control-Expose-Headers": "X-Conversation-Id",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
