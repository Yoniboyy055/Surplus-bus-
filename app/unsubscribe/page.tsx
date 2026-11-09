export const metadata = { title: "Unsubscribe — Surplus Bus", robots: { index: false } };

const LABEL: Record<string, string> = {
  marketing: "product update emails",
  news: "news emails",
  alerts: "saved-search alert emails",
  all: "all emails",
};

export default async function UnsubscribePage({ searchParams: searchParamsP }: { searchParams: Promise<{ token?: string; kind?: string; done?: string }> }) {
  const searchParams = await searchParamsP;
  const kind = LABEL[searchParams.kind || ""] ? (searchParams.kind as string) : "marketing";
  if (searchParams.done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="sb-title mb-2 text-[26px]">You’re unsubscribed</h1>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          We won’t send you {LABEL[kind]} any more. It takes effect immediately. You can turn emails back on in Settings.
        </p>
      </div>
    );
  }
  if (!searchParams.token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="sb-title mb-2 text-[26px]">Unsubscribe link incomplete</h1>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          Use the link in the email, reply “unsubscribe” to any email, or change email settings after signing in.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="sb-title mb-2 text-[26px]">Unsubscribe from {LABEL[kind]}?</h1>
      <p className="mb-6 text-sm text-[var(--sb-ink-soft)]">One click. No sign-in needed.</p>
      <form method="post" action="/api/unsubscribe">
        <input type="hidden" name="token" value={searchParams.token} />
        <input type="hidden" name="kind" value={kind} />
        <button type="submit" className="btn btn-primary">Unsubscribe</button>
      </form>
    </div>
  );
}
