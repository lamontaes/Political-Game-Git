import { expect, test, type Page } from "@playwright/test";

/**
 * The Home/Title screen, on the route a player actually opens.
 *
 * This exists because the failure it guards against was invisible to every
 * other test. The tableau architecture, the scene registry, the tier ladder
 * and an approved 5504x3072 title master all existed and all passed their own
 * tests, and the title screen was still a pale page with three buttons on it,
 * because nothing joined them up. Unit tests on the resolver could not see
 * that: the resolver was right, and unreachable.
 *
 * So these assertions are deliberately about pixels reaching the page. A
 * decoded raster, of a production scene, inside the real player shell.
 */

async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

/** The plate, once the browser has actually decoded it. */
async function paintedPlate(page: Page) {
  const plate = page.getByTestId("title-tableau-plate");
  await expect(plate).toBeVisible();
  await expect
    .poll(async () =>
      plate.evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth,
      ),
    )
    .toBeGreaterThan(0);
  return plate;
}

async function startAndKeepALife(page: Page, age: number) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page.getByTestId("start-age").fill(String(age));
  // The setup screen grew a calibration between choosing an age and beginning,
  // so a life now starts one click further along. Nothing this file asserts
  // depends on how it is answered — only that a life exists to give the title
  // a room — so it is skipped rather than played.
  await page.getByTestId("calibration-skip").click();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("keep-world")).toHaveCount(0);
  await page.getByTestId("leave-game").click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
}

test.describe("The title screen shows the game", () => {
  test("renders production background art before any life exists", async ({
    page,
  }) => {
    await freshBrowser(page);
    await expect(page.getByTestId("title-screen")).toBeVisible();

    const tableau = page.getByTestId("title-tableau");
    await expect(tableau).toHaveAttribute("data-has-plate", "true");

    const plate = await paintedPlate(page);
    // The picture is the approved title master's own ladder, not a stray asset
    // that happened to be reachable.
    await expect(plate).toHaveAttribute(
      "src",
      /title_bg_civic_community_meeting_hero_slot/,
    );
    await expect(page.getByTestId("title-tableau-stage")).toHaveAttribute(
      "data-scene-id",
      "civic-community-meeting-title",
    );

    // THE REGRESSION. A pale page is a page whose backdrop paints nothing.
    const painted = await page
      .getByTestId("title-tableau-camera")
      .getAttribute("data-painted-tier");
    expect(Number(painted)).toBeGreaterThan(0);
  });

  test("keeps New game, Continue and Saved games working over the art", async ({
    page,
  }) => {
    await freshBrowser(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );

    // With nothing saved, the two save controls are off and New game is not.
    await expect(page.getByTestId("continue")).toBeDisabled();
    await expect(page.getByTestId("open-saves")).toBeDisabled();
    await expect(page.getByTestId("new-game")).toBeEnabled();

    await startAndKeepALife(page, 34);
    await expect(page.getByTestId("continue")).toBeEnabled();
    await expect(page.getByTestId("open-saves")).toBeEnabled();

    // The buttons are still reachable, not merely present under a backdrop.
    await page.getByTestId("open-saves").click();
    await expect(page.getByTestId("saves-screen")).toBeVisible();
  });

  test("gives a saved adult a room, and names them in it", async ({ page }) => {
    await freshBrowser(page);
    await startAndKeepALife(page, 34);

    const plate = await paintedPlate(page);
    const sceneId = await page
      .getByTestId("title-tableau-stage")
      .getAttribute("data-scene-id");
    const scene = sceneId ?? "";

    // An ordinary adult gets somewhere ordinary. The office plate is
    // jurisdiction-specific art and is never the answer here.
    expect(scene).not.toBe("office-council-staff-fixture");
    await expect(plate).not.toHaveAttribute("src", /lexington/);

    const description =
      (await page.getByTestId("title-scene-description").textContent()) ?? "";
    const name = (await page.getByTestId("continue").textContent()) ?? "";
    // The copy says whose title this is, using the name the save already has.
    expect(description.length).toBeGreaterThan(0);
    expect(name.length).toBeGreaterThan("Continue".length);
    // And it says what is on screen without saying how it works.
    expect(description).not.toMatch(
      /tableau|asset|tier|registry|raster|fixture|anchor/i,
    );
  });

  /**
   * A child must not be drawn as a shrunken adult. There is no child body art
   * in this project, so the honest title for a ten-year-old is the room with
   * their name on it — and no figure of any kind.
   */
  test("shows a child a room rather than a miniature adult", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startAndKeepALife(page, 10);

    await paintedPlate(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-title-kind",
      "neutral-tableau",
    );
    await expect(page.getByTestId("title-tableau-outline")).toHaveCount(0);
    await expect(page.getByTestId("title-tableau-plate")).not.toHaveAttribute(
      "src",
      /lexington/,
    );
  });

  test("says the same thing on a phone as on a desktop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await freshBrowser(page);
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await paintedPlate(page);
    await expect(page.getByTestId("new-game")).toBeEnabled();
  });
});
