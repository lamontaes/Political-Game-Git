import { expect, test } from "@playwright/test";

test("office onboarding records workflow without voting, then survives reload", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/office-onboarding.html");
  const workspace = page.getByTestId("office-onboarding");
  await expect(workspace).toBeVisible();
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");
  await expect(page.getByLabel("Preference mode")).toHaveText("none");
  await expect(page.getByTestId("office-preference-absent")).toBeVisible();
  await page.getByTestId("office-record-workflow").click();
  await expect(page.getByTestId("office-preference-recorded")).toBeVisible();
  await expect(page.getByLabel("Preference mode")).toHaveText(
    "prior-instructions-with-exceptions",
  );
  await expect(page.getByLabel("Recorded votes")).toHaveText("0");
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
