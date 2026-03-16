"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  Menu,
  X,
  Rss,
  Target,
  Bell,
  Settings,
  Wrench,
  Home,
  Inbox,
  Bookmark,
  Newspaper,
} from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
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

const MAIN_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: <Home size={18} /> },
  { name: "Feed", href: "/feed", icon: <Rss size={18} /> },
  { name: "Opportunities", href: "/opportunities", icon: <Target size={18} /> },
  { name: "Alerts", href: "/alerts", icon: <Bell size={18} /> },
  { name: "Inbox", href: "/inbox", icon: <Inbox size={18} /> },
  { name: "Saved", href: "/saved", icon: <Bookmark size={18} /> },
  { name: "News", href: "/news", icon: <Newspaper size={18} /> },
];

export function AppShell({ children, user, profile }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/";
  };

  const isOperator = profile?.role === "operator";
  const navItems = [...MAIN_NAV];
  if (isOperator) {
    navItems.splice(navItems.length - 1, 0, { name: "Ops", href: "/ops", icon: <Wrench size={18} /> });
  }

  const isPublic = !user;

  if (isPublic) {
    return (
      <div className="min-h-screen flex flex-col bg-quantum-950 text-quantum-50">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
          <header className="flex items-center justify-between border-b border-quantum-700 pb-6">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-quantum-200">
              <span>
                Surplus Bus <span className="text-cyan-500">System</span>
              </span>
            </div>
            <nav className="flex gap-6 text-xs font-medium uppercase tracking-wider text-quantum-400">
              <Link href="/" className="hover:text-quantum-50 transition">
                Home
              </Link>
              <Link href="/landing" className="hover:text-quantum-50 transition">
                Beta
              </Link>
              <Link href="/pricing" className="hover:text-quantum-50 transition">
                Pricing
              </Link>
              <Link href="/faq" className="hover:text-quantum-50 transition">
                FAQ
              </Link>
              <Link href="/auth" className="hover:text-quantum-50 transition">
                Login
              </Link>
            </nav>
          </header>
          <main className="flex flex-1 flex-col gap-6">{children}</main>
          <footer className="border-t border-quantum-700 pt-6 flex flex-col items-center gap-2 text-[10px] uppercase tracking-widest text-quantum-500">
            <div className="flex gap-4">
              <Link href="/legal/terms" className="hover:text-quantum-300 transition">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-quantum-300 transition">Privacy</Link>
              <Link href="/legal/anti-spam" className="hover:text-quantum-300 transition">Anti-Spam</Link>
              <Link href="/faq" className="hover:text-quantum-300 transition">FAQ</Link>
            </div>
            <span>&copy; 2026 Surplus Bus. Information service only. Not a broker.</span>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-quantum-950 text-quantum-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-quantum-900 border-r border-quantum-700 transform transition-transform duration-200 ease-in-out
          md:translate-x-0 md:static md:h-auto md:min-h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-quantum-700 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-quantum-200">
              <span>Surplus Bus <span className="text-cyan-500">Pro</span></span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-quantum-400 hover:text-quantum-50"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "text-quantum-400 hover:text-quantum-50 hover:bg-quantum-800"
                    }
                  `}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-quantum-700 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-quantum-400 hover:text-red-400 hover:bg-quantum-800"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
              <span className="sr-only">Sign Out</span>
              Logout
            </button>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-wider text-quantum-600">Environment</span>
              <Badge variant="default" size="sm" className="text-[10px] py-0 px-2 h-5 bg-quantum-800 text-quantum-300 border border-quantum-700">
                PRODUCTION
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-200">
        <header className="sticky top-0 z-30 bg-quantum-950/80 backdrop-blur-sm border-b border-quantum-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-quantum-400 hover:text-quantum-50"
                title="Open sidebar navigation"
              >
                <Menu size={24} />
              </button>
              <DataStatusPill />
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-quantum-200">{user.email}</span>
                {profile?.role && (
                  <span className="text-xs text-quantum-500 capitalize">{profile.role}</span>
                )}
              </div>

              {profile?.role && (
                <Badge variant="info" size="sm" className="capitalize">
                  {profile.role}
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="!p-2 text-quantum-400 hover:text-red-400"
                title="Sign Out"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
