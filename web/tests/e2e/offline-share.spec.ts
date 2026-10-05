// Offline after one load (service worker precache, incl. Pyodide) and phone-to-phone sharing.
import { expect, test } from "@playwright/test";
import { engineReady, loadExample, settle } from "./helpers";

test("after one load the whole app works in airplane mode, including the engine", async ({ page, context }) => {
  // 21 MB precache + two engine cold starts + the SymPy load: slow when the other workers compete
  test.setTimeout(240_000);
  await page.goto("/");
  await expect(page.getByText("Offline ready")).toBeVisible({ timeout: 90_000 });
  await engineReady(page);
  await loadExample(page, "5");
  await settle(page);

  await context.setOffline(true);
  await page.reload();
  await engineReady(page);
  await page.goto("#/exp/5/results");
  await expect(page.locator(".value-line.emph").first()).toContainText("Bq");
  // SymPy is lazy: the custom-expression tool must also work offline
  await page.goto("#/calc/propagate");
  await page.getByLabel("f =").fill("2*x");
  await page.locator(".var-row").first().getByLabel("value").fill("3");
  await page.locator(".var-row").first().getByLabel("σ").fill("0,1");
  await expect(page.locator(".tool-out .value-line").first()).toContainText(/6\.0 ± 0\.2|\(6\.0 ± 0\.2\)/, { timeout: 90_000 });
  await context.setOffline(false);
});

test("a share link moves a session to another phone", async ({ page, browser }) => {
  await loadExample(page, "6");
  await page.locator(".session-bar summary").click();
  await page.getByRole("button", { name: "Share with teammates" }).click();
  await expect(page.locator(".share-box .qr svg")).toBeVisible();
  // take the link exactly as a teammate would get it: "Copy link"
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/#\/import\//);

  const other = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const phone2 = await other.newPage();
  await phone2.goto(url);
  await phone2.getByRole("button", { name: "Import as a new session" }).click();
  await expect(phone2).toHaveURL(/#\/exp\/6\/data/);
  await expect(phone2.locator(".session-bar")).toContainText("(shared)");
  await expect(phone2.locator(".row-card").first().locator("input").first()).not.toHaveValue("");
  await other.close();
});
