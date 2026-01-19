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
    .single();

  if (insertError) {
    throw insertError;
  }

  return { profile: inserted as Profile, created: true };
};
