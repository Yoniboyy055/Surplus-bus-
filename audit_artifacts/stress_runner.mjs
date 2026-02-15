import { performance } from 'node:perf_hooks';

const url = process.argv[2] || 'http://127.0.0.1:3000/';
const runNumber = Number(process.argv[3] || 1);

const phases = [
  { name: 'warmup', durationSec: 10, concurrency: 5 },
  { name: 'main', durationSec: 60, concurrency: 25 },
  { name: 'spike', durationSec: 20, concurrency: 100 },
  { name: 'cooldown', durationSec: 10, concurrency: 5 },
];

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function runPhase(phase) {
  const endAt = Date.now() + phase.durationSec * 1000;
  const latencies = [];
  const statusCounts = {};
  let errors = 0;
  let requests = 0;

  async function worker() {
    while (Date.now() < endAt) {
      const start = performance.now();
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        requests += 1;
        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
        await res.arrayBuffer();
      } catch {
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        requests += 1;
        errors += 1;
      }
    }
  }

  const workers = Array.from({ length: phase.concurrency }, () => worker());
  const phaseStart = performance.now();
  await Promise.all(workers);
  const phaseElapsedMs = performance.now() - phaseStart;

  const rps = phaseElapsedMs > 0 ? (requests / (phaseElapsedMs / 1000)) : 0;

  return {
    phase: phase.name,
    durationSec: phase.durationSec,
    concurrency: phase.concurrency,
    requests,
    errors,
    errorRatePct: requests > 0 ? (errors / requests) * 100 : 0,
    rps,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    statusCounts,
  };
}

const results = [];
for (const phase of phases) {
  // eslint-disable-next-line no-await-in-loop
  const phaseResult = await runPhase(phase);
  results.push(phaseResult);
}

const allReq = results.reduce((a, r) => a + r.requests, 0);
const allErr = results.reduce((a, r) => a + r.errors, 0);
const allStatus = {};
for (const r of results) {
  for (const [k, v] of Object.entries(r.statusCounts)) {
    allStatus[k] = (allStatus[k] || 0) + v;
  }
}

const main = results.find((r) => r.phase === 'main');

console.log(JSON.stringify({
  run: runNumber,
  url,
  generatedAt: new Date().toISOString(),
  phases: results,
  aggregate: {
    requests: allReq,
    errors: allErr,
    errorRatePct: allReq > 0 ? (allErr / allReq) * 100 : 0,
    statusCounts: allStatus,
  },
  mainPhase: main,
}));
