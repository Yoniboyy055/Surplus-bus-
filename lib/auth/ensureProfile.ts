import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js"; // Direct import for admin client
import { isOwnerEmail } from "./ownerEmail";

type Profile = {
  id: string;
  role: "operator" | "referrer" | "buyer";
};

export const ensureProfile = async (userClient: SupabaseClient, user: User) => {
  console.log(`[ensureProfile] user.id=${user.id} user.email=${user.email}`);

  // 1. Try to read existing profile with the user's client (RLS applied)
  const { data: existing, error: selectError } = await userClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("[ensureProfile] SELECT error:", JSON.stringify(selectError));
  }

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
  
  const role = isOwnerEmail(user.email) ? "operator" : "referrer";

  const insertPayload = {
    id: user.id,
    email: user.email ?? null,
    role,
    created_at: new Date().toISOString(),
  };
  console.log("[ensureProfile] INSERT payload:", JSON.stringify({ ...insertPayload, id: insertPayload.id }));

  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (adminErr) {
    console.error("[ensureProfile] getAdminClient failed:", adminErr);
    throw adminErr;
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("profiles")
    .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
    .select("id, role")
    .single();

  if (insertError) {
    console.error("[ensureProfile] Admin UPSERT failed:", insertError.message, insertError.code, insertError.details);
    throw insertError;
  }

  return { profile: inserted as Profile, created: true };
};

// Helper to get a service role client on the server
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for profile bootstrap. Set it in Vercel → Settings → Environment Variables."
    );
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
