import Link from "next/link";

export const metadata = { title: "Checkout cancelled — Surplus Bus", robots: { index: false } };

export default function BillingCancelPage() {
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
      <h1 className="sb-title text-[30px] text-[var(--sb-ink)]">Checkout cancelled</h1>
      <p className="text-[var(--sb-ink-soft)]">No charge was made. The free plan keeps working.</p>
      <Link href="/pricing" className="btn btn-outline no-underline text-[var(--sb-ink)]">Back to pricing</Link>
    </main>
  );
}
