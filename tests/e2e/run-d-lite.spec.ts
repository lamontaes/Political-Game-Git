import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

async function openPlanning(page: Page, name: "Calendar" | "Work / Pending") {
  await page.getByTestId("navigation-cluster").click();
  await page.getByRole("menuitem", { name }).click();
}

async function eventStyle(event: Locator) {
  return event.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderLeftColor: style.borderLeftColor,
      borderLeftStyle: style.borderLeftStyle,
    };
  });
}

test("renders canonical week geometry and enforces flexible and travel conflicts", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await expect(office).toHaveAttribute("data-simulation-minute", "550");
  await expect(office).toHaveAttribute(
    "data-simulation-time-zone",
    "America/New_York",
  );
  const initialHistory = await office.getAttribute("data-history-sequence");

  await openPlanning(page, "Calendar");
  const calendar = page.getByTestId("calendar-workspace");
  const week = page.getByTestId("calendar-week");
  await expect(calendar).toBeVisible();
  await expect(calendar).toContainText("Lexington time");
  await expect(calendar).not.toContainText("America/New_York");
  await expect(week).toBeVisible();
  await expect(page.getByTestId("calendar-day-column")).toHaveCount(5);
  await expect(page.getByLabel("Time scale")).toBeVisible();
  await expect(page.getByTestId("calendar-current-marker")).toHaveAttribute(
    "data-current-minute",
    "550",
  );
  await expect(office).toHaveAttribute("data-simulation-minute", "550");
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );

  const briefing = calendar.getByRole("button", {
    name: /Constituent intake briefing/,
  });
  const meeting = calendar.getByRole("button", {
    name: /Community transit meeting/,
  });
  await expect(briefing).toHaveAttribute("data-duration-minutes", "45");
  await expect(meeting).toHaveAttribute("data-duration-minutes", "75");
  const briefingBox = await briefing.boundingBox();
  const meetingBox = await meeting.boundingBox();
  expect(briefingBox).not.toBeNull();
  expect(meetingBox).not.toBeNull();
  expect((meetingBox?.height ?? 0) / (briefingBox?.height ?? 1)).toBeCloseTo(
    75 / 45,
    1,
  );

  const confirmed = calendar
    .locator('[data-activity-kind="confirmed"]')
    .first();
  const flexible = calendar.locator('[data-activity-kind="flexible"]');
  const travel = calendar.locator('[data-activity-kind="travel"]');
  const tentative = calendar.locator('[data-activity-kind="tentative"]');
  await expect(confirmed).toBeVisible();
  await expect(flexible).toBeVisible();
  await expect(travel).toBeVisible();
  await expect(tentative).toBeVisible();
  const styles = await Promise.all(
    [confirmed, flexible, travel, tentative].map(eventStyle),
  );
  expect(new Set(styles.map((style) => JSON.stringify(style))).size).toBe(4);

  await flexible.click();
  const detail = page.getByTestId("calendar-event-detail");
  await expect(detail).toBeVisible();
  await expect(week).toBeVisible();
  await expect(detail).toContainText("10:30 AM–11:30 AM · 60 minutes");
  await expect(office).toHaveAttribute("data-simulation-minute", "550");
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );

  const originalTop = await flexible.evaluate(
    (element) => getComputedStyle(element).top,
  );
  await detail.getByRole("button", { name: "Try 1:00–2:00 PM" }).click();
  await expect(page.getByTestId("calendar-feedback")).toContainText(
    "required travel time stays in place",
  );
  await expect(flexible).toHaveAttribute("data-start-minute", "630");
  expect(
    await flexible.evaluate((element) => getComputedStyle(element).top),
  ).toBe(originalTop);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );

  await detail
    .getByRole("button", { name: "Move to 11:00 AM–12:00 PM" })
    .click();
  await expect(page.getByTestId("calendar-feedback")).toContainText(
    "moved to 11:00 AM–12:00 PM",
  );
  await expect(flexible).toHaveAttribute("data-start-minute", "660");
  expect(
    await flexible.evaluate((element) => getComputedStyle(element).top),
  ).not.toBe(originalTop);
  await expect(office).toHaveAttribute("data-simulation-minute", "550");

  await calendar.getByRole("button", { name: "Return to office" }).click();
  await openPlanning(page, "Work / Pending");
  await expect(page.getByTestId("work-pending-workspace")).toBeVisible();
  await page
    .getByTestId("work-pending-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();
  await openPlanning(page, "Calendar");
  await expect(
    page
      .getByTestId("calendar-workspace")
      .locator('[data-activity-kind="flexible"]'),
  ).toHaveAttribute("data-start-minute", "660");
});

