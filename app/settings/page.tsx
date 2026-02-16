import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Settings</h1>
      <p className="text-quantum-400">Manage your account and preferences.</p>

      <div className="space-y-4">
        <Link
          href="/settings/profile"
          className="block bg-quantum-900 border border-quantum-700 rounded-lg p-4 hover:border-quantum-600 transition"
        >
          <h2 className="font-medium text-quantum-50">Profile & preferences</h2>
          <p className="text-sm text-quantum-500 mt-1">
            Timezone, digest frequency, provinces, categories
          </p>
        </Link>
      </div>
    </div>
  );
}
