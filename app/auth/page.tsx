
import { Suspense } from "react";
import AuthClient from "./AuthClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-quantum-950">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">
        <div className="mb-8">
          <span className="block text-center font-bold text-2xl text-cyan-400 tracking-tight">SurplusBus</span>
        </div>
        <div className="w-full bg-quantum-900 border border-quantum-700 rounded-xl p-10 flex flex-col items-center">
          <h1 className="text-xl font-medium text-quantum-50 mb-2">Sign in to Surplus Bus</h1>
          <p className="text-quantum-400 text-sm mb-6 text-center">Beta access is invitation-only. Sign in with your invited account.</p>
          <Suspense fallback={<p className="text-sm text-quantum-300">Loading...</p>}>
            <AuthClient />
          </Suspense>
          <div className="w-full mt-6">
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 text-cyan-300 text-xs text-center">
              Access is for invited beta accounts only. Join waitlist at <Link href="/landing" className="underline hover:text-cyan-400">/landing</Link>.
            </div>
          </div>
        </div>
        <div className="mt-6 text-center text-quantum-500 text-xs w-full">
          <Link href="/legal/terms" className="hover:text-cyan-400">Terms</Link> &middot; <Link href="/legal/privacy" className="hover:text-cyan-400">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
