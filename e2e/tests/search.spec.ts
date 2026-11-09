import { test, expect } from "@playwright/test";
import { shot, trackConsole, noHorizontalOverflow, axeSeriousOrCritical, assertNoStaffPii } from "./helpers";

// Seed: fixtures/open-data/search_relevance_sample.json (real GCSurplus titles and prices, OGL–Canada).
const PART_TITLES = /Truck Canopy|Pallet Truck|Truck Box|Truck Cap|Tool Box|Console|Bumper/;

async function compsN(page: import("@playwright/test").Page) {
  return Number(await page.locator("[data-n]").getAttribute("data-n"));
}

test.describe("Search relevance (/comps)", () => {
  test("truck defaults to cars & trucks: no parts, typical range shown", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/comps?q=truck");
    await expect(page.locator('[data-testid="kind-facets"] [aria-current="true"]')).toContainText("Cars & trucks");
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
    await page.getByRole("link", { name: /Show only cars & trucks/ }).click();
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
    await page.getByRole("link", { name: /Show only everything else/ }).click();
    await expect(page.locator("[data-range]")).toHaveAttribute("data-range", "shown");
    await shot(page, "31_comps_laptop_narrowed");
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
    const hrefs = await page.locator("tbody tr td:last-child a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBe(await rows.count());
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

for (const p of ["/search?q=truck", "/comps?q=generator", "/comps?q=truck", "/price-history?q=truck"]) {
  test(`a11y (signed out): no serious/critical axe violations on ${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    expect(await axeSeriousOrCritical(page)).toEqual([]);
  });
}
