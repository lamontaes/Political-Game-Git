import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  openShellMenu,
  saveLife,
  startLife,
} from "./support/creator";

async function savedWorld(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find((db) =>
      db.name?.endsWith("-art-preview"),
    )?.name;
    if (!name) throw Error("Expected isolated candidate save database");
    return new Promise<string>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const rows = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        rows.onerror = () => reject(rows.error);
        rows.onsuccess = () => {
          db.close();
          resolve(JSON.stringify(JSON.parse(rows.result[0].payload).world));
        };
      };
    });
  });
}
async function navigate(page: Page, id: string, group?: string) {
  await openShellMenu(page);
  if (!(await page.getByTestId(id).isVisible()) && group)
    await page.getByTestId(`nav-group-${group}`).click();
  await page.getByTestId(id).click();
}

test("A39 composed readers, municipal and constitutional routes preserve saved life and clock", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  await page.goto("/?seed=a39-composed-avery&art-preview=candidate", {
    timeout: 120_000,
    waitUntil: "domcontentloaded",
  });
  await startLife(page, {
    age: 34,
    givenName: "Avery",
    familyName: "Review",
    state: "Colorado",
    place: "Aurora",
    gender: "female",
  });
  await enterLife(page);
  await saveLife(page);
  const before = await savedWorld(page);
  await page.keyboard.press("Escape");
  const text: Record<string, string> = {};
  await navigate(page, "nav-calendar");
  await expect(page.getByTestId("ux39-calendar")).toBeVisible();
  await page.getByTestId("calendar-layout-week").press("Enter");
  await expect(page.locator(".ux39-calendar-grid tbody td")).toHaveCount(7);
  text.calendar = await page.getByTestId("ux39-calendar").innerText();
  await page.screenshot({ path: info.outputPath("01-calendar-private.png") });
  await navigate(page, "nav-news");
  await expect(page.getByTestId("world39-news")).toBeVisible();
  text.news = await page.getByTestId("world39-news").innerText();
  await page.screenshot({ path: info.outputPath("02-news-private.png") });
  await navigate(page, "nav-journal-entry");
  await expect(page.getByTestId("world39-journal")).toBeVisible();
  await expect(page.getByTestId("world39-biography")).toContainText(
    "You were born on",
  );
  text.journal = await page.getByTestId("world39-journal").innerText();
  await page
    .getByTestId("world39-journal")
    .locator("summary")
    .filter({ hasText: /^Record$/ })
    .press("Enter");
  await expect(page.locator(".world39-record")).toHaveAttribute("open", "");
  await page.screenshot({ path: info.outputPath("03-journal-private.png") });
  await navigate(page, "nav-municipal", "politics");
  await page.getByTestId("municipal-search").fill("Charlottesville");
  await page
    .getByTestId("municipal-government-select")
    .selectOption("us-va-charlottesville");
  await expect(page.getByTestId("municipal-governing")).toBeVisible();
  text.municipal = await page.getByTestId("municipal-governing").innerText();
  await page
    .getByTestId("municipal-governing")
    .locator("summary")
    .press("Enter");
  await expect(page.getByTestId("municipal-governing")).toContainText(
    "Virginia Code",
  );
  await navigate(page, "nav-politics-budget", "politics");
  await page
    .getByRole("button", {
      name: "Constitutional & charter changes",
      exact: true,
    })
    .press("Enter");
  await expect(page.getByTestId("constitutional-workspace")).toBeVisible();
  text.constitutional = await page
    .getByTestId("constitutional-workspace")
    .innerText();
  await navigate(page, "nav-politics-transit", "politics");
  await expect(
    page.getByRole("heading", { name: "Transit service", exact: true }),
  ).toBeVisible();
  text.transit = await page.locator("main").innerText();
  await saveLife(page);
  expect(await savedWorld(page)).toBe(before);
  await page.reload({ timeout: 120_000, waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Continue Avery Review/ }).click();
  await navigate(page, "nav-journal-entry");
  await expect(page.getByTestId("world39-biography")).toContainText(
    "You were born on",
  );
  expect(await savedWorld(page)).toBe(before);
  writeFileSync(
    info.outputPath("displayed-text.json"),
    JSON.stringify(text, null, 2),
  );
});
