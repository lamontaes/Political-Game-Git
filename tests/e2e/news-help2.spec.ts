import { expect, test } from "@playwright/test";

test("inline civic help supports keyboard focus, Escape, and read purity", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-help2.html");
  const panel = page.getByTestId("public-information-panel");
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close public information" }),
  ).toBeFocused();
  const trigger = page.getByRole("button", {
    name: "Explain Published information",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const help = page.getByTestId("public-information-help");
  await expect(help).toBeVisible();
  const close = page.getByRole("button", {
    name: "Close Published information explanation",
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(help).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const before = await page.locator("body").getAttribute("data-world-before");
  const after = await page.locator("body").getAttribute("data-world-after");
  expect(after).toBe(before);

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute(
    "data-panel-closed",
    "true",
  );
});

test("touch opens help and a typed person reference opens the actual person", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/tests/e2e/fixtures/news-help2.html");

  await page
    .getByRole("button", { name: "Explain Published information" })
    .tap();
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");

  const person = page.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  await person.tap();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-person-id",
    personId!,
  );
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);
  await expect(page.locator("#opened-person")).toContainText("Opened person");
  await context.close();
});
