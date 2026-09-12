import { test, expect } from "@playwright/test";
test("LIFE-PATHS2 pointer, keyboard, period, interruption and reload proof", async ({
  page,
}) => {
  await page.goto("/life-paths2-proof.html");
  await expect(
    page.getByRole("heading", { name: "LIFE-PATHS2 isolated proof" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Enroll in College office administration certificate",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("You enrolled");
  await expect(
    page.getByText(/In progress\. Year 1, period 1 of 1\./),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Schedule next session", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Interrupt", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("interrupted");
  await page.reload();
  await expect(
    page.getByText(/Interrupted\. Year 1, period 1 of 1\./),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("returned");
  await page
    .getByRole("combobox", { name: "Person", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Make offer", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("Accepted");
  await page
    .getByRole("button", { name: "Continue one day", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start engagement", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("started");
  await page.getByRole("button", { name: "Assign work", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue one day", exact: true })
    .click();
  await expect(page.getByText(/Ready for review/)).toBeVisible();
  await page
    .getByRole("button", { name: "End engagement", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("ended");
});
