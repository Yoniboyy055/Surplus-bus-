import Link from "next/link";

const faqs = [
  {
    q: "What is Surplus Bus?",
    a: "Surplus Bus is an information service that organises Canadian government surplus and related public listings, ranks what fits your criteria, and links you to the official source. We never bid, broker, or take a cut.",
  },
  {
    q: "Do you broker or execute transactions?",
    a: "No. Surplus Bus is strictly an information service. We do not buy, sell, broker, negotiate, or execute any transactions. You always act on the official site.",
  },
  {
    q: "How do alerts work?",
    a: "You choose categories, regions, and filters. Matching open listings appear in your in-app inbox. Email alerts are not available in this phase — digests are in-app only for now.",
  },
  {
    q: "How often is data updated?",
    a: "Live lot ingest is not built yet for most sources. Several sites are Official site only (link-out). Open-data hooks for CanadaBuys CSV, GC Surplus sold CSV, and Nova Scotia are reserved pending a feed decision. We will not invent sample rows.",
  },
  {
    q: "What cities and regions are covered?",
    a: "We list federal, provincial, and municipal sources on the Sources page. Many are Official site only until an approved ingest path exists — including Ottawa, Hamilton, and Infrastructure Ontario portals we will not scrape.",
  },
  {
    q: "What sources do you monitor?",
    a: "Each source is listed on /sources with its honesty status (Official site only or hook pending). Open a source's official site to see current listings.",
  },
  {
    q: "How accurate is availability and pricing information?",
    a: "When we show listing data, it comes from official sources. Always verify details on the original page before acting. Closed listings are filtered out of ranking.",
  },
  {
    q: "Will I receive spam?",
    a: "Marketing emails default off. We only email product updates if you opted in (for example via the waitlist consent box). Alert delivery is in-app inbox only for now. Manage preferences in Settings.",
  },
  {
    q: "Can I unsubscribe from emails?",
    a: "Yes. Marketing and product emails include an unsubscribe link, and you can turn them off in Settings. Account and billing notices may still be sent when needed.",
  },
  {
    q: "Is there a refund policy?",
    a: "Surplus Bus currently operates on a freemium model. The Free tier is always free. If you upgrade to Pro during the beta period, we offer a full refund within 14 days if you are not satisfied.",
  },
  {
    q: "How is my data handled?",
    a: "We store only what is necessary to operate the service: your email, alert preferences, and saved listings. We do not sell your data. See our Privacy Policy for full details.",
  },
  {
    q: "Who is Surplus Bus built for?",
    a: "Surplus Bus is built for resellers, small businesses, fleet managers, municipal buyers, and anyone who wants organised visibility into Canadian government surplus opportunities.",
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
