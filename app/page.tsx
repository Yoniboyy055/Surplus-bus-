import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center py-20 text-center space-y-10">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          High-Level <span className="text-blue-500">Surplus</span> Management
        </h1>
        <p className="text-xl text-slate-400">
          The premier platform for sourcing, matching, and acquiring government and public surplus property with institutional-grade intelligence.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/auth"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition shadow-lg shadow-blue-500/20"
        >
          Get Started
        </Link>
        <Link
          href="/docs/02_BLUEPRINT.md"
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
        >
          View Blueprint
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-20">
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50 text-left space-y-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Qualified Sourcing</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Our operator-led qualification process ensures only the most viable surplus deals reach our buyers.
          </p>
        </div>
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Intelligent Matching</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Advanced algorithms match buyer criteria with available properties in real-time for maximum efficiency.
          </p>
        </div>
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50 text-left space-y-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Transparent Payouts</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Automated referral tracking and success-fee based payouts ensure all stakeholders are rewarded fairly.
          </p>
        </div>
      </div>
    </section>
  );
}
