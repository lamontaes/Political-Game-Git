import { expect, test } from "@playwright/test";

test("a resident requests, takes, saves and continues the paid operator's trip", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/e2e/fixtures/resident-transit-service.html");
  const panel = page.getByRole("region", { name: "Request a transit trip" });
  await expect(
    panel.getByText("Authored resident transit operator", { exact: true }),
  ).toBeVisible();
  const transfers = await page.getByTestId("saved-transfers").textContent();
  await expect(page.getByTestId("delivered-trips")).toHaveText(
    "Completed service receipts: 0",
  );
  await panel.getByLabel("Start in how many minutes?").fill("30");
  await panel
    .getByRole("button", { name: /Request a \d+-minute trip/ })
    .click();
  await expect(panel.getByRole("status")).toContainText("is scheduled");
  await expect(page.getByTestId("delivered-trips")).toHaveText(
    "Completed service receipts: 0",
  );
  await page.getByRole("button", { name: "Take the scheduled trip" }).click();
  await expect(page.getByTestId("delivered-trips")).toHaveText(
    "Completed service receipts: 1",
  );
  await expect(page.getByTestId("saved-transfers")).toHaveText(transfers!);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/saveId=/);
  await page.reload();
  await expect(page.getByTestId("delivered-trips")).toHaveText(
    "Completed service receipts: 1",
  );
  await expect(page.getByTestId("saved-transfers")).toHaveText(transfers!);
  await expect(
    page.getByRole("button", { name: "Take the scheduled trip" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
