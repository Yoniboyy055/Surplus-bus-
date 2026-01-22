import React from "react";
import { Modal } from "./Modal";
import { StatusPill } from "./StatusPill";
import { Button } from "./Button";
import { AuditTimeline } from "./AuditTimeline";

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

interface DealDetailDrawerProps {
  isOpen: boolean;
  deal: Deal | null;
  auditEntries: AuditEntry[];
  isLoadingAudit?: boolean;
  onClose: () => void;
  onRequestStatusChange: (status: string) => void;
}

const formatCurrency = (value: unknown) => {
  const amount = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  );
};

const maskId = (prefix: string, id?: string | null) => {
  if (!id) return `${prefix}-UNKNOWN`;
  return `${prefix}-${id.slice(0, 6).toUpperCase()}`;
};

export const DealDetailDrawer: React.FC<DealDetailDrawerProps> = ({
  isOpen,
  deal,
  auditEntries,
  isLoadingAudit = false,
  onClose,
  onRequestStatusChange,
}) => {
  if (!deal) return null;

  const criteria = deal.criteria ?? {};
  const propertyType = criteria.property_type;
  const maxPrice = criteria.max_price;
  const location = criteria.location;
  const notes = criteria.notes;

  const actions = [
    {
      label: "Qualify",
      status: "QUALIFIED",
      visible: deal.status === "NEW_SUBMISSION" || deal.status === "NEEDS_CLARIFICATION",
      variant: "primary" as const,
    },
    {
      label: "Request Info",
      status: "NEEDS_CLARIFICATION",
      visible: deal.status === "NEW_SUBMISSION" || deal.status === "QUALIFIED",
      variant: "secondary" as const,
    },
    {
      label: "Mark as Paid",
      status: "CLOSED_PAID",
      visible: deal.status === "WON_PENDING_CLOSE",
      variant: "primary" as const,
    },
    {
      label: "Reject",
      status: "REJECTED",
      visible: deal.status !== "CLOSED_PAID",
      variant: "danger" as const,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deal Detail"
      subtitle="Review the deal summary, audit timeline, and status controls."
      size="lg"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-quantum-500">Deal</p>
            <p className="text-lg font-semibold text-quantum-50">{maskId("DEAL", deal.id)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status={deal.status} />
            {deal.buyer_track_snapshot && (
              <span className="rounded-full bg-quantum-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-quantum-200">
                Track {deal.buyer_track_snapshot}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-quantum-700 bg-quantum-900/60 p-4">
            <p className="text-xs uppercase tracking-widest text-quantum-500">Deal Summary</p>
            <div className="mt-3 space-y-2 text-sm text-quantum-300">
              <p>
                <span className="text-quantum-500">Property Type:</span>{" "}
                {typeof propertyType === "string" ? propertyType : "Not specified"}
              </p>
              <p>
                <span className="text-quantum-500">Max Price:</span> {formatCurrency(maxPrice)}
              </p>
              <p>
                <span className="text-quantum-500">Location:</span> {typeof location === "string" ? location : "Not specified"}
              </p>
              {typeof notes === "string" && notes.trim() !== "" && (
                <p>
                  <span className="text-quantum-500">Buyer Notes:</span> {notes}
                </p>
              )}
              {deal.exclusive_ends_at && (
                <p>
                  <span className="text-quantum-500">Exclusive Ends:</span>{" "}
                  {new Date(deal.exclusive_ends_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-quantum-700 bg-quantum-900/60 p-4">
            <p className="text-xs uppercase tracking-widest text-quantum-500">Parties</p>
            <div className="mt-3 space-y-2 text-sm text-quantum-300">
              <p>
                <span className="text-quantum-500">Buyer:</span> {maskId("BUYER", deal.buyer_profile_id)}
              </p>
              <p>
                <span className="text-quantum-500">Referrer:</span> {maskId("REF", deal.referrer_profile_id)}
              </p>
              {deal.internal_notes && (
                <p>
                  <span className="text-quantum-500">Internal Notes:</span> {deal.internal_notes}
                </p>
              )}
            </div>
          </div>
        </div>

        {deal.status === "BUYER_COMMITTED" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs uppercase tracking-widest text-red-300">
            Buyer committed. Proof of funds required within 4 hours.
          </div>
        )}

        {deal.status === "NEEDS_CLARIFICATION" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs uppercase tracking-widest text-amber-300">
            Waiting on buyer response. Deal is paused until clarification is received.
          </div>
        )}

        <div className="rounded-lg border border-quantum-700 bg-quantum-900/60 p-4">
          <p className="text-xs uppercase tracking-widest text-quantum-500">Status Controls</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions
              .filter((action) => action.visible)
              .map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => onRequestStatusChange(action.status)}
                >
                  {action.label}
                </Button>
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-quantum-700 bg-quantum-900/60 p-4">
          <p className="text-xs uppercase tracking-widest text-quantum-500">Audit Timeline</p>
          <div className="mt-4">
            {isLoadingAudit ? (
              <p className="text-sm text-quantum-500">Loading audit events...</p>
            ) : (
              <AuditTimeline entries={auditEntries} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

DealDetailDrawer.displayName = "DealDetailDrawer";
