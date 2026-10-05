// The lab flows from the brief's definition of done (§11), on phone viewports.
import { expect, test } from "@playwright/test";
import { EXPS, engineReady, loadExample, settle } from "./helpers";

test.use({ serviceWorkers: "block" }); // offline behaviour has its own spec

test("home lists the experiments in the team's order with a Next-up card", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".exp-card");
  await expect(cards).toHaveCount(5);
  const kickers = await cards.locator(".exp-num").allTextContents();
  const order = kickers.join(" ").match(/Exp\. (\d)/g)?.map((s) => s.slice(-1));
  expect(order).toEqual([...EXPS]);
  await expect(cards.first()).toContainText("Next up");
  await engineReady(page);
});

test("a reading typed on the Run screen (decimal comma) is saved", async ({ page }) => {
  await page.goto("#/exp/5/run");
  const start = Date.now();
  // walk to the background-count step: the first one with plain entry fields
  for (let i = 0; i < 6 && !(await page.locator(".entry-fields input").first().isVisible()); i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  const input = page.locator(".entry-fields input").first();
  await input.fill("1452,0");
  await input.press("Enter");
  await expect(page.locator(".entry-fields input").nth(1)).toBeFocused();
  expect(Date.now() - start, "find the step and type one number").toBeLessThan(10_000);

  await settle(page);
  await page.goto("#/exp/5/data");
  await page.getByText("Parameters and constants of this experiment").click();
  await expect(page.locator(".param-grid input").first()).toHaveValue("1452,0");
});

test("data entry, guides and answers never wait for the engine", async ({ page }) => {
  // hold the Python runtime hostage: the engine can never become ready
  await page.route("**/pyodide/**", () => new Promise(() => undefined));
  await page.goto("#/exp/6/run");
  await expect(page.getByText("Engine loading")).toBeVisible();
  await expect(page.locator(".step-card")).toBeVisible();
  await page.goto("#/answers/7");
  await expect(page.getByText(/electronvolt|1 eV/).first()).toBeVisible();
  await page.goto("#/exp/7/data");
  const first = page.locator(".readings-grid input").first();
  await first.fill("1,234");
  await expect(first).toHaveValue("1,234");
});

test("data survives a reload and closing the tab", async ({ page, context }) => {
  await loadExample(page, "4");
  await page.goto("#/exp/4/data");
  const d1 = page.locator(".row-card").first().locator("input").nth(1);
  await d1.fill("2,777");
  await settle(page);
  await page.reload();
  await expect(page.locator(".row-card").first().locator("input").nth(1)).toHaveValue("2,777");

  await page.close();
  const again = await context.newPage();
  await again.goto("#/exp/4/data");
  await expect(again.locator(".row-card").first().locator("input").nth(1)).toHaveValue("2,777");
});

test("example data gives the headline results with show-steps on every experiment", async ({ page }) => {
  await page.goto("/");
  await engineReady(page);
  for (const e of EXPS) {
    await loadExample(page, e);
    await page.goto(`#/exp/${e}/results`);
    await expect(page.locator(".value-line.emph").first()).toContainText(/±/);
    await expect(page.getByText(/Show steps \(\d+\)/)).toBeVisible();
    await expect(page.locator(".engine-error")).toHaveCount(0);
  }
});

test("dark-room theme applies and persists", async ({ page }) => {
  await page.goto("#/settings");
  await page.getByText("Dark-room (red, dim)").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkroom");
  await settle(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "darkroom");
});

test("no page scrolls sideways on a phone", async ({ page }) => {
  await page.goto("/");
  await engineReady(page);
  for (const e of EXPS) await loadExample(page, e);
  const pages = ["#/", "#/calc", "#/settings", ...EXPS.flatMap((e) => ["brief", "run", "data", "results", "questions"].map((t) => `#/exp/${e}/${t}`)),
    ...["stats", "counting", "linfit", "quick", "propagate", "graphical", "report", "units", "decay"].map((t) => `#/calc/${t}`), ...EXPS.map((e) => `#/answers/${e}`)];
  const wide: string[] = [];
  for (const h of pages) {
    await page.goto(h);
    await page.waitForTimeout(h.includes("results") || h.includes("data") ? 800 : 150);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (sw > cw) wide.push(`${h} (${sw} > ${cw})`);
  }
  expect(wide).toEqual([]);
});

test("Run-screen controls are at least 48 px tall", async ({ page }) => {
  await page.goto("#/exp/5/run");
  for (let i = 0; i < 6 && !(await page.locator(".entry-fields input").first().isVisible()); i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  const targets = page.locator(".step-nav button, .entry-fields input, .tabbar a, .step-card .btn");
  const n = await targets.count();
  expect(n).toBeGreaterThan(5);
  for (let i = 0; i < n; i++) {
    const box = await targets.nth(i).boundingBox();
    if (box) expect(box.height, await targets.nth(i).evaluate((el) => el.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(48);
  }
});
