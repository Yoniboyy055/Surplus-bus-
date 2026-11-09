import Link from "next/link";
import { LegalDoc, H2, legalContact } from "@/components/LegalDoc";
import { PLANS, formatPlanPrice } from "@/lib/billing/plans";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const c = legalContact();
  return (
    <LegalDoc title="Terms of Service" updated="November 9, 2026">
      <p>
        These terms cover your use of Surplus Bus, operated by {c.operator} (&ldquo;we&rdquo;). By creating an account or using
        the site you agree to them. If you do not agree, do not use the service.
      </p>
      <H2>1. What Surplus Bus is</H2>
      <p>
        Surplus Bus is an information service. It shows sold-price history and public tender notices drawn from Canadian
        government open data, and lets you save searches and get alerts. We are <strong>not</strong> a broker, auctioneer,
        government body or agent of any government. We do not sell, hold or bid on any item. Live auctions take place only on
        the official sites, under their own terms.
      </p>
      <H2>2. Information only — no guarantee</H2>
      <p>
        Price ranges are statistics computed from past public sale records. They are not appraisals, offers or advice, and
        past prices do not predict future results. Source data can be late, incomplete or wrong, and our matching can miss or
        mis-group items. Always check the official listing and do your own inspection before you bid. You are responsible
        for your bidding decisions.
      </p>
      <H2>3. Accounts</H2>
      <p>
        You must give a valid email address and keep your sign-in secure. You must be at least the age of majority in your
        province to buy a paid plan. One person per account.
      </p>
      <H2>4. Plans, billing and cancellation</H2>
      <p>
        The Free plan costs {formatPlanPrice(PLANS.free)}. Pro is {formatPlanPrice(PLANS.pro_monthly)} or{" "}
        {formatPlanPrice(PLANS.pro_annual)}, in Canadian dollars, plus applicable taxes, as shown on the{" "}
        <Link href="/pricing" className="underline text-[var(--sb-accent-700)]">pricing page</Link> at checkout. Payments are
        processed by Stripe; we never see your full card number. Subscriptions renew automatically until you cancel. You can
        cancel at any time from Settings → Plan &amp; billing; access continues to the end of the paid period. [Refund policy
        to be confirmed in legal review.] We will give at least 30 days&rsquo; notice by email before any price change applies
        to an existing subscription.
      </p>
      <H2>5. Acceptable use</H2>
      <p>
        Do not scrape, resell or bulk-download the service, try to get around plan limits or security, or use it to send spam
        or to contact government staff about anything other than their official business. We may suspend accounts that do.
      </p>
      <H2>6. Open data and third-party content</H2>
      <p>
        Source data is used under the Open Government Licence – Canada and the Open Government Licence – Nova Scotia; see{" "}
        <Link href="/legal/attributions" className="underline text-[var(--sb-accent-700)]">Attributions</Link>. Links to official
        sites are provided for convenience; we do not control them.
      </p>
      <H2>7. Liability</H2>
      <p>
        To the extent the law allows, the service is provided &ldquo;as is&rdquo;, and our total liability for any claim is limited
        to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under
        consumer protection law in your province that cannot be waived.
      </p>
      <H2>8. Changes and contact</H2>
      <p>
        We may update these terms; we will post the new date above and email account holders about material changes. Questions:{" "}
        {c.email}, {c.address}.
      </p>
      <p className="text-sm text-[var(--sb-ink-soft)]">Governing law: [province to be confirmed in legal review], Canada.</p>
    </LegalDoc>
  );
}
