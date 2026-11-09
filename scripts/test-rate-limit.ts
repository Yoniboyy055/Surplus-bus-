import assert from "node:assert/strict";
import { checkRateLimit, clientIp, _resetMemoryBuckets } from "../lib/security/rateLimit";

const req = (h: Record<string, string>) => new Request("https://x.test/api", { headers: h });

async function main() {
  // Spoofed first XFF hop is ignored; Vercel's own header wins.
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1, 9.9.9.9", "x-vercel-forwarded-for": "5.5.5.5" })), "5.5.5.5");
  assert.equal(clientIp(req({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(req({ "x-real-ip": "7.7.7.7" })), "7.7.7.7");

  _resetMemoryBuckets();
  const r = req({ "x-real-ip": "2.2.2.2" });
  for (let i = 0; i < 3; i++) assert.equal(await checkRateLimit(r, "t", 3, 60_000), null);
  const blocked = await checkRateLimit(r, "t", 3, 60_000);
  assert.ok(blocked && blocked.status === 429 && Number(blocked.headers.get("Retry-After")) >= 1);
  // Rotating a spoofed XFF first hop does not reset the bucket.
  const spoof = req({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "8.8.8.8" });
  assert.equal((await checkRateLimit(spoof, "t", 3, 60_000))?.status, 429);
  // Per-user keys are separate from IP keys.
  assert.equal(await checkRateLimit(r, "t", 3, 60_000, "user-1"), null);
  console.log("rate-limit: 6 OK");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
