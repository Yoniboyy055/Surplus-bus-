import type { SupabaseClient, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  role: "operator" | "referrer" | "buyer";
};

export const ensureProfile = async (supabase: SupabaseClient, user: User) => {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return { profile: existing as Profile, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      role: "buyer",
    })
    .select("id, role")
    .maybeSingle();

  if (insertError) {
    // If insert fails because it already exists (race condition with trigger), 
    // try to fetch it one last time.
    const { data: retry, error: retryError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();
    
    if (retryError) throw retryError;
    return { profile: retry as Profile, created: false };
  }

  if (!inserted) {
    // This could happen if RLS blocks the insert or if it was already there
    const { data: retry, error: retryError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();
    
    if (retryError) throw retryError;
    return { profile: retry as Profile, created: false };
  }

  return { profile: inserted as Profile, created: true };
};
