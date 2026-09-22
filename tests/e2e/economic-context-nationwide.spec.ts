import { expect, test, type Page } from "@playwright/test";
import { enterLife, fillCreator, goTo } from "./support/creator";

/**
 * Does an ordinary town now say how the place is doing?
 *
 * Before this change the "Money and property" screen carried the economic
 * panel in exactly one town — Lexington, the one place with a hand-reviewed
 * crosswalk — and in every other town in America the panel was simply absent
 * from the section, with nothing said about why. The figures themselves were
 * already on disk: 3,597 BEA geographies and 4,934 HUD geographies ship in
 * `public/data/economic-context`.
 *
 * So this walks two ordinary towns that have never had a binding, in two
 * states, and reads the screen. Neither is Lexington and neither is in a state
 * that ships a legislature pack, which is the point: how the local economy is
 * doing should not wait on whether the legislature has been researched.
 */

const TOWNS = [
  { town: "Bowling Green", state: "Kentucky" },
  { town: "Boise City", state: "Idaho" },
] as const;

async function readPlaceSection(page: Page): Promise<string> {
  await goTo(page, "nav-personal").catch(() => undefined);
  const section = page.getByTestId("personal-economic-context");
  await expect(section).toBeVisible({ timeout: 30_000 });
  return (await section.innerText()).replace(/\s+/g, " ").trim();
}

for (const { town, state } of TOWNS) {
  test(`${town}, ${state} says how the place is doing`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });
    await fillCreator(page, { age: 30, state, place: town, route: "normal" });
    await page.getByTestId("begin").click();
    await enterLife(page);

    const before = await readPlaceSection(page);
    console.log(
      `\n==== ${town}, ${state} — "The place you live" ====\n${before}\n`,
    );

    // The panel is present at all, which is the thing that was missing.
    const panel = page.getByTestId("economic-context-panel");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    const panelText = (await panel.innerText()).replace(/\s+/g, " ").trim();
    console.log(`---- panel ----\n${panelText}\n`);

    // It names this town, not Lexington, and not a county passed off as the town.
    expect(panelText).toContain(town);
    expect(panelText).not.toContain("Lexington");

    /*
     * What the panel says today is that it is holding figures back.
     *
     * Every one of the three locked corpora was fetched on 2026-09-03 and none
     * of them establishes a publisher release date, so each observation falls
     * back to the fetch date and an ordinary life opening on 2026-01-05 is
     * eight months too early to see any of it. That is true in Lexington too,
     * which is why the single-entry registry hid it for so long.
     *
     * So the assertion is on the honest sentence rather than on a number: the
     * screen must say figures exist and are being withheld, not that nothing
     * has been published. When the availability basis is fixed, this is the
     * test that should start failing.
     */
    expect(panelText).toMatch(
      /recorded for this place, and the game cannot establish/,
    );
    expect(panelText).not.toContain("Nothing has been published");

    // The screen never shows the old contradiction: an "unavailable" sentence
    // printed directly above a panel full of figures.
    await expect(page.getByTestId("economic-context-unavailable")).toHaveCount(
      0,
    );
  });
}
