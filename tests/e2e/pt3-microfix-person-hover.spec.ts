import { expect, test, type Page } from "./fixtures";

import { enterLife, startLife } from "./support/creator";

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

test("person hover stays transparent while pointer and keyboard activation work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await startLife(page, {
    age: 34,
    place: "Kentucky",
    household: "shares-a-home",
  });
  await enterLife(page);

  const person = page.locator('[data-testid^="scene-person-"]').first();
  await expect(person).toBeVisible();
  await expect(person).toHaveClass(/scene-person-token--selectable/);
  await expect(person).toHaveAttribute("type", "button");
  await expect(person).toHaveAttribute("aria-label", /.+/);
  await expect(person).toHaveCSS("pointer-events", "auto");

  await person.hover();
  await expect(person).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await person.click();
  await expect(page.getByTestId("person-action-menu")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("person-action-menu")).toHaveCount(0);
  await person.focus();
  await expect(person).toBeFocused();
  const focusOutline = await person.evaluate(
    (element) => window.getComputedStyle(element).outlineStyle,
  );
  expect(focusOutline).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("person-action-menu")).toBeVisible();
});

test("an ordinary creator button keeps the intended green hover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await page.getByTestId("new-game").click();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("place-search").fill("Kentucky");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
  await page.getByTestId("whoareyou-play").click();
  const begin = page.getByTestId("begin");
  await expect(begin).toBeEnabled();
  await begin.hover();
  await expect(begin).toHaveCSS("background-color", "rgb(36, 89, 77)");
});
