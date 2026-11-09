import Link from "next/link";

/** Contact details come from env so nothing personal is hard-coded. Placeholders show until set. */
export function legalContact() {
  return {
    email: process.env.PRIVACY_CONTACT_EMAIL || "[privacy contact email — to be set before launch]",
    address: process.env.BUSINESS_MAILING_ADDRESS || "[business mailing address — to be set before launch]",
    operator: process.env.LEGAL_OPERATOR_NAME || "YK+ Systems",
  };
}

export function LegalDoc({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="legal mx-auto max-w-3xl space-y-4 px-5 py-12 text-[15px] leading-relaxed text-[var(--sb-ink)]">
      <div className="banner warn" role="note" data-legal-draft>
        Draft for legal review. This text has not yet been reviewed by a lawyer and may change before launch.
      </div>
      <h1 className="sb-title text-[32px]">{title}</h1>
      <p className="text-sm text-[var(--sb-ink-soft)]">Last updated {updated}</p>
      {children}
      <p className="pt-6 text-sm text-[var(--sb-ink-soft)]">
        See also: <Link href="/legal/terms" className="underline text-[var(--sb-accent-700)]">Terms</Link> ·{" "}
        <Link href="/legal/privacy" className="underline text-[var(--sb-accent-700)]">Privacy</Link> ·{" "}
        <Link href="/legal/anti-spam" className="underline text-[var(--sb-accent-700)]">Email consent</Link> ·{" "}
        <Link href="/legal/attributions" className="underline text-[var(--sb-accent-700)]">Attributions</Link>
      </p>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="sb-title pt-4 text-xl">{children}</h2>;
}
