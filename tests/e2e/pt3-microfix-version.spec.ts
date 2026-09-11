import { expect, test, type Page } from "./fixtures";

import { enterLife, openCreator, startLife } from "./support/creator";

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
    await page.getByTestId("creator-continue-character").click();
    await page.getByTestId("place-search").fill("Kentucky");
    await page
      .getByTestId("place-choices")
      .getByRole("button", { name: /Kentucky/i })
      .first()
      .click();
    await page.getByTestId("creator-continue-place").click();
    await page.getByTestId("whoareyou-answer").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    await expectCornerVersion(page, viewport);

    await page.getByTestId("questionnaire-finish").click();
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
  await startLife(page, { age: 22, place: "Kentucky" });
  await enterLife(page);
  await expectCornerVersion(page, { width: 1440, height: 900 });
});
