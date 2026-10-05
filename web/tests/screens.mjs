// Visual QA: screenshots of every main screen in each theme, on a phone and a desktop viewport.
//   npm run build && npm run preview   (in another terminal)
//   node tests/screens.mjs [outDir]
// Example data is loaded into each experiment so the Data/Results tabs show real tables and plots.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:4173/";
const out = process.argv[2] || "test-results/screens";
mkdirSync(out, { recursive: true });

const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1366, height: 900 } },
};
for (const k of Object.keys(VIEWPORTS)) if (!(process.env.VPS || "phone,desktop").split(",").includes(k)) delete VIEWPORTS[k];
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; // e.g. ONLY="exp5|home"
const THEMES = (process.env.THEMES || "dark,darkroom,light").split(",");
const EXPS = ["5", "6", "7", "3", "4"];
const TABS = ["brief", "run", "data", "results", "questions"];

const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ ...vp, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));
  await page.goto(BASE + "#/");
  await page.getByText("Engine ready").waitFor({ timeout: 90_000 });

  // example data in every experiment
  for (const e of EXPS) {
    await page.goto(BASE + `#/exp/${e}/brief`);
    await page.locator(".session-bar summary").click();
    await page.getByRole("button", { name: "Load example data" }).click();
    await page.locator(".session-bar summary").click();
  }

  for (const theme of THEMES) {
    await page.goto(BASE + "#/settings");
    await page.locator(".choice-opt", { has: page.locator(`input`) }).filter({ hasText: { dark: /^Dark$/, darkroom: /Dark-room/, light: /^Light$/ }[theme] }).click();
    // phone: what the user actually sees, one screen at a time (fixed bars stay in place);
    // desktop: one full-page image
    const shot = async (name) => {
      await page.waitForTimeout(150);
      const file = join(out, `${vpName}-${theme}-${name}`);
      if (vpName !== "phone") return void (await page.screenshot({ path: file + ".png", fullPage: true }));
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let i = 0, y = 0; y < h && i < 12; i++, y += 700) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(80);
        await page.screenshot({ path: `${file}-${i}.png` });
      }
    };
    const visit = async (hash, name, waitFor) => {
      if (ONLY && !ONLY.test(name)) return;
      await page.goto(BASE + hash);
      if (waitFor) await page.locator(waitFor).first().waitFor({ timeout: 30_000 }).catch(() => console.warn(`no ${waitFor} on ${hash}`));
      await shot(name);
    };
    await visit("#/", "home");
    await visit("#/settings", "settings");
    if (theme === "dark" || vpName === "phone") {
      await visit("#/calc", "calc");
      await visit("#/calc/linfit", "calc-linfit");
      await visit("#/answers", "answers");
    }
    for (const e of theme === "dark" ? EXPS : ["5", "4"]) {
      for (const t of TABS) await visit(`#/exp/${e}/${t}`, `exp${e}-${t}`, t === "results" ? ".results-tab svg, .results-tab table" : null);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
