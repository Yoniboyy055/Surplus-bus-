"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { demoAlertRules, demoOpportunities, demoRuns, demoTrends } from "@/lib/demo/mockData";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const categoryColors: Record<string, string> = {
  land: "#22d3ee",
  industrial: "#34d399",
  commercial: "#f59e0b",
  equipment: "#a78bfa",
  mixed_use: "#fb7185",
};

export function DemoDashboardClient() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [trackedOpportunities, setTrackedOpportunities] = useState(120);
  const [minutesSavedPerOpportunity, setMinutesSavedPerOpportunity] = useState(35);
  const [animatedPipeline, setAnimatedPipeline] = useState(0);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  const hotOpportunities = demoOpportunities.filter((op) => op.status === "hot");
  const estimatedPipeline = demoOpportunities.reduce((sum, op) => sum + op.estimatedValue, 0);
  const failedRuns = demoRuns.filter((run) => run.status === "failure").length;
  const largestImport = Math.max(...demoRuns.map((run) => run.itemsFound));

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const op of demoOpportunities) {
      byCategory.set(op.category, (byCategory.get(op.category) ?? 0) + 1);
    }
    return Array.from(byCategory.entries()).map(([category, count]) => ({
      category,
      count,
      pct: (count / demoOpportunities.length) * 100,
    }));
  }, []);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 45;
    const step = () => {
      frame += 1;
      const next = Math.round((estimatedPipeline * frame) / totalFrames);
      setAnimatedPipeline(next);
      if (frame < totalFrames) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [estimatedPipeline]);



  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const reveal = () => setShowDeferredSections(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as Window & { requestIdleCallback: (cb: IdleRequestCallback) => number }).requestIdleCallback(() => reveal());
    } else {
      timeoutId = setTimeout(reveal, 250);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof window !== "undefined" && idleId && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };
  }, []);


  const hoursSavedMonthly = Math.round((trackedOpportunities * minutesSavedPerOpportunity) / 60);
  const roiPipelineEstimate = Math.round((trackedOpportunities / demoOpportunities.length) * estimatedPipeline);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-quantum-50">Surplus Bus Demo Mode</h1>
          <p className="text-quantum-400 mt-2 max-w-3xl">
            Public sandbox with seeded opportunities, alert rules, trend data, and agent run history — fully interactive and pitch-ready.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/landing" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition text-white font-medium">
            View pitch page
          </Link>
          <button onClick={() => setFeedbackOpen(true)} className="px-4 py-2 rounded-lg border border-quantum-700 hover:border-cyan-500 hover:bg-quantum-900 transition text-quantum-100">
            Leave feedback
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total opportunities" value={String(demoOpportunities.length)} />
        <StatCard label="Hot opportunities" value={String(hotOpportunities.length)} highlight />
        <StatCard label="Estimated pipeline" value={currency.format(animatedPipeline)} />
        <StatCard label="Failed runs (24h)" value={String(failedRuns)} warning={failedRuns > 0} />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
          <h2 className="text-sm font-semibold text-quantum-100 mb-4">Opportunity trend (weekly)</h2>
          <div className="h-52 flex items-end justify-between gap-2">
            {demoTrends.map((point) => {
              const height = Math.max(10, Math.round((point.opportunities / 30) * 180));
              return (
                <div key={point.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-quantum-800 rounded-t-md overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-300 transition-all duration-500 group-hover:from-cyan-500 group-hover:to-cyan-200"
                      style={{ height }}
                    />
                  </div>
                  <span className="text-xs text-quantum-400">{point.day}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-quantum-500 mt-3">Trend includes edge-day volatility to show realistic signal swings.</p>
        </div>

        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
          <h2 className="text-sm font-semibold text-quantum-100 mb-4">Category mix</h2>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-quantum-200 uppercase">{cat.category.replace("_", " ")}</span>
                  <span className="text-quantum-500">{cat.count} ({cat.pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-quantum-800 overflow-hidden">
                  <div className="h-full" style={{ width: `${cat.pct}%`, background: categoryColors[cat.category] ?? "#22d3ee" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-quantum-100">ROI & time-saved calculator</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300">Demo defaults loaded</span>
          </div>
          <div className="space-y-4">
            <label className="block text-sm text-quantum-300">
              Opportunities tracked monthly: <span className="text-cyan-300 font-medium">{trackedOpportunities}</span>
              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={trackedOpportunities}
                onChange={(e) => setTrackedOpportunities(Number(e.target.value))}
                className="w-full mt-2"
              />
            </label>
            <label className="block text-sm text-quantum-300">
              Minutes saved per opportunity: <span className="text-cyan-300 font-medium">{minutesSavedPerOpportunity}</span>
              <input
                type="range"
                min={5}
                max={75}
                step={5}
                value={minutesSavedPerOpportunity}
                onChange={(e) => setMinutesSavedPerOpportunity(Number(e.target.value))}
                className="w-full mt-2"
              />
            </label>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Hours saved / month" value={`${hoursSavedMonthly}h`} />
            <MiniStat label="Pipeline surfaced" value={currency.format(roiPipelineEstimate)} />
          </div>
        </div>

        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-quantum-100 mb-4">Edge-case health highlights</h2>
          <div className="space-y-3 text-sm">
            <HighlightRow label="Failed runs" value={`${failedRuns} in last cycle`} badge="Needs retry" tone="danger" />
            <HighlightRow label="Largest import" value={`${largestImport} records found`} badge="Stress-tested" tone="success" />
            <HighlightRow label="Partial runs" value={`${demoRuns.filter((r) => r.status === "partial").length} source latency event`} badge="Recovered" tone="warning" />
          </div>
        </div>
      </section>

      {showDeferredSections ? (
      <>
      <section className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-quantum-100 mb-4">Configured alert rules</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {demoAlertRules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-quantum-700 p-4 bg-quantum-950 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:shadow-lg transition">
              <p className="text-cyan-300 font-medium">{rule.name}</p>
              <p className="text-xs text-quantum-400 mt-1">{rule.region} · min score {rule.minScore} · {rule.frequency}</p>
              <p className="text-xs text-quantum-500 mt-2">Categories: {rule.categories.join(", ")}</p>
              <p className="text-xs mt-2 text-quantum-300">Triggered today: {rule.triggeredToday}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-quantum-100 mb-4">Seeded opportunities</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-quantum-400 border-b border-quantum-700">
                <th className="py-2 pr-4">Opportunity</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Region</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {demoOpportunities.map((op) => (
                <tr key={op.id} className="border-b border-quantum-800 last:border-b-0 hover:bg-quantum-800/40 transition-colors">
                  <td className="py-3 pr-4 text-cyan-300">
                    <div className="flex items-center gap-2">
                      {op.title}
                      {op.status === "hot" ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 uppercase">Hot</span> : null}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-quantum-300">{op.category}</td>
                  <td className="py-3 pr-4 text-quantum-300">{op.region}</td>
                  <td className="py-3 pr-4 text-quantum-300">{op.score}</td>
                  <td className="py-3 pr-4 text-quantum-300">{currency.format(op.estimatedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-quantum-100 mb-3">Recent agent runs</h2>
          <ul className="space-y-3 text-sm">
            {demoRuns.map((run) => (
              <li key={run.id} className="rounded-lg border border-quantum-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-mono">{run.agentName}</span>
                  <span className={run.status === "failure" ? "text-red-400" : run.status === "partial" ? "text-amber-300" : "text-green-400"}>{run.status}</span>
                </div>
                <p className="text-quantum-500 text-xs">{run.itemsUpserted}/{run.itemsFound} upserted/found</p>
                {run.notes ? <p className="text-quantum-400 text-xs mt-1">{run.notes}</p> : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-600/20 to-quantum-900 border border-cyan-500/30 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-quantum-100 mb-2">Pilot-ready talking points</h2>
          <ul className="list-disc pl-5 text-sm text-quantum-200 space-y-1">
            <li>Finds high-value public opportunities before manual searches do.</li>
            <li>Turns multi-source monitoring into a weekly digest + real-time alerts.</li>
            <li>Captures edge-case reliability metrics for pilot confidence.</li>
          </ul>
          <Link href="/landing" className="inline-block mt-4 text-cyan-300 hover:text-cyan-200 text-sm font-medium">
            Open outreach landing page →
          </Link>
        </div>
      </section>
      </>
      ) : (
        <section className="bg-quantum-900 border border-quantum-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-quantum-100 mb-3">Loading full demo details…</h2>
          <p className="text-sm text-quantum-400 mb-4">Optimized for mobile: heavy sections are deferred until the browser is idle.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-20 rounded-lg bg-quantum-800/70 animate-pulse" />
            <div className="h-20 rounded-lg bg-quantum-800/70 animate-pulse" />
            <div className="h-20 rounded-lg bg-quantum-800/70 animate-pulse" />
          </div>
        </section>
      )}

      {feedbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-quantum-700 bg-quantum-950 p-6">
            <h3 className="text-lg font-semibold">Demo feedback</h3>
            <p className="text-sm text-quantum-400 mt-1">What would make this pilot more compelling?</p>
            {!feedbackSubmitted ? (
              <form
                className="space-y-3 mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setFeedbackSubmitted(true);
                }}
              >
                <input className="w-full px-3 py-2 bg-quantum-900 border border-quantum-700 rounded" placeholder="Your name (optional)" />
                <textarea className="w-full px-3 py-2 bg-quantum-900 border border-quantum-700 rounded min-h-28" placeholder="Share suggestions, missing features, or pilot requirements" required />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setFeedbackOpen(false)} className="px-3 py-2 rounded border border-quantum-700 hover:bg-quantum-900">
                    Close
                  </button>
                  <button type="submit" className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 font-medium">
                    Send feedback
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4">
                <p className="text-green-400 text-sm">Thanks — feedback captured for pilot prep.</p>
                <button onClick={() => setFeedbackOpen(false)} className="mt-3 px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, warning = false, highlight = false }: { label: string; value: string; warning?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 border transition ${highlight ? "bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400" : "bg-quantum-900 border-quantum-700 hover:border-quantum-500"}`}>
      <p className="text-xs text-quantum-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warning ? "text-amber-300" : "text-quantum-50"}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-quantum-700 bg-quantum-950 p-3">
      <p className="text-xs text-quantum-500">{label}</p>
      <p className="text-lg font-semibold text-cyan-300 mt-1">{value}</p>
    </div>
  );
}

function HighlightRow({ label, value, badge, tone }: { label: string; value: string; badge: string; tone: "danger" | "warning" | "success" }) {
  const toneClasses = {
    danger: "bg-red-500/15 text-red-300 border-red-500/40",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    success: "bg-green-500/15 text-green-300 border-green-500/40",
  };

  return (
    <div className="rounded-lg border border-quantum-700 bg-quantum-950 p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-quantum-100 font-medium">{label}</p>
        <p className="text-quantum-500 text-xs">{value}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full border ${toneClasses[tone]}`}>{badge}</span>
    </div>
  );
}
