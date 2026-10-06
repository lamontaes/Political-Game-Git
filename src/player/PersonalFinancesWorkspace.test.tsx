import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { estimatedHouseholdLivingCostsAt } from "../simulation/cost-of-living";
import { HouseholdLivingCostsPanel } from "./HouseholdLivingCostsPanel";

describe("Personal money household costs", () => {
  it("shows the random-place new game's linked household categories", () => {
    const seed = "session7-b27-p2-personal-screen";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const estimate = estimatedHouseholdLivingCostsAt(
      game.world,
      game.playerPersonId,
    );
    expect(estimate).not.toBeNull();

    const html = renderToStaticMarkup(
      <HouseholdLivingCostsPanel
        world={game.world}
        personId={game.playerPersonId}
      />,
    );
    expect(html).toContain('data-testid="household-living-costs"');
    expect(html).toContain(`data-basis="ESTIMATED FROM AVERAGE"`);
    expect(place.displayName).toBeTruthy();
    for (const category of estimate!.categories) {
      expect(html).toContain(`data-category="${category.key}"`);
      expect(html).toContain(`data-linked-measure="${category.linkedMeasure}"`);
    }
    expect(html).toContain("Monthly household costs");
    expect(html).toContain("Household total:");
    expect(html).not.toContain("unknown housing bill");
  }, 30_000);
});
