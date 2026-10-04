import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife, saveLife } from "./support/creator";

// Same three distinct random draws as the source proof, including county-only Dyer.
const places = [
  { key: "3220700", place: "Dyer", state: "Nevada", route: "calendar" },
  {
    key: "2537385",
    place: "Lunenburg",
    state: "Massachusetts",
    route: "calendar",
  },
  {
    key: "3556810",
    place: "Picuris Pueblo",
    state: "New Mexico",
    route: "journey",
  },
];
for (const place of places)
  test(`live meeting normal route ${place.key} ${place.route}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?seed=team5-live-meeting:${place.key}`, {
      waitUntil: "domcontentloaded",
    });
    await startLife(page, {
      age: 22,
      state: place.state,
      place: place.place,
      route: "custom",
      household: "shares-a-home",
    });
    // The current opening cards precede the play screen. Use their existing
    // Skip action before the shared helper waits for that screen.
    const opening = page.getByTestId("world-orientation");
    await opening.waitFor({ state: "visible", timeout: 60_000 });
    await opening.getByTestId("orientation-skip").click();
    await enterLife(page);
    if (place.route === "journey") {
      await page.getByTestId("shell-pass-day").click();
      await expect(page.getByTestId("shell-nav-cluster")).toHaveAttribute(
        "aria-label",
        /January 6, 2026/,
      );
      const needed = page.getByTestId("shell-pass-until-needed");
      await expect(needed).toBeEnabled();
      await needed.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("status").filter({
          hasText: "It is time for Posted public meeting.",
        }),
      ).toBeVisible();
    }
    await goTo(page, "nav-calendar");
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    const entry = page
      .getByTestId("calendar-upcoming")
      .locator('[data-testid^="calendar-entry-"]')
      .filter({ hasText: "Posted public meeting" })
      .first();
    await entry.click();
    await page.getByTestId("calendar-play-event").focus();
    await page.keyboard.press("Enter");
    const panel = page.getByTestId("ordinary-meeting-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("ordinary-meeting-people")).toBeVisible();
    await expect(
      panel.getByTestId("ordinary-meeting-agenda-order").locator("li"),
    ).toHaveCount(4);
    await expect(panel.getByTestId("ordinary-meeting-roll-call")).toBeVisible();
    await expect(page.getByTestId("venue-activity-completed")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`${place.key}-open-meeting.png`),
      fullPage: true,
    });
    await expect(panel.getByTestId("speak-ordinary-meeting")).toHaveCount(0);
    await expect(panel.locator('[data-testid^="meeting-speech-"]')).toHaveCount(
      0,
    );
    await expect(
      panel.getByTestId("ordinary-meeting-spoken-words"),
    ).toHaveCount(0);
    await expect(panel.getByTestId("stay-ordinary-meeting")).toHaveText(
      "Stay through the meeting",
    );
    await expect(panel.getByTestId("brief-ordinary-meeting")).toHaveText(
      "Go briefly",
    );
    await expect(panel.getByTestId("leave-ordinary-meeting")).toHaveText(
      "Leave and return home",
    );
    await saveLife(page);
    await page.getByTestId("shell-nav-cluster").click();
    await expect(page.getByTestId("shell-nav-flyout")).not.toBeVisible();
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: info.outputPath(`${place.key}-open-meeting-phone.png`),
      fullPage: true,
    });
    await panel.getByTestId("stay-ordinary-meeting").click();
    await expect(panel.getByRole("status")).toContainText(
      "You completed Posted public meeting",
    );
    await expect(panel.getByTestId("stay-ordinary-meeting")).toHaveCount(0);
    await goTo(page, "nav-calendar");
    await expect(page.getByTestId("ordinary-section")).not.toContainText(
      "nobody else is going to do",
    );
  });
