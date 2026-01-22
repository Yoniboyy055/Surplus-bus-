"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Modal } from "@/components";
import { createClient } from "@/lib/supabase/client";

type PayoutRow = {
  id: string;
  deal_id: string;
  referrer_profile_id: string;
  amount: number | null;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
};

type AuditNote = {
  created_at: string;
  internal_note?: string;
};

function maskId(id: string, prefix: string) {
  return `${prefix}-${id.substring(0, 8).toUpperCase()}`;
}

export default function OperatorPayoutsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [auditByDealId, setAuditByDealId] = useState<Record<string, AuditNote>>({});

  const [activePayout, setActivePayout] = useState<PayoutRow | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = useMemo(() => payouts.filter((p) => p.status === "pending").length, [payouts]);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      router.push("/auth");
      return;
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }
    if (profile?.role !== "operator") {
      router.push("/dashboard");
      return;
    }

    const { data: payoutRows, error: payoutError } = await supabase
      .from("payouts")
      .select("id, deal_id, referrer_profile_id, amount, status, created_at, paid_at")
      .order("created_at", { ascending: false });

    if (payoutError) {
      setError(payoutError.message);
      setLoading(false);
      return;
    }

    const rows = (payoutRows || []) as PayoutRow[];
    setPayouts(rows);

    const dealIds = Array.from(new Set(rows.map((r) => r.deal_id)));
    if (dealIds.length) {
      const { data: auditRows } = await supabase
        .from("audit_logs")
        .select("deal_id, created_at, metadata, action")
        .in("deal_id", dealIds)
        .eq("action", "PAYOUT_PROCESSED")
        .order("created_at", { ascending: false });

      const map: Record<string, AuditNote> = {};
      for (const row of auditRows || []) {
        if (map[row.deal_id]) continue; // keep latest per deal_id
        map[row.deal_id] = {
          created_at: row.created_at,
          internal_note: row.metadata?.internal_note,
        };
      }
      setAuditByDealId(map);
    } else {
      setAuditByDealId({});
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPayModal = (payout: PayoutRow) => {
    setActivePayout(payout);
    setNote("");
  };

  const closePayModal = () => {
    if (submitting) return;
    setActivePayout(null);
    setNote("");
  };

  const markAsPaid = async () => {
    if (!activePayout) return;
    if (!note.trim()) {
      setError("Internal note is required to mark a payout as PAID.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: activePayout.id, status: "paid", internal_note: note.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to update payout." }));
        throw new Error(err.error || "Failed to update payout.");
      }
      closePayModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update payout.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: PayoutRow["status"]) => {
    if (status === "paid") return <Badge variant="success" size="sm">Paid</Badge>;
    if (status === "failed") return <Badge variant="error" size="sm">Failed</Badge>;
    return <Badge variant="warning" size="sm">Pending</Badge>;
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Payouts...</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operator Payouts</h1>
          <p className="text-sm text-slate-400 mt-1">Audit-logged, irreversible payout processing.</p>
        </div>
        <Badge variant={pendingCount ? "warning" : "success"} size="sm">
          {pendingCount ? `${pendingCount} Pending` : "All Clear"}
        </Badge>
      </header>

      {error && (
        <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-4 text-sm text-accent-danger">
          ✕ {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-950/60 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Deal</th>
                <th className="px-4 py-3 text-left font-semibold">Referrer</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Audit Note</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => {
                  const audit = auditByDealId[p.deal_id];
                  return (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-mono text-slate-300">{maskId(p.deal_id, "DEAL")}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{maskId(p.referrer_profile_id, "REF")}</td>
                      <td className="px-4 py-3 text-right text-slate-200">
                        {typeof p.amount === "number" ? `$${p.amount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {audit?.internal_note ? (
                          <span title={audit.created_at}>{audit.internal_note}</span>
                        ) : p.status === "paid" ? (
                          <span className="text-slate-500">Paid (no note found)</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "pending" ? (
                          <Button size="sm" variant="primary" onClick={() => openPayModal(p)}>
                            Mark as Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={!!activePayout}
        onClose={closePayModal}
        title="Mark payout as PAID"
        subtitle="This action is irreversible and will be written to the audit log."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closePayModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={markAsPaid} loading={submitting}>
              Confirm & Mark Paid
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-xs text-quantum-400">
            Deal: {activePayout ? maskId(activePayout.deal_id, "DEAL") : "—"}
          </div>
          <div>
            <label className="block text-sm font-semibold text-quantum-200 mb-3">Internal Note (required)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-quantum-900 border border-quantum-700 rounded-md px-4 py-3 text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 min-h-[120px]"
              placeholder="Why is this payout being marked as paid?"
            />
          </div>
          <div className="rounded-lg border border-accent-warning/40 bg-accent-warning/10 p-4 text-sm text-accent-warning">
            ⚠ This will set payout status to PAID and add a permanent audit entry.
          </div>
        </div>
      </Modal>
    </div>
  );
}

