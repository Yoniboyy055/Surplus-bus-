"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Payout {
  id: string;
  deal_id: string;
  referrer_profile_id: string;
  amount: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
  created_at: string;
  referrer_email?: string;
  deal_masked_id?: string;
}

export default function OperatorPayoutsPage() {
  const [user, setUser] = useState<any>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      
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

      // Fetch payouts with referrer info
      const { data: payoutsData, error } = await supabase
        .from('payouts')
        .select(`
          id,
          deal_id,
          referrer_profile_id,
          amount,
          status,
          paid_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (payoutsData) {
        // Fetch additional info for each payout
        const enrichedPayouts = await Promise.all(
          payoutsData.map(async (payout) => {
            // Get referrer email
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', payout.referrer_profile_id)
              .single();

            // Get referrer from auth (we can't get email directly, so we'll use ID masked)
            return {
              ...payout,
              deal_masked_id: payout.deal_id.substring(0, 8).toUpperCase(),
              referrer_email: `REF-${payout.referrer_profile_id.substring(0, 6).toUpperCase()}`,
            };
          })
        );
        setPayouts(enrichedPayouts);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [router, supabase]);

  const handleMarkAsPaid = (payout: Payout) => {
    setSelectedPayout(payout);
    setIsConfirmOpen(true);
  };

  const processPayment = async (note?: string) => {
    if (!selectedPayout || !note) return;
    
    setIsProcessing(true);
    
    const res = await fetch("/api/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        payoutId: selectedPayout.id, 
        status: "paid",
        internal_note: note 
      })
    });

    if (res.ok) {
      // Update local state
      setPayouts(prev => 
        prev.map(p => 
          p.id === selectedPayout.id 
            ? { ...p, status: 'paid' as const, paid_at: new Date().toISOString() }
            : p
        )
      );
      setIsConfirmOpen(false);
      setSelectedPayout(null);
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
    
    setIsProcessing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-quantum-500">
        Loading Payouts...
      </div>
    );
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const paidPayouts = payouts.filter(p => p.status === 'paid');

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-quantum-50">Payout Management</h1>
          <p className="text-quantum-400 mt-1">Process referrer commissions for closed deals</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium">
            Pending: {pendingPayouts.length}
          </div>
          <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
            Paid: {paidPayouts.length}
          </div>
        </div>
      </header>

      {/* Pending Payouts Table */}
      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
        <h2 className="text-xl font-semibold mb-4 text-quantum-50">Pending Payouts</h2>
        
        {pendingPayouts.length === 0 ? (
          <div className="text-center text-quantum-500 py-10">
            <p>No pending payouts.</p>
            <p className="text-sm mt-1">All commissions have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-quantum-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Deal ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Referrer</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Amount</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Created</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-quantum-700/50 hover:bg-quantum-700/20">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-cyan-400">{payout.deal_masked_id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-quantum-300">{payout.referrer_email}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-quantum-50">{formatCurrency(payout.amount)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusPill status={payout.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-quantum-400">{formatDate(payout.created_at)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleMarkAsPaid(payout)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold transition text-white"
                      >
                        Mark as Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Paid Payouts Table */}
      <section className="p-6 rounded-xl border border-quantum-700 bg-quantum-800/50">
        <h2 className="text-xl font-semibold mb-4 text-quantum-50">Payment History</h2>
        
        {paidPayouts.length === 0 ? (
          <div className="text-center text-quantum-500 py-10">
            <p>No payment history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-quantum-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Deal ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Referrer</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Amount</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-quantum-400">Paid On</th>
                </tr>
              </thead>
              <tbody>
                {paidPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-quantum-700/50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-quantum-400">{payout.deal_masked_id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-quantum-400">{payout.referrer_email}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-quantum-300">{formatCurrency(payout.amount)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusPill status={payout.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-quantum-400">
                        {payout.paid_at ? formatDate(payout.paid_at) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setSelectedPayout(null);
        }}
        onConfirm={processPayment}
        title="Mark Payout as Paid"
        message={`You are about to mark this payout as PAID. This action is IRREVERSIBLE and will be permanently logged in the audit trail.

Deal: ${selectedPayout?.deal_masked_id}
Referrer: ${selectedPayout?.referrer_email}
Amount: ${selectedPayout ? formatCurrency(selectedPayout.amount) : ''}`}
        confirmText="Confirm Payment"
        cancelText="Cancel"
        variant="warning"
        requireNote={true}
        noteLabel="Internal Note (Required for Audit)"
        notePlaceholder="Enter payment reference, bank transaction ID, or other details..."
        loading={isProcessing}
      />
    </div>
  );
}
