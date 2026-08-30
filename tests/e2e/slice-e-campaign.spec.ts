import { expect, test, type Page } from "@playwright/test";

async function loadProfile(page: Page, seed: string) {
  await page.goto(`/?view=office&seed=${seed}`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function openCampaignWithKeyboard(page: Page) {
  const navigation = page.getByTestId("navigation-cluster");
  await navigation.focus();
  await page.keyboard.press("Enter");
  const campaignItem = page.getByRole("menuitem", { name: /Campaign/ });
  await campaignItem.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("campaign-workspace")).toBeVisible();
}

async function completeCalendarActivity(page: Page, title: RegExp) {
  const calendar = page.getByTestId("calendar-workspace");
  await calendar.getByRole("button", { name: title }).click();
  const detail = page.getByTestId("calendar-event-detail");
  await detail
    .getByRole("button", { name: /^(Attend|Work|Travel|Begin) ·/ })
    .click();
  await detail.getByRole("button", { name: "Close" }).click();
}

async function clearEarlierOfficeCommitments(page: Page) {
  await completeCalendarActivity(page, /Constituent intake briefing/);
  await completeCalendarActivity(page, /Transit draft follow-up/);
  await completeCalendarActivity(page, /Travel to community meeting/);
  await completeCalendarActivity(page, /Community transit meeting/);
  await completeCalendarActivity(page, /Tentative constituent return call/);
  await page
    .getByTestId("calendar-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();
}

async function playCampaignActions(page: Page, captureEvidence: boolean) {
  const office = page.getByTestId("player-office");
  await openCampaignWithKeyboard(page);
  await expect(page.getByTestId("campaign-workspace")).toHaveAttribute(
    "data-campaign-phase",
    "not-filed",
  );
  await page.getByTestId("campaign-file").click();
  await expect(page.getByTestId("campaign-workspace")).toHaveAttribute(
    "data-campaign-phase",
    "active",
  );
  await expect(page.getByTestId("campaign-treasury")).toHaveText("$0");
  await expect(page.getByTestId("campaign-endorsement")).toBeVisible();
  if (captureEvidence) {
    await page.screenshot({
      path: "docs/agent/evidence/slice-e-campaign-active.png",
    });
  }

  const initialDate = await office.getAttribute("data-simulation-date");
  const initialHistory = Number(
    await office.getAttribute("data-history-sequence"),
  );
  await expect(page.getByTestId("campaign-fundraise")).toHaveText(
    "Review earlier Calendar commitments",
  );
  await page.getByTestId("campaign-fundraise").click();
  await expect(page.getByTestId("calendar-workspace")).toBeVisible();
  await clearEarlierOfficeCommitments(page);
  await openCampaignWithKeyboard(page);
  await expect(page.getByTestId("campaign-fundraise")).toHaveText(
    "Do fundraising calls",
  );
  await page.getByTestId("campaign-fundraise").click();
  await expect(page.getByTestId("campaign-raised")).toContainText("Raised $");
  await expect(page.getByTestId("campaign-treasury")).not.toHaveText("$0");
  await expect(office).not.toHaveAttribute(
    "data-simulation-date",
    initialDate!,
  );
  expect(
    Number(await office.getAttribute("data-history-sequence")),
  ).toBeGreaterThan(initialHistory);

  await page.getByTestId("campaign-outreach").click();
  const feedback = page.getByTestId("campaign-feedback");
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText(/About \d+%/);
  await expect(feedback).toContainText("±4 points");
  await expect(feedback).toContainText("imperfect and may be wrong");
  await expect(page.locator("body")).not.toContainText(
    /hidden support|true support|canonical support/i,
  );
  if (captureEvidence) {
    await page.screenshot({
      path: "docs/agent/evidence/slice-e-imperfect-feedback.png",
    });
  }
}

test("WIN path files, acts, receives imperfect feedback, resolves, and continues", async ({
  page,
}) => {
  await loadProfile(page, "slice-e-profile-0");
  await playCampaignActions(page, true);

  await page.getByTestId("campaign-election").click();
  const result = page.getByTestId("campaign-result");
  await expect(result).toContainText("You won the election");
  await expect(page.getByTestId("campaign-workspace")).toHaveAttribute(
    "data-campaign-phase",
    "won",
  );
  await expect(page.getByTestId("player-office")).toHaveAttribute(
    "data-campaign-phase",
    "won",
  );
  await expect(page.locator("body")).not.toContainText(
    /hidden support|true support|canonical support/i,
  );
  await result.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.screenshot({
    path: "docs/agent/evidence/slice-e-election-win.png",
  });

  await page.getByTestId("campaign-continue").click();
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await expect(page.getByTestId("campaign-workspace")).toHaveCount(0);
  await openCampaignWithKeyboard(page);
  await expect(page.getByTestId("campaign-result")).toContainText(
    "You won the election",
  );
});

test("LOSS persists without game over and normal Calendar play remains available", async ({
  page,
}) => {
  await loadProfile(page, "slice-e-profile-16");
  await playCampaignActions(page, false);

  await page.getByTestId("campaign-election").click();
  const result = page.getByTestId("campaign-result");
  await expect(result).toContainText("You lost the election");
  await expect(result).toContainText("normal play continue");
  await expect(page.getByTestId("campaign-workspace")).toHaveAttribute(
    "data-campaign-phase",
    "lost",
  );
  await expect(page.locator("body")).not.toContainText(/game over/i);
  await result.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.screenshot({
    path: "docs/agent/evidence/slice-e-election-loss.png",
  });

  await page.getByTestId("campaign-continue").click();
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await expect(page.getByTestId("player-office")).toHaveAttribute(
    "data-campaign-phase",
    "lost",
  );
  const navigation = page.getByTestId("navigation-cluster");
  await navigation.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Calendar" }).click();
  await expect(page.getByTestId("calendar-workspace")).toBeVisible();
  await expect(page.getByTestId("calendar-workspace")).toContainText(
    "Election night results",
  );
  await page.mouse.move(720, 20);
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "docs/agent/evidence/slice-e-loss-continued-calendar.png",
  });

  await page
    .getByTestId("calendar-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();
  await navigation.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Work / Pending" }).click();
  await expect(page.getByTestId("work-pending-workspace")).toBeVisible();
  await expect(page.getByTestId("work-pending-workspace")).toContainText(
    "What actually needs me?",
  );
  await page.mouse.move(720, 20);
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "docs/agent/evidence/slice-e-loss-continued-work.png",
  });
  await page
    .getByTestId("work-pending-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();
  await openCampaignWithKeyboard(page);
  await expect(page.getByTestId("campaign-result")).toContainText(
    "You lost the election",
  );
});
