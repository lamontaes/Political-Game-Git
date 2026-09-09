import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import type { Page } from "@playwright/test";

async function savedWorld(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<Array<{ payload: string }>>(
      (resolve, reject) => {
        const request = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    return JSON.parse(records[0]!.payload).world;
  });
}

async function save(page: Page) {
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
}

test("normal completed legislative action publishes News with person Back and unchanged read/save history", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-connect2-news");
  await startLife(page, { age: 38, route: "custom", office: true });
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
  await page
    .getByRole("button", { name: "Close public information" })
    .press("Escape");
  await expect(page.getByTestId("shell-nav-cluster")).toBeFocused();
  await goTo(page, "elsewhere-work");
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await save(page);
  const published = await savedWorld(page);
  expect(published.history.publications.length).toBeGreaterThan(0);
  await goTo(page, "nav-news");
  const article = page.locator(".public-information-article").first();
  const sourceEventId = await article.getAttribute("data-source-event-id");
  const source = published.history.events.find(
    (event: { id: string }) => event.id === sourceEventId,
  );
  expect(source.visibility).toBe("public");
  const person = article.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  const name = await person.innerText();
  await person.click();
  await expect(page.getByTestId("person-workspace")).toContainText(name);
  await expect(
    page.getByTestId("person-workspace").locator("[data-person-id]").first(),
  ).toHaveAttribute("data-person-id", personId!);
  await page.getByTestId("person-workspace-back").press("Enter");
  await expect(person).toBeFocused();
  await article
    .getByRole("button", { name: /^Explain/ })
    .first()
    .press("Enter");
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("normal-news-1440.png") });
  await save(page);
  expect(await savedWorld(page)).toEqual(published);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(article).toHaveAttribute("data-source-event-id", sourceEventId!);
  await expect(person).toHaveAttribute("data-person-id", personId!);
  await save(page);
  expect(await savedWorld(page)).toEqual(published);
});
