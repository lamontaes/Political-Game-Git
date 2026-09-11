import { expect, test, type Page } from "./fixtures";

import { openCreator } from "./support/creator";

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
  await page.reload();
}

async function reachPlaceSearch(page: Page) {
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
}

async function chooseKentucky(page: Page) {
  await page.getByTestId("place-search").fill("Kentucky");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
}

async function expectFooterInsideViewport(
  page: Page,
  viewport: { width: number; height: number },
) {
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toBeVisible();
  const backBox = await back.boundingBox();
  expect(backBox).not.toBeNull();
  expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(viewport.height);

  const begin = page.getByTestId("begin");
  if ((await begin.count()) === 0) return;
  await expect(begin).toBeVisible();
  const beginBox = await begin.boundingBox();
  expect(beginBox).not.toBeNull();
  expect(beginBox!.y + beginBox!.height).toBeLessThanOrEqual(viewport.height);
  expect(
    backBox!.x + backBox!.width <= beginBox!.x ||
      beginBox!.x + beginBox!.width <= backBox!.x ||
      backBox!.y + backBox!.height <= beginBox!.y ||
      beginBox!.y + beginBox!.height <= backBox!.y,
  ).toBe(true);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 390, height: 844 },
]) {
  test(`keeps only applicable footer controls at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await freshBrowser(page);
    await reachPlaceSearch(page);

    await expect(page.getByTestId("begin")).toHaveCount(0);
    await expectFooterInsideViewport(page, viewport);

    await page.getByTestId("start-age").fill("22");
    await page.getByTestId("creator-continue-character").click();
    await expect(page.getByTestId("creator-stage-place")).toBeVisible();
    await expect(page.getByTestId("begin")).toHaveCount(0);
    await chooseKentucky(page);
    await page.getByTestId("creator-continue-place").click();
    await page.getByTestId("whoareyou-play").click();
    await expect(page.getByTestId("begin")).toBeEnabled();
    await expectFooterInsideViewport(page, viewport);
  });
}

test("bounds long search results and preserves Back/edit with keyboard", async ({
  page,
}) => {
  const viewport = { width: 1440, height: 900 };
  await page.setViewportSize(viewport);
  await freshBrowser(page);
  await reachPlaceSearch(page);
  await page.getByTestId("start-age").fill("22");
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("place-search").fill("Springfield");

  const choices = page.getByTestId("place-choices");
  await expect(choices.getByRole("button").first()).toBeVisible();
  await expect
    .poll(() =>
      choices.evaluate((node) => node.scrollHeight > node.clientHeight + 1),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    ),
  ).toBeLessThanOrEqual(1);

  await choices
    .getByRole("button", { name: /Springfield, Illinois/i })
    .first()
    .click();
  await expect(page.getByTestId("creator-continue-place")).toBeVisible();
  await expectFooterInsideViewport(page, viewport);

  await page.getByTestId("creator-summary-character").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await page.getByTestId("start-age").fill("23");
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("creator-summary-character")).toContainText(
    "age 23",
  );

  await page.getByRole("button", { name: "Back", exact: true }).focus();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("title-screen")).toBeVisible();
});
