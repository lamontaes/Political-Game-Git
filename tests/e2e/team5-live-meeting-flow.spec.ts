import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife, saveLife } from "./support/creator";

// Same three distinct random draws as the source proof, including county-only Dyer.
const places = [
  { key: "3220700", place: "Dyer", state: "Nevada", route: "today" },
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
    await enterLife(page);
    await goTo(page, "nav-calendar");
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    if (place.route === "calendar") {
      const entry = page
        .locator('[data-testid^="calendar-entry-"]')
        .filter({ hasText: "Posted public meeting" })
        .first();
      await entry.click();
      await page.getByTestId("calendar-play-event").focus();
      await page.keyboard.press("Enter");
    } else {
      const planned = page.getByTestId("venue-activities");
      const row = planned
        .locator(":scope > div")
        .filter({
          hasText:
            place.route === "journey"
              ? "Go to the public meeting"
              : "Posted public meeting",
        })
        .first();
      await row.locator("button[data-activity-id]").click();
    }
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
    const speak = panel.getByTestId("speak-ordinary-meeting");
    await speak.click();
    await panel
      .getByRole("button", {
        name: "What hours are proposed, and how would the extra evening be funded?",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      panel.getByTestId("ordinary-meeting-spoken-words"),
    ).toContainText("how would the extra evening be funded");
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
