import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  openShellMenu,
  saveLife,
  startLife,
} from "./support/creator";

// The complete creator/read/Back/Keep/reopen journey shares one test budget.
// Retain every assertion and native activation under a bounded 90-second limit.
test.setTimeout(90_000);

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
  await enterLife(page);
}

/** The Budget is the Issues and budget tab of the Politics hub. */
async function goToBudget(page: Page): Promise<void> {
  await openShellMenu(page);
  await page.getByTestId("nav-politics").click();
  await page.getByTestId("politics-tab-issues").click();
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
  await page.getByTestId("nav-politics").focus();
  await page.getByTestId("nav-politics").press("Enter");
  await expect(page.getByTestId("shell-nav-flyout")).toBeHidden();
  await page.getByTestId("politics-tab-issues").focus();
  await page.getByTestId("politics-tab-issues").press("Enter");
  const politics = page.getByTestId("politics-workspace");
  const budget = page.getByTestId("budget-economy-workspace");
  await expect(politics).toBeVisible();
  await expect(budget).toContainText("Budget & economy");
  await expect(budget).toContainText("Lexington, Kentucky");
  await expect(budget).toContainText(currentDate);
  const panel = page.getByTestId("economic-context-panel");
  await expect(panel).toBeVisible();
  /*
   * The panel used to explain which products were "not established as available
   * by this simulation date" and offer an "Unavailable comparisons" disclosure
   * over the binding failures behind them. Ordinary play now gets the place and
   * the figures; the machinery moved behind the diagnostics profile, and the
   * test below walks it there so none of those assertions were lost.
   */
  await expect(panel).toContainText("Lexington, Kentucky");
  await expect(panel).not.toContainText("not established as available");
  await expect(page.locator(".economic-unavailable summary")).toHaveCount(0);

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
  await goToBudget(page);
  await expect(budget).toContainText(currentDate);
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
});

test("the same normal Budget route still shows its ingestion record under the diagnostics profile", async ({
  page,
}) => {
  /*
   * The other half of the pair above. Same route, same place, same panel — the
   * only difference is the explicit opt-in, which nothing in the game links to.
   * Everything the normal-route test used to assert is asserted here instead,
   * including the keyboard activation of the disclosure.
   */
  await page.goto("/?seed=recovery25-budget-normal&diagnostics=1");
  await startLife(page, {
    age: 38,
    place: "Lexington, Kentucky",
    route: "normal",
  });
  await enterLife(page);
  await goToBudget(page);

  const panel = page.getByTestId("economic-context-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(
    "not established as available by this simulation date",
  );
  const unavailable = page
    .locator(".economic-unavailable summary")
    .filter({ hasText: "Unavailable comparisons" });
  await unavailable.focus();
  await unavailable.press("Enter");
  await expect(unavailable.locator("..")).toHaveAttribute("open", "");
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

// Carson City had no binding until every town was bound through its own
// county relation; it now reads its own figures, and still never Lexington's.
test("Politics Budget route binds Carson City to its own area instead of borrowing Lexington", async ({
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

  await goToBudget(page);
  const budget = page.getByTestId("budget-economy-workspace");
  await expect(budget).toContainText("Carson City, Nevada");
  await expect(page.getByTestId("economic-binding-unavailable")).toHaveCount(0);
  const panel = page.getByTestId("economic-context-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Carson City");
  await expect(page.getByText("Lexington, Kentucky")).toHaveCount(0);
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
});

test("normal pending conversation survives Politics Budget Back and saved reopen", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?seed=delivery28-budget-pending-0");
  await startLife(page, {
    age: 38,
    place: "Lexington, Kentucky",
    route: "normal",
  });
  await enterLife(page);
  await goTo(page, "elsewhere-people");
  await page.getByTestId("conversation-start-household-obligation").click();
  const conversation = page.getByRole("region", {
    name: /^Conversation with /,
  });
  await expect(conversation).toBeVisible();
  // Match DOM text, as toHaveText does; CSS can render the topic in capitals.
  const name = (await conversation
    .getByTestId("talk-name")
    .textContent())!.trim();
  const topic = (await conversation
    .getByTestId("conversation-topic")
    .textContent())!.trim();
  const line = (await conversation
    .getByTestId("conversation-beat")
    .textContent())!.trim();
  const choices = (await conversation
    .getByTestId("conversation-intents")
    .textContent())!.trim();
  await expect(conversation.getByTestId("talk-listen")).toBeVisible();
  await saveLife(page);
  const before = await savedWorldPayload(page);
  const currentDate = JSON.parse(before).world.currentDate as string;

  await goToBudget(page);
  await expect(page.getByTestId("budget-economy-workspace")).toContainText(
    currentDate,
  );
  await expect(page.getByTestId("budget-economy-workspace")).toContainText(
    "Lexington, Kentucky",
  );
  await page.screenshot({
    path: testInfo.outputPath("budget-pending-conversation.png"),
  });
  await page.getByTestId("politics-workspace-back").press("Enter");
  await expect(conversation).toBeVisible();
  await expect(conversation.getByTestId("talk-name")).toHaveText(name);
  await expect(conversation.getByTestId("conversation-topic")).toHaveText(
    topic,
  );
  await expect(conversation.getByTestId("conversation-beat")).toHaveText(line);
  await expect(conversation.getByTestId("conversation-intents")).toHaveText(
    choices,
  );
  await expect(conversation.getByTestId("talk-listen")).toBeVisible();
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);

  await continueSavedLife(page);
  await goTo(page, "elsewhere-people");
  await page.getByTestId("conversation-start-household-obligation").click();
  await expect(conversation).toBeVisible();
  await expect(conversation.getByTestId("talk-name")).toHaveText(name);
  await expect(conversation.getByTestId("conversation-topic")).toHaveText(
    topic,
  );
  await expect(conversation.getByTestId("conversation-beat")).toHaveText(line);
  await expect(conversation.getByTestId("conversation-intents")).toHaveText(
    choices,
  );
  await expect(conversation.getByTestId("talk-listen")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("conversation-after-reopen.png"),
  });
  await goToBudget(page);
  await page.getByTestId("politics-workspace-back").click();
  await expect(conversation.getByTestId("conversation-beat")).toHaveText(line);
  await saveLife(page);
  expect(await savedWorldPayload(page)).toBe(before);
});
