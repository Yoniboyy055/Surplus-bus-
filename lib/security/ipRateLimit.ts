type Entry = {
  hits: number[];
};

const storeKey = "__surplus_bus_ip_rate_limit_store__";

function getStore(): Map<string, Entry> {
  const globalRef = globalThis as unknown as Record<string, Map<string, Entry> | undefined>;
  if (!globalRef[storeKey]) {
    globalRef[storeKey] = new Map<string, Entry>();
  }
  return globalRef[storeKey]!;
}

export function getClientIp(request: Request): string {
  const xfwd = request.headers.get("x-forwarded-for");
  if (xfwd) {
    const first = xfwd.split(",").at(0);
    return first ? first.trim() : "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkSlidingWindowRateLimit({
  key,
  nowMs = Date.now(),
  windowMs,
  maxHits,
}: {
  key: string;
  nowMs?: number;
  windowMs: number;
  maxHits: number;
}) {
  const store = getStore();
  const existing = store.get(key) || { hits: [] };
  const cutoff = nowMs - windowMs;
  existing.hits = existing.hits.filter((t) => t >= cutoff);

  if (existing.hits.length >= maxHits) {
    store.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (nowMs - (existing.hits.at(0) ?? nowMs))),
    };
  }

  existing.hits.push(nowMs);
  store.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxHits - existing.hits.length),
    resetMs: windowMs,
  };
}
