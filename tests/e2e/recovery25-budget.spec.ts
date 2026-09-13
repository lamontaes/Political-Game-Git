import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";

async function savedWorldPayload(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const records = await new Promise<Array<{ payload: string }>>(
        (resolve, reject) => {
          const request = database
            .transaction("worlds", "readonly")
            .objectStore("worlds")
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
      if (records.length !== 1) {
        throw new Error(`Expected one saved World, got ${records.length}.`);
      }
      return records[0]!.payload;
    } finally {
      database.close();
    }
  });
}

async function continueSavedLife(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("continue").click();
  await page
    .getByRole("button", { name: "Continue your life", exact: true })
    .click();
  await enterLife(page);
}

test("normal Politics Budget route preserves exact Lexington scope, date, Back and save", async ({
  page,
}) => {
  await page.goto("/?seed=recovery25-budget-normal");
  await startLife(page, {
    age: 38,
    place: "Lexington, Kentucky",
    route: "normal",
  });
  await enterLife(page);
  await saveLife(page);
  const before = await savedWorldPayload(page);
  const currentDate = JSON.parse(before).world.currentDate as string;

  await page.keyboard.press("Escape");
  await page.getByTestId("shell-nav-cluster").focus();
  await page.getByTestId("shell-nav-cluster").press("Enter");
  await page.getByTestId("nav-politics-budget").focus();
  await page.getByTestId("nav-politics-budget").press("Enter");
  await expect(page.getByTestId("shell-nav-flyout")).toBeHidden();
  const politics = page.getByTestId("politics-workspace");
  const budget = page.getByTestId("budget-economy-workspace");
  await expect(politics).toBeVisible();
  await expect(budget).toContainText("Budget & economy");
  await expect(budget).toContainText("Lexington, Kentucky");
  await expect(budget).toContainText(currentDate);
  await expect(page.getByTestId("economic-context-panel")).toBeVisible();
  await expect(page.getByTestId("economic-context-panel")).toContainText(
    "not established as available by this simulation date",
  );
  const unavailable = page
    .locator(".economic-unavailable summary")
    .filter({ hasText: "Unavailable comparisons" });
  await unavailable.focus();
  await unavailable.press("Enter");
  await expect(unavailable.locator("..")).toHaveAttribute("open", "");

  await goTo(page, "elsewhere-people");
  await expect(page.getByTestId("people-overlay")).toBeVisible();
  await page.getByTestId("people-overlay-back").press("Enter");
  await expect(politics).toBeVisible();
  await goTo(page, "nav-news");
  await expect(politics).toHaveCount(0);
  await page.getByTestId("news-workspace-back").press("Enter");
  await expect(politics).toBeVisible();

  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
  await continueSavedLife(page);
  await goTo(page, "nav-politics-budget");
  await expect(budget).toContainText(currentDate);
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
});

test("supported-date browser proof shows exact economic and fiscal graph metadata with keyboard tables", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/recovery25-budget.html");
  const budget = page.getByTestId("budget-economy-workspace");
  await expect(budget).toBeVisible();
  await expect(page.locator(".economic-graph-scope").first()).toContainText(
    /Fayette, KY · county · Dollars/,
  );
  await expect(page.locator(".economic-legend").first()).toContainText(
    "historical observation",
  );
  const fiscal = page
    .locator(".economic-graph")
    .filter({ hasText: "Government revenue and outlays" });
  await expect(fiscal).toContainText("Lexington-Fayette, Kentucky");
  await expect(fiscal).toContainText("USD minor units");
  await expect(fiscal).toContainText("simulated history");
  await expect(fiscal.locator("svg circle")).toHaveCount(2);
  await expect(fiscal.locator("svg polyline")).toHaveCount(0);

  const exactValues = fiscal.getByText("Exact values", { exact: true });
  await exactValues.focus();
  await exactValues.press("Enter");
  await expect(fiscal.getByRole("table")).toBeVisible();
  await expect(fiscal.getByRole("table")).toContainText(
    "2,450,000,000 USD minor units",
  );
  await expect(fiscal.getByRole("table")).toContainText(
    "2,370,000,000 USD minor units",
  );
  await expect(
    fiscal.getByRole("columnheader", { name: "Period" }),
  ).toBeVisible();
  await expect(
    fiscal.getByRole("columnheader", { name: "Class" }),
  ).toBeVisible();
  await expect(
    fiscal.getByRole("columnheader", { name: "Value" }),
  ).toBeVisible();
});

test("Politics Budget route keeps an unmatched place unavailable instead of borrowing Lexington", async ({
  page,
}) => {
  await page.goto("/?seed=recovery25-budget-unmatched");
  await startLife(page, {
    age: 38,
    place: "Carson City, Nevada",
    placeQuery: "Carson City",
    route: "normal",
  });
  await enterLife(page);
  await saveLife(page);
  const before = await savedWorldPayload(page);

  await goTo(page, "nav-politics-budget");
  const budget = page.getByTestId("budget-economy-workspace");
  await expect(budget).toContainText("Carson City, Nevada");
  await expect(page.getByTestId("economic-binding-unavailable")).toContainText(
    "another city, county, metro, or state have not been substituted",
  );
  await expect(page.getByTestId("economic-context-panel")).toHaveCount(0);
  await expect(page.getByText("Lexington, Kentucky")).toHaveCount(0);
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
});
