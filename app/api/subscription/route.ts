import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";

/**
 * Billing/subscription API — not enabled for v1.
 * Returns 501. Re-enable when Stripe is wired.
 */
export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "subscription-post", 20, 60_000);
  if (limited) return limited;

  return NextResponse.json({ error: "billing_not_enabled" }, { status: 501 });
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "subscription-get", 60, 60_000);
  if (limited) return limited;

  return NextResponse.json({ error: "billing_not_enabled" }, { status: 501 });
}
