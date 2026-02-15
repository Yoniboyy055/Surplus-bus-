import { NextResponse, type NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const LIMIT = 30;
const SIGNUP_PATH = "/api/beta-signups";

type Bucket = { count: number; resetAt: number };

const storeKey = "__surplus_beta_signup_rl__";

function getStore(): Map<string, Bucket> {
  const globalRef = globalThis as unknown as Record<string, Map<string, Bucket> | undefined>;
  if (!globalRef[storeKey]) {
    globalRef[storeKey] = new Map<string, Bucket>();
  }
  return globalRef[storeKey]!;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? "unknown";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname !== SIGNUP_PATH) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const key = `beta:${ip}`;
  const now = Date.now();
  const store = getStore();

  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (existing.count >= LIMIT) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  existing.count += 1;
  store.set(key, existing);
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/beta-signups"],
};
