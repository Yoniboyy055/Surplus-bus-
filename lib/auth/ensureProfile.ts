import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isOwnerEmail } from "./ownerEmail";

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
    throw selectError; 
  }

  if (existing) {
    // Check if we need to upgrade to operator
    if (isOwnerEmail(user.email) && existing.role !== 'operator') {
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
  const role = isOwnerEmail(user.email) ? "operator" : "buyer"; // Default to buyer, but operator if owner
  console.log(`ensureProfile: Profile not found, inserting for ${user.id} with role ${role}`);
  
  // Use Upsert with onConflict to handle race conditions atomically
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        role: role,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select("id, role")
    .maybeSingle();

  if (insertError) {
    console.error("ensureProfile: INSERT/UPSERT failed", insertError);
    throw insertError;
  }

  // If ignoreDuplicates: true and row existed, inserted might be null if it didn't update anything
  // In that case, we need to select again
  if (!inserted) {
    const { data: retry } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();
    if (!retry) throw new Error("Profile creation failed: upsert returned null and select failed");
    return { profile: retry as Profile, created: false };
  }

  return { profile: inserted as Profile, created: true };
};
