import { expect, test, type Page } from "./fixtures";

import { enterLife, openShellMenu, startLife } from "./support/creator";

/*
 * UI46 polish (MAPS s7-390 report): at a phone viewport a workspace uses the
 * viewport width with a gutter instead of collapsing to a narrow column, the
 * Politics tab strip stays compact, and nothing scrolls the page sideways.
 */

test.describe.configure({ timeout: 180_000 });

async function freshBrowser(page: Page): Promise<void> {
  await page.goto("/?art-preview=candidate");
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

test("Politics workspace fills a 390x844 phone frame", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await freshBrowser(page);
  await startLife(page, {
    state: "Nevada",
    place: "Alamo",
    age: 34,
    calibration: "skipped",
  });
  await enterLife(page);

  await openShellMenu(page);
  await page.getByTestId("nav-politics").click();
  await page.getByTestId("politics-tab-government").click();
  await expect(page.getByTestId("government-browser")).toBeVisible();

  const frame = page.locator(".pg-workspace").first();
  await expect(frame).toBeVisible();
  const box = (await frame.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(340);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);

  // The tab strip is at most two rows tall, or scrolls sideways.
  const strip = await page
    .locator(".pg-politics-tab-list")
    .first()
    .evaluate((list) => {
      const tabs = Array.from(list.querySelectorAll("button"));
      const tops = new Set(
        tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)),
      );
      return {
        rows: tops.size,
        scrolls: getComputedStyle(list).overflowX !== "visible",
      };
    });
  expect(strip.rows <= 2 || strip.scrolls).toBe(true);

  // The strip keeps keyboard access: a focused tab is scrolled into view.
  const parties = page.getByTestId("politics-tab-parties");
  await parties.focus();
  await expect(parties).toBeFocused();
  await expect(page.getByTestId("politics-tabs")).toHaveAttribute(
    "aria-label",
    "Politics",
  );
  await expect(page.getByTestId("politics-tab-government")).toHaveAttribute(
    "aria-current",
    "page",
  );
  const partiesBox = (await parties.boundingBox())!;
  expect(partiesBox.x).toBeGreaterThanOrEqual(0);
  expect(partiesBox.x + partiesBox.width).toBeLessThanOrEqual(390 + 1);

  // No sideways page scroll.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The corner navigation stays reachable and does not cover the frame.
  const cluster = page.getByTestId("shell-nav-cluster");
  await expect(cluster).toBeVisible();
  const clusterBox = (await cluster.boundingBox())!;
  expect(clusterBox.y + clusterBox.height).toBeLessThanOrEqual(844 + 1);
  expect(clusterBox.y).toBeGreaterThanOrEqual(box.y + box.height - 1);

  await page.screenshot({ path: info.outputPath("phone-government.png") });
  expect(errors).toEqual([]);
});
