import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Surplus Referral Platform</h1>
      <p className="text-sm text-slate-300">
        This is a minimal MVP scaffold for auth, roles, and health checks.
      </p>
      <ul className="space-y-3 text-sm">
        <li>
          <Link
            href="/auth"
            className="text-slate-200 underline decoration-slate-600 underline-offset-4 transition hover:text-white"
          >
            Go to auth
          </Link>
        </li>
        <li>
          <Link
            href="/api/health"
            className="text-slate-200 underline decoration-slate-600 underline-offset-4 transition hover:text-white"
          >
            API health
          </Link>
        </li>
      </ul>
    </section>
  );
}
