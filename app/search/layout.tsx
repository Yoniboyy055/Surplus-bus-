import { Suspense } from "react";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-[var(--sb-muted)]">Loading search…</div>}>{children}</Suspense>;
}
