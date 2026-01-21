import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/deals/[id]
 * Updates deal status.
 * 
 * PART 3.2: Commit-to-Bid Confirmation
 * - Before BUYER_COMMITTED: require explicit confirmation text
 * - Require acceptance of 5% success fee
 * 
 * PART 3.3: NEEDS_CLARIFICATION Enforcement
 * - When operator sets NEEDS_CLARIFICATION: message to buyer required
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next();
  const supabase = createRouteHandlerClient(request, response);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { status, confirmation_text, fee_accepted, message } = body;

  // PART 3.2: Commit-to-Bid Confirmation
  if (status === "BUYER_COMMITTED") {
    if (!confirmation_text) {
      return NextResponse.json(
        { error: "Explicit confirmation required" },
        { status: 400 }
      );
    }

    if (!fee_accepted) {
      return NextResponse.json(
        { error: "5% success fee acceptance required" },
        { status: 400 }
      );
    }
  }

  // PART 3.3: NEEDS_CLARIFICATION Enforcement
  if (status === "NEEDS_CLARIFICATION") {
    if (!message) {
      return NextResponse.json(
        { error: "Message to buyer required when status is NEEDS_CLARIFICATION" },
        { status: 400 }
      );
    }
  }

  // Implementation would continue with status update...
  return NextResponse.json(
    { message: "Deal status update logic placeholder", dealId: params.id },
    { status: 200 }
  );
}
