import { expect, test } from "./fixtures";

test("the panel offers no explanation popup and Escape closes it, read-only", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-help2.html");
  const panel = page.getByTestId("public-information-panel");
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close public information" }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Explain Published information" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);

  const before = await page.locator("body").getAttribute("data-world-before");
  const after = await page.locator("body").getAttribute("data-world-after");
  expect(after).toBe(before);

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute(
    "data-panel-closed",
    "true",
  );
});

test("touch: a typed person reference opens the actual person", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/tests/e2e/fixtures/news-help2.html");

  const person = page.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  await person.tap();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-person-id",
    personId!,
  );
  await expect(page.locator("#opened-person")).toContainText("Opened person");
  await context.close();
});
