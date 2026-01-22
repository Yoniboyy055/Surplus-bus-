"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Sidebar from "./Sidebar";
import { createClient } from "@/lib/supabase/client";

type Role = "operator" | "buyer" | "referrer" | null;

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
};

const navIcons = {
  dashboard: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h7v7H3z" />
      <path d="M14 3h7v4h-7z" />
      <path d="M14 10h7v11h-7z" />
      <path d="M3 14h7v7H3z" />
    </svg>
  ),
  payouts: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  audit: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3h6a2 2 0 0 1 2 2v16l-5-3-5 3V5a2 2 0 0 1 2-2z" />
    </svg>
  ),
  criteria: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  deals: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  ),
  links: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 1 7 0l1 1a5 5 0 0 1-7 7l-1-1" />
      <path d="M14 11a5 5 0 0 0-7 0l-1 1a5 5 0 0 0 7 7l1-1" />
    </svg>
  ),
  referrals: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" />
      <path d="M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z" />
      <path d="M8 13c-2.67 0-8 1.34-8 4v3h10" />
      <path d="M16 13c-1.34 0-4 .67-4 2v5h12v-3c0-2.66-5.33-4-8-4z" />
    </svg>
  ),
};

const roleNav: Record<Exclude<Role, null>, NavItem[]> = {
  operator: [
    { href: "/operator", label: "Dashboard", description: "Deal pipeline", icon: navIcons.dashboard },
    { href: "/operator/payouts", label: "Payouts", description: "Process payouts", icon: navIcons.payouts },
    { href: "/operator/audit", label: "Audit Logs", description: "Timeline view", icon: navIcons.audit },
  ],
  buyer: [
    { href: "/buyer", label: "Dashboard", description: "Active deals", icon: navIcons.dashboard },
    { href: "/buyer#criteria", label: "Submit Criteria", description: "Define targets", icon: navIcons.criteria },
    { href: "/buyer#active-deals", label: "Active Deals", description: "Track progress", icon: navIcons.deals },
  ],
  referrer: [
    { href: "/referrer", label: "Dashboard", description: "Tier overview", icon: navIcons.dashboard },
    { href: "/referrer#links", label: "Generate Links", description: "Referral URLs", icon: navIcons.links },
    { href: "/referrer#referrals", label: "My Referrals", description: "Deal status", icon: navIcons.referrals },
  ],
};

const roleStyles: Record<Exclude<Role, null>, string> = {
  operator: "bg-red-500/20 text-red-300 border border-red-500/30",
  buyer: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  referrer: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const getEnvLabel = () => {
  const raw = process.env.NEXT_PUBLIC_APP_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "staging";
  const normalized = raw.toLowerCase();
  return normalized === "production" ? "PRODUCTION" : "STAGING";
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        setUserEmail(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUserEmail(data.user.email ?? null);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!mounted) return;
      setRole((profile?.role as Role) ?? null);
      setLoading(false);
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const envLabel = getEnvLabel();
  const envStyles =
    envLabel === "PRODUCTION"
      ? "bg-green-500/20 text-green-300 border border-green-500/30"
      : "bg-amber-500/20 text-amber-300 border border-amber-500/30";

  const navItems = role ? roleNav[role] : [];

  return (
    <div className="min-h-screen bg-quantum-950 text-quantum-50">
      <header className="sticky top-0 z-40 border-b border-quantum-800 bg-quantum-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-bold uppercase tracking-[0.3em] text-quantum-100">
              Surplus Bus
            </Link>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${envStyles}`}>
              {envLabel}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs text-quantum-300 md:block">
              <div className="uppercase tracking-widest text-quantum-500">Signed in as</div>
              <div className="font-semibold text-quantum-100">{userEmail || "Unknown user"}</div>
            </div>
            {role && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${roleStyles[role]}`}>
                {role}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full border border-quantum-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300 transition hover:border-cyan-500/60 hover:text-cyan-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <Sidebar items={navItems} activePath={pathname} />
        <main className="flex-1 space-y-8">
          {loading ? <p className="text-sm text-quantum-500">Loading portal...</p> : children}
        </main>
      </div>
    </div>
  );
}
