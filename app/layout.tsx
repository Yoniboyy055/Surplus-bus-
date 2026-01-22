import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surplus Referral Platform",
  description: "High-level surplus property sourcing and advisory platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-quantum-950 text-quantum-50 antialiased">
        {children}
      </body>
    </html>
  );
}
