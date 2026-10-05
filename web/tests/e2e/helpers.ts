import { expect, type Page } from "@playwright/test";

export const EXPS = ["5", "6", "7", "3", "4"] as const;

export async function engineReady(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: "Engine ready" })).toBeVisible({ timeout: 90_000 });
}

/** Load the seeded example data of an experiment into a new session (Session bar → Load example data). */
export async function loadExample(page: Page, exp: string) {
  await page.goto(`#/exp/${exp}/brief`);
  await page.locator(".session-bar summary").click();
  await page.getByRole("button", { name: "Load example data" }).click();
  await page.locator(".session-bar summary").click();
}

/** Wait until the debounced IndexedDB autosave (250 ms) has run. */
export async function settle(page: Page) {
  await page.waitForTimeout(600);
}
