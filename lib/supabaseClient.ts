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
