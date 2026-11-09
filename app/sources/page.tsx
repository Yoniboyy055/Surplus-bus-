"use client";

import { SOURCE_REGISTRY } from "@/lib/sources/modes";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";
import { ExternalLink } from "lucide-react";

export default function SourcesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--sb-text)]">Sources</h1>
        <p className="text-[var(--sb-text-muted)] text-sm mt-1">
          The feed never looks more live than this. Official site only means we can&apos;t list that
          site&apos;s lots here yet — open the official site to see current listings.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--sb-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sb-bg-elevated)] text-left text-[var(--sb-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Notes</th>
              <th className="px-4 py-3 font-medium">Official</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_REGISTRY.map((s) => (
              <tr key={s.parserKey} className="border-t border-[var(--sb-border)] bg-[var(--sb-surface)]">
                <td className="px-4 py-3 text-[var(--sb-text)] font-medium">
                  {s.name}
                  <div className="text-xs text-[var(--sb-text-disabled)]">{s.province}</div>
                </td>
                <td className="px-4 py-3">
                  <SourceStatusBadge level={s.mode === "hook_pending" ? "official_site_only" : s.mode} />
                </td>
                <td className="px-4 py-3 text-[var(--sb-text-muted)] hidden md:table-cell max-w-md">
                  {s.honesty}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={s.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--sb-accent)] hover:underline"
                  >
                    Open <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
