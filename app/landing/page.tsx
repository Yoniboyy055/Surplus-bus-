"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/beta-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, use_case: `pitch_contact:${company || "unspecified"}` }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Unable to submit request. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("Thanks — we’ll reach out with pilot options and a live walkthrough.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please retry in a moment.");
    }
  };

  return (
    <main className="space-y-12 py-10">
      <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-600/20 via-quantum-900 to-quantum-950 p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <p className="text-cyan-300 text-sm font-semibold uppercase tracking-wider">Pitch-ready intelligence platform</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-quantum-50">Find public opportunities in minutes, not hours.</h1>
            <p className="text-quantum-300">Surplus Bus turns fragmented surplus and tender sources into ranked opportunities, live alerts, and pilot-ready insights.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-quantum-950 font-semibold transition">
                Pay now & start
              </Link>
              <Link href="/demo" className="px-5 py-3 rounded-lg border border-cyan-400/50 hover:border-cyan-300 text-cyan-100 transition">
                Launch live demo
              </Link>
              <a href="#contact" className="px-5 py-3 rounded-lg border border-quantum-600 hover:border-cyan-400 text-quantum-100 transition">
                Schedule a call
              </a>
            </div>
          </div>
          <div className="rounded-xl border border-quantum-700 bg-quantum-950/80 p-4">
            <p className="text-xs uppercase tracking-wide text-quantum-500 mb-3">Demo preview GIF placeholder</p>
            <div className="aspect-video rounded-lg border border-dashed border-cyan-500/40 bg-quantum-900 flex items-center justify-center text-center px-6">
              <p className="text-quantum-400 text-sm">Drop in your product GIF/video here for outreach decks and cold email embeds.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "1. Aggregate", desc: "Agents continuously scan public surplus and procurement feeds across regions." },
          { title: "2. Score", desc: "Signals are ranked by fit, value, and confidence so teams focus on what matters." },
          { title: "3. Alert", desc: "Users receive targeted alerts and dashboard summaries with edge-case transparency." },
        ].map((step) => (
          <div key={step.title} className="rounded-xl border border-quantum-700 bg-quantum-900 p-5 hover:border-cyan-500/50 transition">
            <h2 className="font-semibold text-quantum-100">{step.title}</h2>
            <p className="text-sm text-quantum-400 mt-2">{step.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-quantum-700 bg-quantum-900 p-6 md:p-8">
        <h2 className="text-xl font-bold">ROI teaser</h2>
        <p className="text-quantum-300 mt-2">Traditional search: 20–40 hours/week. Surplus Bus demo workflow: first qualified shortlist in under 15 minutes.</p>
        <div className="grid gap-4 md:grid-cols-3 mt-5">
          <Metric label="Time to shortlist" value="&lt; 15 min" />
          <Metric label="Manual hours reduced" value="60–80%" />
          <Metric label="Pipeline surfaced" value="$26M+ demo value" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Testimonials (placeholder)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Quote
            text="We replaced spreadsheet hunting with ranked opportunities our team could action the same day."
            by="Pilot lead, Regional acquisition team"
          />
          <Quote
            text="The edge-case reporting gave us confidence to test this in a controlled pilot quickly."
            by="Director, Public asset strategy"
          />
        </div>
      </section>

      <section id="contact" className="rounded-xl border border-quantum-700 bg-quantum-900 p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <h2 className="text-xl font-bold">Book a pilot walkthrough</h2>
            <p className="text-quantum-400 mt-1">Share your contact info and we’ll tailor a live run-through for your region.</p>
          </div>
          <Link href="/pilot" className="text-cyan-300 hover:text-cyan-200 text-sm">
            View pilot one-pager →
          </Link>
        </div>

        <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
          <input
            className="bg-quantum-950 border border-quantum-700 rounded px-4 py-3"
            placeholder="Organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="bg-quantum-950 border border-quantum-700 rounded px-4 py-3"
            type="email"
            required
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="bg-cyan-600 hover:bg-cyan-500 px-5 py-3 rounded font-semibold text-quantum-50 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Sending…" : "Request pilot call"}
          </button>
        </form>
        {status === "success" ? <p className="text-green-400 text-sm">{message}</p> : null}
        {status === "error" ? <p className="text-red-400 text-sm">{message}</p> : null}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-quantum-700 bg-quantum-950 p-4">
      <p className="text-xs text-quantum-500">{label}</p>
      <p className="text-lg font-semibold text-cyan-300 mt-1">{value}</p>
    </div>
  );
}

function Quote({ text, by }: { text: string; by: string }) {
  return (
    <figure className="rounded-lg border border-quantum-700 bg-quantum-900 p-5">
      <blockquote className="text-quantum-200">“{text}”</blockquote>
      <figcaption className="text-sm text-quantum-500 mt-3">— {by}</figcaption>
    </figure>
  );
}
