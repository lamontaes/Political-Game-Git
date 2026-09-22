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
 * So this walks four ordinary towns that have never had a binding, in four
 * states, and reads the screen. None is Lexington, which is the point: how the
 * local economy is doing should not wait on a hand-reviewed crosswalk.
 */

// Small and middling towns in four states, none of them Lexington's.
// `rents` is whether HUD's rent benchmark reaches the town today: in New
// England HUD files rents by town rather than by county, and the game does not
// yet hold which town-level area a place sits in, so Presque Isle has none.
const TOWNS = [
  { town: "Boise City", state: "Idaho", rents: true },
  { town: "Sioux Center", state: "Iowa", rents: true },
  { town: "Presque Isle", state: "Maine", rents: false },
  { town: "Truth or Consequences", state: "New Mexico", rents: true },
] as const;

async function readPlaceSection(page: Page): Promise<string> {
  await goTo(page, "nav-personal").catch(() => undefined);
  const section = page.getByTestId("personal-economic-context");
  await expect(section).toBeVisible({ timeout: 30_000 });
  return (await section.innerText()).replace(/\s+/g, " ").trim();
}

for (const { town, state, rents } of TOWNS) {
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
     * A life opens on January 5, 2026. The only locked edition published by
     * then is HUD's FY2025 Fair Market Rents (August 14, 2024), so that is
     * what shows; county income (February 5) and price levels (February 19)
     * are held back, however old the years they describe.
     */
    if (rents) {
      expect(panelText).toContain("Two-bedroom Fair Market Rent");
      expect(panelText).toContain("2024-08-14");
    } else {
      expect(panelText).toMatch(
        /recorded for this place, and the game cannot establish/,
      );
    }
    expect(panelText).not.toContain("personal income");
    expect(panelText).not.toContain("Nothing has been published");

    // The screen never shows the old contradiction: an "unavailable" sentence
    // printed directly above a panel full of figures.
    await expect(page.getByTestId("economic-context-unavailable")).toHaveCount(
      0,
    );
  });
}
