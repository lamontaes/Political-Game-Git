import { expect, test, type Page } from "@playwright/test";

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
  test("opens on the room with the household on a persistent rail", async ({
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

    // The generated household is on the rail — the family the fourth play never
    // saw — each named with its relationship, not hidden behind a button.
    const rail = page.getByTestId("people-rail");
    await expect(rail).toBeVisible();
    const people = rail.getByTestId(/^rail-person-/);
    expect(await people.count()).toBeGreaterThan(0);
    expect(await rail.innerText()).toMatch(
      /your (mom|dad|parent|older|younger|brother|sister)/i,
    );

    // The moment is a compact panel, not a page-sized card.
    const moment = page.getByTestId("story-section");
    await expect(moment).toBeVisible();
    const momentBox = await moment.boundingBox();
    expect(momentBox).not.toBeNull();
    expect(momentBox!.width).toBeLessThan(1440 * 0.62);

    // The corner HUD carries where and when, and the way to everything else.
    await expect(page.getByTestId("life-hud")).toBeVisible();
  });

  test("opens a person from the rail, and can be collapsed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { age: 10 });
    await enterLife(page);

    const rail = page.getByTestId("people-rail");
    await expect(rail).toBeVisible();

    // Selecting somebody opens the conversation surface over the room.
    await rail
      .getByTestId(/^rail-person-/)
      .first()
      .click();
    await expect(page.getByTestId("people-overlay")).toBeVisible();
    await expect(page.getByTestId("conversations")).toBeVisible();

    // Closing it (via its X) and collapsing the rail are both reachable.
    await page.getByTestId("people-overlay-close").click();
    await expect(page.getByTestId("conversations")).toHaveCount(0);
    await page.getByTestId("people-rail-toggle").click();
    await expect(rail.getByTestId(/^rail-person-/)).toHaveCount(0);
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
