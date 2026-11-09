import Link from "next/link";
import { ALERTS_HONESTY_NOTE, PLANS, effectiveMonthly, formatPlanPrice } from "@/lib/billing/plans";
import { CheckoutButton } from "./CheckoutButton";

/** Pricing cards rendered from lib/billing/plans.ts (single source of truth). */
export function PlanCards({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const free = PLANS.free;
  const monthly = PLANS.pro_monthly;
  const annual = PLANS.pro_annual;
  const eff = effectiveMonthly(annual);
  const Bullet = ({ f }: { f: string }) => (
    <li className="relative pl-[18px] before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[var(--sb-ok)]">{f}</li>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col" data-plan="free">
          <h3 className="sb-title text-xl text-[var(--sb-ink)]">{free.name}</h3>
          <div className="sb-mono my-2.5 text-[32px] font-bold text-[var(--sb-ink)]">{formatPlanPrice(free)}</div>
          <ul className="mb-5 flex-1 space-y-1.5 text-sm text-[var(--sb-ink-soft)]">{free.features.map((f) => <Bullet key={f} f={f} />)}</ul>
          <Link href="/comps" className="btn btn-ghost no-underline text-[var(--sb-ink)]">Start free</Link>
        </div>
        <div className="card flex flex-col border-[rgba(132,89,36,0.35)]" data-plan="pro">
          <h3 className="sb-title text-xl text-[var(--sb-ink)]">{monthly.name}</h3>
          <div className="sb-mono my-2.5 text-[32px] font-bold text-[var(--sb-ink)]" data-price-monthly={monthly.priceCad}>
            {formatPlanPrice(monthly)}
          </div>
          <p className="-mt-1 mb-3 text-sm text-[var(--sb-ink-soft)]" data-price-annual={annual.priceCad}>
            or {formatPlanPrice(annual)}{eff ? ` (about C$${eff.toFixed(2)}/mo)` : ""}
          </p>
          <ul className="mb-5 flex-1 space-y-1.5 text-sm text-[var(--sb-ink-soft)]">{monthly.features.map((f) => <Bullet key={f} f={f} />)}</ul>
          {checkoutEnabled ? (
            <div className="flex flex-wrap gap-2">
              <CheckoutButton plan="pro_monthly" label={`Get Pro · ${formatPlanPrice(monthly)}`} />
              <CheckoutButton plan="pro_annual" label={`Annual · ${formatPlanPrice(annual)}`} variant="outline" />
            </div>
          ) : (
            <Link href="/landing" className="btn btn-primary no-underline">Join the waitlist</Link>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-[var(--sb-ink-soft)]">
        Prices in CAD, plus applicable tax. Cancel anytime from Settings. {ALERTS_HONESTY_NOTE}
      </p>
    </div>
  );
}
