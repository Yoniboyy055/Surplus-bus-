import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "./ensureProfile";

/**
 * Role-based routing utility for post-auth redirects.
 * 
 * Fetches user profile and returns appropriate route based on role.
 * If profile doesn't exist, creates one via ensureProfile and re-fetches.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to route
 * @returns Route path based on user role
 */
export async function routeByRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Fetch profile
  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // If profile doesn't exist (successful query with no result), create it
  if (!profile && selectError === null) {
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await ensureProfile(supabase, user.user);
      
      // Re-fetch profile after creation
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      
      if (newProfile?.role) {
        return getRoleRoute(newProfile.role);
      }
    }
  }

  // Route based on role
  if (profile?.role) {
    return getRoleRoute(profile.role);
  }

  // Fallback: no role found
  return "/onboarding/role";
}

/**
 * Maps role to route path
 */
function getRoleRoute(role: string): string {
  switch (role) {
    case "operator":
      return "/operator";
    case "buyer":
      return "/buyer";
    case "referrer":
      return "/referrer";
    default:
      return "/onboarding/role";
  }
}
