import { expect, test, type Page } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";

async function savedWorld(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<string>((resolve, reject) => {
        const request = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () =>
          resolve(JSON.stringify(JSON.parse(request.result[0].payload).world));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test("UX39 ordinary calendar: month/week, pointer/keyboard, date order and unchanged saved life", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.goto("/?seed=ux39-calendar-ordinary", {
    waitUntil: "domcontentloaded",
  });
  await startLife(page, {
    age: 34,
    state: "Colorado",
    place: "Aurora",
    givenName: "Maya",
    familyName: "Rivera",
  });
  await enterLife(page);
  await saveLife(page);
  const before = await savedWorld(page);
  await page.keyboard.press("Escape");
  await goTo(page, "nav-calendar");
  await expect(page.getByTestId("ux39-calendar")).toBeVisible();
  const today = page.locator('.ux39-calendar-date[aria-current="date"]');
  const isoDate = await today.getAttribute("data-calendar-date");
  const source = JSON.parse(before);
  expect(isoDate).toBe(source.currentMoment.date);
  await expect(
    page.getByRole("radio", { name: "Month / day / year" }),
  ).toBeChecked();
  expect(
    await page.locator(".ux39-calendar-grid tbody td").count(),
  ).toBeGreaterThanOrEqual(28);
  await page.screenshot({ path: info.outputPath("01-month-private.png") });
  await today.click();
  await expect(today).toHaveAttribute("aria-pressed", "true");
  await today.focus();
  await page.keyboard.press("ArrowRight");
  const next = page.locator(".ux39-calendar-date:focus");
  expect(await next.getAttribute("data-calendar-date")).not.toBe(isoDate);
  await page.keyboard.press("Enter");
  await expect(next).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("calendar-layout-week").press("Enter");
  await expect(page.locator(".ux39-calendar-grid tbody td")).toHaveCount(7);
  const period = await page.getByTestId("calendar-grid-period").innerText();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  expect(await page.getByTestId("calendar-grid-period").innerText()).not.toBe(
    period,
  );
  await page
    .getByRole("button", { name: "Previous week", exact: true })
    .press("Enter");
  await expect(page.getByTestId("calendar-grid-period")).toHaveText(period);
  await page.getByRole("radio", { name: "Day / month / year" }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("radio", { name: "Day / month / year" }),
  ).toBeChecked();
  await page.screenshot({ path: info.outputPath("02-week-private.png") });
  await page.getByTestId("calendar-history-toggle").press("Enter");
  await expect(page.getByTestId("calendar-history")).toBeVisible();
  await expect(page.getByTestId("ux39-calendar")).toHaveCount(0);
  await page.getByTestId("calendar-tab-today").click();
  await page
    .getByRole("button", { name: "Show all upcoming", exact: true })
    .click();
  const entries = page.locator('[data-testid^="calendar-entry-"]');
  expect(
    await entries.count(),
    "This exact generated life must expose its scheduled commitment",
  ).toBeGreaterThan(0);
  await entries.first().click();
  await expect(entries.first()).toHaveAttribute("aria-pressed", "true");
  await entries.first().press("Enter");
  await expect(entries.first()).toHaveAttribute("aria-pressed", "false");
  await saveLife(page);
  expect(await savedWorld(page)).toBe(before);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-calendar");
  await expect(
    page.getByRole("radio", { name: "Day / month / year" }),
  ).toBeChecked();
  expect(await savedWorld(page)).toBe(before);
  await expect(
    page.locator('.ux39-calendar-date[aria-current="date"]'),
  ).toHaveAttribute("data-calendar-date", isoDate!);
});
