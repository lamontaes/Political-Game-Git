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
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
}

test("keeps the canonical place without formal or capability clutter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await reachPlaceSearch(page);

  await page.getByTestId("place-search").fill("lex");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Lexington, Kentucky/i })
    .first()
    .click();

  const context = page.getByTestId("place-context");
  await expect(context).toContainText("Lexington, Kentucky");
  await expect(context).not.toContainText("This is the exact place");
  await expect(context).not.toContainText("Lexington-Fayette");
  await expect(context).not.toContainText("United States");
  await expect(context).not.toMatch(/game models|no legislature|capability/i);
});

test("scopes the unavailable message to the legislative staff start", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshBrowser(page);
  await openCreator(page);
  await page.getByTestId("start-custom").click();
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  await page.getByTestId("place-search").fill("lex");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Lexington, Kentucky/i })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
  await expect(page.getByTestId("creator-stage-background")).toBeVisible();
  const office = page.getByTestId("office-start");
  await expect(office).toBeDisabled();
  await expect(office).toContainText(
    "A legislative staff start is not available for this selected place yet.",
  );
  await expect(office).not.toContainText(/no legislature/i);
});
