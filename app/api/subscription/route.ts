import { NextResponse } from "next/server";

/**
 * Billing/subscription API — not enabled for v1.
 * Returns 501. Re-enable when Stripe is wired.
 */
export async function POST() {
  return NextResponse.json(
    { error: "billing_not_enabled" },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "billing_not_enabled" },
    { status: 501 }
  );
}
