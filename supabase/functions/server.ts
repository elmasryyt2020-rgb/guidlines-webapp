import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import chatHandler from "./chat/index.ts";
import brainstormHandler from "./brainstorm/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PORT = Number(Deno.env.get("PORT") || 9000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  console.log(`[Edge Router] Incoming request path: ${url.pathname}`);

  if (url.pathname.includes("/brainstorm")) {
    return brainstormHandler(req);
  }

  return chatHandler(req);
}, { port: PORT });
