import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { enterLife, fillCreator, goTo, openMoment } from "./support/creator";

async function personnel(page: Page) {
  /*
   * Personnel work is the Personal half of the old Work record, not the
   * Politics office half.
   *
   * The Politics hub split left `elsewhere-work` meaning "Politics -> Your
   * office", and hiring, jobs and study moved to Personal. The two halves
   * share the `personal-work-section` test id whenever the player holds no
   * office, so reaching for the office half found a panel, looked in it for
   * controls that were never there, and failed on the control rather than on
   * the destination. Ask for the half this case is actually about, and say so
   * by reading the heading the player sees.
   */
  await goTo(page, "nav-jobs");
  await expect(
    page.getByRole("heading", { name: "Jobs and study", exact: true }).first(),
  ).toBeVisible();
  const panel = page
    .getByTestId("personal-work-section")
    .getByRole("region", { name: "Personnel matters" });
  await expect(panel).toBeVisible();
  return panel;
}

/**
 * Walk ordinary time forward to the date the personnel source was observed.
 *
 * This used to press `pass-day` on the Calendar surface sixty times. Two
 * things were wrong with that and only one of them was visible. The control
 * is the first: `pass-day` is drawn by the work and office frames, not by the
 * Calendar, whose own time controls are the shell clock's `shell-pass-day`
 * and `shell-pass-week` — so the loop timed out waiting for a button that is
 * not on the surface it had navigated to. The arithmetic is the second, and
 * would have bitten as soon as the control was fixed: this life starts on
 * 2026-01-05 and the source was observed on 2026-09-06, which is two hundred
 * and forty-four days, so sixty single days could never have arrived however
 * reliably they were pressed.
 *
 * So it moves by the shell's own week, reading the date back out of the clock
 * the player reads it from rather than counting presses, and stops the moment
 * the world is standing on or after the observation date.
 */
const OBSERVED_ON = Date.parse("2026-09-06T00:00:00Z");

async function worldDate(page: Page): Promise<number> {
  const label =
    (await page.getByTestId("shell-nav-cluster").getAttribute("aria-label")) ??
    "";
  // "<name>. <Month D, YYYY>. <Place, State>. Open navigation."
  const match = label.match(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
  if (!match) throw new Error(`No date in the shell clock: ${label}`);
  return Date.parse(`${match[0]} UTC`);
}

async function passTimeUntilSeptember(page: Page) {
  for (let week = 0; week < 60; week += 1) {
    if ((await worldDate(page)) >= OBSERVED_ON) return;
    await page.getByTestId("shell-pass-week").click();
    await expect(page.getByTestId("shell-pass-week")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
  }
  throw new Error("Ordinary time did not reach the observation date.");
}

test("current Custom Start reaches dated personnel work, an NPC answer, and save/reopen", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Current main's compact Day overlay still intercepts the story time control;
  // #178's reviewed handoff records that owner-bound shell defect. The normal
  // route is proved at the supported desktop viewport without bypassing time.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?seed=recovery25-civil-normal-route");
  await fillCreator(page, {
    age: 40,
    route: "custom",
    place: "Minneapolis, Minnesota",
    placeQuery: "Minneapolis",
    placeScope: "locality",
  });
  await page.getByTestId("creator-summary-background").click();
  const start = page.getByTestId("state-agency-start");
  await expect(start).toBeEnabled();
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(start).toHaveClass(/is-chosen/);
  await page.getByTestId("creator-continue-background").click();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  await enterLife(page);
  await openMoment(page);

  let panel = await personnel(page);
  const employee = panel.getByRole("article", {
    name: /, Records specialist$/,
  });
  await expect(employee).toContainText(
    "observed in current text on 2026-09-06",
  );
  await expect(employee.getByRole("textbox")).toHaveCount(0);
  const initialVacancy = panel.getByRole("article", {
    name: "Vacant Records specialist position",
  });
  await expect(
    initialVacancy.getByRole("button", { name: "Offer direct reinstatement" }),
  ).toBeDisabled();

  await passTimeUntilSeptember(page);
  panel = await personnel(page);
  const vacancy = panel.getByRole("article", {
    name: "Vacant Records specialist position",
  });
  const offer = vacancy.getByRole("button", { name: "Offer reinstatement" });
  await expect(offer).toBeEnabled();
  await offer.click();
  await expect(
    page.getByText(
      "The offer was made and answered on receipt. Only an acceptance is an appointment.",
      { exact: true },
    ),
  ).toBeVisible();
  const answered = panel.getByRole("article", {
    name: /^Reinstatement offer to /,
  });
  await expect(answered).toContainText(
    /answer on receiving it: (accepted|declined)/,
  );
  const heading = await answered.getAttribute("aria-label");

  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openMoment(page);
  panel = await personnel(page);
  await expect(panel.getByRole("article", { name: heading! })).toContainText(
    /answer on receiving it: (accepted|declined)/,
  );
});
