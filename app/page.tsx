import Link from "next/link";

const links = [
  { href: "/auth", label: "Sign in (magic link)" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/api/health", label: "API health check" },
];

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Standalone MVP Scaffold</h1>
        <p className="text-slate-300">
          Minimal Next.js + Supabase setup for auth, roles, and health checks.
        </p>
      </div>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-slate-200 underline decoration-slate-600 underline-offset-4 transition hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
