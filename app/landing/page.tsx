"use client";

import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/beta-signups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, use_case: "weekly_intelligence" }),
    });
    setSubmitted(true);
  };

  return (
    <section className="max-w-3xl mx-auto py-16 space-y-8">
      <h1 className="text-4xl font-bold">Get Canada&apos;s Weekly Opportunity Intelligence</h1>
      <p className="text-quantum-300">
        Built for serious operators: ranked public opportunities, contextual insights, and personalized signal—not noise.
      </p>
      <form onSubmit={submit} className="flex gap-3">
        <input
          className="flex-1 bg-quantum-900 border border-quantum-700 rounded px-4 py-3"
          type="email"
          required
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="bg-cyan-600 px-5 py-3 rounded font-semibold">Get Weekly Intelligence</button>
      </form>
      {submitted && <p className="text-green-400">You&apos;re in. We&apos;ll send your first weekly intelligence brief soon.</p>}
    </section>
  );
}
