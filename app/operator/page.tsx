"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OperatorPortal() {
  const [user, setUser] = useState<any>(null);
  const [actionDeals, setActionDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setUser(user);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "operator") {
        router.push("/dashboard");
        return;
      }

      const actionRequiredStatuses = ['NEW_SUBMISSION', 'NEEDS_CLARIFICATION', 'WON_PENDING_CLOSE'];
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .in('status', actionRequiredStatuses)
        .order('created_at', { ascending: true });
      
      setActionDeals(deals || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleStatusChange = async (dealId: string, newStatus: string) => {
    // 4️⃣ Operator Status Guards
    let message = "";
    if (newStatus === "NEEDS_CLARIFICATION") {
      message = window.prompt("Enter clarification message for the buyer (Mandatory):") || "";
      if (!message) {
        alert("Error: A clarification message is required.");
        return;
      }
    }

    const internalNote = window.prompt("Enter internal note for audit log (Mandatory):") || "";
    if (!internalNote) {
      alert("Error: An internal note is required for all status changes.");
      return;
    }

    // 1️⃣ Status Change Confirmation Copy
    const confirmed = window.confirm(`This action is permanent and logged.\nConfirm you intend to move this deal to: ${newStatus.replace('_', ' ')}.`);
    if (!confirmed) return;

    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, status: newStatus, message, internal_note: internalNote })
    });

    if (res.ok) {
      alert("Status updated successfully!");
      window.location.reload();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Operator Portal...</div>;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operator Portal</h1>
        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium uppercase tracking-wider">
          System Administrator
        </div>
      </header>

      <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-xl font-semibold mb-4 text-red-400">Action Required Pipeline ({actionDeals.length})</h2>
        <div className="space-y-4">
          {actionDeals.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              <p>No deals require action right now.</p>
              <p className="text-sm mt-1">You’re clear.</p>
            </div>
          ) : (
            actionDeals.map((deal) => (
              <div key={deal.id} className="p-4 border border-slate-700 rounded-lg space-y-4 bg-slate-950/50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold uppercase tracking-widest">
                      DEAL ID: {deal.id.substring(0, 8)}
                    </span>
                    <h3 className="text-lg font-bold mt-1">{deal.status.replace('_', ' ')}</h3>
                    {/* 3️⃣ BUYER_COMMITTED Warning */}
                    {deal.status === 'BUYER_COMMITTED' && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 font-bold uppercase tracking-wider">
                        Buyer committed. Proof of Funds required. Failure to complete may downgrade buyer track.
                      </div>
                    )}
                    {/* 2️⃣ NEEDS_CLARIFICATION Copy */}
                    {deal.status === 'NEEDS_CLARIFICATION' && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-400 font-bold uppercase tracking-wider">
                        Waiting on buyer response — deal is paused until clarification is received.
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">Submitted: {new Date(deal.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded border border-slate-800">
                  <p className="font-medium text-slate-300 mb-1">Criteria Snapshot:</p>
                  <pre className="text-xs overflow-auto">{JSON.stringify(deal.criteria, null, 2)}</pre>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleStatusChange(deal.id, "QUALIFIED")}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition"
                  >
                    Qualify
                  </button>
                  <button 
                    onClick={() => handleStatusChange(deal.id, "NEEDS_CLARIFICATION")}
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-bold transition"
                    title="Waiting on buyer response — deal is paused until clarification is received."
                  >
                    Request Info
                  </button>
                  {deal.status === 'WON_PENDING_CLOSE' && (
                    <button 
                      onClick={() => handleStatusChange(deal.id, "CLOSED_PAID")}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-bold transition"
                      title="This action creates a permanent audit log entry."
                    >
                      Mark as Paid (Irreversible)
                    </button>
                  )}
                  <button 
                    onClick={() => handleStatusChange(deal.id, "REJECTED")}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
