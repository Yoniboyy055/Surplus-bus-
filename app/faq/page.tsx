import Link from "next/link";

const faqs = [
  {
    q: "What is Surplus Bus?",
    a: "Surplus Bus is an intelligence and alerts platform that monitors Canadian government surplus listings, public auctions, and procurement opportunities. We surface relevant opportunities early so you can act on them.",
  },
  {
    q: "Do you broker or execute transactions?",
    a: "No. Surplus Bus is strictly an information service. We do not buy, sell, broker, negotiate, or execute any transactions. Users act independently on the opportunities they discover.",
  },
  {
    q: "How do alerts work?",
    a: "You choose categories, regions, and keyword filters. When a matching listing appears in our monitored sources, we notify you via email. Free accounts get basic alerts; Pro accounts get unlimited custom alerts with priority delivery.",
  },
  {
    q: "How often is data updated?",
    a: "Our automated agents scan government sources multiple times per day. New listings typically appear within hours of being published by the issuing entity.",
  },
  {
    q: "What cities and regions are covered?",
    a: "We currently monitor surplus listings from federal sources (GCSurplus), provincial sources (Alberta, Ontario), and municipal sources including Calgary, Edmonton, Toronto, and Ottawa. Coverage is expanding regularly.",
  },
  {
    q: "What sources do you monitor?",
    a: "We aggregate from official government surplus portals, municipal auction pages, and provincial procurement sites. Each source is listed on our Sources page with its update frequency and status.",
  },
  {
    q: "How accurate is availability and pricing information?",
    a: "We relay listing data directly from official sources. Availability, pricing, and closing dates reflect what the issuing entity publishes. We recommend verifying details on the original source before acting.",
  },
  {
    q: "Will I receive spam?",
    a: "No. We only send alerts you have configured and occasional product updates if you opted in. You can manage your email preferences in Settings at any time.",
  },
  {
    q: "Can I unsubscribe from emails?",
    a: "Yes. Every email includes a one-click unsubscribe link. You can also disable all email notifications from your Settings page.",
  },
  {
    q: "Is there a refund policy?",
    a: "Surplus Bus currently operates on a freemium model. The Free tier is always free. If you upgrade to Pro during the beta period, we offer a full refund within 14 days if you are not satisfied.",
  },
  {
    q: "How is my data handled?",
    a: "We store only what is necessary to operate the service: your email, alert preferences, and saved opportunities. We do not sell your data. See our Privacy Policy for full details.",
  },
  {
    q: "Who is Surplus Bus built for?",
    a: "Surplus Bus is built for resellers, small businesses, fleet managers, municipal buyers, and anyone who wants early visibility into Canadian government surplus opportunities.",
  },
];

export default function FAQPage() {
  return (
    <section className="max-w-3xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-quantum-800 pb-4">
            <h2 className="font-semibold text-quantum-50">{faq.q}</h2>
            <p className="mt-2 text-quantum-400 text-sm leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-quantum-500">
        Have another question?{" "}
        <Link href="/landing" className="text-cyan-500 hover:text-cyan-400">
          Join the beta
        </Link>{" "}
        and let us know.
      </p>
    </section>
  );
}
