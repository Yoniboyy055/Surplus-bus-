import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./FeedClient";

export default async function FeedPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  return <FeedClient />;
}
