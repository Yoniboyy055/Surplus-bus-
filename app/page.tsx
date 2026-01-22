import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-12 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Private surplus property access — governed, verified, operator-led.
          </h1>
          <p className="text-lg text-quantum-300">
            Exclusive sourcing built for serious buyers who want vetted opportunities and an operator-led audit trail.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/auth"
            className="rounded-full bg-cyan-500 px-8 py-3 text-sm font-semibold text-quantum-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          >
            Continue with Email
          </Link>
          <div className="rounded-full border border-quantum-700 bg-quantum-900/60 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300">
            Operator-verified · Audit-logged · No spam
          </div>
        </div>

        <div className="mt-8 w-full">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-quantum-800 bg-quantum-900/60 p-6 text-left">
              <p className="text-xs uppercase tracking-widest text-quantum-500">Step 1</p>
              <h3 className="mt-3 text-xl font-bold text-quantum-50">Submit criteria</h3>
              <p className="mt-2 text-sm text-quantum-400">
                Share the asset type, price ceiling, and geographic focus you want us to source.
              </p>
            </div>
            <div className="rounded-2xl border border-quantum-800 bg-quantum-900/60 p-6 text-left">
              <p className="text-xs uppercase tracking-widest text-quantum-500">Step 2</p>
              <h3 className="mt-3 text-xl font-bold text-quantum-50">Operator qualifies</h3>
              <p className="mt-2 text-sm text-quantum-400">
                Our operator team screens every submission and activates exclusive access windows.
              </p>
            </div>
            <div className="rounded-2xl border border-quantum-800 bg-quantum-900/60 p-6 text-left">
              <p className="text-xs uppercase tracking-widest text-quantum-500">Step 3</p>
              <h3 className="mt-3 text-xl font-bold text-quantum-50">Success fee on close</h3>
              <p className="mt-2 text-sm text-quantum-400">
                Commit to bid, close the opportunity, and pay the 5% success fee only on completion.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
