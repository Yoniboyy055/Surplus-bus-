import type { SupabaseClient, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  role: "operator" | "referrer" | "buyer";
};

export const ensureProfile = async (supabase: SupabaseClient, user: User) => {
  // 1. Try to read existing profile
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("ensureProfile: SELECT error", selectError);
    // Do not throw immediately, RLS might be blocking. 
    // But if RLS blocks SELECT, it usually blocks INSERT return too.
    throw selectError; 
  }

  if (existing) {
    return { profile: existing as Profile, created: false };
  }

  // 2. Insert if not found
  console.log("ensureProfile: Profile not found, inserting for", user.id);
  
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      role: "buyer", // Default role
    })
    .select("id, role")
    .maybeSingle();

  if (insertError) {
    // 3. Race Condition Handling
    // If insert failed because it already exists (race condition with trigger or parallel request),
    // try to fetch one last time.
    if (insertError.code === '23505') { // Unique violation
        console.log("ensureProfile: Insert race condition detected, retrying select.");
        const { data: retry, error: retryError } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single();
        
        if (retryError) {
            console.error("ensureProfile: Retry SELECT failed", retryError);
            throw retryError;
        }
        return { profile: retry as Profile, created: false };
    }

    console.error("ensureProfile: INSERT failed", insertError);
    throw insertError;
  }

  if (!inserted) {
    // This happens if RLS blocks the INSERT ... RETURNING clause
    console.error("ensureProfile: Inserted but no data returned. RLS likely blocking SELECT.");
    throw new Error("Profile inserted but could not be read. Check RLS 'SELECT' policies.");
  }

  return { profile: inserted as Profile, created: true };
};
