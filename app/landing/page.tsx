"use client";


import Link from "next/link";
import { useState } from "react";
import { CheckCircle, BarChart3, Bell, Target } from "lucide-react";

const STATS = [
  { label: "Beta waitlist", value: "340+" },
  { label: "Opportunities indexed", value: "12k+" },
  { label: "Alert precision rate", value: "94%" },
];

const FEATURES = [
  {
    icon: <Bell className="text-cyan-400" size={28} />,
    title: "Targeted alert rules",
    desc: "Set up custom rules for category, region, and value. Get notified instantly when a match is found.",
  },
  {
    icon: <BarChart3 className="text-cyan-400" size={28} />,
    title: "Trend analytics",
    desc: "See opportunity trends, demand signals, and value estimates to inform your strategy.",
  },
  {
    icon: <Target className="text-cyan-400" size={28} />,
    title: "Ranked intelligence",
    desc: "Opportunities are scored and ranked so you focus on what matters most.",
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/beta-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setError(data.error || "Could not join beta. Try again.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-quantum-950 text-quantum-50 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <span className="font-bold text-xl tracking-tight text-cyan-400">SurplusBus</span>
        </div>
        <div className="flex gap-6 items-center text-quantum-300 text-sm">
          <Link href="/product" className="hover:text-cyan-400">Product</Link>
          <Link href="/pricing" className="hover:text-cyan-400">Pricing</Link>
          <Link href="/faq" className="hover:text-cyan-400">FAQ</Link>
          <Link href="/auth" className="ml-6 px-4 py-2 rounded bg-cyan-500 text-quantum-950 font-semibold hover:bg-cyan-400 transition">Sign in</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 py-16 px-4 bg-quantum-950">
        <div className="max-w-3xl w-full text-center space-y-6">
          <span className="inline-block px-3 py-1 rounded-full border border-cyan-500 bg-cyan-500/10 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">Public Beta — Limited Access</span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-quantum-50">
            Public-sector opportunities, <span className="text-cyan-400">before your competitors</span>
          </h1>
          <p className="text-quantum-300 text-lg max-w-2xl mx-auto">
            Get instant alerts and analytics for public surplus, tenders, and auctions. Set up custom rules and see trends before anyone else.
          </p>
          {/* Email form */}
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <CheckCircle className="text-green-400 mb-2" size={32} />
              <span className="text-green-400 font-medium mb-2">
                You&apos;re on the list! We&apos;ll send your access details soon. In the meantime, explore what Surplus Bus can do.
              </span>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Link href="/pricing" className="px-4 py-2 rounded bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition text-center">See pricing</Link>
                <Link href="/product" className="px-4 py-2 rounded bg-quantum-900 text-cyan-400 font-semibold border border-cyan-700 hover:bg-cyan-950 transition text-center">Learn more</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto mt-4 w-full">
              <input
                type="email"
                required
                className="flex-1 px-4 py-3 rounded border border-quantum-700 bg-quantum-900 text-quantum-50 placeholder:text-quantum-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Work email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === "loading"}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded bg-cyan-500 text-quantum-950 font-semibold hover:bg-cyan-400 transition disabled:opacity-60"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Joining…" : "Join Beta"}
              </button>
            </form>
          )}
          {status === "error" && error && (
            <div className="text-red-400 text-sm mt-2">{error}</div>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="w-full bg-quantum-900 border-y border-quantum-700 py-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-2 text-cyan-300 font-semibold text-base">
              <span>{stat.value}</span>
              <span className="text-quantum-400 font-normal text-xs">{stat.label}</span>
              {i < STATS.length - 1 && <span className="hidden sm:inline-block mx-4 h-5 w-px bg-quantum-700" />}
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl border border-cyan-500/20 bg-quantum-900 p-7 flex flex-col items-center text-center gap-4 shadow-sm">
              <div>{f.icon}</div>
              <h3 className="font-semibold text-lg text-cyan-300">{f.title}</h3>
              <p className="text-quantum-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
