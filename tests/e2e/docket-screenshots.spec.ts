import { fileCandidacy } from "./support/campaign";
import { expect, test, type Page } from "@playwright/test";

import { enterLife, openElsewhere, startLife } from "./support/creator";
import { shotPath } from "./support/shot-path";

/**
 * Owner-facing capture of the docket click path.
 *
 * Not a gate — it asserts only enough to be sure it is photographing the right
 * screen, and its job is to produce the images an owner review looks at. Kept
 * beside the real specs so the pictures always come from the same route the
 * suite proves, rather than from a hand-driven session nobody can reproduce.
 *
 * Run with: CI=1 PLAYWRIGHT_PORT=<free port> npx playwright test
 * tests/e2e/docket-screenshots.spec.ts
 */

async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
}

async function liveUntilDecided(page: Page, maxDays = 45) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await page.getByTestId("pass-day").click();
  }
  return page.getByTestId("campaign-result").isVisible();
}

test("captures the five-minute click path", async ({ page }) => {
  await freshBrowser(page);
  await page.goto("/?seed=p85c-owner-0");
  await startLife(page, { age: 34, place: "Lexington", gender: "male" });
  await enterLife(page);
  await openElsewhere(page, "work");
  await fileCandidacy(page);
  await page.getByTestId("campaign-fundraising").click();
  for (let day = 0; day < 3; day += 1) {
    await page.getByTestId("pass-day").click();
    await page.getByTestId("campaign-outreach").click();
  }
  expect(await liveUntilDecided(page)).toBe(true);
  await openElsewhere(page, "work");
  await expect(page.getByTestId("office-section")).toBeVisible();

  // 1. Work, with an empty docket and a way to start.
  await page.screenshot({
    path: shotPath("01-work-empty-docket.png"),
    fullPage: true,
  });

  // 2. The drafting table: four families, eight configurations.
  await page.getByTestId("open-drafting-table").click();
  await page.screenshot({
    path: shotPath("02-drafting-options.png"),
    fullPage: true,
  });

  // 3. A bill that authorizes nothing at all.
  await page
    .getByTestId("drafting-option-water-service-lines-inventory-and-plan")
    .click();
  await page.screenshot({
    path: shotPath("03-unfunded-mandate.png"),
    fullPage: true,
  });

  // 4. A different family, and the clause comparison before anything moves.
  await page
    .getByTestId("drafting-option-bridge-maintenance-worst-first-condition")
    .click();
  await page.screenshot({
    path: shotPath("04-compare-as-offered.png"),
    fullPage: true,
  });

  // 5. Scope and amount moved by keyboard; the text moves with them.
  const threshold = page.getByTestId("draft-param-condition-threshold");
  await threshold.focus();
  await threshold.press("End");
  const money = page.getByTestId("draft-param-repair-authorization");
  await money.focus();
  await money.press("End");
  await page.screenshot({
    path: shotPath("05-compare-changed.png"),
    fullPage: true,
  });

  // 6. Filed: identity, clauses, and the analysis that refuses to forecast.
  await page.getByTestId("file-the-draft").click();
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await page.screenshot({
    path: shotPath("06-filed-bill.png"),
    fullPage: true,
  });

  // 7. Three bills on one docket.
  for (const configuration of [
    "drafting-option-transit-access-enrollment-fare-relief",
    "drafting-option-broadband-access-adoption-support",
  ]) {
    await page.getByTestId("open-drafting-table").click();
    await page.getByTestId(configuration).click();
    await page.getByTestId("file-the-draft").click();
    await expect(page.getByTestId("docket-bill")).toBeVisible();
  }
  await page.screenshot({
    path: shotPath("07-three-bills.png"),
    fullPage: true,
  });

  // 8. Reopening the first bill, still itself.
  await page
    .getByTestId("docket-open-legislative-docket:kentucky:bill-001")
    .click();
  await page.screenshot({
    path: shotPath("08-reopened-first.png"),
    fullPage: true,
  });
});
