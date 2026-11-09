import { test, expect } from "@playwright/test";
import { shot, trackConsole, noHorizontalOverflow, axeSeriousOrCritical, assertNoStaffPii } from "./helpers";

test.describe("Home and search (signed out)", () => {
  test("home renders and search routes to comps", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Know the sold range");
    await expect(page.getByText(/84,995 sold-lot records/)).toBeVisible();
    await shot(page, "01_home");
    await page.getByRole("textbox", { name: "Search sold surplus" }).fill("pickup truck");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/comps\?q=pickup(\+|%20)truck/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("pickup truck");
    await shot(page, "02_comps_pickup_truck");
    await noHorizontalOverflow(page);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("AI images are labelled as illustrations", async ({ page }) => {
    await page.goto("/");
    const alts = await page.locator("img[src*='hero_surplus_still_life'], img[srcset*='hero_surplus_still_life']").evaluateAll((els) => els.map((e) => e.getAttribute("alt") || ""));
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(a).toMatch(/illustration$/);
    await page.goto("/legal/attributions");
    await expect(page.locator("[data-ai-credit]")).toContainText("AI-generated illustrations");
  });

  test("comps reflects query safely (no HTML injection)", async ({ page }) => {
    const payload = '<img src=x onerror="window.__xss=1">';
    await page.goto(`/comps?q=${encodeURIComponent(payload)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("<img");
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test("signed-out save prompts sign-in", async ({ page }) => {
    await page.goto("/comps?q=pickup%20truck");
    await page.getByRole("button", { name: "Save this search" }).click();
    await expect(page.getByRole("link", { name: "Sign in to save this search" })).toBeVisible();
  });
});

test.describe("Open-data pages (real tables via mock Supabase)", () => {
  test("price history: rows, OGL attribution, no staff contact details", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/price-history");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.locator("table tbody tr").count()).toBeGreaterThan(0);
    await expect(page.getByText(/Open Government Licence/i).first()).toBeVisible();
    assertNoStaffPii(await page.content(), "/price-history");
    await shot(page, "05_price_history");
    await noHorizontalOverflow(page);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("tenders: rows, attribution, no officer contact details", async ({ page }) => {
    await page.goto("/tenders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.locator("article").count()).toBeGreaterThan(0);
    await expect(page.getByText(/Open Government Licence/i).first()).toBeVisible();
    assertNoStaffPii(await page.content(), "/tenders");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tender notices open on CanadaBuys");
    // "Open" on CanadaBuys but closed before today: hidden and counted
    await expect(page.getByText("E2E past closing notice")).toHaveCount(0);
    await expect(page.locator("[data-hidden-past]")).toContainText("closed before today");
    // RFI and ACAN keep their real type, flagged as not normal bids
    await expect(page.locator('[data-notice-kind="rfi"]')).toContainText("Request for information");
    await expect(page.locator('[data-notice-kind="rfi"]')).toContainText("not a bid opportunity");
    await expect(page.locator('[data-notice-kind="acan"]')).toContainText("Advance contract award notice");
    await shot(page, "06_tenders");
    await noHorizontalOverflow(page);
  });

  test("comps for the synthetic-contact lot shows the lot but not the contact", async ({ page }) => {
    await page.goto("/comps?q=pickup%20truck%204x4");
    assertNoStaffPii(await page.content(), "/comps");
  });

  test("watchlist lists official sites only (no made-up rows)", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.getByRole("heading", { level: 1, name: "Official sites to watch" })).toBeVisible();
    await expect(page.getByText("n was 128")).toHaveCount(0);
    await shot(page, "07_watchlist");
  });
});

test.describe("Waitlist, unsubscribe, gates, legal, SEO", () => {
  test("waitlist requires consent and records it", async ({ page }) => {
    await page.goto("/landing");
    await page.getByLabel("Work email").fill(`e2e-${Date.now()}@example.test`);
    await expect(page.locator('input[type="checkbox"]')).toHaveAttribute("required", "");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "Join waitlist" }).click();
    await expect(page.getByText(/on the (waitlist|list)|You're in|Thanks/i).first()).toBeVisible();
    await shot(page, "09_waitlist_joined");
  });

  test("unsubscribe: GET never mutates, POST one-click works, unknown token is neutral", async ({ request }) => {
    // No token: neutral redirect to the unsubscribe page (never an error page, never a mutation)
    expect([303, 400]).toContain((await request.get("/api/unsubscribe", { maxRedirects: 0 })).status());
    const g = await request.get("/api/unsubscribe?token=does-not-exist&kind=marketing", { maxRedirects: 0 });
    expect(g.status()).toBe(303);
    const p = await request.post("/api/unsubscribe?token=does-not-exist&kind=marketing", { form: { "List-Unsubscribe": "One-Click" } });
    expect(p.status()).not.toBe(405);
    expect(p.status()).not.toBe(500);
  });

  test("protected pages redirect to /auth when signed out", async ({ page }) => {
    for (const p of ["/dashboard", "/saved", "/inbox", "/settings", "/ops", "/alerts", "/digest"]) {
      await page.goto(p);
      await expect(page, p).toHaveURL(/\/auth/);
    }
    await shot(page, "10_auth_redirect");
  });

  test("signed-out API calls are rejected", async ({ request }) => {
    for (const [m, p] of [["GET", "/api/saved-searches"], ["GET", "/api/inbox"], ["PATCH", "/api/profile"], ["POST", "/api/preferences/marketing"], ["POST", "/api/billing/checkout"]] as const) {
      const r = await request.fetch(p, { method: m, data: {} });
      expect([401, 403], `${m} ${p} -> ${r.status()}`).toContain(r.status());
    }
  });

  test("cron/agent routes reject unauthenticated calls", async ({ request }) => {
    for (const p of ["/api/agents/run?parser_key=canadabuys", "/api/cron/opendata-ingest", "/api/cron/saved-search-alerts", "/api/agents/news", "/api/agents/recon"]) {
      const r = await request.get(p);
      expect([401, 403], `${p} returned ${r.status()}`).toContain(r.status());
    }
  });

  test("legal pages are drafts marked for review and linked", async ({ page }) => {
    for (const [p, h] of [["/legal/terms", /Terms/], ["/legal/privacy", /Privacy/], ["/legal/anti-spam", /Email consent/], ["/legal/attributions", /Attributions/]] as const) {
      await page.goto(p);
      await expect(page.getByRole("heading", { level: 1, name: h })).toBeVisible();
      await expect(page.locator("[data-legal-draft]")).toBeVisible();
    }
    await shot(page, "11_attributions");
  });

  test("robots.txt, sitemap.xml and OG image", async ({ request, page }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap:");
    const sm = await request.get("/sitemap.xml");
    expect(sm.status()).toBe(200);
    expect(await sm.text()).toContain("/price-history");
    expect((await request.get("/og.png")).status()).toBe(200);
    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });

  test("security headers", async ({ request }) => {
    const r = await request.get("/");
    const csp = r.headers()["content-security-policy"] || "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*https:/);
    expect(r.headers()["x-frame-options"]).toBe("DENY");
    expect(r.headers()["strict-transport-security"]).toContain("max-age=");
  });

  test("unknown route returns 404", async ({ page }) => {
    const r = await page.goto("/this-does-not-exist");
    expect(r?.status()).toBe(404);
  });
});

const A11Y_PAGES = ["/", "/search", "/comps?q=pickup%20truck", "/comps?q=zzzz-no-match", "/price-history", "/tenders", "/watchlist", "/sources", "/landing", "/pricing", "/faq", "/product", "/legal/terms", "/legal/privacy", "/legal/anti-spam", "/legal/attributions", "/auth", "/unsubscribe?done=1&kind=marketing", "/unsubscribe?token=abc&kind=alerts", "/billing/cancel"];
for (const p of A11Y_PAGES) {
  test(`a11y (signed out): no serious/critical axe violations on ${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
}
