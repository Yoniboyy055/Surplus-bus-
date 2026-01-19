import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Surplus Referral Platform",
  description: "Standalone MVP scaffold for the Surplus Referral Platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
          <header className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Surplus Referral Platform
          </header>
          <main className="flex flex-1 flex-col gap-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
