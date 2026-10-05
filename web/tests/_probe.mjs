import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const p = await ctx.newPage();
await p.goto("http://localhost:4173/#/");
await p.getByText("Engine ready").waitFor({ timeout: 90000 });
await p.goto("http://localhost:4173/#/exp/7/brief");
await p.locator(".session-bar summary").click();
await p.getByRole("button", { name: "Load example data" }).click();
await p.goto("http://localhost:4173/#/exp/7/run");
for (let i = 0; i < 6; i++) await p.getByRole("button", { name: "Next", exact: true }).click();
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const W = document.documentElement.clientWidth, out = [];
  for (const el of document.querySelectorAll("body *")) {
    const rc = el.getBoundingClientRect();
    if (rc.right > W + 1 && rc.width > 0) {
      let q = el.parentElement, inScroller = false;
      while (q) { const s = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(s.overflowX) && q.getBoundingClientRect().right <= W + 1) { inScroller = true; break; } q = q.parentElement; }
      if (!inScroller) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} w=${Math.round(rc.width)} right=${Math.round(rc.right)}`);
    }
  }
  return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 12) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
