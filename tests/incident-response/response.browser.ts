import { test, expect } from "@playwright/test";
test("pointer and keyboard decision, actual work, briefing and save/reload", async ({
  page,
}) => {
  await page.goto("/tests/incident-response/index.html");
  const staff = page.getByLabel("Staff member");
  await staff.selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Commission response briefing" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Recorded.");
  await expect(
    page.getByRole("button", { name: "Arrange briefing", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Continue 30 minutes" }).click();
  const arrange = page.getByRole("button", {
    name: "Arrange briefing",
    exact: true,
  });
  await expect(arrange).toBeEnabled();
  await arrange.focus();
  await page.keyboard.press("Enter");
  const attend = page.getByRole("button", { name: "Attend response briefing" });
  await attend.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("heading", { name: "Follow-up", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Request existing allocation" })
    .click();
  await expect(page.getByTestId("delivery-count")).toHaveText("0 deliveries");
  await page.getByRole("button", { name: "Continue to next day" }).click();
  const authorize = page.getByRole("button", {
    name: "Authorize requested allocation",
  });
  await authorize.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("delivery-count")).toHaveText("0 deliveries");
  await page
    .getByRole("button", { name: "Deliver existing allocation" })
    .click();
  await expect(page.getByTestId("delivery-count")).toHaveText("1 deliveries");
  await page.getByRole("button", { name: "Save diagnostic" }).click();
  await expect(page.getByTestId("save-status")).toHaveText("saved");
  await page.reload();
  await page.getByRole("button", { name: "Reload diagnostic" }).click();
  await expect(page.getByTestId("delivery-count")).toHaveText("1 deliveries");
  await expect(
    page.getByRole("heading", { name: "Follow-up", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Attend response briefing" }),
  ).toHaveCount(0);
});

test("information request, deferral and declined allocation remain distinct", async ({
  page,
}) => {
  await page.goto("/tests/incident-response/index.html");
  await page.getByLabel("Staff member").selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Request information", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Recorded.");
  await page.getByRole("button", { name: "Defer response briefing" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Arrange briefing", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Request existing allocation" })
    .click();
  await page.getByRole("button", { name: "Continue to next day" }).click();
  await page
    .getByRole("button", { name: "Decline requested allocation" })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status")).toHaveText("Recorded.");
  await expect(page.getByTestId("delivery-count")).toHaveText("0 deliveries");
});
