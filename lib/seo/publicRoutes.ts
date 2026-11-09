/** Public, indexable pages. Everything signed-in, ops, API and auth stays out of the index. */
export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/comps", changeFrequency: "daily", priority: 0.9 },
  { path: "/price-history", changeFrequency: "daily", priority: 0.8 },
  { path: "/tenders", changeFrequency: "daily", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/sources", changeFrequency: "monthly", priority: 0.5 },
  { path: "/watchlist", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/anti-spam", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/attributions", changeFrequency: "yearly", priority: 0.2 },
] as const;

export const DISALLOWED_PREFIXES = [
  "/api/",
  "/auth",
  "/ops",
  "/dashboard",
  "/saved",
  "/inbox",
  "/settings",
  "/billing",
  "/onboarding",
  "/unsubscribe",
  "/demo",
  "/pilot",
  "/design",
  "/analytics",
] as const;
