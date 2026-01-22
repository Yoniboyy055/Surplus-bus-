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

  const handleGoogleSignIn = async () => {
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

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

      <button
        onClick={handleGoogleSignIn}
        disabled={!supabaseReady || status === "loading"}
        className="w-full inline-flex items-center justify-center gap-3 font-semibold rounded-full transition-all duration-200 bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 px-4 py-3 text-base"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-800"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider">Or with email</span>
        <div className="flex-grow border-t border-slate-800"></div>
      </div>

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
