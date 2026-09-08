import { expect, test, type Page } from "@playwright/test";

/**
 * Owner-review screenshot capture for UI-PROTOTYPE-01.
 *
 * DEVELOPMENT-ONLY, and OPT-IN: it runs only when `UI_PROTOTYPE_SCREENS=1` is
 * set. It writes files into the repository, and a spec that rewrites tracked
 * files on every ordinary `npm run test:e2e` would leave a dirty tree in every
 * other lane that runs the suite.
 *
 *   UI_PROTOTYPE_SCREENS=1 npx playwright test tests/e2e/ui-prototype-review-screens.spec.ts
 *
 * JPEG at moderate quality on purpose: these are review aids, and a dozen
 * full-resolution PNGs is megabytes of binary in a pull request for no gain.
 */

const ENABLED = process.env.UI_PROTOTYPE_SCREENS === "1";
const OUT = "docs/plans/active/ui-prototype-01-screens";
const PROTOTYPE_URL = "/ui-prototype.html";

/** The desktop widths the packet names for review. */
const REVIEW_VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
];

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({
    path: `${OUT}/${name}.jpg`,
    type: "jpeg",
    quality: 55,
  });
}

async function openTitle(page: Page) {
  await page.goto(PROTOTYPE_URL);
  await page.getByTestId("preview-dismiss").click();
  await expect(page.getByTestId("preview-disclosure")).toHaveCount(0);
}

async function enterShell(page: Page) {
  await openTitle(page);
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("scene-shell")).toBeVisible();
}

test.describe("UI-PROTOTYPE-01 review screens", () => {
  test.skip(!ENABLED, "Set UI_PROTOTYPE_SCREENS=1 to capture review screens.");
  test.setTimeout(180_000);

  test("captures the owner-review set at 1600x900", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });

    await page.goto(PROTOTYPE_URL);
    await shot(page, "00-first-entry-preview");
    await page.getByTestId("preview-dismiss").click();
    await shot(page, "01-title-rest");
    await page.getByTestId("title-continue").hover();
    await shot(page, "02-title-selected");

    await page.getByTestId("title-saved-games").click();
    await shot(page, "03-title-saved-games");
    await page.getByTestId("saved-games-close").click();

    await page.getByTestId("title-options").click();
    await shot(page, "04-options");
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("title-new-game").click();
    await expect(page.getByTestId("scene-shell")).toBeVisible();
    await shot(page, "05-scene-shell");

    /* U03-03: the two resting and raised states, side by side in the set. */
    await page.mouse.move(1400, 200);
    await page.waitForTimeout(320);
    await shot(page, "05b-shell-cluster-resting");
    const clusterBox = await page.getByTestId("nav-cluster").boundingBox();
    if (clusterBox) {
      await page.mouse.move(
        clusterBox.x + clusterBox.width + 60,
        clusterBox.y - 40,
        { steps: 8 },
      );
    }
    await page.waitForTimeout(320);
    await shot(page, "05c-shell-cluster-expanded");

    await page.getByTestId("nav-cluster").click();
    await shot(page, "06-nav-open");
    await page.getByTestId("nav-places").click();
    await shot(page, "07-nav-submenu");
    await page.keyboard.press("Escape");

    await page.getByTestId("scene-person-person-aide").click();
    await shot(page, "08-person-action-menu");
    await page.getByTestId("action-inspect").click();
    await shot(page, "09-quick-dossier");

    await page.getByTestId("quick-dossier-pin").click();
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();
    await page.getByTestId("quick-dossier-full").click();
    await shot(page, "10-full-dossier");

    await page.getByTestId("workspace-pin").click();
    await page.getByTestId("entity-link-measure-measure-transit-pilot").click();
    await page.getByTestId("workspace-pin").click();
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-row-meeting-community").click();
    await page.getByTestId("workspace-pin").click();
    await page.getByTestId("workspace-close").click();
    await shot(page, "11-mixed-pins");

    /* U03-04: a pin's management menu, and the drag affordance in context. */
    await page.getByTestId("pin-manage-measure:measure-transit-pilot").click();
    await shot(page, "11b-pin-menu");
    await page.keyboard.press("Escape");

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-people").click();
    await shot(page, "12-people-categories");
    await page.getByTestId("people-view-toggle").click();
    await shot(page, "13-people-list");
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-calendar").click();
    await shot(page, "14-calendar");
    await page.getByTestId("calendar-row-meeting-community").click();
    await shot(page, "15-calendar-detail");
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-personal").click();
    await page.getByTestId("nav-finances").click();
    await shot(page, "16-personal-finances");
    await page.getByTestId("workspace-close").click();

    /* U03-05: the Details grouping and the separated current-activity line. */
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();
    await page.getByTestId("quick-dossier-full").click();
    await shot(page, "16b-dossier-details");
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-offices").click();
    await shot(page, "17-offices");
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-journal").click();
    await shot(page, "18-journal");
    await page.getByTestId("journal-chapter-chapter-council").click();
    await shot(page, "19-journal-chapter");
    await page.getByTestId("workspace-close").click();

    /* U03-08: patch notes and the quiet version display. */
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-patch-notes").click();
    await shot(page, "19b-patch-notes");
    await page.keyboard.press("Escape");

    /* U03-01: the technical identity, in the place it now lives. */
    await page.getByTestId("inspector-toggle").click();
    await shot(page, "19c-developer-inspector");
    await page.getByTestId("inspector-close").click();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-places").click();
    await page.getByTestId("nav-room-home").click();
    await shot(page, "20-scene-home");
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-places").click();
    await page.getByTestId("nav-room-community-room").click();
    await shot(page, "21-scene-community-room");
  });

  test("captures the title and the shell at every review width", async ({
    page,
  }) => {
    for (const viewport of REVIEW_VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await openTitle(page);
      await shot(page, `w-${viewport.name}-title`);

      await enterShell(page);
      await page.getByTestId("scene-person-person-aide").click();
      await page.getByTestId("action-inspect").click();
      await shot(page, `w-${viewport.name}-dossier`);
      await page.keyboard.press("Escape");

      await page.getByTestId("nav-cluster").click();
      await page.getByTestId("nav-people").click();
      await shot(page, `w-${viewport.name}-people`);
    }
  });
});
