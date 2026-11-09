import { LegalDoc, H2, legalContact } from "@/components/LegalDoc";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const c = legalContact();
  return (
    <LegalDoc title="Privacy Policy" updated="November 9, 2026">
      <p>
        This policy explains what personal information Surplus Bus ({c.operator}) collects, why, and your choices. We follow
        Canada&rsquo;s Personal Information Protection and Electronic Documents Act (PIPEDA) and, for email, Canada&rsquo;s
        Anti-Spam Legislation (CASL).
      </p>
      <H2>What we collect</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Account:</strong> your email address and, if you add them, your name and phone number.</li>
        <li><strong>Your use of the product:</strong> saved searches, alert settings, inbox items and when you read them.</li>
        <li><strong>Consent records:</strong> what you agreed to (the exact text) and when, for alert and product-update emails.</li>
        <li><strong>Billing:</strong> your plan, subscription status and a Stripe customer ID. Card details go to Stripe, not us.</li>
        <li><strong>Waitlist:</strong> email, optional use case, and whether you agreed to updates.</li>
        <li>
          <strong>Product analytics:</strong> counts of actions such as &ldquo;search run&rdquo; or &ldquo;search saved&rdquo;, with no
          name, email, IP address or free-text search terms attached.
        </li>
        <li><strong>Security logs:</strong> our hosting provider keeps short-lived request logs, including IP addresses, to run and protect the service.</li>
      </ul>
      <H2>What we do not collect</H2>
      <p>
        Government open data sometimes includes the names, emails or phone numbers of government staff. We remove these before
        anything is stored and never show them. We do not buy personal data and we do not sell yours.
      </p>
      <H2>Why we use it</H2>
      <p>
        To run your account, run your saved searches and deliver alerts, bill you, keep the service secure, meet legal duties,
        and improve the product using aggregate figures. We only send alert or product-update emails if you have opted in, and
        every such email has a one-click unsubscribe.
      </p>
      <H2>Who processes it for us</H2>
      <p>
        Supabase (database and sign-in), Vercel (hosting), Stripe (payments) and Resend (email). Some of these store data
        outside Canada, including in the United States, where it may be accessible to authorities under local law. [Data
        regions to be confirmed in legal review.]
      </p>
      <H2>How long we keep it</H2>
      <p>
        Account data is kept while your account is open. When you delete your account we delete or anonymise your personal
        information within 30 days, except billing records we must keep for tax purposes and consent records kept as proof of
        consent. [Retention periods to be confirmed in legal review.]
      </p>
      <H2>Your choices and rights</H2>
      <p>
        You can see and change your profile and email choices in Settings, and unsubscribe from any email with one click. You
        can ask for a copy of your information, ask us to correct it, or ask us to delete your account by writing to {c.email}.
        We reply within 30 days. If you are not satisfied, you may contact the Office of the Privacy Commissioner of Canada.
      </p>
      <H2>Contact</H2>
      <p>
        Privacy contact: {c.email}, {c.address}.
      </p>
    </LegalDoc>
  );
}
