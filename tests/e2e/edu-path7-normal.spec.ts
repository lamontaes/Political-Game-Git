import { readSavedLegislativeWorld } from "./support/legislative-entry";
import { test, expect, type Page } from "./fixtures";
import {
  startLife,
  enterLife,
  openElsewhere,
  saveLife,
} from "./support/creator";

async function passDays(page: Page, days: number) {
  const button = page.getByTestId("pass-day");
  for (let i = 0; i < days; i++) await button.click();
}

test("normal dated education offer, period progression, interruption and repeated saving", async ({
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
  await institution.click();
  await education
    .getByRole("button", {
      name: "Request Workforce Education study offer",
      exact: true,
    })
    .click();
  await education
    .getByRole("button", { name: "Accept study offer", exact: true })
    .click();
  const study = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Workforce Education — noncredit study",
      exact: true,
    }),
  });
  await expect(study).toContainText("period 1 of 1");
  await expect(
    study.getByRole("button", { name: "Schedule next session", exact: true }),
  ).toHaveCount(0);
  await passDays(page, 20);
  await study
    .getByRole("button", { name: "Interrupt", exact: true })
    .press("Space");
  await expect(study).toContainText("Interrupted");
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(study).toContainText("Interrupted");
  await test.info().attach("saved-study-world.json", {
    body: JSON.stringify(await readSavedLegislativeWorld(page)),
    contentType: "application/json",
  });
  await study.getByRole("button", { name: "Return", exact: true }).click();
  await expect(study).toContainText("period 1 of 1");
  await expect(study).toContainText("Next tuition due");
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(study).toContainText("period 1 of 1");
});

test("normal invitation pointer refusal preserves time and survives saving", async ({
  page,
}) => {
  await page.goto("/?seed=ui-invitation-pointer");
  await startLife(page, { age: 35, route: "custom", household: "lives-alone" });
  await enterLife(page);
  await saveLife(page);
  const before = await readSavedLegislativeWorld(page);
  await openElsewhere(page, "work");
  const invitations = page.getByRole("region", {
    name: "Invitations",
    exact: true,
  });
  await invitations
    .getByRole("button", {
      name: "Decline invitation: Something on Saturday",
      exact: true,
    })
    .click();
  await expect(invitations).toHaveCount(0);
  await saveLife(page);
  const after = await readSavedLegislativeWorld(page);
  expect(after.currentMoment).toEqual(before.currentMoment);
  expect(
    after.history.events.filter(
      (event) => event.type === "life.social-invitation-declined",
    ),
  ).toHaveLength(1);
  expect(after.history.scheduledActivities).toEqual(
    before.history.scheduledActivities,
  );
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(invitations).toHaveCount(0);
  await saveLife(page);
  expect(await readSavedLegislativeWorld(page)).toEqual(after);
});
