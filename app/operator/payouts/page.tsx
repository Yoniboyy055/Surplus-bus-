"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { AuditTimeline, ConfirmModal, Modal, StatusPill } from "@/components";

type Payout = {
  id: string;
  deal_id: string;
  referrer_profile_id: string;
  amount: number | null;
  status: string;
  created_at: string;
  paid_at?: string | null;
};

type AuditEntry = {
  id: string;
  action: string;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(Number(value))) return "Pending";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
};

const maskId = (prefix: string, id: string) => `${prefix}-${id.slice(0, 6).toUpperCase()}`;

export default function OperatorPayoutsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [auditDealId, setAuditDealId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchPayouts = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/auth");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "operator") {
      router.push("/dashboard");
      return;
    }

    const { data, error: payoutError } = await supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (payoutError) {
      setError(payoutError.message);
    }
    setPayouts((data ?? []) as Payout[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayouts();
  }, [supabase]);

  const openMarkPaid = (payout: Payout) => {
    setSelectedPayout(payout);
    setInternalNote("");
  };

  const closeMarkPaid = () => {
    setSelectedPayout(null);
    setInternalNote("");
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;
    if (!internalNote.trim()) {
      setError("Internal note is required when marking a payout as paid.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payoutId: selectedPayout.id,
        status: "paid",
        internal_note: internalNote,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Unable to mark payout as paid.");
      setSubmitting(false);
      return;
    }

    setSuccess("Payout marked as paid and logged.");
    setSubmitting(false);
    closeMarkPaid();
    await fetchPayouts();
  };

  const openAudit = async (dealId: string) => {
    if (!supabase) return;
    setAuditDealId(dealId);
    setAuditLoading(true);

    const { data, error: auditError } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (auditError) {
      setError(auditError.message);
    }

    setAuditEntries((data ?? []) as AuditEntry[]);
    setAuditLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-quantum-50">Payouts</h1>
          <p className="text-sm text-quantum-400">Track payouts and mark completed payments with audit notes.</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            {success}
          </div>
        )}

        <section className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
          <h2 className="text-xl font-semibold text-quantum-50">Payout Queue</h2>
          <p className="text-sm text-quantum-400">
            Mark payouts as paid only after funds have been released. Each action logs an audit entry.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-quantum-500">
                <tr>
                  <th className="pb-3">Deal ID</th>
                  <th className="pb-3">Referrer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-quantum-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-quantum-500">
                      Loading payout queue...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-quantum-500">
                      No payouts available yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="text-quantum-200">
                      <td className="py-4 font-mono text-xs">{maskId("DEAL", payout.deal_id)}</td>
                      <td className="py-4 font-mono text-xs">{maskId("REF", payout.referrer_profile_id)}</td>
                      <td className="py-4">{formatCurrency(payout.amount)}</td>
                      <td className="py-4">
                        <StatusPill status={payout.status} size="sm" />
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => openAudit(payout.deal_id)}
                            className="rounded-full border border-quantum-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
                          >
                            View Audit
                          </button>
                          {payout.status !== "paid" && (
                            <button
                              onClick={() => openMarkPaid(payout)}
                              className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-quantum-950 transition hover:bg-cyan-400"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ConfirmModal
          isOpen={Boolean(selectedPayout)}
          title="Mark payout as paid"
          description="This action is irreversible and will be logged to the audit trail."
          confirmLabel={submitting ? "Saving..." : "Confirm Paid"}
          confirmDisabled={submitting || !internalNote.trim()}
          onConfirm={handleMarkPaid}
          onCancel={closeMarkPaid}
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-quantum-500">Internal Note (Required)</label>
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-quantum-700 bg-quantum-900 px-3 py-2 text-sm text-quantum-100"
              placeholder="Document payout confirmation details."
            />
          </div>
        </ConfirmModal>

        <Modal
          isOpen={Boolean(auditDealId)}
          onClose={() => setAuditDealId(null)}
          title="Payout Audit Trail"
          footer={
            <button
              onClick={() => setAuditDealId(null)}
              className="rounded-full border border-quantum-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
            >
              Close
            </button>
          }
        >
          {auditLoading ? (
            <p className="text-sm text-quantum-500">Loading audit trail...</p>
          ) : (
            <AuditTimeline entries={auditEntries} emptyMessage="No audit logs for this payout yet." />
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
