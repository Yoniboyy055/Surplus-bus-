import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bell, Home, CheckCircle } from "lucide-react";

export default async function OnboardingPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth?callbackUrl=/onboarding");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--sb-bg)] px-4 py-12">
      <div className="flex items-center gap-6 mb-10">
        <StepCircle done label="Account" />
        <div className="h-1 w-8 bg-[var(--sb-accent)] rounded" />
        <StepCircle active label="Setup" />
        <div className="h-1 w-8 bg-[var(--sb-border)] rounded" />
        <StepCircle label="Done" />
      </div>

      <span className="inline-block px-3 py-1 rounded-full border border-[var(--sb-accent-border)] bg-[var(--sb-accent-subtle)] text-[var(--sb-accent)] text-xs font-semibold tracking-wider mb-4">
        Surplus Bus beta
      </span>
      <h2 className="text-2xl font-bold text-[var(--sb-text)] mb-2 text-center">
        Let&apos;s set up what you want to see
      </h2>
      <p className="text-[var(--sb-text-muted)] text-sm max-w-xl text-center mb-8">
        We pull public listings from Canadian government surplus and procurement sites, rank them by
        how well they fit you, and link you to the official page. You always act on the official site.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-6">
        <Link
          href="/alerts"
          className="rounded-xl border-2 border-[var(--sb-accent)] bg-[var(--sb-surface)] p-6 flex flex-col gap-2 hover:border-[var(--sb-accent-hover)] transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <Bell className="text-[var(--sb-accent)]" size={22} />
            <span className="text-xs font-bold text-[var(--sb-accent)] bg-[var(--sb-accent-subtle)] px-2 py-0.5 rounded">
              RECOMMENDED
            </span>
          </div>
          <span className="text-lg font-semibold text-[var(--sb-text)]">Add an alert rule</span>
          <span className="text-[var(--sb-text-muted)] text-sm">
            New listings that match your rule show up in your inbox here in Surplus Bus.
          </span>
        </Link>
        <Link
          href="/feed"
          className="rounded-xl border-2 border-[var(--sb-border)] bg-[var(--sb-surface)] p-6 flex flex-col gap-2 hover:border-[var(--sb-accent)] transition"
        >
          <div className="flex items-center gap-2 mb-1">
            <Home className="text-[var(--sb-text-muted)]" size={22} />
            <span className="text-xs font-bold text-[var(--sb-text-muted)] bg-[var(--sb-bg-elevated)] px-2 py-0.5 rounded">
              LOOK AROUND
            </span>
          </div>
          <span className="text-lg font-semibold text-[var(--sb-text)]">Go to my feed</span>
          <span className="text-[var(--sb-text-muted)] text-sm">
            Browse recent listings before you set any rules.
          </span>
        </Link>
      </div>
      <p className="text-xs text-[var(--sb-text-muted)] text-center max-w-md">
        Surplus Bus shows public information only. We don&apos;t bid, broker or take a cut.
      </p>
    </div>
  );
}

function StepCircle({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={
          done
            ? "w-7 h-7 rounded-full bg-[var(--sb-accent)] flex items-center justify-center"
            : active
              ? "w-7 h-7 rounded-full bg-[var(--sb-accent)] flex items-center justify-center border-4 border-[var(--sb-accent-hover)]"
              : "w-7 h-7 rounded-full bg-[var(--sb-border)] flex items-center justify-center"
        }
      >
        {done ? (
          <CheckCircle className="text-[var(--sb-text-inverse)]" size={18} />
        ) : active ? (
          <span className="text-[var(--sb-text-inverse)] font-bold">2</span>
        ) : (
          <span className="text-[var(--sb-text-muted)] font-bold">3</span>
        )}
      </div>
      <span
        className={
          done || active
            ? "text-xs mt-1 text-[var(--sb-accent)] font-semibold"
            : "text-xs mt-1 text-[var(--sb-text-disabled)] font-semibold"
        }
      >
        {label}
      </span>
    </div>
  );
}
