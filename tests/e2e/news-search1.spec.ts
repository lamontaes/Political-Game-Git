import { expect, test } from "@playwright/test";

test("search filters published stories, clears focus, and leaves the world unchanged", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");
  const panel = page.getByTestId("public-information-panel");
  await expect(panel).toBeVisible();

  const search = page.getByTestId("public-information-search-input");
  const count = page.getByTestId("public-information-search-count");
  const articles = page.locator(".public-information-article");

  await expect(count).toHaveText("2 published stories.");
  await expect(articles).toHaveCount(2);

  await search.fill("downtown");
  await expect(count).toHaveText(
    "Showing 1 of 2 published stories.",
  );
  await expect(articles).toHaveCount(1);
  await expect(articles.first()).toContainText("downtown");

  await search.fill("zzzz-no-match");
  await expect(page.getByTestId("public-information-no-match")).toBeVisible();
  await expect(articles).toHaveCount(0);

  await page.getByTestId("public-information-search-clear").click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(articles).toHaveCount(2);
  await expect(page.getByTestId("public-information-no-match")).toHaveCount(0);

  const before = await page.locator("body").getAttribute("data-world-before");
  const after = await page.locator("body").getAttribute("data-world-after");
  expect(after).toBe(before);
});

test("search matches correction text and literal punctuation without breaking help or people", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-search1.html");

  const search = page.getByTestId("public-information-search-input");
  await search.fill("[special]");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  await search.fill("Typo in chamber");
  await expect(page.locator(".public-information-article")).toHaveCount(1);

  const trigger = page.getByRole("button", {
    name: "Explain Published information",
  });
  await trigger.click();
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);

  const person = page.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  await person.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-person-id",
    personId!,
  );
});
