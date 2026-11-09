import { test, expect } from "@playwright/test";
import { shot, trackConsole, noHorizontalOverflow, axeSeriousOrCritical, assertNoStaffPii, MOCK } from "./helpers";

// Seed: fixtures/open-data/search_relevance_sample.json (real GCSurplus titles and prices, OGL–Canada).
const PART_TITLES = /Truck Canopy|Pallet Truck|Truck Box|Truck Cap|Tool Box|Console|Bumper/;

async function compsN(page: import("@playwright/test").Page) {
  return Number(await page.locator("[data-n]").getAttribute("data-n"));
}

test.describe("Search relevance (/comps)", () => {
  test("truck defaults to cars & trucks: no parts, typical range shown", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/comps?q=truck");
    await expect(page.locator('[data-testid="kind-facets"] [aria-current="true"]')).toContainText("Cars, pickups & vans");
    await expect(page.locator("[data-range]")).toHaveAttribute("data-range", "shown");
    const lots = await page.locator("tbody tr td:first-child").allInnerTexts();
    expect(lots.length).toBeGreaterThan(5);
    for (const t of lots) expect(t).not.toMatch(PART_TITLES);
    await expect(page.getByTestId("expanded-note")).toContainText("silverado");
    await shot(page, "30_comps_truck_vehicles");
    await noHorizontalOverflow(page);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("truck with all kinds: no single range, one-tap narrow back to vehicles", async ({ page }) => {
    await page.goto("/comps?q=truck&kind=all");
    await expect(page.locator("[data-range]")).toHaveAttribute("data-range", "mixed_kinds");
    await expect(page.getByTestId("narrow-note")).toContainText("mix different kinds");
    await page.getByRole("link", { name: /Show only cars, pickups & vans/ }).click();
    await expect(page).toHaveURL(/kind=vehicle/);
    await expect(page.locator("[data-range]")).toHaveAttribute("data-range", "shown");
  });

  test("pickup / pick-up / pick up and f150 / F-150 find the same lots", async ({ page }) => {
    const ns: number[] = [];
    for (const q of ["pickup", "pick-up", "pick up"]) {
      await page.goto(`/comps?q=${encodeURIComponent(q)}`);
      ns.push(await compsN(page));
    }
    expect(new Set(ns).size).toBe(1);
    expect(ns[0]).toBeGreaterThanOrEqual(20);
    await page.goto("/comps?q=f150");
    const a = await compsN(page);
    await page.goto("/comps?q=F-150");
    expect(await compsN(page)).toBe(a);
    expect(a).toBeGreaterThan(0);
  });

  test("generator and laptop: mixed matches show a narrow-your-search note, not a range", async ({ page }) => {
    for (const q of ["generator", "laptop"]) {
      await page.goto(`/comps?q=${q}`);
      await expect(page.locator("[data-range]")).toHaveAttribute("data-range", "mixed_kinds");
      await expect(page.getByText("Typical sold range")).toHaveCount(0);
    }
  });
});

// Seed also includes fixtures/open-data/kind_labels.json (hand-labelled odd items) and the rows in data/kind_overrides.csv.
const LAB_GEN = /Signal Generator|Function Generator|Pulse Generator|Waveform|Nitrogen|Zero Air|Tone Generator|Hydrogen/i;
const LAPTOP_EXTRAS = /\bbags?\b|\bcases?\b|charger|sleeve|backpack|mount|messenger/i;

test.describe("Odd items (/comps)", () => {
  test("generator: power generators and lab signal generators are separate kinds", async ({ page }) => {
    await page.goto("/comps?q=generator");
    const facets = page.getByTestId("kind-facets");
    await expect(facets).toContainText("Tractors, machinery & generators");
    await expect(facets).toContainText("Computers, electronics & lab gear");
    await page.goto("/comps?q=generator&kind=equipment");
    const titles = await page.locator("tbody tr td:first-child").allInnerTexts();
    expect(titles.length).toBeGreaterThan(5);
    for (const t of titles) expect(t).not.toMatch(LAB_GEN);
    await shot(page, "40_comps_generator_power");
    await page.goto("/comps?q=generator&kind=electronics");
    expect((await page.locator("tbody tr td:first-child").allInnerTexts()).some((t) => LAB_GEN.test(t))).toBe(true);
  });

  test("laptop: computers without bags, cases and chargers", async ({ page }) => {
    await page.goto("/comps?q=laptop&kind=electronics");
    const titles = await page.locator("tbody tr td:first-child").allInnerTexts();
    expect(titles.length).toBeGreaterThan(5);
    for (const t of titles) expect(t).not.toMatch(LAPTOP_EXTRAS);
    await shot(page, "41_comps_laptop_computers");
  });

  test("dump truck defaults to medium & heavy trucks; pickups stay out", async ({ page }) => {
    await page.goto("/comps?q=dump%20truck");
    await expect(page.locator('[data-testid="kind-facets"] [aria-current="true"]')).toContainText("Medium & heavy trucks");
    await page.goto("/comps?q=truck");
    for (const t of await page.locator("tbody tr td:first-child").allInnerTexts()) expect(t).not.toMatch(/Dump Truck|F-[4-7]50|Western Star|Freightliner/i);
  });

  test("outliers are left out of the range, counted, and one tap shows them all", async ({ page }) => {
    await page.goto("/comps?q=laptop");
    const note = page.getByTestId("outlier-note");
    await expect(note).toHaveAttribute("data-mode", "trimmed");
    const excluded = Number(await note.getAttribute("data-excluded"));
    expect(excluded).toBeGreaterThan(0);
    await expect(note).toContainText(/Leaves out \d+ of \d+ sales/);
    await expect(note).toContainText(/bulk or multi-item lots/);
    const nTrimmed = await compsN(page);
    await shot(page, "42_comps_laptop_outliers_trimmed");
    await page.getByTestId("outliers-toggle").click();
    await expect(page).toHaveURL(/outliers=all/);
    await expect(page.getByTestId("outlier-note")).toHaveAttribute("data-mode", "all");
    expect(await compsN(page)).toBe(nTrimmed + excluded);
    await shot(page, "43_comps_laptop_outliers_all");
    await page.getByTestId("outliers-toggle").click();
    await expect(page).not.toHaveURL(/outliers=all/);
  });
});

test.describe("Report a wrong result", () => {
  test("link on result rows -> short form -> stored without personal data", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/search?q=truck");
    const link = page.getByTestId("report-link").first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/report\?feed=gcsurplus_sold&id=/);
    const id = new URL(page.url()).searchParams.get("id")!;
    await expect(page.getByTestId("report-current-kind")).toBeVisible();
    await page.getByLabel(/Anything else/).fill("call me at 613-555-0199");
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByTestId("report-error")).toContainText(/leave out email addresses and phone numbers/i);
    await page.getByLabel(/Anything else/).fill("This is a bumper, not a truck.");
    await page.getByRole("radio").first().check();
    const select = page.getByLabel(/Where does it belong/);
    if (await select.isVisible()) await select.selectOption("part");
    await shot(page, "44_report_form");
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByTestId("report-done")).toBeVisible();
    await shot(page, "45_report_done");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const rows = await (await fetch(`${MOCK}/rest/v1/lot_reports?external_id=eq.${encodeURIComponent(id)}&select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["created_at", "external_id", "feed_key", "id", "note", "reason", "status", "suggested_kind"]);
    expect(JSON.stringify(rows)).not.toMatch(/613-555|@/);
    // The refused note (contact details) is an expected 400; nothing else may fail.
    expect(errors.filter((e) => !/status of 400/.test(e)), errors.join("\n")).toEqual([]);
  });

  test("route refuses cross-site posts, bad input and floods", async ({ request, baseURL }) => {
    const body = { feed_key: "gcsurplus_sold", external_id: "gcs-R5OT0021340", reason: "odd_price" };
    expect((await request.post("/api/lot-reports", { data: body, headers: { origin: "https://evil.example", "x-forwarded-for": "203.0.113.7" } })).status()).toBe(403);
    expect((await request.post("/api/lot-reports", { data: { ...body, external_id: "x),or(1" }, headers: { origin: baseURL!, "x-forwarded-for": "203.0.113.8" } })).status()).toBe(400);
    expect((await request.post("/api/lot-reports", { data: { ...body, external_id: "gcs-NOPE0000000" }, headers: { origin: baseURL!, "x-forwarded-for": "203.0.113.9" } })).status()).toBe(404);
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) codes.push((await request.post("/api/lot-reports", { data: body, headers: { origin: baseURL!, "x-forwarded-for": "203.0.113.77" } })).status());
    expect(codes).toContain(429);
  });

  test("hand override shows on the report page (bumper listed as a part)", async ({ page }) => {
    await page.goto("/report?feed=gcsurplus_sold&id=gcs-R5OT0021340");
    await expect(page.getByTestId("report-current-kind")).toContainText("Parts, accessories");
  });

  test("a11y: /report has no serious/critical axe violations", async ({ page }) => {
    await page.goto("/report?feed=gcsurplus_sold&id=gcs-R5OT0021340");
    await page.waitForLoadState("networkidle");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
});

test.describe("/search results page", () => {
  test("query + filters + pagination, every row links to its dataset", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/search?q=truck");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Search sold surplus");
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const t of await page.locator("tbody tr td:nth-child(2)").allInnerTexts()) expect(t).not.toMatch(PART_TITLES);
    const hrefs = await page.locator('tbody tr td:last-child a:not([data-testid="report-link"])').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBe(await rows.count());
    expect(await page.getByTestId("report-link").count()).toBe(await rows.count());
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/(open\.canada\.ca|data\.novascotia\.ca)\//);
    await expect(page.getByText(/Open Government Licence/i).first()).toBeVisible();
    assertNoStaffPii(await page.content(), "/search");
    await shot(page, "32_search_truck");

    // Parts facet then back
    await page.locator('[data-kind="part"]').click();
    await expect(page).toHaveURL(/kind=part/);
    expect((await page.locator("tbody tr td:nth-child(2)").allInnerTexts()).some((t) => PART_TITLES.test(t))).toBe(true);

    // Filters: price + province + dates through the form
    await page.goto("/search?q=truck&kind=all");
    // Filters start open when a filter is already set (kind=all here); open them otherwise.
    if (!(await page.getByLabel("Sold for at least (C$)").isVisible())) await page.getByText("Filters", { exact: true }).click();
    await page.getByLabel("Sold for at least (C$)").fill("10000");
    await page.getByLabel("Closed from").fill("2023-01-01");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/min=10000/);
    for (const s of await page.locator("tbody tr td:nth-child(4)").allInnerTexts()) expect(Number(s.replace(/[^0-9]/g, ""))).toBeGreaterThanOrEqual(10000);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("pagination keeps the query and filters", async ({ page }) => {
    await page.goto("/search?q=e&kind=all");
    const total = Number(await page.locator("[data-total]").getAttribute("data-total"));
    test.skip(total <= 25, "not enough seeded rows to page");
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/q=e/);
    await expect(page).toHaveURL(/kind=all/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
  });

  test("empty state is honest", async ({ page }) => {
    await page.goto("/search?q=zzzz-no-match");
    await expect(page.getByRole("heading", { name: "No sold lots match" })).toBeVisible();
  });
});

test.describe("Header", () => {
  test("mobile header stays on one row; Menu opens and closes", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/price-history");
    const h = await page.getByTestId("public-header").boundingBox();
    expect(h!.height).toBeLessThan(80);
    await expect(page.getByRole("link", { name: "Search", exact: true }).first()).toBeVisible();
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#public-menu").getByRole("link", { name: "Tenders" })).toBeVisible();
    await shot(page, "33_mobile_menu_open");
    await page.keyboard.press("Escape");
    await expect(page.locator("#public-menu")).toHaveCount(0);
    await menu.click();
    await page.locator("#public-menu").getByRole("link", { name: "Tenders" }).click();
    await expect(page).toHaveURL(/\/tenders/);
    await expect(page.locator("#public-menu")).toHaveCount(0);
  });

  test("desktop header shows inline links", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.goto("/price-history");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tenders" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  });
});

for (const p of ["/search?q=truck", "/comps?q=generator", "/comps?q=truck", "/comps?q=laptop&outliers=all", "/price-history?q=truck"]) {
  test(`a11y (signed out): no serious/critical axe violations on ${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
}
