import { test, expect } from "@playwright/test";
test("EDU real institution search, explicit offer, study, interruption and save", async ({
  page,
}) => {
  await page.goto("/edu-path7-proof.html");
  await page
    .getByRole("textbox", { name: "Search institutions" })
    .fill("Bluegrass");
  const institution = page.getByRole("button", {
    name: /Bluegrass Community and Technical College/,
  });
  await expect(institution).toBeVisible();
  await institution.click();
  const request = page.getByRole("button", {
    name: "Request Workforce Education study offer",
  });
  await request.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Accept study offer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept study offer" }).click();
  await page
    .getByRole("button", { name: "Schedule next session", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: /^Attend Workforce Education/ })
    .click();
  await page.getByRole("button", { name: "Interrupt", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(
    page.getByText("Interrupted. 1 attended sessions.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return", exact: true }).click();
  await page
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Attend Workforce Education/ })
    .click();
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(
    page.getByText("Active. 2 attended sessions.", { exact: true }),
  ).toBeVisible();
});
