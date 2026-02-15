#!/usr/bin/env node
/**
 * Stress Test Script for Surplus Bus
 * Runs 15 independent iterations of a 3-phase load profile using autocannon.
 * Targets: GET / and GET /api/health
 */

const autocannon = require("autocannon");

const BASE_URL = "http://127.0.0.1:3000";
const TOTAL_RUNS = 15;

// Pass/fail thresholds
const THRESHOLDS = {
  max_error_rate: 1, // percent
  max_p95_homepage: 800, // ms
};

const results = [];

async function runPhase(title, url, duration, connections) {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      duration,
      connections,
      pipelining: 1,
      timeout: 10,
    });

    instance.on("done", (result) => resolve(result));
    instance.on("error", (err) => reject(err));
  });
}

async function singleRun(runNumber) {
  const startTime = Date.now();
  const runData = { run: runNumber, phases: {} };

  // Warmup: 10s @ 5 connections
  console.log(`  Run ${runNumber}: warmup (10s @ 5 conn)...`);
  const warmup = await runPhase("warmup", `${BASE_URL}/`, 10, 5);
  runData.phases.warmup = summarize(warmup);

  // Main: 60s @ 25 connections — GET /
  console.log(`  Run ${runNumber}: main GET / (60s @ 25 conn)...`);
  const mainHome = await runPhase("main_home", `${BASE_URL}/`, 60, 25);
  runData.phases.main_home = summarize(mainHome);

  // Main: 60s @ 25 connections — GET /api/health
  console.log(`  Run ${runNumber}: main GET /api/health (60s @ 25 conn)...`);
  const mainHealth = await runPhase("main_health", `${BASE_URL}/api/health`, 60, 25);
  runData.phases.main_health = summarize(mainHealth);

  // Spike: 20s @ 100 connections — GET /
  console.log(`  Run ${runNumber}: spike (20s @ 100 conn)...`);
  const spike = await runPhase("spike", `${BASE_URL}/`, 20, 100);
  runData.phases.spike = summarize(spike);

  // Cooldown: 10s @ 5 connections
  console.log(`  Run ${runNumber}: cooldown (10s @ 5 conn)...`);
  const cooldown = await runPhase("cooldown", `${BASE_URL}/`, 10, 5);
  runData.phases.cooldown = summarize(cooldown);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  runData.totalTimeSec = totalTime;

  // Aggregate pass/fail from main phase (home)
  const m = runData.phases.main_home;
  const errRate = m.errors > 0 ? ((m.errors / (m.requests_total || 1)) * 100) : 0;
  runData.pass =
    errRate <= THRESHOLDS.max_error_rate &&
    m.p95 <= THRESHOLDS.max_p95_homepage;
  runData.errRate = errRate.toFixed(2);

  results.push(runData);
  console.log(`  Run ${runNumber} done in ${totalTime}s — ${runData.pass ? "PASS" : "FAIL"}`);
}

function summarize(r) {
  return {
    rps: Math.round(r.requests.average || 0),
    p50: r.latency.p50 || 0,
    p95: r.latency.p95 || 0,
    p99: r.latency.p99 || 0,
    requests_total: r.requests.total || 0,
    errors: (r.errors || 0) + (r.timeouts || 0),
    status_2xx: r["2xx"] || 0,
    status_4xx: r["4xx"] || 0,
    status_5xx: r["5xx"] || 0,
    non2xx: r.non2xx || 0,
    throughput_mbps: ((r.throughput.average || 0) / 1024 / 1024).toFixed(2),
  };
}

async function main() {
  console.log("=== Surplus Bus Stress Test ===");
  console.log(`Start: ${new Date().toISOString()}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Runs: ${TOTAL_RUNS}`);
  console.log(`Thresholds: error_rate <= ${THRESHOLDS.max_error_rate}%, p95 <= ${THRESHOLDS.max_p95_homepage}ms\n`);

  // Pre-flight check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    console.log(`Pre-flight /api/health: ${res.status}`);
  } catch (e) {
    console.error("Pre-flight FAILED. Is the server running?", e.message);
    process.exit(1);
  }

  for (let i = 1; i <= TOTAL_RUNS; i++) {
    console.log(`\n--- Run ${i}/${TOTAL_RUNS} ---`);
    await singleRun(i);
  }

  console.log("\n\n=== RESULTS TABLE ===");
  console.log("Run# | Phase | RPS | p50 | p95 | p99 | err% | 2xx | 4xx | 5xx | Pass | Notes");
  console.log("-----|-------|-----|-----|-----|-----|------|-----|-----|-----|------|------");

  for (const r of results) {
    const m = r.phases.main_home;
    const h = r.phases.main_health;
    const s = r.phases.spike;
    const errP = r.errRate;
    const pass = r.pass ? "PASS" : "FAIL";
    console.log(
      `${r.run} | main_home | ${m.rps} | ${m.p50} | ${m.p95} | ${m.p99} | ${errP}% | ${m.status_2xx} | ${m.status_4xx} | ${m.status_5xx} | ${pass} | ${r.totalTimeSec}s`
    );
    console.log(
      `${r.run} | main_health | ${h.rps} | ${h.p50} | ${h.p95} | ${h.p99} | ${((h.errors/(h.requests_total||1))*100).toFixed(2)}% | ${h.status_2xx} | ${h.status_4xx} | ${h.status_5xx} | - | -`
    );
    console.log(
      `${r.run} | spike | ${s.rps} | ${s.p50} | ${s.p95} | ${s.p99} | ${((s.errors/(s.requests_total||1))*100).toFixed(2)}% | ${s.status_2xx} | ${s.status_4xx} | ${s.status_5xx} | - | -`
    );
  }

  // Summary stats
  const p95s = results.map((r) => r.phases.main_home.p95);
  const errRates = results.map((r) => parseFloat(r.errRate));
  const avgP95 = (p95s.reduce((a, b) => a + b, 0) / p95s.length).toFixed(1);
  const stdDevP95 = Math.sqrt(p95s.reduce((sum, v) => sum + (v - avgP95) ** 2, 0) / p95s.length).toFixed(1);
  const avgErr = (errRates.reduce((a, b) => a + b, 0) / errRates.length).toFixed(2);
  const stdDevErr = Math.sqrt(errRates.reduce((sum, v) => sum + (v - avgErr) ** 2, 0) / errRates.length).toFixed(2);
  const passCount = results.filter((r) => r.pass).length;

  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${passCount}/${TOTAL_RUNS}`);
  console.log(`Avg p95 (main GET /): ${avgP95}ms  (StdDev: ${stdDevP95}ms)`);
  console.log(`Avg error rate: ${avgErr}%  (StdDev: ${stdDevErr}%)`);
  console.log(`End: ${new Date().toISOString()}`);

  // Output JSON for report
  const output = {
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    summary: { passCount, total: TOTAL_RUNS, avgP95, stdDevP95, avgErr, stdDevErr },
    runs: results,
  };
  require("fs").writeFileSync("/tmp/stress_results.json", JSON.stringify(output, null, 2));
  console.log("\nFull results written to /tmp/stress_results.json");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
