import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunitiesClient } from "./OpportunitiesClient";

export default async function OpportunitiesPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  return <OpportunitiesClient />;
}
