import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { MORTALITY_TRANSITION_KEY, recordPersonDeath } from "./vitality";

const SEED = "bg14-fresh-random-2026-10-06";
const PLACE = drawRandomPlace(SEED, (place) => place.scope === "locality");

describe(`BG-14 mortality regression in ${PLACE.displayName} (seed ${SEED})`, () => {
  it("does not turn an annual population rate into deaths during one new-game day", () => {
    const opened = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: PLACE.key,
      startAge: 40,
      questionnaire: "skipped",
    }).world;
    const before = opened.history.personDeaths.length;

    const next = passOrdinaryDays(opened, 1);
    const deaths = next.history.personDeaths.slice(before);

    expect(deaths).toEqual([]);
    expect(
      next.history.personDeaths.some(
        (death) => death.causeKey === MORTALITY_TRANSITION_KEY,
      ),
    ).toBe(false);

    expect(() =>
      recordPersonDeath(opened, {
        stableKey: "bg14:retired-annual-check",
        personId: opened.personOrder[0]!,
        diedAt: opened.currentDate,
        causeKey: MORTALITY_TRANSITION_KEY,
        sourceEntityIds: [opened.id],
        summary: "A retired annual mortality check selected this death.",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [opened.id],
        },
      }),
    ).toThrow("retired annual mortality check");
  });
});
