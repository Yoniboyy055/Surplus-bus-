import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-quantum-800 bg-quantum-900/60 p-8 text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-quantum-500">403</p>
        <h1 className="text-3xl font-bold text-quantum-50">Access Forbidden</h1>
        <p className="text-sm text-quantum-300">
          This area is restricted to a different role. Return to login or switch accounts.
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2 text-sm font-semibold text-quantum-950 transition hover:bg-cyan-400"
        >
          Return to Login
        </Link>
      </div>
    </main>
  );
}
