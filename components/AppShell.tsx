"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  Menu,
  X,
  Search,
  Star,
  Mail,
  Settings,
  Wrench,
  History,
  FileText,
  Database,
} from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { BrandMark } from "./BrandMark";
import { DataStatusPill } from "./DataStatusPill";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  role: string;
};

interface AppShellProps {
  children: React.ReactNode;
  user: User | null;
  profile: Profile | null;
}

const APP_NAV = [
  { name: "Search", href: "/search", icon: Search },
  { name: "Watchlist", href: "/watchlist", icon: Star },
  { name: "Digest", href: "/digest", icon: Mail },
  { name: "Price history", href: "/price-history", icon: History },
  { name: "Tenders", href: "/tenders", icon: FileText },
  { name: "Sources", href: "/sources", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children, user, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/";
  };

  const isOperator = profile?.role === "operator";
  const navItems = [...APP_NAV];
  if (isOperator) {
    navItems.push({ name: "Ops", href: "/ops", icon: Wrench });
  }

  const isPublic = !user;
  const isMarketing =
    pathname === "/" ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/product") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/auth");

  if (isPublic && (isMarketing || pathname.startsWith("/demo"))) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--sb-bg)] text-[var(--sb-ink)]">
        <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-[18px] md:px-10">
          <BrandMark href="/" size="nav" />
          <nav className="flex items-center gap-4 md:gap-7 text-sm text-[var(--sb-ink-soft)]">
            <Link href="/product" className="hidden sm:inline hover:text-[var(--sb-ink)]">
              How it works
            </Link>
            <Link href="/pricing" className="hidden sm:inline hover:text-[var(--sb-ink)]">
              Pricing
            </Link>
            <Link href="/sources" className="hidden sm:inline hover:text-[var(--sb-ink)]">
              Sources
            </Link>
            <Link href="/search" className="hidden md:inline hover:text-[var(--sb-ink)]">
              Search
            </Link>
            <Link href="/auth" className="btn btn-ghost !py-2 !px-4 text-sm no-underline text-[var(--sb-ink)]">
              Sign in
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-[1100px] border-t border-[var(--sb-line)] px-5 py-6 md:px-10 text-xs text-[var(--sb-muted)] space-y-2">
          <p>
            Contains information licensed under the Open Government Licence – Canada. Guidance only —
            not an appraisal. Surplus Bus by YK+ Systems.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/legal/terms" className="hover:text-[var(--sb-ink)]">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--sb-ink)]">
              Privacy
            </Link>
            <Link href="/legal/anti-spam" className="hover:text-[var(--sb-ink)]">
              Anti-Spam
            </Link>
            <Link href="/faq" className="hover:text-[var(--sb-ink)]">
              FAQ
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  if (isPublic) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--sb-bg)] text-[var(--sb-ink)]">
        <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-[18px] md:px-10 border-b border-[var(--sb-line)]">
          <BrandMark href="/" size="nav" />
          <nav className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-[var(--sb-ink-soft)]">
            <Link href="/search" className="hover:text-[var(--sb-ink)]">
              Search
            </Link>
            <Link href="/watchlist" className="hover:text-[var(--sb-ink)]">
              Watchlist
            </Link>
            <Link href="/price-history" className="hover:text-[var(--sb-ink)]">
              Prices
            </Link>
            <Link href="/tenders" className="hover:text-[var(--sb-ink)]">
              Tenders
            </Link>
            <Link href="/pricing" className="hover:text-[var(--sb-ink)]">
              Pricing
            </Link>
            <Link href="/auth" className="btn btn-ghost !py-2 !px-4 text-sm no-underline text-[var(--sb-ink)]">
              Sign in
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-[1100px] border-t border-[var(--sb-line)] px-5 py-6 md:px-10 text-xs text-[var(--sb-muted)]">
          Contains information licensed under the Open Government Licence – Canada. Guidance only — not
          an appraisal. Surplus Bus by YK+ Systems.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--sb-bg)] text-[var(--sb-ink)]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-[var(--sb-bg-overlay)] z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[72px] bg-[var(--sb-bg-deep)] border-r border-[var(--sb-line)]
          flex flex-col items-center py-5 gap-3 transform transition-transform duration-200
          md:translate-x-0 md:static md:min-h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <BrandMark href="/search" size="side" showWordmark={false} />
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-[var(--sb-muted)]"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
        <nav className="flex flex-col items-center gap-2 mt-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                aria-label={item.name}
                onClick={() => setSidebarOpen(false)}
                className={`w-11 h-11 rounded-[14px] grid place-items-center transition-colors ${
                  isActive
                    ? "bg-[var(--sb-surface)] text-[var(--sb-action)] shadow-soft"
                    : "text-[var(--sb-ink-soft)] hover:bg-[var(--sb-surface)]/60"
                }`}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-[14px] grid place-items-center text-[var(--sb-ink-soft)] hover:text-[var(--sb-danger)]"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-[var(--sb-bg)]/90 backdrop-blur-sm border-b border-[var(--sb-line)] px-4 md:px-9 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-[var(--sb-ink-soft)]"
                aria-label="Open sidebar"
              >
                <Menu size={24} />
              </button>
              <DataStatusPill />
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-[var(--sb-ink)]">{user.email}</span>
                {profile?.role && (
                  <span className="text-xs text-[var(--sb-muted)] capitalize">{profile.role}</span>
                )}
              </div>
              {profile?.role && (
                <Badge variant="info" size="sm" className="capitalize !py-1 !px-2">
                  {profile.role}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="!p-2" title="Sign out">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-9">{children}</main>
      </div>
    </div>
  );
}
