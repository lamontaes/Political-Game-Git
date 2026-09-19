import { expect, test } from "./fixtures";
import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  goTo,
  saveLife,
  startLife,
  openNewsContext,
} from "./support/creator";

/**
 * Wording that describes the save or the engine instead of the place or the life.
 *
 * The three identifier alternations require an id-length hex run. Written as a
 * single hex character they matched any word beginning with a, b, c, d, e or f
 * under /i — "Publication details" is a control label, not a leaked id, and it
 * failed this guard eight times in one page. Asking for an identifier is what
 * the guard always meant; asking for one hex letter was an accident of how it
 * was written.
 */
const DATABASE_WORDING =
  /\brecorded\b|in this save|saved-world|No incumbent|Reading does not|Assembled|\d{4}-\d{2}-\d{2}|Tenure [0-9a-f]{6,}|Event [0-9a-f]{6,}|Publication [0-9a-f]{6,}/i;

test("News speaks about the place and the Journal tells the life through save (Aurora, Colorado)", async ({
  page,
}) => {
  await page.goto("/?seed=world39-editorial");
  await startLife(page, {
    place: "Aurora",
    state: "Colorado",
    age: 34,
    givenName: "Maya",
    familyName: "Hale",
    route: "normal",
  });
  await enterLife(page);
  await saveLife(page);

  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  const news = page.getByTestId("world39-news");
  await expect(news).toBeVisible();
  await expect(news).toContainText("Around Aurora, Colorado");
  await expect(news).toContainText("serves as President of the United States");
  await expect(news).toContainText(
    /has served as President of the United States since [A-Z][a-z]+ \d{4}\./,
  );
  const newsText = await news.innerText();
  expect(newsText).not.toMatch(/war broke out|secret motive|you chose to/i);
  expect(newsText).not.toMatch(DATABASE_WORDING);
  expect(newsText).not.toMatch(/Fictional saved-world|reading here does not/i);
  // A seeded opening carries outlets that have already filed, so News has
  // reporting rather than the empty line this once asserted. What matters is
  // still what it says about the place: a named outlet and a story that reads
  // as reporting, not as a record.
  const reporting = news.locator("[data-publication-id]");
  await expect(reporting.first()).toBeVisible();
  await expect(reporting.first()).toContainText(
    /Published [A-Z][a-z]+ \d{1,2}, \d{4}/,
  );
  await expect(page.getByTestId("world39-no-reporting")).toHaveCount(0);

  await goTo(page, "nav-journal-entry");
  const journal = page.getByTestId("world39-journal");
  await expect(journal).toBeVisible();
  await expect(journal).toContainText("Your life so far");
  const biography = page.getByTestId("world39-biography");
  await expect(biography).toContainText(
    /You were born on [A-Z][a-z]+ \d{1,2}, \d{4}\./,
  );
  await expect(page.getByTestId("world39-chapter").first()).toBeVisible();
  const accountText = await biography.innerText();
  expect(accountText).not.toMatch(/you chose to/i);
  expect(accountText).not.toMatch(DATABASE_WORDING);

  await saveLife(page);
  await page.goto("/");
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  await expect(page.getByTestId("world39-news")).toContainText(
    "Around Aurora, Colorado",
  );
  await goTo(page, "nav-journal-entry");
  await expect(page.getByTestId("world39-biography")).toContainText(
    "You were born on",
  );
});

test("Kentucky regression: Lexington's News names its consolidated government plainly", async ({
  page,
}) => {
  await page.goto("/?seed=world39-editorial-lexington");
  await startLife(page, {
    ...KENTUCKY_LEXINGTON_REGRESSION,
    age: 34,
    givenName: "Maya",
    familyName: "Hale",
    route: "normal",
  });
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  const news = page.getByTestId("world39-news");
  await expect(news).toContainText(
    "Lexington, Kentucky is governed by Lexington-Fayette Urban County Government",
  );
  await expect(news).toContainText("Urban County Council");
  const newsText = await news.innerText();
  expect(newsText).not.toMatch(/URBAN_COUNTY|Form:|Recorded body/);
  expect(newsText).not.toMatch(DATABASE_WORDING);
});
