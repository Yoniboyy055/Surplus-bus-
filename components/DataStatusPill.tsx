"use client";

import { useEffect, useState } from "react";

export function DataStatusPill() {
  const [status, setStatus] = useState<"green" | "amber" | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.dataStatus && setStatus(d.dataStatus))
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        status === "green" ? "bg-accent-success/20 text-accent-success" : "bg-amber-500/20 text-amber-400"
      }`}
    >
      Data {status === "green" ? "fresh" : "stale"}
    </span>
  );
}
