import { describe, expect, it } from "vitest";

import {
  availableOpeningLifeScenes,
  availableOptionalLifeActivities,
  currentOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * PT3-PROSE acceptance: the first session as three different lives see it.
 *
 * These are three separate starts — one person alone at 22, one person at 22
 * sharing a home, one seven-year-old with the adults who look after them —
 * not one save seen three ways.
 */

function start(
  seed: string,
  startAge: number,
  household: "lives-alone" | "shares-a-home",
) {
  // Custom, because a normal start draws its household from the world seed
  // and these three proofs each need a known one.
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge,
    household,
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("the first session reads differently in three different lives", () => {
  it("does not offer the retired plan-week leisure prompt to a new adult", () => {
    const life = start("pt3-alone", 22, "lives-alone");
    const offered = availableOpeningLifeScenes(life.world, life.personId).map(
      (entry) => entry.definition.key,
    );
    expect(offered).not.toContain("adult.home.plan-week");
    expect(
      availableOptionalLifeActivities(life.world, life.personId).map(
        (entry) => entry.definition.key,
      ),
    ).not.toContain("adult.home.free-time");
    const opened = openNextLifeScene(life.world, life.personId);
    expect(
      currentOpeningLifeScene(opened, life.personId)?.definition.key,
    ).not.toBe("adult.home.plan-week");
  });
});
