import { expect, type Page, type BrowserContext, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const MOCK = "http://127.0.0.1:54399";
export const CRON_SECRET = "e2e-cron-secret";
export const SHOTS = process.env.E2E_SHOTS_DIR || "e2e/screenshots";
export const SYNTHETIC_STAFF = ["Zelda Quintero", "zelda.quintero@tpsgc-pwgsc.gc.ca", "613-555-0199", "Yuri Okonkwo", "yuri.okonkwo@tpsgc-pwgsc.gc.ca", "819-555-0123"];

export const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SHOTS}/${test.info().project.name}_${name}.png`, fullPage: true });

export async function signIn(context: BrowserContext, user: "member" | "operator" = "member") {
  const r = await fetch(`${MOCK}/__test/session?user=${user}`);
  const { session } = await r.json();
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ name: "sb-localhost-auth-token", value, domain: "localhost", path: "/", sameSite: "Lax" }]);
  return session;
}

export function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

export async function noHorizontalOverflow(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, `page scrollWidth ${sw} > clientWidth ${cw}`).toBeLessThanOrEqual(cw + 1);
}

export async function axeSeriousOrCritical(page: Page) {
  // Cast: @axe-core/playwright bundles its own playwright-core types.
  const res = await new AxeBuilder({ page: page as any }).withTags(["wcag2a", "wcag2aa"]).analyze();
  test.info().annotations.push({
    type: "axe",
    description: JSON.stringify(res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")).slice(0, 5) }))),
  });
  return res.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
}

export function assertNoStaffPii(text: string, where: string) {
  for (const s of SYNTHETIC_STAFF) expect(text.includes(s), `${where} contains synthetic staff value "${s}"`).toBe(false);
  // Real fixture rows carry RCMP/PSPC staff emails in free text; none may be shown.
  expect(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.gc\.ca/.test(text), `${where} contains a *.gc.ca email`).toBe(false);
}
