import { expect, test } from "./fixtures";
import { enterLife, openShellMenu, startLife } from "./support/creator";

/**
 * PT3: Today and Work are two different places, and each says what it is.
 *
 * Walked on the owner's own route — a normal age-22 start in Lexington — not a
 * member-office fixture, because the complaint was about hunting through the
 * menus an ordinary life actually shows. Every move here is a pointer press or
 * a key press on a control a player can see.
 */
test("Today links into Work instead of carrying it, and reading them costs no time", async ({
  page,
}) => {
  await page.goto("/?seed=pt3-owner-22");
  await startLife(page, { age: 22, place: "Lexington", state: "Kentucky" });
  await enterLife(page);

  // The menu, opened from the keyboard, is grouped and has no duplicate route
  // back to the scene.
  await page.getByTestId("shell-nav-cluster").focus();
  await page.keyboard.press("Enter");
  const flyout = page.getByTestId("shell-nav-flyout");
  await expect(flyout).toBeVisible();
  /*
   * The grouping the menu actually has. A top-level group holding exactly one
   * destination opens it directly rather than as a group button, so Calendar
   * (which carries Today), Politics (the office and the work that goes with
   * it), Travel and Journal are each one entry, and Personal, which holds
   * several, is a group. None of them is a second route back to the room.
   */
  await expect(page.getByTestId("nav-calendar")).toContainText("Calendar");
  await expect(page.getByTestId("nav-politics")).toContainText("Politics");
  await expect(page.getByTestId("nav-places")).toContainText("Travel");
  await expect(page.getByTestId("nav-journal-entry")).toContainText("Journal");
  await expect(page.getByTestId("nav-group-personal")).toContainText(
    "Personal",
  );
  await expect(page.getByTestId("nav-life-scenes")).toHaveCount(0);
  await expect(flyout).not.toContainText("Life scenes");
  await expect(flyout).not.toContainText("The room");

  await page.getByTestId("nav-calendar").press("Enter");
  const today = page.getByTestId("calendar-workspace");
  await expect(today).toBeVisible();
  const clock = (await page.getByTestId("day-date").textContent()) ?? "";

  // Today answers its four questions and mounts no work stack.
  for (const heading of ["Now", "Next", "Use your time"]) {
    await expect(
      today.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  await expect(today.getByTestId("campaign-section")).toHaveCount(0);
  await expect(
    today.getByRole("region", { name: "Education and work", exact: true }),
  ).toHaveCount(0);
  /* Getting on with the day is offered here; inside the Calendar that is the
     calendar's own skip rather than a second copy of the day control. */
  await expect(today.getByTestId("calendar-simulate-day")).toBeVisible();

  // Its Work link opens the one Work surface, by keyboard.
  await today.getByTestId("day-open-work").focus();
  await page.keyboard.press("Enter");
  const work = page.getByRole("region", { name: "Work", exact: true });
  await expect(work).toBeVisible();
  await expect(page.getByTestId("work-role")).toContainText(
    "You do not hold a job or an office",
  );
  // Each panel is mounted exactly once in the whole page.
  await expect(page.getByTestId("work-section-campaign")).toHaveCount(1);
  await expect(page.getByTestId("work-section-paths")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Education and work", exact: true }),
  ).toHaveCount(1);

  // The jump list moves focus to the section it names.
  await page.getByTestId("work-jump-paths").click();
  await expect(
    page.getByTestId("work-section-paths").getByRole("heading").first(),
  ).toBeFocused();

  // Back returns to Today, and reading Today and Work spent no time.
  await work.getByRole("button", { name: /Back/ }).click();
  await expect(today).toBeVisible();
  await expect(page.getByTestId("day-date")).toHaveText(clock);

  // Close returns to the room.
  await today.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByTestId("calendar-workspace")).toHaveCount(0);
  await expect(
    page
      .getByTestId("opening-life-scene")
      .or(page.getByTestId("story-section")),
  ).toBeVisible();

  // Getting on with the day is the one control that waits, and it does.
  await openShellMenu(page);
  await page.getByTestId("nav-politics").click();
  const before = (await page.getByTestId("day-date").textContent()) ?? "";
  await page.getByTestId("pass-day").click();
  await expect(page.getByTestId("day-date")).not.toHaveText(before);
});
