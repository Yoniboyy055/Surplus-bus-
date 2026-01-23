import { Suspense } from "react";
import AuthClient from "./AuthClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-quantum-950 via-quantum-900 to-quantum-950 flex items-center justify-center p-lg">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-3xl">
          <h1 className="text-4xl font-bold text-quantum-50 mb-md">
            Access Your <span className="text-cyan-500">Quantum Ledger</span>
          </h1>
          <p className="text-quantum-400">
            Enter your email to receive a secure, single-use login link.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-quantum-800 border border-quantum-700 rounded-lg p-2xl shadow-card mb-2xl">
          <Suspense fallback={<p className="text-sm text-quantum-300">Loading...</p>}>
            <AuthClient />
          </Suspense>
        </div>

        {/* Footer */}
        <div className="text-center text-quantum-500 text-sm">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/" className="text-cyan-500 hover:text-cyan-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/" className="text-cyan-500 hover:text-cyan-400">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
