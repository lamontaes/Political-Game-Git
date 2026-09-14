import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";
import type { World } from "../../src/simulation";

async function savedWorld(page: {
  evaluate: (fn: () => Promise<World>) => Promise<World>;
}): Promise<World> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
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
      if (records.length !== 1) {
        throw new Error(`Expected one saved World, got ${records.length}`);
      }
      return JSON.parse(records[0]!.payload).world as World;
    } finally {
      db.close();
    }
  });
}

test("News orients from public records and Journal tells the lived account through save", async ({
  page,
}) => {
  await page.goto("/?seed=world39-news-journal");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 34,
    givenName: "Maya",
    familyName: "Hale",
    route: "normal",
  });
  await enterLife(page);
  await saveLife(page);
  const beforeNews = await savedWorld(page);

  await goTo(page, "nav-news");
  const news = page.getByTestId("news-orientation");
  await expect(news).toBeVisible();
  await expect(page.getByTestId("news-orientation-item").first()).toBeVisible();
  const newsText = await news.innerText();
  expect(newsText).toMatch(/Lexington, Kentucky is governed by/);
  expect(newsText).not.toMatch(/war broke out|secret motive|you chose to/i);
  expect(newsText).not.toMatch(
    /\brecorded\b|in this save|No incumbent|Reading does not publish|Assembled/i,
  );
  await expect(
    page.getByTestId("news-orientation-links").first(),
  ).toBeVisible();
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
  await expect(
    page
      .getByTestId("news-orientation-known-empty")
      .or(page.getByTestId("news-orientation-known")),
  ).toBeVisible();

  await goTo(page, "nav-journal-entry");
  await expect(page.getByTestId("journal-account")).toBeVisible();
  const account = page.getByTestId("journal-account-passages");
  await expect(account).toBeVisible();
  const accountText = await account.innerText();
  expect(accountText).toMatch(/You were born on/);
  expect(accountText).not.toMatch(/you chose to/i);
  expect(accountText).not.toMatch(
    /\brecorded\b|in this save|\d{4}-\d{2}-\d{2}/i,
  );
  await expect(
    page.getByTestId("journal-account-chapter").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Private notebook" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("journal-entries").or(page.getByTestId("journal-empty")),
  ).toBeVisible();

  await saveLife(page);
  const saved = await savedWorld(page);
  expect(saved.history.publications?.length ?? 0).toBe(0);
  expect(saved.history.nextSequence).toBe(beforeNews.history.nextSequence);

  await page.goto("/");
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(page.getByTestId("news-orientation")).toContainText(
    "Lexington, Kentucky is governed by",
  );
  await goTo(page, "nav-journal-entry");
  await expect(page.getByTestId("journal-account-passages")).toContainText(
    "You were born on",
  );
});
