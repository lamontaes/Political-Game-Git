import { expect, test } from "./fixtures";
import { startLife, enterLife, openElsewhere } from "./support/creator";
/** Requires the UI owner's LIFE-panel registration patch, never a fixture route. */
test("normal civilian career offer, keyboard consent, work, resignation and save", async ({
  page,
}) => {
  await page.goto("/?seed=career-path7-normal");
  await startLife(page, { age: 35, route: "custom", household: "lives-alone" });
  await enterLife(page);
  await openElsewhere(page, "work");
  const career = page.getByRole("region", {
    name: "Career opportunities",
    exact: true,
  });
  await expect(career).toBeVisible();
  await career
    .getByRole("button", { name: "Seek an offer", exact: true })
    .click();
  await career
    .getByRole("button", { name: "Refuse offer", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(career.getByRole("status")).toContainText("declined");
  await career
    .getByRole("button", { name: "Seek an offer", exact: true })
    .click();
  await career
    .getByRole("button", { name: "Accept offer", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(career.getByRole("status")).toContainText("Accepted");
  await career
    .getByRole("button", { name: "Wait one day", exact: true })
    .click();
  await expect(career.getByRole("status")).toHaveText(
    "Resolve your current calendar commitment before waiting.",
  );
  // The normal start has a real commitment; fulfill it through Day.
  await openElsewhere(page, "day");
  const activities = page
    .getByTestId("day-overlay")
    .getByTestId("venue-activities");
  await activities
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .click();
  await expect(
    activities.getByTestId("venue-activity-completed"),
  ).toBeVisible();
  await openElsewhere(page, "work");
  await career
    .getByRole("button", { name: "Wait one day", exact: true })
    .click();
  await expect(career.getByRole("status")).toHaveText("One day passed.");
  await career
    .getByRole("button", { name: "Begin accepted work", exact: true })
    .click();
  await expect(career.getByRole("status")).toContainText("began");
  await career
    .getByRole("button", { name: "Schedule responsibility", exact: true })
    .click();
  await expect(career.getByRole("status")).toContainText("scheduled");
  await career
    .getByRole("textbox", { name: "Work submission", exact: true })
    .fill(
      "Recorded the customer request and prepared the requested stock for purchase.",
    );
  await career
    .getByRole("button", { name: "Perform shift and submit work", exact: true })
    .click();
  await expect(career.getByRole("status")).toContainText("recorded");
  await career.getByRole("button", { name: "Resign", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(career.getByRole("status")).toContainText("left");
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("keep-world").click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(
    career.getByText(
      "Recorded the customer request and prepared the requested stock for purchase.",
      { exact: false },
    ),
  ).toBeVisible();
});
