"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal, Modal, StatusPill } from "@/components";

type Deal = {
  id: string;
  status: string;
  created_at: string;
  criteria?: Record<string, unknown> | null;
  exclusive_ends_at?: string | null;
};

type Buyer = {
  track?: string | null;
  reputation_score?: number | null;
};

const formatCurrency = (value: unknown) => {
  const amount = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  );
};

const getCriteriaValue = (criteria: Record<string, unknown> | null | undefined, key: string) => {
  if (!criteria) return undefined;
  return criteria[key];
};

const CriteriaForm = ({ onSubmitted }: { onSubmitted: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      property_type: formData.get("property_type"),
      max_price: formData.get("max_price"),
      criteria: {
        location: formData.get("location"),
        notes: formData.get("notes"),
      },
    };

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Unable to submit criteria.");
      setLoading(false);
      return;
    }

    setSuccess("Criteria submitted. Your operator will review shortly.");
    setLoading(false);
    onSubmitted();
    event.currentTarget.reset();
  };

  return (
    <form
      id="criteria"
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-quantum-800 bg-quantum-900/60 p-6"
    >
      <h2 className="text-xl font-semibold text-quantum-50">Submit Criteria</h2>
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{success}</div>
      )}
      <select name="property_type" className="w-full" required>
        <option value="">Select Property Type</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
        <option value="residential">Residential</option>
        <option value="industrial">Industrial</option>
      </select>
      <input name="max_price" type="number" placeholder="Max Price (USD)" className="w-full" required />
      <input name="location" type="text" placeholder="Preferred Location" className="w-full" />
      <textarea name="notes" placeholder="Additional Notes" className="h-24 w-full" />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-cyan-500 py-2 text-sm font-semibold text-quantum-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Criteria"}
      </button>
    </form>
  );
};

