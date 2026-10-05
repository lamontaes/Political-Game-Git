import { expect, test, type Page } from "./fixtures";

import {
  chooseStateThenTown,
  enterLife,
  openCreator,
  startLife,
  completeCharacterStep,
} from "./support/creator";

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

async function expectNoCurrentVersion(page: Page) {
  await expect(page.getByTestId("shell-version")).toHaveCount(0);
  await expect(page.getByTestId("shell-build")).toHaveCount(0);
  // The diagnostic identity remains available; only its visible stamp is removed.
  const response = await page.request.get("/__dev/identity");
  expect(response.ok()).toBe(true);
  const identity = await response.json();
  expect(identity.head).toMatch(/^[0-9a-f]{40}$/);
  expect(typeof identity.dirty).toBe("boolean");
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 390, height: 844 },
]) {
  test(`omits current version stamps throughout player routes at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const check = () => {
        if (document.querySelector('[data-testid="shell-version"]'))
          document.documentElement.setAttribute(
            "data-test-version-stamp-seen",
            "true",
          );
      };
      new MutationObserver(check).observe(document, {
        childList: true,
        subtree: true,
      });
      check();
    });
    await freshBrowser(page);
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await expectNoCurrentVersion(page);

    await openCreator(page);
    await expectNoCurrentVersion(page);

    await page.getByTestId("start-normal").click();
    await completeCharacterStep(page, 30);
    await page.getByTestId("creator-continue-character").click();
    await expect(
      page.getByRole("heading", { name: "Where are you from?", exact: true }),
    ).toBeVisible();
    await chooseStateThenTown(page, "Kentucky", "Lexingto", /Lexington/i);
    await page.getByTestId("creator-continue-place").click();
    await page.getByTestId("whoareyou-answer").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    await expectNoCurrentVersion(page);

    /*
     * `questionnaire-finish` does not finish anything. Its button reads
     * "Review appearance" and its handler is `onFinishEarly`, which returns
     * the player to the creator's appearance step with Begin still to press.
     * This walk pressed it and waited for `play-screen`, so it timed out on a
     * screen the game had every intention of showing.
     *
     * The test id outlived the button's meaning, and the id is what a test
     * author reads. Nothing about the version stamp was ever wrong here: the
     * two failures this spec reported were both this navigation, two steps
     * before the first assertion the spec exists to make.
     */
    await page.getByTestId("questionnaire-finish").click();
    await expect(page.getByTestId("begin")).toBeEnabled();
    await expectNoCurrentVersion(page);

    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    await expectNoCurrentVersion(page);
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-test-version-stamp-seen",
      "true",
    );
  });
}

test("omits version stamps after a normal age-22 start", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await startLife(page, { age: 22, place: "Lexington", state: "Kentucky" });
  await enterLife(page);
  await expectNoCurrentVersion(page);
});
