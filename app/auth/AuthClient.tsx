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
    setMessage("Magic link sent. Check your inbox to continue.");
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-slate-300">Use your email to receive a magic link.</p>
      </div>

      {!supabaseReady && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Supabase is not configured. Add the env vars to enable magic link auth.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Email address
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-slate-500"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!supabaseReady}
          />
        </label>
        <button
          type="submit"
          disabled={!supabaseReady || status === "loading"}
          className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {(message || errorParam) && (
        <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          {message || `Sign-in failed: ${errorParam}`}
        </div>
      )}
    </section>
  );
}
