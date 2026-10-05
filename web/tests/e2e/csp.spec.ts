// The Content-Security-Policy shipped in deploy/Caddyfile must not break the app: the Pyodide
// engine (WebAssembly in a worker), KaTeX, the plots and the service worker all have to work under it.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { engineReady, loadExample } from "./helpers";

const caddy = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../deploy/Caddyfile"), "utf8");
const csp = /Content-Security-Policy "([^"]+)"/.exec(caddy)![1];

test("the app works under the production Content-Security-Policy", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/.test(m.text())) violations.push(m.text());
  });
  await page.route("**/*", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), "content-security-policy": csp } });
  });
  await page.goto("/");
  await engineReady(page);
  await loadExample(page, "7");
  await page.goto("#/exp/7/results");
  await expect(page.locator(".value-line.emph").first()).toContainText("J·s");
  await expect(page.locator("figure.plot svg").first()).toBeVisible();
  await page.goto("#/answers/5");
  await expect(page.locator(".katex").first()).toBeVisible();
  expect(violations).toEqual([]);
});
