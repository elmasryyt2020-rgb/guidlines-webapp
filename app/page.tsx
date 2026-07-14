import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import Landing from "@/components/auth/Landing";

export default async function Home() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/chat");
  }

  return <Landing />;
}
