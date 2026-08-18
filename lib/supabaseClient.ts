import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Shared browser Supabase client with cookie-based auth.
 * The SDK automatically attaches the current session access token to every
 * request, so RLS policies using auth.jwt() work natively.
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  cookieOptions: {
    name: "sb-auth-token",
  },
});

/**
 * Returns the shared authenticated Supabase client.
 * ponytail: getToken param kept for signature compatibility with existing
 * store callers; ignored — the browser client auto-attaches the session token.
 */
export const getSupabaseClient = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _getToken?: (options?: { template?: string }) => Promise<string | null>
) => supabase;

/**
 * Lightweight connectivity probe — does NOT require a Clerk JWT.
 * Uses the anon key directly to reach the REST API.
 * Returns true if Supabase responds with any HTTP reply.
 */
export const checkSupabaseConnectivity = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    // Any response (even 404/401) means the server is reachable
    return res.status < 500;
  } catch {
    return false;
  }
};
