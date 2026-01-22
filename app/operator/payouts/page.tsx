import { createClient } from "@/lib/supabase/server";
import { PayoutsList } from "./PayoutsList";

export default async function OperatorPayoutsPage() {
  const supabase = createClient();
  
  if (!supabase) {
    return <div>Database configuration error</div>;
  }

  // Fetch payouts with referrer details
  const { data: payouts, error } = await supabase
    .from("payouts")
    .select(`
      *,
      referrers:referrer_profile_id (
        profiles:profile_id (
          email
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payouts:", error);
    return <div>Error loading payouts</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Payout Management</h1>
      </div>
      
      <PayoutsList initialPayouts={payouts || []} />
    </div>
  );
}