export default function BuyerPortal() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [buyerData, setBuyerData] = useState<Buyer | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [commitDeal, setCommitDeal] = useState<Deal | null>(null);
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [pofConfirmed, setPofConfirmed] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({
    property_type: "",
    max_price: "",
    location: "",
    notes: "",
  });

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/auth");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "buyer") {
      router.push("/dashboard");
      return;
    }

    const { data: bData } = await supabase.from("buyers").select("*").eq("profile_id", auth.user.id).single();
    setBuyerData(bData as Buyer);

    const { data: activeDeals } = await supabase
      .from("deals")
      .select("*")
      .eq("buyer_profile_id", auth.user.id)
      .neq("status", "CLOSED_PAID")
      .neq("status", "LOST")
      .neq("status", "WITHDRAWN")
      .order("created_at", { ascending: false });

    setDeals((activeDeals ?? []) as Deal[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const openEditDeal = (deal: Deal) => {
    const criteria = deal.criteria ?? {};
    setCriteriaForm({
      property_type: String(getCriteriaValue(criteria, "property_type") ?? ""),
      max_price: String(getCriteriaValue(criteria, "max_price") ?? ""),
      location: String(getCriteriaValue(criteria, "location") ?? ""),
      notes: String(getCriteriaValue(criteria, "notes") ?? ""),
    });
    setEditDeal(deal);
  };

  const handleUpdateCriteria = async () => {
    if (!editDeal) return;
    setEditSubmitting(true);
    setError(null);

    const res = await fetch("/api/deals/criteria", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: editDeal.id,
        property_type: criteriaForm.property_type,
        max_price: criteriaForm.max_price,
        location: criteriaForm.location,
        notes: criteriaForm.notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Unable to update criteria.");
      setEditSubmitting(false);
      return;
    }

    setSuccess("Criteria updated successfully.");
    setEditSubmitting(false);
    setEditDeal(null);
    await fetchData();
  };

  const openCommitModal = (deal: Deal) => {
    setCommitDeal(deal);
    setFeeAccepted(false);
    setPofConfirmed(false);
  };

  const handleCommit = async () => {
    if (!commitDeal) return;
    setError(null);

    const res = await fetch("/api/deals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: commitDeal.id, action: "COMMIT_TO_BID", acceptedFee: true }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Unable to commit to bid.");
      return;
    }

    setSuccess("Commitment received. Status updated to BUYER_COMMITTED.");
    setCommitDeal(null);
    await fetchData();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-20 text-center text-quantum-500">Loading Portal...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-quantum-50">Buyer Portal</h1>
            <p className="text-sm text-quantum-400">Track your deals and manage criteria updates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-300">
              Track {buyerData?.track || "B"}
            </div>
            <div className="relative group">
              <div className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300">
                Reputation: {buyerData?.reputation_score || 50}
              </div>
              <div className="pointer-events-none absolute right-0 top-10 w-56 rounded-lg border border-quantum-700 bg-quantum-900 px-3 py-2 text-xs text-quantum-300 opacity-0 transition group-hover:opacity-100">
                Reputation scores reflect response speed, proof-of-funds compliance, and close rate.
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            {success}
          </div>
        )}

        <section id="active-deals" className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
          <h2 className="text-xl font-semibold text-quantum-50">Active Deals</h2>
          <p className="text-sm text-quantum-400">All open deals tied to your profile.</p>
          <div className="mt-6 space-y-4">
            {deals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-quantum-700 p-6 text-center text-sm text-quantum-500">
                No deals yet. Submit criteria to open your first opportunity.
              </div>
            ) : (
              deals.map((deal) => {
                const criteria = deal.criteria ?? {};
                const propertyType = getCriteriaValue(criteria, "property_type");
                const maxPrice = getCriteriaValue(criteria, "max_price");
                const canEdit = ["NEW_SUBMISSION", "NEEDS_CLARIFICATION"].includes(deal.status);
                return (
                  <div key={deal.id} className="rounded-lg border border-quantum-800 bg-quantum-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-quantum-500">Deal {deal.id.slice(0, 8)}</p>
                        <h3 className="text-lg font-semibold text-quantum-50">
                          {typeof propertyType === "string" ? propertyType : "Property Request"}
                        </h3>
                        <p className="text-sm text-quantum-400">Max price: {formatCurrency(maxPrice)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={deal.status} size="sm" />
                        <button
                          onClick={() => setDetailDeal(deal)}
                          className="rounded-full border border-quantum-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
                        >
                          View Details
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditDeal(deal)}
                            className="rounded-full border border-quantum-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
                          >
                            Edit Criteria
                          </button>
                        )}
                      </div>
                    </div>
                    {deal.status === "EXCLUSIVE_WINDOW_ACTIVE" && deal.exclusive_ends_at && (
                      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        Exclusive window ends: {new Date(deal.exclusive_ends_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <CriteriaForm onSubmitted={fetchData} />

        <section className="rounded-xl border border-quantum-800 bg-quantum-900/60 p-6">
          <h2 className="text-xl font-semibold text-quantum-50">Portal Info</h2>
          <div className="mt-4 space-y-3 text-sm text-quantum-300">
            <p>Manage criteria updates and track all operator-qualified deals from this dashboard.</p>
            <ul className="list-disc list-inside space-y-1 text-quantum-400">
              <li>Track A receives priority matching windows.</li>
              <li>Track B operates on standard matching priority.</li>
              <li>Reputation improves with timely responses and successful closes.</li>
            </ul>
          </div>
        </section>
      </div>

      <Modal
        isOpen={Boolean(detailDeal)}
        onClose={() => setDetailDeal(null)}
        title="Deal Detail"
        footer={
          <button
            onClick={() => setDetailDeal(null)}
            className="rounded-full border border-quantum-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-quantum-300 hover:border-cyan-500/50 hover:text-cyan-200"
          >
            Close
          </button>
        }
      >
        {detailDeal && (
          <div className="space-y-4 text-sm text-quantum-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPill status={detailDeal.status} size="sm" />
              <span className="text-xs uppercase tracking-widest text-quantum-500">
                Deal {detailDeal.id.slice(0, 8)}
              </span>
            </div>
            <div className="space-y-2">
              <p>
                <span className="text-quantum-500">Property Type:</span>{" "}
                {String(getCriteriaValue(detailDeal.criteria, "property_type") ?? "Not specified")}
              </p>
              <p>
                <span className="text-quantum-500">Max Price:</span>{" "}
                {formatCurrency(getCriteriaValue(detailDeal.criteria, "max_price"))}
              </p>
              <p>
                <span className="text-quantum-500">Location:</span>{" "}
                {String(getCriteriaValue(detailDeal.criteria, "location") ?? "Not specified")}
              </p>
              <p>
                <span className="text-quantum-500">Notes:</span>{" "}
                {String(getCriteriaValue(detailDeal.criteria, "notes") ?? "None")}
              </p>
              {detailDeal.exclusive_ends_at && (
                <p>
                  <span className="text-quantum-500">Exclusive Window Ends:</span>{" "}
                  {new Date(detailDeal.exclusive_ends_at).toLocaleString()}
                </p>
              )}
            </div>
            {detailDeal.status === "EXCLUSIVE_WINDOW_ACTIVE" && (
              <button
                onClick={() => openCommitModal(detailDeal)}
                className="w-full rounded-full bg-green-500 py-2 text-sm font-semibold text-quantum-950 transition hover:bg-green-400"
              >
                Commit to Bid (5% Success Fee)
              </button>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(editDeal)}
        title="Edit Criteria"
        description="You can edit criteria while the deal is still in early review."
        confirmLabel={editSubmitting ? "Saving..." : "Save Changes"}
        confirmDisabled={editSubmitting}
        onConfirm={handleUpdateCriteria}
        onCancel={() => setEditDeal(null)}
      >
        <div className="space-y-3">
          <input
            value={criteriaForm.property_type}
            onChange={(event) => setCriteriaForm((prev) => ({ ...prev, property_type: event.target.value }))}
            placeholder="Property Type"
            className="w-full"
          />
          <input
            value={criteriaForm.max_price}
            onChange={(event) => setCriteriaForm((prev) => ({ ...prev, max_price: event.target.value }))}
            placeholder="Max Price (USD)"
            className="w-full"
          />
          <input
            value={criteriaForm.location}
            onChange={(event) => setCriteriaForm((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Preferred Location"
            className="w-full"
          />
          <textarea
            value={criteriaForm.notes}
            onChange={(event) => setCriteriaForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Additional Notes"
            className="w-full"
          />
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={Boolean(commitDeal)}
        title="Confirm Bid Commitment"
        description="Confirming locks your exclusive window and triggers the 5% success fee."
        confirmLabel="Confirm Commitment"
        confirmDisabled={!feeAccepted || !pofConfirmed}
        onConfirm={handleCommit}
        onCancel={() => setCommitDeal(null)}
      >
        <div className="space-y-3 text-sm text-quantum-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={feeAccepted} onChange={(event) => setFeeAccepted(event.target.checked)} />
            I accept the 5% buyer-paid success fee on close.
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pofConfirmed} onChange={(event) => setPofConfirmed(event.target.checked)} />
            I will upload proof-of-funds within 4 hours of commitment.
          </label>
        </div>
      </ConfirmModal>
    </AppShell>
  );
}
