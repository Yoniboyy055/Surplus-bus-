export default function PricingPage() {
  return (
    <section className="max-w-4xl mx-auto py-16 space-y-8">
      <h1 className="text-4xl font-bold">Freemium Tiers</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-quantum-700 rounded-xl p-6 bg-quantum-900/40">
          <h2 className="text-2xl font-semibold">Free</h2>
          <ul className="mt-4 text-sm space-y-2 text-quantum-300">
            <li>Basic alerts</li><li>7-day trend history</li><li>2 active filters</li>
          </ul>
        </div>
        <div className="border border-cyan-500/40 rounded-xl p-6 bg-cyan-950/20">
          <h2 className="text-2xl font-semibold">Pro</h2>
          <ul className="mt-4 text-sm space-y-2 text-quantum-200">
            <li>Unlimited custom alerts</li><li>90-day analytics</li><li>Priority notification channels</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
