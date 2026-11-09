import Image from "next/image";
import { PlanCards } from "@/components/PlanCards";
import { fetchCorpusStats } from "@/lib/opendata/queries";
import { GCSURPLUS_SOLD_RECORDS_2023_2025 as FIG } from "@/lib/opendata/verifiedFigures";
import { OGL_CANADA } from "@/lib/opendata/attribution";
import { PAID_PLAN_IDS, PLANS, stripePriceId } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";



export default async function HomePage() {
  // Real counts from the database only; hidden when unavailable (no hard-coded stats).
  const stats = await fetchCorpusStats();
  const checkoutEnabled = stripeConfigured() && PAID_PLAN_IDS.every((id) => Boolean(stripePriceId(PLANS[id])));

  return (
    <>
      <section className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 text-center md:px-10">
        <div className="relative mx-auto mb-7 max-w-[920px] overflow-hidden rounded-[32px] shadow-raised bg-[var(--sb-surface)]">
          <Image
            src="/images/hero_surplus_still_life.jpg"
            alt="Soft 3D still life of surplus goods, AI-generated illustration"
            width={1840}
            height={920}
            className="h-auto w-full"
            priority
          />
          <span className="absolute right-3 top-3 rounded-full bg-[var(--sb-ink)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">
            AI illustration
          </span>
        </div>

        <p className="chip mx-auto">Canadian government surplus · sold-price guidance</p>
        <h1 className="sb-display mx-auto mt-4 max-w-[16ch] text-[clamp(32px,5vw,48px)] text-[var(--sb-ink)]">
          Know the sold range before you bid
        </h1>
        <p className="mx-auto mt-3.5 max-w-[42ch] text-lg text-[var(--sb-ink-soft)]">
          Search closed Canadian government surplus lots. See a guidance band from real sold prices —
          then open the official listing.
        </p>

        <form
          action="/comps"
          method="get"
          role="search"
          className="mx-auto mt-7 flex max-w-[640px] items-center gap-2.5 rounded-full border border-[var(--sb-line)] bg-[var(--sb-surface-raised)] py-2 pl-[22px] pr-2 shadow-raised"
        >
          <input
            name="q"
            required
            placeholder='Try “pickup truck” or “office chair”'
            aria-label="Search sold surplus"
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-3 text-base text-[var(--sb-ink)] shadow-none focus:ring-0"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <a href={FIG.datasetUrl} target="_blank" rel="noopener noreferrer" className="chip no-underline" data-stat="gcsurplus-records">
            {FIG.text}
          </a>
          {stats && (
            <span className="chip" data-stat="tenders">
              <strong>{stats.tenders.toLocaleString("en-CA")}</strong>&nbsp;open federal tenders today
            </span>
          )}
          <a href={OGL_CANADA.url} target="_blank" rel="noopener noreferrer" className="chip no-underline">Open Government Licence – Canada</a>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 pb-16 md:px-10">
        <h2 className="sb-title text-[28px] text-[var(--sb-ink)]">Pricing</h2>
        <p className="mb-6 text-[var(--sb-ink-soft)]">
          Simple plans. Live auctions stay on the official site — we link out.
        </p>
        <PlanCards checkoutEnabled={checkoutEnabled} />
      </section>
    </>
  );
}
