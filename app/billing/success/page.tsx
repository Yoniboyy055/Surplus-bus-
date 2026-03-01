import Link from "next/link";

export default function BillingSuccessPage({ searchParams }: { searchParams?: { plan?: string } }) {
  const plan = searchParams?.plan || "selected";

  return (
    <main className="max-w-2xl mx-auto py-16 space-y-6 text-center">
      <h1 className="text-4xl font-bold text-green-400">Payment received ✅</h1>
      <p className="text-quantum-300">
        Your <span className="text-cyan-300 font-semibold">{plan}</span> plan is ready. Sign in to activate your workspace and start receiving ranked opportunities.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/auth?next=/dashboard" className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-quantum-950 font-semibold">
          Activate account now
        </Link>
        <Link href="/demo" className="px-5 py-3 rounded-lg border border-quantum-700 hover:border-cyan-500 text-quantum-100">
          View demo first
        </Link>
      </div>
    </main>
  );
}
