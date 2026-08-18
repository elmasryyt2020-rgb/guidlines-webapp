import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DBMessage {
  role: string;
  content: string;
}

interface GuidelineChunk {
  file_name: string;
  content: string;
}

function decodeJwtClaims(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

export default async function chatHandler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];

    // Validate all required secrets
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiKey) throw new Error("MISSING_SECRET: GEMINI_API_KEY is not set.");
    if (!supabaseUrl) throw new Error("MISSING_SECRET: SUPABASE_URL is not set.");
    if (!supabaseServiceKey) throw new Error("MISSING_SECRET: SUPABASE_SERVICE_ROLE_KEY is not set.");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const tokenClaims = decodeJwtClaims(token);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      const detail = authError?.message ?? "Invalid or expired token";
      return new Response(
        JSON.stringify({
          error: `Unauthorized token: ${detail}.`,
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
      const { data: conv, error: checkError } = await supabaseAdmin
        .from("conversations")
        .select("user_id")
        .eq("id", activeConvId)
        .maybeSingle();

      if (checkError || !conv) {
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
      const initialTitle = message.split(" ").slice(0, 5).join(" ") || "New consultation";
      const newConvId = crypto.randomUUID();
      const { data: convData, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert({ id: newConvId, title: initialTitle, user_id: userId })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create conversation: ${createError?.message}`);
      }
      activeConvId = convData?.id || newConvId;

      await supabaseAdmin
        .from("mind_maps")
        .insert({ conversation_id: activeConvId, nodes: [], edges: [] });

      // Async title summarization in background
      (async () => {
        try {
          const titleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
          const titleResponse = await fetch(titleUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{ text: `Summarize this clinical query into 2 to 4 words title without emojis or quotes: "${message}"` }]
              }],
              generationConfig: { maxOutputTokens: 20, temperature: 0.5 }
            })
          });
          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            const genTitle = titleData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.replace(/["'./]/g, "");
            if (genTitle) {
              await supabaseAdmin.from("conversations").update({ title: genTitle }).eq("id", activeConvId);
            }
          }
        } catch (_) {}
      })();
    }

    // Prepare stream transform and return response IMMEDIATELY (<0.2s)
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Heavy async pipeline (RAG + Gemini streaming) runs in background
    (async () => {
      let fullResponseText = "";
      try {
        // 2. Fetch Embeddings
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

        let guidelinesContext = "";
        if (embedResponse.ok) {
          const embedData = await embedResponse.json();
          const embedding: number[] = embedData.embedding?.values ?? [];
          if (embedding.length > 0) {
            const { data: contextChunks } = await supabaseAdmin.rpc("match_guidelines", {
              query_embedding: embedding,
              match_threshold: 0.3,
              match_count: 5,
            });
            guidelinesContext = ((contextChunks || []) as GuidelineChunk[])
              .map((c) => `[Document: ${c.file_name}]\n${c.content}`)
              .join("\n\n---\n\n");
          }
        }

        // 3. DB History & Save User Message
        const { data: dbHistory } = await supabaseAdmin
          .from("messages")
          .select("role, content")
          .eq("conversation_id", activeConvId)
          .order("created_at", { ascending: true })
          .limit(10);

        await supabaseAdmin
          .from("messages")
          .insert({ conversation_id: activeConvId, role: "user", content: message });

        // 4. Construct Prompt
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

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        // 5. Call Gemini Stream API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse&key=${geminiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        });

        if (geminiResponse.ok && geminiResponse.body) {
          const reader = geminiResponse.body.getReader();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
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
                    await writer.write(encoder.encode(textChunk));
                  }
                } catch (_) {}
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
      } catch (err: any) {
        console.error("[chat] Background stream error:", err);
        if (!fullResponseText) {
          await writer.write(encoder.encode(`Failed to complete request: ${err?.message || "Unknown error"}`));
        }
      } finally {
        try {
          await writer.close();
        } catch {}
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "X-Conversation-Id": activeConvId,
        "Access-Control-Expose-Headers": "X-Conversation-Id",
      },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
