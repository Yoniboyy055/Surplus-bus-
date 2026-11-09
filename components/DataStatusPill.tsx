"use client";

import { useEffect, useState } from "react";

export function DataStatusPill() {
  const [status, setStatus] = useState<"green" | "amber" | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.dataStatus && setStatus(d.dataStatus))
      .catch(() => {});
  }, []);

  if (!status) return null;

  return (
    <span
      className={`chip !py-0.5 !px-2 text-[10px] font-bold uppercase tracking-wider ${
        status === "green"
          ? "!bg-[var(--sb-success-bg)] !text-[var(--sb-ok-text)] !border-[rgba(108,126,87,0.25)]"
          : "!bg-[var(--sb-warning-bg)] !text-[var(--sb-warn-text)] !border-[rgba(188,143,25,0.28)]"
      }`}
    >
      Data {status === "green" ? "fresh" : "stale"}
    </span>
  );
}