test("derives truthful work groups and advances staff work during player activity", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await openPlanning(page, "Work / Pending");
  const work = page.getByTestId("work-pending-workspace");
  const needsYou = page.getByTestId("work-group-needs-you");
  const waiting = page.getByTestId("work-group-waiting-on-others");
  const staff = page.getByTestId("work-group-staff-handling");
  const completed = page.getByTestId("work-group-completed-ready");
  await expect(work).toContainText("What actually needs me?");
  await expect(needsYou).toContainText("Transit Access Pilot draft");
  await expect(needsYou).toContainText("Prepare community meeting brief");
  await expect(waiting).toContainText("Third referral verification");
  await expect(waiting).toContainText("Waiting for Reed's verification");
  await expect(waiting.getByRole("button", { name: /complete/i })).toHaveCount(
    0,
  );
  await expect(staff).toContainText("Collins's transit analysis summary");
  await expect(completed).toContainText("Nothing here right now");
  await expect(work).not.toContainText("Undisclosed Reed note");

  await needsYou.getByRole("button", { name: "Delegate to Collins" }).click();
  await expect(page.getByTestId("work-feedback")).toContainText(
    "Collins now owns the meeting brief",
  );
  await expect(needsYou).not.toContainText("Prepare community meeting brief");
  await expect(staff).toContainText("Prepare community meeting brief");
  await expect(office).toHaveAttribute("data-simulation-minute", "550");

  await work.getByRole("button", { name: "Return to office" }).click();
  await openPlanning(page, "Calendar");
  const calendar = page.getByTestId("calendar-workspace");
  await calendar
    .getByRole("button", { name: /Constituent intake briefing/ })
    .click();
  const detail = page.getByTestId("calendar-event-detail");
  await expect(detail).toContainText(
    "Attending uses the full 45-minute briefing and advances the clock to 10:15 AM",
  );
  await detail
    .getByRole("button", { name: "Attend briefing — 45 minutes" })
    .click();
  await expect(office).toHaveAttribute("data-simulation-minute", "615");
  await expect(
    page.getByTestId("navigation-cluster").locator(".cluster-time"),
  ).toHaveText("10:15 AM");
  await expect(page.getByTestId("calendar-current-marker")).toHaveAttribute(
    "data-current-minute",
    "615",
  );
  await expect(detail).toContainText("Completed at 10:15 AM");

  await calendar.getByRole("button", { name: "Return to office" }).click();
  await openPlanning(page, "Work / Pending");
  await expect(page.getByTestId("work-group-completed-ready")).toContainText(
    "Collins's transit analysis summary",
  );
  await expect(page.getByTestId("work-group-staff-handling")).toContainText(
    "Prepare community meeting brief",
  );
  await expect(page.getByTestId("work-pending-workspace")).not.toContainText(
    /\d+%/,
  );
});

test("returns from planning to the accepted office, conversation, and working document", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await openPlanning(page, "Work / Pending");
  const needsYou = page.getByTestId("work-group-needs-you");
  await needsYou.getByRole("button", { name: "Open working document" }).click();
  await expect(page.getByTestId("working-document-workspace")).toBeVisible();
  await expect(page.getByTestId("legislative-paper")).toContainText(
    "Transit Access Pilot",
  );
  await page
    .getByTestId("working-document-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();

  const personPin = page.locator('[data-pin-id="person"]');
  await personPin.click();
  await expect(page.getByTestId("pin-controls-person")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByTestId("scene-person").click();
  await page.getByRole("menuitem", { name: /Talk/ }).click();
  await expect(page.getByTestId("conversation-strip")).toBeVisible();
  await expect(page.getByTestId("conversation-strip")).toContainText(
    "Constituent services",
  );
  await page
    .getByTestId("conversation-strip")
    .getByRole("button", { name: "Close conversation" })
    .click();
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await expect(office).toHaveAttribute("data-simulation-minute", "550");

  const body = page.locator("body");
  for (const forbidden of [
    /END TURN/i,
    /success percentage/i,
    /progress percentage/i,
    /run-d-lite:/i,
    /scheduled-activity-state/i,
    /work-item-state/i,
    /Undisclosed Reed note/i,
    /Private Reed follow-up/i,
  ]) {
    await expect(body).not.toContainText(forbidden);
  }
});
