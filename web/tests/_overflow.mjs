import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const p = await ctx.newPage();
await p.goto("http://localhost:4173/#/");
await p.getByText("Engine ready").waitFor({ timeout: 90000 });
for (const e of ["5", "6", "7", "3", "4"]) {
  await p.goto(`http://localhost:4173/#/exp/${e}/brief`);
  await p.locator(".session-bar summary").click();
  await p.getByRole("button", { name: "Load example data" }).click();
}
const pages = ["#/", "#/calc", "#/answers", "#/settings", ...["5", "6", "7", "3", "4"].flatMap((e) => ["brief", "run", "data", "results", "questions"].map((t) => `#/exp/${e}/${t}`)),
  ...["stats", "counting", "linfit", "quick", "propagate", "graphical", "report", "units", "decay"].map((t) => `#/calc/${t}`), ...["6", "7", "3", "4"].map((e) => `#/answers/${e}`)];
for (const h of pages) {
  await p.goto("http://localhost:4173/" + h);
  await p.waitForTimeout(h.includes("results") || h.includes("data") ? 1500 : 300);
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const rc = el.getBoundingClientRect();
      if (rc.right > W + 1 && rc.width > 0) {
        // skip children inside a horizontal scroller
        let q = el.parentElement, scrolled = false;
        while (q) { const s = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(s.overflowX) && q.getBoundingClientRect().right <= W + 1) { scrolled = true; break; } q = q.parentElement; }
        if (!scrolled) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} right=${Math.round(rc.right)} w=${Math.round(rc.width)}`);
      }
    }
    return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 6) };
  });
  if (r.sw > r.W || r.out.length) console.log(h, `scrollWidth=${r.sw}`, r.out);
}
await b.close();
