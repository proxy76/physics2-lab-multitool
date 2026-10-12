// Final self-review (brief §11): every Run step of every experiment on a phone, as a first-time
// student sees it, with the "How" expander open. Example data loaded so inline entry shows values.
//   npm run preview   (other terminal)
//   node tests/walkthrough.mjs [outDir]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:4173/";
const out = process.argv[2] || "test-results/walkthrough";
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const p = await ctx.newPage();
await p.goto(BASE + "#/");
await p.getByText("Engine ready").waitFor({ timeout: 90_000 });
for (const e of (process.env.EXPS || "5,6,7,3,4").split(",")) {
  await p.goto(BASE + `#/exp/${e}/brief`);
  await p.locator(".session-bar summary").click();
  await p.getByRole("button", { name: "Load example data" }).click();
  await p.locator(".session-bar summary").click();
  await p.goto(BASE + `#/exp/${e}/run`);
  const total = Number((await p.locator(".step-count").textContent()).match(/of (\d+)/)[1]);
  for (let i = 0; i < total; i++) {
    const how = p.locator('.step-card button.disclosure[aria-expanded="false"]', { hasText: /^\+?\s*How$/ });
    if (await how.count()) await how.first().click().catch(() => {});
    await p.waitForTimeout(150);
    await p.locator(".step-card").screenshot({ path: join(out, `exp${e}-step${String(i + 1).padStart(2, "0")}.png`) });
    if (i < total - 1) {
      try {
        await p.getByRole("button", { name: "Next", exact: true }).click({ timeout: 5000 });
      } catch (err) {
        await p.screenshot({ path: join(out, `exp${e}-STUCK-step${i + 1}.png`) });
        console.error(`exp ${e} step ${i + 1}: Next not clickable — ${String(err).split("\n")[0]}`);
        break;
      }
    }
  }
  await p.getByRole("button", { name: "Cheat card" }).click().catch(() => {});
  await p.waitForTimeout(200);
  await p.screenshot({ path: join(out, `exp${e}-cheat.png`), fullPage: true });
}
await b.close();
console.log(`walkthrough in ${out}`);
