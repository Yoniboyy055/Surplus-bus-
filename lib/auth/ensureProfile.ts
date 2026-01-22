import type { SupabaseClient, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  role: "operator" | "referrer" | "buyer";
};

const OWNER_EMAIL = "nohabe056@gmail.com";

export const ensureProfile = async (supabase: SupabaseClient, user: User) => {
  // 1. Try to read existing profile
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("ensureProfile: SELECT error", selectError);
    throw selectError; 
  }

  if (existing) {
    // Check if we need to upgrade to operator
    if (user.email === OWNER_EMAIL && existing.role !== 'operator') {
       console.log(`ensureProfile: Upgrading ${user.email} to operator`);
       const { data: updated } = await supabase
         .from("profiles")
         .update({ role: 'operator' })
         .eq("id", user.id)
         .select("id, role")
         .single();
       return { profile: updated as Profile, created: false };
    }
    return { profile: existing as Profile, created: false };
  }

  // 2. Insert if not found
  const role = user.email === OWNER_EMAIL ? "operator" : "buyer"; // Default to buyer, but operator if owner
  console.log(`ensureProfile: Profile not found, inserting for ${user.id} with role ${role}`);
  
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      role: role,
    })
    .select("id, role")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') { // Unique violation
        console.log("ensureProfile: Insert race condition detected, retrying select.");
        const { data: retry, error: retryError } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single();
        
        if (retryError) throw retryError;
        return { profile: retry as Profile, created: false };
    }
    console.error("ensureProfile: INSERT failed", insertError);
    throw insertError;
  }

  if (!inserted) {
    console.error("ensureProfile: Inserted but no data returned. RLS likely blocking SELECT.");
    throw new Error("Profile inserted but could not be read. Check RLS 'SELECT' policies.");
  }

  return { profile: inserted as Profile, created: true };
};
