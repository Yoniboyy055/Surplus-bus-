import Link from "next/link";

export default function PilotPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-bold">Surplus Bus Pilot One-Pager</h1>
      <p className="text-quantum-300">A lightweight 4-week pilot structure for municipalities, agencies, and private acquisition teams.</p>

      <section className="rounded-xl border border-quantum-700 bg-quantum-900 p-6 space-y-4">
        <h2 className="text-xl font-semibold">Pilot Structure</h2>
        <ul className="list-disc pl-5 space-y-2 text-quantum-200">
          <li><strong>Week 1:</strong> Source alignment, regions, and scoring calibration.</li>
          <li><strong>Week 2:</strong> Live alerting + weekly dashboard reviews.</li>
          <li><strong>Week 3:</strong> ROI checkpoints (time saved + opportunities surfaced).</li>
          <li><strong>Week 4:</strong> Executive readout and rollout recommendation.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-quantum-700 bg-quantum-900 p-6 space-y-3">
        <h2 className="text-xl font-semibold">Success Metrics</h2>
        <ul className="list-disc pl-5 space-y-2 text-quantum-200">
          <li>Reduction in manual search time (target 60%+).</li>
          <li>Number and value of qualified opportunities identified.</li>
          <li>Signal quality and edge-case reliability confidence.</li>
        </ul>
      </section>

      <div className="flex gap-3">
        <Link href="/demo" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500">Open Demo</Link>
        <Link href="/landing#contact" className="px-4 py-2 rounded-lg border border-quantum-700 hover:border-cyan-500">Contact Team</Link>
      </div>
    </main>
  );
}
