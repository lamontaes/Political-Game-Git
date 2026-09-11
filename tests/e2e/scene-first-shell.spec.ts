import { expect, test, type Page } from "./fixtures";

import { enterLife, startLife } from "./support/creator";

/**
 * The scene-first life shell (fourth human play FAIL / convergence).
 *
 * The fourth play reported a large white card over wallpaper: no family in the
 * room, People reduced to a button. These assertions hold the repair — the room
 * is the surface, the generated household is a persistent rail, and the moment
 * is a compact panel rather than a page-sized card.
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

test.describe("A life is played in the room, not on a card", () => {
  test("opens on the room with the people who are in it on a persistent rail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { age: 10 });
    await enterLife(page);

    // The room is a released, decoded plate filling the frame.
    const backdrop = page.getByTestId("scene-backdrop");
    await expect(backdrop).toHaveAttribute("data-has-plate", "true");
    const plate = page.getByTestId("scene-backdrop-plate");
    await expect
      .poll(async () =>
        plate.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
    // And it actually covers the viewport, rather than sitting in a text column.
    const plateBox = await plate.boundingBox();
    expect(plateBox).not.toBeNull();
    expect(plateBox!.width).toBeGreaterThan(1440 * 0.9);
    expect(plateBox!.height).toBeGreaterThan(900 * 0.9);

    // Whoever is actually in the room is IN the room, named with their
    // relationship rather than hidden behind a button. UI9-03 finished here:
    // the rail above the room carried the people present and was the only way
    // to choose one, which made it a roster the player never asked for. The
    // same people stand in the scene now, named on their own plates, and each
    // one is a real control with their id on it.
    const room = page.getByTestId("scene-people");
    await expect(room).toBeVisible();
    const people = room.locator('[data-testid^="scene-person-"]');
    expect(await people.count()).toBeGreaterThan(0);
    expect(await room.innerText()).toMatch(
      /your (mom|dad|parent|older|younger|brother|sister)/i,
    );
    // And nothing populates a roster for the player any more.
    await expect(page.getByTestId("people-rail")).toHaveCount(0);

    // The moment is a compact panel, not a page-sized card.
    const moment = page.getByTestId("story-section");
    await expect(moment).toBeVisible();
    const momentBox = await moment.boundingBox();
    expect(momentBox).not.toBeNull();
    expect(momentBox!.width).toBeLessThan(1440 * 0.62);

    // The corner cluster carries who, where and when, and the way to
    // everything else. At rest it is small and translucent, and it is still on
    // the screen rather than hidden behind a control.
    const cluster = page.getByTestId("shell-nav-cluster");
    await expect(cluster).toBeVisible();
    await expect(page.getByTestId("shell-nav")).toHaveAttribute(
      "data-state",
      "rest",
    );
  });

  test("opens a person from the room, by pointer and by keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { age: 10 });
    await enterLife(page);

    const room = page.getByTestId("scene-people");
    await expect(room).toBeVisible();
    const person = room.locator('[data-testid^="scene-person-"]').first();

    /*
     * Selecting somebody opens the anchored action menu beside them, carrying
     * their id. This test used to assert that the click opened the people
     * overlay and a conversation directly; it had been failing before UI9
     * touched this file, because selecting a person has not gone straight to
     * that surface since the anchored menu landed. Asserting the menu is what
     * the game actually does, and it is the thing worth protecting: every entry
     * on it is about the person who was clicked.
     *
     * Pointer AND keyboard, because the figures live in a click-through layer
     * — the room behind them has to stay clickable — and the two routes really
     * can come apart: a token can take keyboard focus perfectly while every
     * click falls through it to the backdrop.
     */
    await person.click();
    const menu = page.getByTestId("person-action-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("action-inspect")).toBeVisible();

    // Their full record is one step from here, and Back returns to the room.
    await menu.getByTestId("action-record").click();
    await expect(page.getByTestId("person-workspace")).toBeVisible();
    await page.getByTestId("person-workspace-close").click();

    // The same person, reached with no pointer at all.
    await person.focus();
    await expect(person).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
  });

  test("advances the life from a choice on the moment panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { age: 10 });
    await enterLife(page);

    const before = await page.getByTestId("story-prose").innerText();
    await page.getByTestId("story-options").getByRole("button").first().click();
    // The world moved: either the prose changed or time was let to pass into a
    // new beat. Either way the moment is not frozen behind a card.
    await expect
      .poll(async () => {
        const prose = page.getByTestId("story-prose");
        return (await prose.count()) > 0 ? prose.innerText() : "";
      })
      .not.toBe(before);
  });
});
