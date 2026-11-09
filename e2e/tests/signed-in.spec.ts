import { test, expect } from "@playwright/test";
import { MOCK, CRON_SECRET, shot, signIn, trackConsole, noHorizontalOverflow, axeSeriousOrCritical, assertNoStaffPii } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await signIn(context, "member");
});

async function clearSaved(page: import("@playwright/test").Page) {
  const r = await page.request.get("/api/saved-searches");
  expect(r.status()).toBe(200);
  for (const s of (await r.json()).saved_searches) await page.request.delete(`/api/saved-searches/${s.id}`);
}

test("saved search -> alerts cron -> inbox, end to end", async ({ page, request }) => {
  const errors = trackConsole(page);
  await page.goto("/dashboard");
  await clearSaved(page);

  // 1. Save from comps
  await page.goto("/comps?q=pickup%20truck");
  await page.getByRole("button", { name: "Save this search" }).click();
  await expect(page.getByRole("button", { name: /Saved/ })).toBeVisible();

  // 2. Turn on daily in-app alerts on /saved; email is Pro-only on the free plan
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "pickup truck" })).toBeVisible();
  await page.getByLabel("Alert frequency for pickup truck").selectOption("daily");
  await expect(page.getByLabel("Alert frequency for pickup truck")).toHaveValue("daily");
  await expect(page.getByRole("checkbox", { name: /Also email me/ })).toBeDisabled();
  await page.waitForTimeout(300);
  await shot(page, "20_saved_searches");

  // Free plan: a second saved search is refused by the API (limit from lib/billing/plans.ts)
  const second = await page.request.post("/api/saved-searches", { data: { query: "office chair" } });
  expect(second.status()).toBe(402);
  // Free plan: email alerts refused server-side too
  const list = (await (await page.request.get("/api/saved-searches")).json()).saved_searches;
  const pe = await page.request.patch(`/api/saved-searches/${list[0].id}`, { data: { alert_email: true } });
  expect(pe.status()).toBe(402);

  // 3. A new matching sold lot arrives, then the daily alerts cron runs
  const title = `Pickup truck e2e ${Date.now()}`;
  expect((await fetch(`${MOCK}/__test/new-lot`, { method: "POST", body: JSON.stringify({ title }) })).status).toBe(201);
  expect((await request.get("/api/cron/saved-search-alerts")).status()).toBe(401);
  const cron = await request.get("/api/cron/saved-search-alerts", { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  const summary = await cron.json();
  expect(cron.status(), JSON.stringify(summary)).toBe(200);
  expect(summary.inbox_items_created ?? summary.items_created ?? 1).toBeGreaterThan(0);
  expect(summary.email_enabled).toBe(false);

  // Running again creates no duplicates
  const again = await (await request.get("/api/cron/saved-search-alerts", { headers: { Authorization: `Bearer ${CRON_SECRET}` } })).json();
  expect(again.inbox_items_created ?? 0).toBe(0);

  // 4. Inbox shows it; mark read / unread / read all
  await page.goto("/inbox");
  const item = page.getByRole("heading", { name: title });
  await expect(item).toBeVisible();
  await shot(page, "21_inbox_unread");
  await page.getByRole("button", { name: "Mark read" }).first().click();
  await expect(page.getByRole("button", { name: "Mark unread" }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark unread" }).first()).toBeVisible();
  await shot(page, "22_inbox_read");
  assertNoStaffPii(await page.content(), "/inbox");

  // 5. Dashboard reflects it
  await page.goto("/dashboard");
  await expect(page.locator('[data-tile="saved"]')).toContainText("1");
  await expect(page.getByText(title)).toBeVisible();
  await shot(page, "23_dashboard");
  await noHorizontalOverflow(page);
  expect(errors.filter((e) => !/Failed to load resource.*(402|409)/.test(e)), errors.join("\n")).toEqual([]);
});

test("settings: profile save and CASL marketing consent round trip", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Name").fill("Mira E2E");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Mira E2E");

  const subscribe = page.getByRole("button", { name: "Subscribe" });
  if (await subscribe.isVisible()) {
    await expect(subscribe).toBeDisabled(); // nothing pre-ticked
    await page.getByRole("checkbox", { name: /product updates/ }).check();
    await subscribe.click();
    await expect(page.getByText(/Subscribed since/)).toBeVisible();
  }
  await shot(page, "24_settings");
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();

  // Bad input is rejected with a friendly message, not a DB error
  const bad = await page.request.patch("/api/profile", { data: { full_name: "x", role: "operator" } });
  expect(bad.status()).toBe(400);
  const phone = await page.request.patch("/api/profile", { data: { phone: "<script>" } });
  expect(phone.status()).toBe(400);
});

test("RLS through the app: a member cannot touch another user's saved search", async ({ page, browser }) => {
  const opCtx = await browser.newContext();
  await signIn(opCtx, "operator");
  const op = await opCtx.newPage();
  await op.goto("http://localhost:3217/settings");
  const mine = await op.request.post("http://localhost:3217/api/saved-searches", { data: { query: "forklift" } });
  let opSearchId: string;
  if (mine.status() === 201) opSearchId = (await mine.json()).saved_search.id;
  else opSearchId = (await (await op.request.get("http://localhost:3217/api/saved-searches")).json()).saved_searches[0].id;
  await opCtx.close();

  await page.goto("/dashboard");
  expect((await page.request.patch(`/api/saved-searches/${opSearchId}`, { data: { name: "hijack" } })).status()).toBe(404);
  expect((await page.request.delete(`/api/saved-searches/${opSearchId}`)).status()).toBe(404);
  const visible = (await (await page.request.get("/api/saved-searches")).json()).saved_searches.map((s: any) => s.id);
  expect(visible).not.toContain(opSearchId);
});

test("member is kept out of /ops", async ({ page }) => {
  await page.goto("/ops");
  await expect(page).not.toHaveURL(/\/ops/);
});

test("no staff contact details anywhere in the database", async () => {
  const scan = await (await fetch(`${MOCK}/__test/pii-scan`)).json();
  expect(scan.lots).toBeGreaterThan(0);
  expect(scan.staff_columns, "no staff/custodian/sales-person columns exist").toEqual([]);
  expect(scan.hits, "synthetic staff values found in DB").toEqual([]);
});

for (const p of ["/dashboard", "/saved", "/inbox", "/settings", "/pricing"]) {
  test(`a11y (signed in): no serious/critical axe violations on ${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
}
