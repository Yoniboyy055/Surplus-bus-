"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal, DealDetailDrawer, KanbanBoard, StatusPill } from "@/components";

type Deal = {
  id: string;
  status: string;
  created_at: string;
  criteria?: Record<string, unknown> | null;
  buyer_track_snapshot?: string | null;
  buyer_profile_id?: string | null;
  referrer_profile_id?: string | null;
  internal_notes?: string | null;
  exclusive_ends_at?: string | null;
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

const pipelineStatuses = [
  "NEW_SUBMISSION",
  "NEEDS_CLARIFICATION",
  "QUALIFIED",
  "MATCHING",
  "BUYER_COMMITTED",
  "WON_PENDING_CLOSE",
];

export default function OperatorPortal() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [clarificationMessage, setClarificationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDeals = async () => {
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

    const { data: dealsData, error: dealsError } = await supabase
      .from("deals")
      .select("*")
      .in("status", pipelineStatuses)
      .order("created_at", { ascending: true });

    if (dealsError) {
      setError(dealsError.message);
      setDeals([]);
    } else {
      setDeals((dealsData ?? []) as Deal[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDeals();
  }, [supabase]);

  useEffect(() => {
    if (!selectedDeal || !supabase) return;
    let mounted = true;

    const fetchAudit = async () => {
      setAuditLoading(true);
      const { data: entries, error: auditError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("deal_id", selectedDeal.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (auditError) {
        setAuditEntries([]);
        setError(auditError.message);
      } else {
        setAuditEntries((entries ?? []) as AuditEntry[]);
      }
      setAuditLoading(false);
    };

    fetchAudit();
    return () => {
      mounted = false;
    };
  }, [selectedDeal, supabase]);

  const actionCounts = {
    NEW_SUBMISSION: deals.filter((deal) => deal.status === "NEW_SUBMISSION").length,
    NEEDS_CLARIFICATION: deals.filter((deal) => deal.status === "NEEDS_CLARIFICATION").length,
    BUYER_COMMITTED: deals.filter((deal) => deal.status === "BUYER_COMMITTED").length,
  };

  const openStatusModal = (status: string) => {
    setPendingStatus(status);
    setInternalNote("");
    setClarificationMessage("");
  };

  const closeStatusModal = () => {
    setPendingStatus(null);
    setInternalNote("");
    setClarificationMessage("");
  };

  const handleStatusChange = async () => {
    if (!pendingStatus || !selectedDeal) return;
    if (!internalNote.trim()) {
      setError("An internal note is required for every status change.");
      return;
    }

    if (pendingStatus === "NEEDS_CLARIFICATION" && !clarificationMessage.trim()) {
      setError("A clarification message to the buyer is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: selectedDeal.id,
        status: pendingStatus,
        message: clarificationMessage,
        internal_note: internalNote,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Unable to update deal status.");
      setSubmitting(false);
      return;
    }

    setSuccess(`Status updated to ${pendingStatus.replace(/_/g, " ")}.`);
    setSubmitting(false);
    closeStatusModal();
    setSelectedDeal(null);
    await fetchDeals();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-quantum-500">Loading Operator Portal...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-quantum-50">Operator Portal</h1>
            <p className="text-sm text-quantum-400">Action queue, audit visibility, and pipeline control.</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="ACTION REQUIRED" size="sm" />
            <span className="rounded-full bg-quantum-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-quantum-200">
              System Administrator
            </span>
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Action Required</p>
              <h2 className="text-xl font-semibold text-quantum-50">Pipeline Alerts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-quantum-700 bg-quantum-950 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300">
                New Submissions: <span className="text-quantum-100">{actionCounts.NEW_SUBMISSION}</span>
              </div>
              <div className="rounded-full border border-quantum-700 bg-quantum-950 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300">
                Needs Clarification: <span className="text-quantum-100">{actionCounts.NEEDS_CLARIFICATION}</span>
              </div>
              <div className="rounded-full border border-quantum-700 bg-quantum-950 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300">
                Buyer Committed: <span className="text-quantum-100">{actionCounts.BUYER_COMMITTED}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
          <h2 className="text-xl font-semibold text-quantum-50">Deal Pipeline</h2>
          <p className="text-sm text-quantum-400">
            Move deals through the lifecycle. Click any card to view the deal drawer, audit logs, and actions.
          </p>
          <div className="mt-6">
            <KanbanBoard deals={deals} onSelectDeal={setSelectedDeal} />
          </div>
        </section>
      </div>

      <DealDetailDrawer
        isOpen={Boolean(selectedDeal)}
        deal={selectedDeal}
        auditEntries={auditEntries}
        isLoadingAudit={auditLoading}
        onClose={() => setSelectedDeal(null)}
        onRequestStatusChange={openStatusModal}
      />

      <ConfirmModal
        isOpen={Boolean(pendingStatus)}
        title="Confirm Status Change"
        description={`This action is permanent and logged. Confirm moving the deal to ${pendingStatus?.replace(/_/g, " ")}.`}
        confirmLabel={submitting ? "Updating..." : "Confirm Update"}
        intent={pendingStatus === "REJECTED" ? "danger" : "primary"}
        confirmDisabled={
          submitting ||
          !internalNote.trim() ||
          (pendingStatus === "NEEDS_CLARIFICATION" && !clarificationMessage.trim())
        }
        onConfirm={handleStatusChange}
        onCancel={closeStatusModal}
      >
        {pendingStatus === "NEEDS_CLARIFICATION" && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest text-quantum-500">Buyer Clarification Message</label>
            <textarea
              value={clarificationMessage}
              onChange={(event) => setClarificationMessage(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-quantum-700 bg-quantum-900 px-3 py-2 text-sm text-quantum-100"
              placeholder="Provide the buyer with the specific clarification needed."
            />
          </div>
        )}
        <div>
          <label className="text-xs uppercase tracking-widest text-quantum-500">Internal Note (Required)</label>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-quantum-700 bg-quantum-900 px-3 py-2 text-sm text-quantum-100"
            placeholder="Add an internal note for the audit trail."
          />
        </div>
      </ConfirmModal>
    </AppShell>
  );
}
