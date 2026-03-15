
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bell, Home, CheckCircle } from "lucide-react";

export default async function OnboardingPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth?callbackUrl=/onboarding");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-quantum-950 px-4 py-12">
      {/* Progress bar */}
      <div className="flex items-center gap-6 mb-10">
        <StepCircle done label="Account" />
        <div className="h-1 w-8 bg-cyan-500 rounded" />
        <StepCircle active label="Setup" />
        <div className="h-1 w-8 bg-quantum-700 rounded" />
        <StepCircle label="Alerts" />
      </div>

      <span className="inline-block px-3 py-1 rounded-full border border-cyan-500 bg-cyan-500/10 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">Welcome to Surplus Bus Beta</span>
      <h2 className="text-2xl font-bold text-quantum-50 mb-2">How do you want to start?</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-6">
        <Link href="/alerts" className="rounded-xl border-2 border-cyan-500 bg-quantum-900 p-6 flex flex-col gap-2 hover:border-cyan-400 transition group focus:outline-none">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="text-cyan-400" size={22} />
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">RECOMMENDED</span>
          </div>
          <span className="text-lg font-semibold text-quantum-50">Set up alerts</span>
          <span className="text-quantum-400 text-sm">Create custom alert rules to get notified about new opportunities that match your criteria.</span>
        </Link>
        <Link href="/dashboard" className="rounded-xl border-2 border-quantum-700 bg-quantum-900 p-6 flex flex-col gap-2 hover:border-cyan-400 transition group focus:outline-none">
          <div className="flex items-center gap-2 mb-1">
            <Home className="text-quantum-400" size={22} />
            <span className="text-xs font-bold text-quantum-400 bg-quantum-700/20 px-2 py-0.5 rounded">EXPLORE FIRST</span>
          </div>
          <span className="text-lg font-semibold text-quantum-50">Go to dashboard</span>
          <span className="text-quantum-400 text-sm">Browse the intelligence dashboard and explore recent opportunities before setting up alerts.</span>
        </Link>
      </div>
      <div className="text-xs text-quantum-400 text-center">
        Alert setup increases engagement by <span className="text-cyan-400 font-semibold">3x</span> in the first 7 days.
      </div>
    </div>
  );
}

function StepCircle({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={
          done
            ? "w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center"
            : active
            ? "w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center border-4 border-cyan-300"
            : "w-7 h-7 rounded-full bg-quantum-700 flex items-center justify-center"
        }
      >
        {done ? <CheckCircle className="text-white" size={18} /> : active ? <span className="text-white font-bold">2</span> : <span className="text-quantum-300 font-bold">3</span>}
      </div>
      <span className={done ? "text-xs mt-1 text-cyan-500 font-semibold" : active ? "text-xs mt-1 text-cyan-500 font-semibold" : "text-xs mt-1 text-quantum-500 font-semibold"}>{label}</span>
    </div>
  );
}
