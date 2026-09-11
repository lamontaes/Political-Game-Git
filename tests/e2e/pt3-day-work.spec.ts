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
  await startLife(page, { age: 22, place: "Lexington" });
  await enterLife(page);

  // The menu, opened from the keyboard, is grouped and has no duplicate route
  // back to the scene.
  await page.getByTestId("shell-nav-cluster").focus();
  await page.keyboard.press("Enter");
  const flyout = page.getByTestId("shell-nav-flyout");
  await expect(flyout).toBeVisible();
  await expect(page.getByTestId("nav-group-now")).toContainText("Today");
  await expect(page.getByTestId("nav-group-now")).toContainText("Work");
  await expect(page.getByTestId("nav-group-world")).toContainText("Places");
  await expect(page.getByTestId("nav-group-you")).toContainText("Journal");
  await expect(page.getByTestId("nav-life-scenes")).toHaveCount(0);
  await expect(flyout).not.toContainText("Life scenes");
  await expect(flyout).not.toContainText("The room");

  await page.getByTestId("elsewhere-day").press("Enter");
  const today = page.getByTestId("day-overlay");
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
  await expect(today.getByTestId("pass-day")).toBeVisible();

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
  await expect(page.getByTestId("day-overlay")).toHaveCount(0);
  await expect(
    page
      .getByTestId("opening-life-scene")
      .or(page.getByTestId("story-section")),
  ).toBeVisible();

  // Getting on with the day is the one control that waits, and it does.
  await openShellMenu(page);
  await page.getByTestId("elsewhere-work").click();
  const before = (await page.getByTestId("day-date").textContent()) ?? "";
  await page.getByTestId("pass-day").click();
  await expect(page.getByTestId("day-date")).not.toHaveText(before);
});
