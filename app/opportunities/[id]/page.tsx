import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityDetailClient } from "./OpportunityDetailClient";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  return <OpportunityDetailClient />;
}
