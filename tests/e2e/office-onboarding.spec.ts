import { expect, test } from "@playwright/test";

test("office onboarding records workflow only through Record, without voting", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/office-onboarding.html");
  const workspace = page.getByTestId("office-onboarding");
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-briefing-role", "briefing");
  await expect(workspace).toHaveAttribute("data-recommendation-status", "none");
  await expect(workspace).toHaveAttribute("data-executed-delegation", "false");
  await expect(
    page.getByTestId("office-briefing-not-recommendation"),
  ).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");
  await expect(page.getByLabel("Preference mode")).toHaveText("none");
  await expect(page.getByTestId("office-preference-absent")).toBeVisible();

  await page.getByTestId("office-instruction-yea").click();
  await expect(page.getByTestId("office-onboarding-error")).toContainText(
    "Record how this office handles votes and casework",
  );
  await expect(page.getByLabel("Preference mode")).toHaveText("none");
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");

  await page.getByTestId("office-record-workflow").click();
  await expect(page.getByTestId("office-onboarding-error")).toContainText(
    "Choose a voting workflow and a casework workflow",
  );
  await expect(page.getByLabel("Preference mode")).toHaveText("none");

  await page.getByTestId("office-voting-review-batch").check();
  await page.getByTestId("office-casework-player-handles-all").check();
  await expect(page.getByLabel("Preference mode")).toHaveText("none");
  await expect(page.getByTestId("office-preference-absent")).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");

  await page.getByTestId("office-record-workflow").click();
  await expect(page.getByTestId("office-preference-recorded")).toBeVisible();
  await expect(page.getByLabel("Preference mode")).toHaveText("review-batch");
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");

  await page.getByTestId("office-instruction-yea").click();
  await expect(page.getByTestId("office-instruction-refused")).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");

  await page
    .getByTestId("office-voting-prior-instructions-with-exceptions")
    .check();
  await page
    .getByTestId("office-casework-staff-routine-player-exceptions")
    .check();
  await expect(page.getByLabel("Preference mode")).toHaveText("review-batch");
  await page.getByTestId("office-record-workflow").click();
  await expect(page.getByLabel("Preference mode")).toHaveText(
    "prior-instructions-with-exceptions",
  );
  await page.getByTestId("office-instruction-yea").click();
  await expect(page.getByTestId("office-instruction-armed")).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");

  await page.getByRole("button", { name: "Reload snapshot" }).click();
  await expect(page.getByLabel("Preference mode")).toHaveText(
    "prior-instructions-with-exceptions",
  );
  await expect(page.getByTestId("office-instruction-armed")).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");
});
