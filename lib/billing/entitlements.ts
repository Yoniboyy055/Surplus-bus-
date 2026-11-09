import { limitsFor } from "./plans";

type Db = { from: (t: string) => any };

/** Plan limits for the signed-in user (RLS: subs_self_select). Defaults to free. */
export async function getUserLimits(db: Db, userId: string) {
  const { data } = await db.from("subscriptions").select("tier,status").eq("profile_id", userId).maybeSingle();
  return limitsFor(data ?? null);
}
