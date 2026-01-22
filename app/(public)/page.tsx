import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-24 text-center space-y-8">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-quantum-50">
            Private surplus property access —{" "}
            <span className="text-cyan-500">governed, verified, operator-led.</span>
          </h1>
          <p className="text-lg md:text-xl text-quantum-400 max-w-2xl mx-auto">
            Connect with exclusive surplus property opportunities through our operator-verified platform. 
            No spam, no noise — just qualified deals.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-quantum-950 rounded-full font-bold text-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
          >
            Continue with Email
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Compliance Strip */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm text-quantum-500">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Operator-verified
          </span>
          <span className="text-quantum-700">·</span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Audit-logged
          </span>
          <span className="text-quantum-700">·</span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No spam
          </span>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 border-t border-quantum-800">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-quantum-50 mb-12">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative p-8 rounded-2xl border border-quantum-700 bg-quantum-800/50 text-center space-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-quantum-950 font-bold text-sm">
              1
            </div>
            <div className="w-16 h-16 mx-auto bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-quantum-50">Submit Criteria</h3>
            <p className="text-quantum-400 text-sm leading-relaxed">
              Tell us what you&apos;re looking for. Property type, budget, location preferences — we&apos;ll match you with the right opportunities.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative p-8 rounded-2xl border border-quantum-700 bg-quantum-800/50 text-center space-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-quantum-950 font-bold text-sm">
              2
            </div>
            <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-quantum-50">Operator Qualifies</h3>
            <p className="text-quantum-400 text-sm leading-relaxed">
              Our operators verify and qualify each deal. Only legitimate, actionable opportunities make it to your dashboard.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative p-8 rounded-2xl border border-quantum-700 bg-quantum-800/50 text-center space-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-quantum-950 font-bold text-sm">
              3
            </div>
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-quantum-50">Success Fee on Close</h3>
            <p className="text-quantum-400 text-sm leading-relaxed">
              No upfront costs. You only pay a 5% success fee when your deal closes. Transparent, fair, and aligned with your success.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
