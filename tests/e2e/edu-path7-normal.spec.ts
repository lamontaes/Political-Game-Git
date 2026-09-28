import { readSavedLegislativeWorld } from "./support/legislative-entry";
import { test, expect, type Page } from "./fixtures";
import {
  startLife,
  enterLife,
  openElsewhere,
  saveLife,
  browseStudy,
  openFolded,
} from "./support/creator";

async function passDays(page: Page, days: number) {
  const button = page.getByTestId("shell-pass-day");
  for (let i = 0; i < days; i++) await button.click();
}

test("normal dated education offer, period progression, interruption and repeated saving", async ({
  page,
}) => {
  // Twenty passed days, two reloads and three trips through the menu sit
  // past the default budget on a loaded runner; the assertions are unchanged.
  test.setTimeout(90_000);
  await page.goto("/?seed=ui-edu-path7-normal");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 35,
    route: "custom",
    household: "lives-alone",
  });
  await enterLife(page);
  await openElsewhere(page, "jobs");
  await browseStudy(page);
  const education = page.getByRole("region", {
    name: "Real education options",
    exact: true,
  });
  await education
    .getByRole("textbox", { name: "Search institutions" })
    .fill("Bluegrass");
  // Since 508c8736a the row names the institution and its place only; the
  // federal unit ID (156392) is no longer part of the button's name.
  const institution = education.getByRole("button", {
    name: "Bluegrass Community and Technical College — Lexington, KY",
    exact: true,
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
  await openElsewhere(page, "jobs");
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
  await openElsewhere(page, "jobs");
  await expect(study).toContainText("period 1 of 1");
});

test("normal invitation pointer refusal preserves time and survives saving", async ({
  page,
}) => {
  // Since 5c04dfb47 an invitation needs a reason in the host's own life, and
  // the reasonless "Something on Saturday" is no longer written. This seed's
  // Lexington life opens with a grounded one (seed found by search).
  await page.goto("/?seed=ui-invitation-pointer-41");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 35,
    route: "custom",
    household: "lives-alone",
  });
  await enterLife(page);
  await saveLife(page);
  const before = await readSavedLegislativeWorld(page);
  await openElsewhere(page, "jobs");
  await openFolded(page, "Other paths and invitations");
  const invitations = page.getByRole("region", {
    name: "Invitations",
    exact: true,
  });
  // Since e79d4ec33 the reply wording is SOCIAL_INVITATION_REPLIES, and the
  // panel keeps the spoken answer on screen until time moves.
  await invitations
    .getByRole("button", {
      name: /^Say you can’t make it: Saturday afternoon at /,
    })
    .click();
  await expect(invitations.getByRole("article")).toHaveCount(0);
  await expect(invitations).toContainText("I can’t make it.");
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
  await openElsewhere(page, "jobs");
  await expect(invitations).toHaveCount(0);
  await saveLife(page);
  expect(await readSavedLegislativeWorld(page)).toEqual(after);
});
