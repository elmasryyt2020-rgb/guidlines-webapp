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

    // Validate all required secrets before any external calls
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiKey) throw new Error("MISSING_SECRET: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
    if (!supabaseUrl) throw new Error("MISSING_SECRET: SUPABASE_URL is not set in Supabase Edge Function secrets.");
    if (!supabaseServiceKey) throw new Error("MISSING_SECRET: SUPABASE_SERVICE_ROLE_KEY is not set in Supabase Edge Function secrets.");

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the Supabase access token and extract the user id
    const tokenClaims = decodeJwtClaims(token);
    console.log(
      `[chat] Auth attempt. Configured SUPABASE_URL: ${supabaseUrl}, token issuer: ${tokenClaims?.iss ?? "unknown"}, kid: ${tokenClaims?.kid ?? "unknown"}`
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
    const { message, conversationId } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      // Call Gemini to generate a concise summary/title for the conversation based on the first message
      let title = "New consultation";
      try {
        const titleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
        const titleResponse = await fetch(titleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{
                text: `You are a medical guidelines assistant. Summarize the following doctor's query into a very short, professional, clinical title (2 to 4 words). Do not use any emojis, punctuation, or extra words.
Query: "${message}"`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 20,
              temperature: 0.5,
            }
          })
        });
        if (titleResponse.ok) {
          const titleData = await titleResponse.json();
          const genTitle = titleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (genTitle) {
            title = genTitle.replace(/["'./]/g, "").trim(); // strip quotes and punctuation
          }
        } else {
          console.error(`Gemini title generation failed with status: ${titleResponse.status}`);
          title = message.split(" ").slice(0, 5).join(" ") || "New consultation";
        }
      } catch (titleErr) {
        console.error("Failed to generate title with Gemini, falling back to slice:", titleErr);
        title = message.split(" ").slice(0, 5).join(" ") || "New consultation";
      }

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
    // Uses gemini-embedding-2 with 768 output dimensions to match the ingestion pipeline
    const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`;
    const embedResponse = await fetch(embedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: message }] },
        outputDimensionality: 768,
      }),
    });

    if (!embedResponse.ok) {
      throw new Error(`Failed to generate embeddings: ${await embedResponse.text()}`);
    }
    const embedData = await embedResponse.json();
    const embedding: number[] = embedData.embedding?.values ?? [];
    if (embedding.length === 0) {
      throw new Error("Embedding returned empty values. Check model access for this API key.");
    }

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
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
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
