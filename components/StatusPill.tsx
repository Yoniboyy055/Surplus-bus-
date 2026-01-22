import React from "react";

type StatusPillProps = {
  status: string;
  size?: "sm" | "md";
  className?: string;
};

const statusStyles: Record<string, string> = {
  ACTION_REQUIRED: "bg-red-500/20 text-red-300 border border-red-500/30",
  NEW_SUBMISSION: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  NEEDS_CLARIFICATION: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  QUALIFIED: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  MATCHING: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  OFFER_SENT: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  OFFER_VIEWED: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  EXCLUSIVE_WINDOW_ACTIVE: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  BUYER_COMMITTED: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  WON_PENDING_CLOSE: "bg-green-500/20 text-green-300 border border-green-500/30",
  CLOSED_PAID: "bg-green-500/20 text-green-300 border border-green-500/30",
  REJECTED: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  LOST: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  WITHDRAWN: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  ON_HOLD: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  PENDING: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  PAID: "bg-green-500/20 text-green-300 border border-green-500/30",
  FAILED: "bg-red-500/20 text-red-300 border border-red-500/30",
};

const sizeStyles = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-xs",
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = "md", className = "" }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");
  const label = status.replace(/_/g, " ");
  const style = statusStyles[normalized] ?? "bg-slate-700/30 text-slate-200 border border-slate-600/40";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wider ${sizeStyles[size]} ${style} ${className}`}
    >
      {label}
    </span>
  );
};

StatusPill.displayName = "StatusPill";
