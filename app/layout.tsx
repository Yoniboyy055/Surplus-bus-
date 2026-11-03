import type { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Surplus Bus",
    template: "%s — Surplus Bus",
  },
  description:
    "Know the sold range before you bid. Sold-price guidance from Canadian government surplus open data.",
  applicationName: "Surplus Bus",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#F8F0E4",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  let user = null;
  let profile = null;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();
      profile = profileData;
    }
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-ink)] antialiased font-sans">
        <AppShell user={user} profile={profile}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
