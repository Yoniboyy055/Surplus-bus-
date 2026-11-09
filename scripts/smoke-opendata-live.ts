/**
 * Live, read-only smoke test of the open-data ingest against the real public feeds.
 * Always dryRun: fetches + unzips + parses, never writes to any database.
 * Run: npx tsx scripts/smoke-opendata-live.ts
 */
import { ingestOpenDataFeeds } from "../lib/opendata/ingest";

async function main() {
  const t0 = Date.now();
  const mem0 = process.memoryUsage().rss;
  const results = await ingestOpenDataFeeds({ dryRun: true });
  const ms = Date.now() - t0;
  const peakRssMb = Math.round(Math.max(mem0, process.memoryUsage().rss) / 1024 / 1024);
  for (const r of results) {
    console.log(
      `${r.feed_key}: status=${r.status} rows_parsed=${r.rows_parsed}` +
        (r.row_cap != null ? ` row_cap=${r.row_cap} dropped=${r.rows_dropped_by_cap}` : "") +
        (r.error_message ? ` error=${r.error_message}` : "")
    );
  }
  console.log(`elapsed_ms=${ms} rss_mb=${peakRssMb}`);
  if (results.some((r) => r.status === "error")) process.exit(1);
}

main();
