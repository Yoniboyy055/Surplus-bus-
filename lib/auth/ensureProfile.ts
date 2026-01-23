import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js"; // Direct import for admin client
import { isOwnerEmail } from "./ownerEmail";

type Profile = {
  id: string;
  role: "operator" | "referrer" | "buyer";
};

export const ensureProfile = async (userClient: SupabaseClient, user: User) => {
  console.log(`ensureProfile: Checking profile for ${user.email} (${user.id})`);

  // 1. Try to read existing profile with the user's client (RLS applied)
  const { data: existing, error: selectError } = await userClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  // If we found it, verify role upgrade for owner
  if (existing) {
    if (isOwnerEmail(user.email) && existing.role !== 'operator') {
       console.log(`ensureProfile: Upgrading ${user.email} to operator`);
       // Use admin client for upgrade to bypass any "self_update" restrictions on role
       const adminClient = getAdminClient();
       const { data: updated, error: updateError } = await adminClient
         .from("profiles")
         .update({ role: 'operator' })
         .eq("id", user.id)
         .select("id, role")
         .single();
       
       if (updateError) {
         console.error("ensureProfile: Upgrade failed", updateError);
         // Fallback to existing, but log error
         return { profile: existing as Profile, created: false };
       }
       return { profile: updated as Profile, created: false };
    }
    return { profile: existing as Profile, created: false };
  }

  // 2. Insert if not found
  // We use the ADMIN client here to bypass RLS policies that might restrict:
  // - Inserting 'operator' role (often blocked for normal users)
  // - Inserting 'referrer' if default policies are too strict
  // - Race conditions (admin client is authoritative)
  
  const role = isOwnerEmail(user.email) ? "operator" : "referrer"; // Default to referrer for new users as per requirement? 
  // Requirement says: "role default = 'referrer' unless operator email match" -> YES.
  
  console.log(`ensureProfile: Profile not found, inserting for ${user.id} with role ${role} (using Admin Client)`);
  
  const adminClient = getAdminClient();
  
  const { data: inserted, error: insertError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        role: role,
        created_at: new Date().toISOString()
      },
      { onConflict: 'id', ignoreDuplicates: false } // We want to overwrite/ensure it exists
    )
    .select("id, role")
    .single();

  if (insertError) {
    console.error("ensureProfile: Admin INSERT/UPSERT failed", insertError);
    // If admin fails, something is very wrong (DB down, constraints).
    throw insertError;
  }

  return { profile: inserted as Profile, created: true };
};

// Helper to get a service role client on the server
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("ensureProfile: Missing SUPABASE_SERVICE_ROLE_KEY or URL for admin operations");
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
