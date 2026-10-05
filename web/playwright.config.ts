import { defineConfig, devices } from "@playwright/test";

// End-to-end flows on phone-sized viewports against the production build (npm run build first).
// Chromium only: it is what the team's Android phones run, and the only engine CI installs.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // BASE_URL runs the suite against another server, e.g. the real Caddy config (see README)
  use: { baseURL: process.env.BASE_URL || "http://localhost:4173/", trace: "retain-on-failure" },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "small-phone", use: { browserName: "chromium", viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
