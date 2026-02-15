import fs from 'fs';
import path from 'path';

const dir = 'audit_artifacts/stress_runs';
const runs = [];
for (let i = 1; i <= 15; i++) {
  const p = path.join(dir, `run_${i}.json`);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const main = d.mainPhase;
  const s = d.aggregate.statusCounts || {};
  const row = {
    run: i,
    rps: main?.rps ?? 0,
    p50: main?.p50 ?? null,
    p95: main?.p95 ?? null,
    p99: main?.p99 ?? null,
    errPct: d.aggregate.errorRatePct ?? 0,
    s2xx: Object.entries(s).filter(([k]) => k.startsWith('2')).reduce((a,[,v])=>a+v,0),
    s4xx: Object.entries(s).filter(([k]) => k.startsWith('4')).reduce((a,[,v])=>a+v,0),
    s5xx: Object.entries(s).filter(([k]) => k.startsWith('5')).reduce((a,[,v])=>a+v,0),
    req: d.aggregate.requests,
    err: d.aggregate.errors,
    pass: (d.aggregate.errorRatePct <= 1 && (main?.p95 ?? 1e9) <= 800) ? 'PASS' : 'FAIL'
  };
  runs.push(row);
}

function mean(arr){return arr.reduce((a,b)=>a+b,0)/arr.length}
function std(arr){const m=mean(arr); return Math.sqrt(mean(arr.map(x=>(x-m)**2)));}

const out = {
  runs,
  summary: {
    avgRps: mean(runs.map(r=>r.rps)),
    avgP95: mean(runs.map(r=>r.p95)),
    avgErrPct: mean(runs.map(r=>r.errPct)),
    p95StdDev: std(runs.map(r=>r.p95)),
    errPctStdDev: std(runs.map(r=>r.errPct)),
    failedRuns: runs.filter(r=>r.pass==='FAIL').map(r=>r.run)
  }
};

console.log(JSON.stringify(out,null,2));
