import { expect, test, type Page } from "./fixtures";

import { enterLife, openMoment, startLife } from "./support/creator";

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
    await startLife(page, { place: "Lexington", state: "Kentucky", age: 10 });
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
    // A named, real relationship - not necessarily a parental one.
    // `resolveGuardian` (src/simulation/person-context.ts) reports "your
    // guardian" for a non-parental child authority, which is a legitimate,
    // tested outcome (see tests/character-context.test.ts) an unseeded age-10
    // start can land on just as often as a parent or sibling.
    expect(await room.innerText()).toMatch(
      /your (mom|dad|parent|older|younger|brother|sister|guardian)/i,
    );
    // And nothing populates a roster for the player any more.
    await expect(page.getByTestId("people-rail")).toHaveCount(0);

    /*
     * What is visible on arrival is the way IN to the moment, not the moment.
     * A panel standing permanently over the room covers whoever is standing
     * where it lands — measured, there is no viewport where it leaves every
     * person reachable — so the room offers the moment and the player opens
     * it, and it closes back to the room. An active authored scene is
     * unaffected: it still shows its own choices in the room.
     */
    const opener = page.getByTestId("open-moment");
    await expect(opener).toBeVisible();
    await expect(page.getByTestId("story-section")).toHaveCount(0);

    await openMoment(page);

    // Opened, it is still a compact panel and not a page-sized card.
    const moment = page.getByTestId("story-section");
    await expect(moment).toBeVisible();
    const momentBox = await moment.boundingBox();
    expect(momentBox).not.toBeNull();
    expect(momentBox!.width).toBeLessThan(1440 * 0.62);

    // And it closes back to the room, leaving the way in behind it.
    await page.getByTestId("pending-life-return").click();
    await expect(page.getByTestId("story-section")).toHaveCount(0);
    await expect(opener).toBeVisible();

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
    await startLife(page, { place: "Lexington", state: "Kentucky", age: 10 });
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
    /*
     * With the moment closed — which is how the room rests — the figure's own
     * token is reachable again, so this is the ordinary press on the person.
     * The name beside them opens the same person, and is checked below.
     */
    await expect(page.getByTestId("story-section")).toHaveCount(0);
    await person.click();
    const menu = page.getByTestId("quick-dossier");
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId("dossier-talk")).toBeVisible();

    // Their full record is one step from here, and Back returns to the room.
    await menu.getByTestId("person-full-record").click();
    await expect(page.getByTestId("person-workspace")).toBeVisible();
    await page.getByTestId("person-workspace-back").click();

    // The same person, reached with no pointer at all.
    await person.focus();
    await expect(person).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("quick-dossier")).toBeVisible();

    /*
     * And the name is not a second stop on the way there. It is a pointer
     * shortcut to the token that labels it, so it is out of the tab order and
     * hidden from assistive technology: tabbing on from the token reaches
     * something else, and the name is never the focused element.
     */
    const personId = (await person.getAttribute("data-testid"))!.replace(
      "scene-person-",
      "",
    );
    const name = page.getByTestId(`scene-name-${personId}`);
    await expect(name).toHaveAttribute("aria-hidden", "true");
    await expect(name).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("Escape");
    await person.focus();
    await page.keyboard.press("Tab");
    await expect(name).not.toBeFocused();
  });

  test("advances the life from a choice on the moment panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { place: "Lexington", state: "Kentucky", age: 10 });
    await enterLife(page);
    await openMoment(page);

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
