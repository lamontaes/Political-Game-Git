import { expect, test } from "@playwright/test";

test("keyboard route preserves condensed intent and exact confirmed wording", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/news-press4.html");
  const panel = page.getByTestId("press-interview-panel");
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close press interview" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Condensed" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("condensed-explanation")).toContainText(
    "not a refusal",
  );
  await page.getByRole("button", { name: /Add context/u }).click();
  await page
    .getByLabel("Follow-up being answered")
    .fill("Which details are not yet decided?");
  await page
    .getByLabel("Consequential wording")
    .fill("No final vote has occurred.");
  await page.getByRole("button", { name: "Review exact wording" }).click();

  await expect(page.locator("body")).toHaveAttribute(
    "data-drafted-mode",
    "condensed",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-drafted-intent",
    "add-context",
  );
  await expect(page.getByTestId("press-exact-wording")).toHaveText(
    "No final vote has occurred.",
  );
  await page
    .getByRole("button", { name: "Confirm this exact wording" })
    .press("Space");
  await expect(page.locator("body")).toHaveAttribute(
    "data-confirmed-wording",
    "No final vote has occurred.",
  );
});

test("terms help and typed people support touch, focus return and Escape", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/tests/e2e/fixtures/news-press4.html");

  const terms = page.getByRole("button", { name: "Explain On background" });
  await terms.tap();
  const help = page.getByTestId("press-terms-help");
  await expect(help).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close On background explanation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(help).toHaveCount(0);
  await expect(terms).toBeFocused();

  const reporter = page.locator('[data-person-id="person_press_reporter"]');
  await reporter.tap();
  await expect(page.locator("body")).toHaveAttribute(
    "data-opened-person-id",
    "person_press_reporter",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator("body")).toHaveAttribute(
    "data-panel-closed",
    "true",
  );
  await context.close();
});
