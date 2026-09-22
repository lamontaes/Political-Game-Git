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

async function expectCornerVersion(
  page: Page,
  viewport: { width: number; height: number },
) {
  const version = page.getByTestId("shell-version");
  await expect(version).toHaveCount(1);
  await expect(version).toHaveText(/^v\d+\.\d+\.\d+$/);
  // The build hash is not shown to the player; it stays in the tooltip.
  await expect(page.getByTestId("shell-build")).toHaveCount(0);
  const response = await page.request.get("/__dev/identity");
  expect(response.ok()).toBe(true);
  const identity = await response.json();
  await expect(version).toHaveAttribute(
    "title",
    identity.dirty ? `${identity.head} (uncommitted changes)` : identity.head,
  );
  await expect(version).not.toContainText(identity.head.slice(0, 7));

  const geometry = await version.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      position: style.position,
      right: Number.parseFloat(style.right),
      bottom: Number.parseFloat(style.bottom),
      left: box.left,
      top: box.top,
      rightEdge: box.right,
      bottomEdge: box.bottom,
    };
  });

  expect(geometry.position).toBe("fixed");
  expect(geometry.rightEdge).toBeLessThanOrEqual(viewport.width);
  expect(geometry.bottomEdge).toBeLessThanOrEqual(viewport.height);
  expect(geometry.left).toBeGreaterThan(0);
  expect(geometry.top).toBeGreaterThan(0);
  expect(viewport.width - geometry.rightEdge).toBeCloseTo(geometry.right, 0);
  expect(viewport.height - geometry.bottomEdge).toBeCloseTo(geometry.bottom, 0);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 390, height: 844 },
]) {
  test(`keeps one canonical version stamp in the viewport at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await freshBrowser(page);
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await expectCornerVersion(page, viewport);

    await openCreator(page);
    await expectCornerVersion(page, viewport);

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
    await expectCornerVersion(page, viewport);

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
    await expectCornerVersion(page, viewport);

    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    await expectCornerVersion(page, viewport);
  });
}

test("uses the same version placement after a normal age-22 start", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await startLife(page, { age: 22, place: "Lexington", state: "Kentucky" });
  await enterLife(page);
  await expectCornerVersion(page, { width: 1440, height: 900 });
});
