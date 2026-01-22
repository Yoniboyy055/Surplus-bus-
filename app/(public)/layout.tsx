import type { ReactNode } from "react";
import Link from "next/link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200">
          Surplus Bus <span className="text-blue-500">System</span>
        </div>
        <nav className="flex gap-6 text-xs font-medium uppercase tracking-wider text-slate-400">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/auth" className="hover:text-white transition">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <footer className="border-t border-slate-800 pt-6 text-center text-[10px] uppercase tracking-widest text-slate-500">
        &copy; 2026 Surplus Referral Platform. All rights reserved.
      </footer>
    </div>
  );
}

