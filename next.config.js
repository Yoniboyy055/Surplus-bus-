/** @type {import('next').NextConfig} */

// Supabase is the only third-party origin the browser talks to (auth + PostgREST).
// Stripe Checkout/Portal are full-page redirects, so they need no CSP entry.
function supabaseOrigins() {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return [u.origin, `wss://${u.host}`];
  } catch {
    return [];
  }
}

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Next 14 App Router injects inline bootstrap scripts; a nonce-based policy needs
  // middleware + dynamic rendering everywhere (tracked in the review package).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ${supabaseOrigins().join(" ")}`.trim(),
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Signed-in and API responses must never be cached by shared caches.
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
