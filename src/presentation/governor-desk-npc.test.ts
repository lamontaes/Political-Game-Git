import { describe, expect, it } from "vitest";

import { measurePosition, searchLifePlaces } from "../simulation";
import { LEGISLATIVE_INTAKE_VERSION } from "../simulation/governing/legislative-clock";
import { currentGoverningOffices } from "../simulation/governing/state-governing";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * A governor the game plays decides each bill, rather than replaying the
 * veto written into the developer bills legislatures file on their own.
 *
 * Measured 2026-09-23 over 36 months with the seed below: before, all nine
 * Alaska bills that reached the desk were vetoed; after, six were enacted.
 */
describe("a governor the player does not control", () => {
  it("signs some bills into law instead of vetoing every one", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-AK",
      scope: "locality",
    })[0]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "veto-US-AK",
        placeKey: place.key,
        startAge: 40,
        questionnaire: "skipped",
      }),
    ).game!;
    let world = openOrdinaryLife(game.world, game.playerPersonId);
    for (let month = 0; month < 36; month += 1)
      world = passOrdinaryDays(world, 30);
    const office = currentGoverningOffices(world).find(
      (entry) => entry.stateUsps === "AK",
    );
    expect(office?.controlledByPlayer).toBe(false);
    const phases = (world.history.legislativeMeasures ?? [])
      .filter((measure) =>
        measure.stableKey.startsWith(LEGISLATIVE_INTAKE_VERSION),
      )
      .map((measure) => measurePosition(world, measure.id).phase);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases).toContain("enacted");
  }, 900_000);
});
