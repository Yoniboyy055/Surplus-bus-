import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;
export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one shared mock database; tests that write use their own data
  outputDir: "./test-results",
  reporter: [["list"], ["json", { outputFile: "./results.json" }], ["html", { open: "never", outputFolder: "./playwright-report" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "npx tsx e2e/mock-supabase.ts",
      cwd: "..",
      url: "http://127.0.0.1:54399/__test/session",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
    },
    {
      command: `npx next start -p ${PORT}`,
      cwd: "..",
      url: `http://localhost:${PORT}/api/ping`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
