import { test, expect, type Page } from "./fixtures";

async function continueDays(page: Page, days: number) {
  const button = page.getByRole("button", {
    name: "Continue one day",
    exact: true,
  });
  for (let i = 0; i < days; i++) await button.click();
}

test("EDU real institution search, explicit offer, period study, interruption and save", async ({
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
  const study = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: /Workforce Education — noncredit study/,
    }),
  });
  await expect(study).toContainText("period 1 of 1");
  await expect(
    study.getByRole("button", { name: "Schedule next session", exact: true }),
  ).toHaveCount(0);
  await continueDays(page, 20);
  await study.getByRole("button", { name: "Interrupt", exact: true }).click();
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(study).toContainText("Interrupted");
  await study.getByRole("button", { name: "Return", exact: true }).click();
  await continueDays(page, 29);
  await expect(study).toContainText("Completed");
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(study).toContainText("Completed");
});
