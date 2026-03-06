import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center py-20 text-center space-y-10">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-quantum-50">
          Surplus Bus: <span className="text-cyan-500">alerts + analytics for public surplus intelligence</span>
        </h1>
        <p className="text-xl text-quantum-400">
          Surplus Bus is an information service. We surface opportunities early with targeted notifications and trend insights.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-quantum-950 focus:ring-cyan-500 bg-cyan-500 text-quantum-950 hover:bg-cyan-400 active:scale-95 px-8 py-4 text-lg"
        >
          Pay Now & Start
        </Link>
        <Link
          href="/landing"
          className="inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-quantum-950 focus:ring-cyan-500 bg-quantum-800 text-quantum-50 border border-quantum-700 hover:bg-quantum-700 active:scale-95 px-8 py-4 text-lg"
        >
          Pitch Landing Page
        </Link>
      </div>

      <div className="max-w-2xl text-sm text-quantum-400 border border-quantum-700 rounded-xl p-5 bg-quantum-900/40">
        We do not buy, sell, broker, negotiate, or execute transactions. Users act independently.
      </div>
    </section>
  );
}
