import { test, expect, type Page } from "./fixtures";
import {
  startLife,
  enterLife,
  openShellMenu,
  saveLife as keepLife,
} from "./support/creator";
import { readSavedLegislativeWorld } from "./support/legislative-entry";

async function saveLife(page: Page) {
  await keepLife(page);
  await page.keyboard.press("Escape");
}

async function personal(page: Page) {
  await openShellMenu(page);
  await page.getByTestId("nav-personal-group").click();
  await page.getByTestId("nav-personal").click();
  const routine = page.getByTestId("personal-routine");
  await expect(routine).toBeVisible();
  await routine.locator(":scope > summary").press("Enter");
  return routine;
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1200, height: 720 },
]) {
  test(`Personal combined work, included journey, education period and reload ${viewport.width}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.goto(`/?seed=next24-personal-${viewport.width}`);
    await startLife(page, {
      age: 35,
      route: "custom",
      household: "lives-alone",
    });
    await enterLife(page);
    const routine = await personal(page);
    await routine
      .getByRole("button", { name: "Accept Shop assistant", exact: true })
      .click();
    await routine
      .getByRole("button", {
        name: "Enroll in College office administration certificate",
        exact: true,
      })
      .press("Space");
    await routine
      .getByRole("button", {
        name: "Continue to tomorrow morning",
        exact: true,
      })
      .click();
    const meeting = routine.locator("li").filter({
      has: page.getByText("Posted public meeting", { exact: true }),
    });
    await expect(meeting).toContainText("20-minute journey");
    await expect(meeting).toContainText("no fare");
    await meeting
      .getByRole("button", {
        name: "Attend: Posted public meeting",
        exact: true,
      })
      .press("Enter");
    await expect(routine.getByTestId("personal-routine-outcome")).toContainText(
      "1 ordinary work shift completed",
    );
    await expect(routine.getByTestId("personal-routine-outcome")).toContainText(
      "has not posted yet",
    );
    await saveLife(page);
    const attended = await readSavedLegislativeWorld(page);
    expect(attended.currentMoment.minuteOfDay).toBe(1185);
    expect(
      attended.history.events.filter(
        (e) => e.type === "life-paths2.work-session",
      ),
    ).toHaveLength(1);
    const study = routine
      .locator("article")
      .filter({
        has: page.getByRole("heading", {
          name: "College office administration certificate",
          exact: true,
        }),
      })
      .last();
    await study.getByRole("button", { name: "Interrupt", exact: true }).click();
    await expect(study).toContainText("Interrupted");
    await saveLife(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await personal(page);
    await expect(study).toContainText("Interrupted");
    await routine
      .getByRole("button", {
        name: "Continue to tomorrow morning",
        exact: true,
      })
      .press("Space");
    await expect(routine.getByTestId("personal-routine-outcome")).toContainText(
      "Received USD: 72.00",
    );
    await study
      .getByRole("button", { name: "Return", exact: true })
      .press("Enter");
    await routine
      .getByRole("button", {
        name: "Continue to next study period",
        exact: true,
      })
      .click();
    await expect(study).toContainText("Completed");
    await expect(routine.getByTestId("personal-routine-outcome")).toContainText(
      "Paid USD: 600.00",
    );
    await expect(routine.getByTestId("personal-routine-outcome")).toContainText(
      "Office administration certificate",
    );
    await saveLife(page);
    const completed = await readSavedLegislativeWorld(page);
    const pay = completed.history.resourceTransferOutcomes.filter(
      (o) => o.transferredAmount.minorUnits === 7200,
    );
    expect(
      new Set(
        pay.map(
          (o) => `${o.resourceFlowId}:${o.periodStartsAt}:${o.periodEndsAt}`,
        ),
      ).size,
    ).toBe(pay.length);
    expect(
      completed.history.events.filter(
        (e) => e.type === "life-paths2.credential",
      ),
    ).toHaveLength(1);
    const arrival = completed.history.events.find(
      (e) =>
        e.stableKey.startsWith("attend-journey:") &&
        e.type === "life.scene.arrived",
    )!;
    const activity = completed.history.scheduledActivities.find(
      (a) => a.title === "Posted public meeting",
    )!;
    const outcome = completed.history.scheduledActivityStates.find(
      (s) => s.activityId === activity.id && s.status === "completed",
    )!;
    expect(arrival.sequence).toBeLessThan(outcome.sequence);
    await test.info().attach("combined-world-deltas.json", {
      body: JSON.stringify({ attended, completed }),
      contentType: "application/json",
    });
    await routine
      .getByTestId("personal-routine-outcome")
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath("personal-combined-outcome.png"),
    });
    await routine.locator(":scope > summary").click();
    await page.screenshot({
      path: test.info().outputPath("personal-combined-complete.png"),
    });
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await personal(page);
    await expect(study).toContainText("Completed");
  });
}
