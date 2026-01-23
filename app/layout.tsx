import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surplus Referral Platform",
  description: "High-level surplus property sourcing and advisory platform.",
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-quantum-950 text-quantum-50 antialiased">
         <AppShell user={user} profile={profile}>
            {children}
         </AppShell>
      </body>
    </html>
  );
}
