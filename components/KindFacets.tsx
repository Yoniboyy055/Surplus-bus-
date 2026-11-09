import Link from "next/link";
import { KIND_LABEL } from "@/lib/opendata/search";
import { lotHref, type KindFacet, type LotParams } from "@/lib/opendata/lotParams";

/** One-tap kind filters for a search ("Cars & trucks 1,732 · Parts & accessories 536 …"). */
export function KindFacets({ path, params, facets, total, capped }: { path: string; params: LotParams; facets: KindFacet[]; total: number; capped: boolean }) {
  if (facets.length < 2 && !params.kind) return null;
  const all = facets.reduce((s, f) => s + f.n, 0);
  return (
    <nav aria-label="Filter by kind of item" className="space-y-2" data-testid="kind-facets">
      <div className="flex flex-wrap gap-2">
        <Link href={lotHref(path, params, { kind: "all" })} aria-current={params.kind == null ? "true" : undefined} className="chip-link">
          All <span className="chip-n">{(capped ? total : all).toLocaleString("en-CA")}</span>
        </Link>
        {facets.map((f) => (
          <Link key={f.kind} href={lotHref(path, params, { kind: f.kind })} aria-current={params.kind === f.kind ? "true" : undefined} className="chip-link" data-kind={f.kind}>
            {KIND_LABEL[f.kind]} <span className="chip-n">{f.n.toLocaleString("en-CA")}</span>
          </Link>
        ))}
      </div>
      <p className="text-xs text-[var(--sb-ink-soft)]">
        {params.kindIsDefault ? "Showing cars & trucks because your search looks like a vehicle. Tap All to include parts and accessories. " : ""}
        Kinds are worked out from lot titles (the open data has no category field), so a few lots may be in the wrong group.
        {capped ? ` Counts cover the newest ${all.toLocaleString("en-CA")} matches.` : ""}
      </p>
    </nav>
  );
}
