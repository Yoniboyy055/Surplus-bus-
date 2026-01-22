import React from "react";
import { StatusPill } from "./StatusPill";

type Deal = {
  id: string;
  status: string;
  created_at: string;
  criteria?: Record<string, unknown> | null;
  buyer_track_snapshot?: string | null;
};

interface KanbanBoardProps {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
}

const columns = [
  { key: "NEW_SUBMISSION", label: "New Submission" },
  { key: "NEEDS_CLARIFICATION", label: "Needs Clarification" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "MATCHING", label: "Matching" },
  { key: "BUYER_COMMITTED", label: "Buyer Committed" },
  { key: "WON_PENDING_CLOSE", label: "Won Pending Close" },
];

const getCriteriaValue = (criteria: Record<string, unknown> | null | undefined, key: string) => {
  if (!criteria) return undefined;
  return criteria[key];
};

const formatCurrency = (value: unknown) => {
  const amount = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  );
};

const dealAge = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  if (Number.isNaN(diffMs)) return "Unknown";
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${days}d`;
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ deals, onSelectDeal }) => {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      {columns.map((column) => {
        const columnDeals = deals.filter((deal) => deal.status === column.key);
        return (
          <div key={column.key} className="flex flex-col gap-3 rounded-xl border border-quantum-800 bg-quantum-900/40 p-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-quantum-400">
              <span>{column.label}</span>
              <span className="text-quantum-500">{columnDeals.length}</span>
            </div>
            <div className="space-y-3">
              {columnDeals.length === 0 ? (
                <div className="rounded-lg border border-dashed border-quantum-700 p-3 text-xs text-quantum-500">
                  No deals in this stage.
                </div>
              ) : (
                columnDeals.map((deal) => {
                  const propertyType = getCriteriaValue(deal.criteria ?? {}, "property_type");
                  const maxPrice = getCriteriaValue(deal.criteria ?? {}, "max_price");
                  const location = getCriteriaValue(deal.criteria ?? {}, "location");

                  return (
                    <button
                      key={deal.id}
                      onClick={() => onSelectDeal(deal)}
                      className="w-full rounded-lg border border-quantum-700 bg-quantum-900/70 p-3 text-left transition hover:border-cyan-500/60 hover:bg-quantum-900"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-quantum-500">
                        <span>Deal {deal.id.slice(0, 8)}</span>
                        <span>{dealAge(deal.created_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={deal.status} size="sm" />
                        {deal.buyer_track_snapshot && (
                          <span className="rounded-full bg-quantum-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-quantum-200">
                            Track {deal.buyer_track_snapshot}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-quantum-300">
                        <p>
                          <span className="text-quantum-500">Property:</span>{" "}
                          {typeof propertyType === "string" ? propertyType : "Not specified"}
                        </p>
                        <p>
                          <span className="text-quantum-500">Max Price:</span> {formatCurrency(maxPrice)}
                        </p>
                        <p>
                          <span className="text-quantum-500">Location:</span>{" "}
                          {typeof location === "string" ? location : "Not specified"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

KanbanBoard.displayName = "KanbanBoard";
