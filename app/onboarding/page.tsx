import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function OnboardingPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth?callbackUrl=/onboarding");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-quantum-50">Welcome to Surplus Bus</h1>
      <p className="text-quantum-400">
        Configure your alert defaults and preferences to get started.
      </p>
      <div className="flex gap-4">
        <Link
          href="/alerts"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
        >
          Set up alerts
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg font-medium transition border border-quantum-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
