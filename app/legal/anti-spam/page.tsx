import { LegalDoc, H2, legalContact } from "@/components/LegalDoc";
import { ALERT_EMAIL_CONSENT_TEXT } from "@/lib/alerts/schemas";
import { MARKETING_CONSENT_TEXT } from "@/lib/account/schemas";

export const metadata = { title: "Email consent (CASL)" };

export default function AntiSpamPage() {
  const c = legalContact();
  return (
    <LegalDoc title="Email consent (CASL)" updated="November 9, 2026">
      <p>We only send commercial email you have expressly agreed to, as Canada&rsquo;s Anti-Spam Legislation requires.</p>
      <H2>What you can opt in to</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Alert emails</strong> (Pro): &ldquo;{ALERT_EMAIL_CONSENT_TEXT}&rdquo;</li>
        <li><strong>Product updates</strong>: &ldquo;{MARKETING_CONSENT_TEXT}&rdquo;</li>
      </ul>
      <p>Neither box is pre-ticked. We record the exact wording you agreed to and when.</p>
      <H2>Unsubscribing</H2>
      <p>
        Every email has an unsubscribe link that works in one click, and supports your mail app&rsquo;s built-in unsubscribe
        button. We act on it immediately (the law allows up to 10 business days). You can also turn emails off in Settings.
        In-app alerts in your inbox are not email and are not affected.
      </p>
      <H2>Who sends it</H2>
      <p>
        Emails come from {c.operator}, {c.address}, contact {c.email}. Account and security notices (for example sign-in links
        and billing receipts) are sent without marketing consent because they are needed to provide the service.
      </p>
    </LegalDoc>
  );
}
