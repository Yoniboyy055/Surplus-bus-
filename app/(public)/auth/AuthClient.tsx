"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function AuthClient() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const supabaseReady = isSupabaseConfigured;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (!supabaseReady) {
      setStatus("error");
      setMessage("Supabase is not configured yet. Add env vars to enable auth.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase client is unavailable.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Magic link sent. Check your inbox (and spam folder) for a secure login link.");
  };

  return (
    <section className="space-y-4">
      {!supabaseReady && (
        <div className="rounded-lg border border-accent-warning/40 bg-accent-warning/10 p-4 text-sm text-accent-warning">
          ⚠ Supabase is not configured. Add the env vars to enable magic link auth.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-quantum-200 mb-3">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="your.email@institution.com"
            className="w-full bg-quantum-900 border border-quantum-700 rounded-md px-4 py-3 text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!supabaseReady || status === "loading"}
          />
        </div>

        <button
          type="submit"
          disabled={!supabaseReady || status === "loading"}
          className="w-full inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-quantum-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 text-quantum-950 hover:bg-cyan-400 active:scale-95 px-4 py-3 text-base"
        >
          {status === "loading" ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              Send Secure Link
              <span className="ml-3">→</span>
            </>
          )}
        </button>
      </form>

      {message && (
        <div className={`rounded-lg border p-4 text-sm ${
          status === "sent"
            ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
            : "border-accent-danger/40 bg-accent-danger/10 text-accent-danger"
        }`}>
          {status === "sent" ? "✓" : "✕"} {message}
        </div>
      )}

      {errorParam && (
        <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-4 text-sm text-accent-danger">
          ✕ Sign-in failed: {errorParam}
        </div>
      )}
    </section>
  );
}
