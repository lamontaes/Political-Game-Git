import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  saveLife,
  startLife,
  openNewsContext,
} from "./support/creator";
import {
  expectRecordedMember,
  enterRecordedMemberTerm,
  readSavedLegislativeWorld as savedWorld,
} from "./support/legislative-entry";
import type { Page } from "@playwright/test";

async function publishFirstBill(page: Page) {
  await enterRecordedMemberTerm(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
}

test("normal legislative publication supports search, clear, help, person, Back, and save/reload without mutating World", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-connect2-news");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 38,
    route: "normal",
  });
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  // A seeded opening carries published reporting, so the directory is not
  // empty — but it opens on For You, and nothing has been published about this
  // player yet. That is the honest modern form of what this once asserted:
  // not "nothing exists" but "nothing about you". The full record stays one
  // click away under All.
  await expect(page.getByTestId("public-information-empty")).toHaveCount(0);
  await expect(
    page.getByTestId("public-information-for-you-empty"),
  ).toBeVisible();
  // The directory context mounts the panel with showClose={false}, so there is
  // no close button here and there has not been since the composition landed —
  // this step only became reachable once the assertion above stopped failing
  // first. Escape is handled on the panel itself, so it still closes from any
  // control inside it.
  await page.getByTestId("news-view-all").press("Escape");

  await publishFirstBill(page);
  await saveLife(page);
  const published = await savedWorld(page);
  const { measure } = expectRecordedMember(published);
  const introduction = published.history.legislativeActions!.find(
    (action) => action.measureId === measure.id && action.kind === "introduced",
  );
  expect(introduction).toBeDefined();
  const publications = published.history.publications!.filter(
    (record) => record.sourceEventId === introduction!.eventId,
  );
  expect(publications).toHaveLength(1);

  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  const article = page.locator(
    `.public-information-article[data-source-event-id="${introduction!.eventId}"]`,
  );
  await expect(article).toBeVisible();
  const headline = await article.locator("h3").innerText();
  const search = page.getByTestId("public-information-search-input");
  const queryToken = headline.split(/\s+/).find((part) => part.length > 3)!;

  await search.fill(queryToken);
  await expect(page.locator(".public-information-article")).toHaveCount(1);
  await search.fill("zzzz-no-such-story-token");
  await expect(page.getByTestId("public-information-no-match")).toContainText(
    "zzzz-no-such-story-token",
  );
  await expect(page.getByTestId("public-information-search-count")).toHaveCount(
    0,
  );
  await page.getByTestId("public-information-search-clear").click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  const glossaryTrigger = article
    .getByRole("button", { name: /^Explain/ })
    .first();
  if ((await glossaryTrigger.count()) > 0) {
    await glossaryTrigger.press("Enter");
    await expect(page.getByTestId("public-information-help")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("public-information-help")).toHaveCount(0);
  }

  const corrections = article.locator(
    ".public-information-corrections summary",
  );
  if ((await corrections.count()) > 0) {
    await corrections.first().click();
    await expect(
      article.locator(".public-information-corrections"),
    ).toBeVisible();
  }

  const person = article.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  const name = await person.innerText();
  await person.click();
  await expect(page.getByTestId("person-workspace")).toContainText(name);
  await page.getByTestId("person-workspace-back").press("Enter");
  await expect(person).toBeFocused();

  await page.screenshot({
    path: info.outputPath("normal-news-search-desktop.png"),
    fullPage: true,
  });

  const afterReads = await savedWorld(page);
  expect(afterReads).toEqual(published);

  await saveLife(page);
  expect(await savedWorld(page)).toEqual(published);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  await expect(article).toBeVisible();
  await expect(person).toHaveAttribute("data-person-id", personId!);
  await saveLife(page);
  expect(await savedWorld(page)).toEqual(published);
});

/**
 * This one case keeps the real campaign, and pays the term walk for it.
 *
 * What it is about is search narrowing two published stories to one, so it
 * needs two publications that can be told apart. The constructed seat's
 * chamber offers exactly one drafting option, and filing that option twice
 * would produce two stories whose copy is `designation — shortTitle` with the
 * same shortTitle both times: they would differ only by bill number, which is
 * too short to be the four-character token this case searches on. So the
 * second publication has to be a different bill, and that needs the chamber a
 * won election actually gives.
 */
