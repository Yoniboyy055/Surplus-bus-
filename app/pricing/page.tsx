import Link from "next/link";

export default function PricingPage() {
  return (
    <section className="max-w-4xl mx-auto py-16 space-y-8">
      <h1 className="text-4xl font-bold">Freemium Tiers</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Tier */}
        <div className="border border-quantum-700 rounded-xl p-6 bg-quantum-900/40 flex flex-col">
          <h2 className="text-2xl font-semibold">Free</h2>
          <p className="mt-2 text-quantum-400 text-sm">Get started with core surplus intelligence.</p>
          <ul className="mt-4 text-sm space-y-2 text-quantum-300 flex-1">
            <li>Basic alerts</li>
            <li>7-day trend history</li>
            <li>2 active filters</li>
          </ul>
          <Link
            href="/auth"
            className="mt-6 block w-full text-center bg-quantum-700 hover:bg-quantum-600 text-quantum-50 font-semibold rounded-full px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Get Started — Free
          </Link>
        </div>

        {/* Pro Tier */}
        <div className="border border-cyan-500/40 rounded-xl p-6 bg-cyan-950/20 flex flex-col">
          <h2 className="text-2xl font-semibold">Pro</h2>
          <p className="mt-2 text-quantum-400 text-sm">For operators who need the full picture.</p>
          <ul className="mt-4 text-sm space-y-2 text-quantum-200 flex-1">
            <li>Unlimited custom alerts</li>
            <li>90-day analytics</li>
            <li>Priority notification channels</li>
          </ul>
          <Link
            href="/landing"
            className="mt-6 block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-quantum-950 font-semibold rounded-full px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            Join Beta — Pro
          </Link>
        </div>
      </div>
    </section>
  );
}
