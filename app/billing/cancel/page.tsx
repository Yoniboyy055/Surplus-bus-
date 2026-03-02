import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 space-y-6 text-center">
      <h1 className="text-4xl font-bold">Checkout canceled</h1>
      <p className="text-quantum-300">No charge was made. You can restart checkout at any time.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/pricing" className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-quantum-950 font-semibold">
          Restart checkout
        </Link>
        <Link href="/landing" className="px-5 py-3 rounded-lg border border-quantum-700 hover:border-cyan-500 text-quantum-100">
          Speak with sales
        </Link>
      </div>
    </main>
  );
}