test("normal News search stays usable on a narrow viewport after a second publication", async ({
  browser,
}, info) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/?seed=ui-connect2-news");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 38,
    route: "normal",
  });
  await enterLife(page);
  // The real route, not the recorded-term fixture the other cases use.
  await reachMemberOffice(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await saveLife(page);
  const afterFirst = await savedWorld(page);
  await goTo(page, "elsewhere-work");
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').nth(1).click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await saveLife(page);
  const afterSecond = await savedWorld(page);
  expect(afterSecond.history.publications!.length).toBeGreaterThan(
    afterFirst.history.publications!.length,
  );

  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  const articles = page.locator(".public-information-article");
  await expect(articles).toHaveCount(2);
  const search = page.getByTestId("public-information-search-input");
  const articleTexts = await articles.allTextContents();
  const token = articleTexts[0]
    ?.match(/[\p{L}\p{N}'’-]{4,}/gu)
    ?.find((part) =>
      articleTexts
        .slice(1)
        .every(
          (text) =>
            !text.toLocaleLowerCase().includes(part.toLocaleLowerCase()),
        ),
    );
  expect(
    token,
    "the first publication should have a distinguishing search term",
  ).toBeTruthy();
  await search.tap();
  await search.fill(token!);
  await expect(articles).toHaveCount(1);
  await page.getByTestId("public-information-search-clear").tap();
  await expect(articles).toHaveCount(2);

  await page.screenshot({
    path: info.outputPath("normal-news-search-narrow.png"),
    fullPage: true,
  });

  expect(await savedWorld(page)).toEqual(afterSecond);
  await context.close();
});

test("normal News keeps For You, outlet following, person Back, and per-life persistence over the canonical publication", async ({
  page,
}, info) => {
  await page.goto("/?seed=recovery25-news");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 38,
    route: "normal",
  });
  await enterLife(page);
  // The real route, not the recorded-term fixture the other cases use.
  await reachMemberOffice(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await saveLife(page);

  const published = await savedWorld(page);
  const { measure } = expectRecordedMember(published);
  const introduction = published.history.legislativeActions!.find(
    (action) => action.measureId === measure.id && action.kind === "introduced",
  );
  expect(introduction).toBeDefined();

  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  const article = page.locator(
    `.public-information-article[data-source-event-id="${introduction!.eventId}"]`,
  );
  await expect(page.getByTestId("news-view-for-you")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(article).toBeVisible();
  await expect(article.getByTestId("news-relevance")).toContainText(
    "This story names you.",
  );

  await page.getByTestId("news-view-all").press("Enter");
  await expect(article).toBeVisible();
  await page.getByTestId("news-view-outlet-civic-ledger").click();
  await expect(
    page.getByTestId("public-information-outlet-view"),
  ).toContainText("Civic Ledger");
  await expect(page.getByTestId("news-outlet-follow")).toHaveText("Follow");
  await page.getByTestId("news-outlet-follow").click();
  await expect(page.getByTestId("news-outlet-follow")).toHaveText("Unfollow");

  await page.getByTestId("news-view-for-you").click();
  await expect(article.getByTestId("news-relevance")).toContainText(
    "You follow Civic Ledger.",
  );
  const search = page.getByTestId("public-information-search-input");
  await search.fill("zzzz-no-story");
  await expect(page.getByTestId("public-information-no-match")).toBeVisible();
  await page.getByTestId("public-information-search-clear").click();

  const person = article.locator(".public-information-people button").first();
  const name = await person.innerText();
  await person.click();
  await expect(page.getByTestId("person-workspace")).toContainText(name);
  await page.getByTestId("person-workspace-back").press("Enter");
  await expect(article).toBeVisible();

  await page.screenshot({
    path: info.outputPath("recovery25-news-current-ui.png"),
    fullPage: true,
  });
  expect(await savedWorld(page)).toEqual(published);

  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  await page.getByTestId("news-view-outlet-civic-ledger").click();
  await expect(page.getByTestId("news-outlet-follow")).toHaveText("Unfollow");
  await page.getByTestId("news-outlet-follow").click();
  await expect(page.getByTestId("news-outlet-follow")).toHaveText("Follow");
  await page.getByTestId("news-view-all").click();
  await expect(article).toBeVisible();
  expect(await savedWorld(page)).toEqual(published);
});

test("compact News keeps view and follow controls keyboard reachable", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/?seed=recovery25-news-compact");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 38,
    route: "normal",
  });
  await enterLife(page);
  await publishFirstBill(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");

  const outlet = page.getByTestId("news-view-outlet-civic-ledger");
  await outlet.focus();
  await page.keyboard.press("Enter");
  const follow = page.getByTestId("news-outlet-follow");
  await expect(follow).toBeVisible();
  await follow.focus();
  await page.keyboard.press("Space");
  await expect(follow).toHaveText("Unfollow");

  await page.locator(".pg-workspace-body").evaluate((element) => {
    element.scrollTop = 0;
  });

  await page.screenshot({
    path: info.outputPath("recovery25-news-compact.png"),
    fullPage: true,
  });
  await context.close();
});
