"use client";

import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, use_case: "weekly_intelligence" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(
          data.error === "Email service not configured"
            ? "Email service not configured. Please try again later."
            : data.error ?? "Something went wrong. Please try again."
        );
        return;
      }

      setStatus("success");
      setMessage("You\u2019re in! Check your inbox for a confirmation email.");
    } catch {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <section className="max-w-3xl mx-auto py-16 space-y-8">
      <h1 className="text-4xl font-bold">Get Canada&apos;s Weekly Opportunity Intelligence</h1>
      <p className="text-quantum-300">
        Built for serious operators: ranked public opportunities, contextual insights, and personalized signal—not noise.
      </p>
      <form onSubmit={submit} className="flex gap-3">
        <input
          className="flex-1 bg-quantum-900 border border-quantum-700 rounded px-4 py-3 text-quantum-50 placeholder:text-quantum-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          type="email"
          required
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="bg-cyan-600 hover:bg-cyan-500 px-5 py-3 rounded font-semibold text-quantum-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Sending\u2026" : "Get Weekly Intelligence"}
        </button>
      </form>
      {status === "success" && (
        <p className="text-green-400">{message}</p>
      )}
      {status === "error" && (
        <p className="text-red-400">{message}</p>
      )}
    </section>
  );
}
