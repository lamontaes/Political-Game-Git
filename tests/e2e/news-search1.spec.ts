import { expect, test, type Page } from "@playwright/test";

import type { PublicInformationPanelModel } from "../../src/presentation/public-information-adapters";
import type { NewsSearch1LiveSnapshot } from "./fixtures/news-search1-harness";

async function liveSnapshot(page: Page) {
  return page.evaluate(() => window.newsSearch1Harness!.snapshot());
}

async function baselineSnapshot(page: Page) {
  return page.evaluate(() => window.newsSearch1Harness!.baseline);
}

test("search filters published stories, clears focus, and leaves live state unchanged", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");
  const panel = page.getByTestId("public-information-panel");
  await expect(panel).toBeVisible();

  const search = page.getByTestId("public-information-search-input");
  const count = page.getByTestId("public-information-search-count");
  const articles = page.locator(".public-information-article");
  const baseline = await baselineSnapshot(page);

  await expect(count).toHaveText("2 published stories.");
  await expect(articles).toHaveCount(2);

  const beforeSearch = await liveSnapshot(page);
  await search.fill("downtown");
  await expect(count).toHaveText("Showing 1 of 2 published stories.");
  await expect(articles).toHaveCount(1);
  await expect(articles.first()).toContainText("downtown");

  await search.fill("zzzz-no-match");
  await expect(page.getByTestId("public-information-no-match")).toBeVisible();
  await expect(articles).toHaveCount(0);

  await page.getByTestId("public-information-search-clear").click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(articles).toHaveCount(2);
  await expect(page.getByTestId("public-information-no-match")).toHaveCount(0);

  const afterSearch = await liveSnapshot(page);
  expect(afterSearch).toEqual(beforeSearch);
  expect(afterSearch).toEqual(baseline);
});

test("live snapshot detects deliberate world mutation while stored baseline strings would not", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");
  const baseline = await baselineSnapshot(page);
  const beforeMutation = await liveSnapshot(page);

  await page.evaluate(() => {
    window.newsSearch1Harness!.mutateWorldForNegativeControl();
  });

  const afterMutation = await liveSnapshot(page);
  expect(afterMutation.world).not.toBe(beforeMutation.world);
  expect(afterMutation.world).not.toBe(baseline.world);
  expect(afterMutation.model).toBe(beforeMutation.model);

  const vacuousStoredBefore = baseline.world;
  const vacuousStoredAfter = baseline.world;
  expect(vacuousStoredAfter).toBe(vacuousStoredBefore);
  expect(afterMutation.world).not.toBe(vacuousStoredAfter);
});

test("empty save message differs from active-search no-match state", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1-empty.html");
  await expect(page.getByTestId("public-information-empty")).toHaveText(
    "No public-information items have been published in this save.",
  );
  await expect(page.getByTestId("public-information-search-input")).toHaveCount(
    0,
  );

  await page.goto("/tests/e2e/fixtures/news-search1.html");
  await page
    .getByTestId("public-information-search-input")
    .fill("zzzz-no-match");
  await expect(page.getByTestId("public-information-no-match")).toContainText(
    "zzzz-no-match",
  );
  await expect(page.getByTestId("public-information-empty")).toHaveCount(0);
});

test("keyboard search, clear, and glossary focus stay intact on a narrow viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/tests/e2e/fixtures/news-search1.html");

  const search = page.getByTestId("public-information-search-input");
  const baseline = await baselineSnapshot(page);
  await search.focus();
  await page.keyboard.type("downtown");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.locator(".public-information-article")).toHaveCount(2);

  const trigger = page
    .getByRole("button", {
      name: "Explain Published information",
    })
    .first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const afterKeyboard = await liveSnapshot(page);
  expect(afterKeyboard).toEqual(baseline);
  await context.close();
});

test("an updated supplied model re-filters under the active query without mutating prior items", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");
  const search = page.getByTestId("public-information-search-input");
  const beforeModelChange = await liveSnapshot(page);

  await page.getByTestId("news-view-all").click();
  await search.fill("downtown");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  await page.evaluate(() => {
    const harness = window.newsSearch1Harness!;
    const model = JSON.parse(
      harness.snapshot().model,
    ) as PublicInformationPanelModel;
    const downtownStory = model.items.find((item) =>
      item.body.includes("downtown"),
    );
    if (!downtownStory) {
      throw new Error("expected downtown story in fixture model");
    }
    const appended = {
      ...downtownStory,
      publicationId: "pub-search1-added",
      sourceEventId: "event-search1-added",
      headline: "Added riverfront briefing downtown",
      body: "A newly published riverfront briefing downtown.",
      people: [],
      corrections: [],
      civicReferences: [],
    };
    harness.replaceModel({
      ...model,
      items: [...model.items, appended],
      outlets: model.outlets.map((outlet) =>
        outlet.outletKey === appended.outletKey
          ? { ...outlet, storyCount: outlet.storyCount + 1 }
          : outlet,
      ),
    });
  });

  await expect(page.getByTestId("public-information-search-count")).toHaveText(
    "Showing 2 of 3 published stories.",
  );
  await expect(page.locator(".public-information-article")).toHaveCount(2);

  const afterModelChange = await liveSnapshot(page);
  expect(afterModelChange.world).toBe(beforeModelChange.world);
  expect(JSON.parse(afterModelChange.model).items).toHaveLength(3);
  expect(JSON.parse(beforeModelChange.model).items).toHaveLength(2);
});

test("search matches correction text and literal punctuation without breaking help or people", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");
  const baseline = await baselineSnapshot(page);

  const search = page.getByTestId("public-information-search-input");
  await search.fill("[special]");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  await search.fill("Typo in chamber");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  const trigger = page
    .getByRole("button", {
      name: "Explain Published information",
    })
    .first();
  await trigger.click();
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);

  const person = page.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  await person.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-person-id",
    personId!,
  );

  await page.locator(".public-information-corrections summary").first().click();
  await expect(
    page.locator(".public-information-corrections").first(),
  ).toContainText("Typo in chamber name.");

  const afterInteractions = await liveSnapshot(page);
  expect(afterInteractions).toEqual(baseline);
});

declare global {
  interface Window {
    newsSearch1Harness?: {
      baseline: NewsSearch1LiveSnapshot;
      snapshot(): NewsSearch1LiveSnapshot;
      mutateWorldForNegativeControl(): void;
      replaceModel(model: unknown): void;
    };
  }
}
