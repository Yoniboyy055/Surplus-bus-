import Link from "next/link";

export const metadata = { title: "Thanks — Surplus Bus", robots: { index: false } };

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
      <h1 className="sb-title text-[30px] text-[var(--sb-ink)]">Thanks — you’re on Pro</h1>
      <p className="text-[var(--sb-ink-soft)]">
        Your plan activates as soon as Stripe confirms the payment (usually a few seconds). You’ll see it in Settings.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/saved" className="btn btn-primary no-underline">Set up saved searches</Link>
        <Link href="/settings" className="btn btn-outline no-underline text-[var(--sb-ink)]">Settings</Link>
      </div>
    </main>
  );
}
