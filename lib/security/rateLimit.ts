import { NextRequest, NextResponse } from "next/server";

type Bucket = { hits: number[]; lastSeenAt: number };
const buckets = new Map<string, Bucket>();

let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60_000;


function getIp(request: Request | NextRequest): string {
  if ("ip" in request && typeof request.ip === "string" && request.ip.length > 0) {
    return request.ip;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  return "unknown";
}

function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.lastSeenAt <= now - SWEEP_INTERVAL_MS) {
      buckets.delete(bucketKey);
    }
  }

  lastSweepAt = now;
}


export function checkRateLimit(
  request: Request | NextRequest,
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const bucketKey = `${key}:${getIp(request)}`;

  const bucket = buckets.get(bucketKey) ?? { hits: [], lastSeenAt: now };
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs);
  bucket.lastSeenAt = now;

  if (bucket.hits.length >= limit) {
    const oldestHit = bucket.hits[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldestHit));
    buckets.set(bucketKey, bucket);


    return NextResponse.json(
      { error: "rate_limited", retry_in_ms: retryAfterMs },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
        },
      },
    );
  }

  bucket.hits.push(now);
  buckets.set(bucketKey, bucket);
  return null;
}
