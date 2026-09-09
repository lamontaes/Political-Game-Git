import { test, expect } from "./fixtures";
import {
  startLife,
  enterLife,
  openElsewhere,
  saveLife,
} from "./support/creator";

test("normal dated education offer, attendance, interruption and repeated saving", async ({
  page,
}) => {
  await page.goto("/?seed=ui-edu-path7-normal");
  await startLife(page, { age: 35, route: "custom", household: "lives-alone" });
  await enterLife(page);
  await openElsewhere(page, "work");
  const education = page.getByRole("region", {
    name: "Real education options",
    exact: true,
  });
  await education
    .getByRole("textbox", { name: "Search institutions" })
    .fill("Bluegrass");
  const institution = education.getByRole("button", {
    name: /Bluegrass Community and Technical College.*156392/,
  });
  await expect(institution).toBeVisible();
  await institution
    .locator("..")
    .getByRole("checkbox", { name: "Compare" })
    .check();
  await expect(education.getByRole("table")).toContainText(
    "Bluegrass Community and Technical College",
  );
  await institution.click();
  const request = education.getByRole("button", {
    name: "Request Workforce Education study offer",
    exact: true,
  });
  await expect(request).toBeEnabled();
  await request.focus();
  await page.keyboard.press("Enter");
  await education
    .getByRole("button", { name: "Accept study offer", exact: true })
    .click();
  const study = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Workforce Education — noncredit study",
      exact: true,
    }),
  });
  await expect(study).toContainText("0 attended sessions");
  await study
    .getByRole("button", { name: "Schedule next session", exact: true })
    .press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("You already have a commitment at that time.");
  await expect(study).toContainText("0 attended sessions");
  await expect(
    study.getByRole("button", {
      name: "Attend Workforce Education — noncredit study",
      exact: true,
    }),
  ).toHaveCount(0);
  await openElsewhere(page, "day");
  await page
    .getByTestId("venue-activities")
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("venue-activity-completed")).toBeVisible();
  await openElsewhere(page, "work");
  await study
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await study
    .getByRole("button", {
      name: "Attend Workforce Education — noncredit study",
      exact: true,
    })
    .click();
  await expect(study).toContainText("1 attended sessions");
  await study
    .getByRole("button", { name: "Interrupt", exact: true })
    .press("Space");
  await expect(study).toContainText("Interrupted");
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(study).toContainText("Interrupted. 1 attended sessions");
  await study.getByRole("button", { name: "Return", exact: true }).click();
  await study
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await study
    .getByRole("button", {
      name: "Attend Workforce Education — noncredit study",
      exact: true,
    })
    .press("Enter");
  await expect(study).toContainText("2 attended sessions");
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(study).toContainText("2 attended sessions");
});
