import React from "react";
import { StatusPill } from "./StatusPill";

type AuditEntry = {
  id: string;
  action: string;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

interface AuditTimelineProps {
  entries: AuditEntry[];
  emptyMessage?: string;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ entries, emptyMessage = "No audit events yet." }) => {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-quantum-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const metadata = entry.metadata ?? {};
        const note = typeof metadata.internal_note === "string" ? metadata.internal_note : null;
        const message = typeof metadata.message === "string" ? metadata.message : null;

        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-cyan-500 shadow-glow-cyan" />
              <div className="flex-1 w-px bg-quantum-700" />
            </div>
            <div className="flex-1 space-y-2 rounded-lg border border-quantum-700 bg-quantum-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-quantum-400">
                <span>{formatTimestamp(entry.created_at)}</span>
                {entry.actor_role && (
                  <span className="uppercase tracking-wider">{entry.actor_role}</span>
                )}
              </div>
              <div className="text-sm font-semibold text-quantum-100">{entry.action}</div>
              {(entry.from_status || entry.to_status) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-quantum-300">
                  {entry.from_status && <StatusPill status={entry.from_status} size="sm" />}
                  <span className="text-quantum-500">→</span>
                  {entry.to_status && <StatusPill status={entry.to_status} size="sm" />}
                </div>
              )}
              {message && (
                <p className="text-xs text-quantum-300">
                  Buyer message: <span className="text-quantum-200">{message}</span>
                </p>
              )}
              {note && (
                <p className="text-xs text-quantum-300">
                  Internal note: <span className="text-quantum-200">{note}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

AuditTimeline.displayName = "AuditTimeline";
