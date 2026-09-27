import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { deserializeWorld, serializeWorld } from "../simulation";
import { recordPersonDeath } from "../simulation/vitality";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
  newGameSetupProblems,
} from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { completePreStartWorldYear } from "./pre-start-world-year";

const ordinarySetup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "pre-start-year-ordinary-22",
  startAge: 22,
  preStartYearVersion: "pre-start-world-year-v1" as const,
};

describe("a versioned pre-start world year", () => {
  it("leaves an absent-version opening on its existing target date", () => {
    const setup = { ...ordinarySetup, preStartYearVersion: undefined };
    const generated = generateOpeningLife(prepareOpeningLife(setup));
    expect(generated.game!.world.currentDate).toBe(
      generated.game!.place.context.initialMoment.date,
    );
  }, 180_000);

  it("runs canonical time from the prior date once and saves the target World", () => {
    const built = createNewGameWorld(ordinarySetup);
    const targetDated = createNewGameWorld({
      ...ordinarySetup,
      preStartYearVersion: undefined,
    });
    const target = built.place.context.initialMoment.date;
    const prior = addDays(target, -365);
    expect(built.world.currentDate).toBe(prior);
    expect(built.playerPersonId).toBe(targetDated.playerPersonId);
    expect(built.world.people[built.playerPersonId]?.birthDate).toBe(
      targetDated.world.people[targetDated.playerPersonId]?.birthDate,
    );
    const generated = generateOpeningLife(prepareOpeningLife(ordinarySetup));
    const world = generated.game!.world;
    expect(world.currentDate).toBe(target);
    expect(world.currentMoment.date).toBe(target);
    expect(
      world.history.events.some(
        (event) => event.occurredAt > prior && event.occurredAt <= target,
      ),
    ).toBe(true);
    expect(completePreStartWorldYear(world, built.playerPersonId, target)).toBe(
      world,
    );
    expect(generateOpeningLife(generated)).toBe(generated);
    const opened = openOrdinaryLife(world, built.playerPersonId);
    const reopened = deserializeWorld(serializeWorld(opened));
    expect(reopened.currentDate).toBe(target);
    expect(reopened.history.events).toEqual(opened.history.events);
    expect(passOrdinaryDays(reopened, 1).currentDate).toBe(addDays(target, 1));
  }, 180_000);

  it("rejects office starts and unresolved birthday boundaries in the pilot", () => {
    for (const startAge of [5, 6, 11, 14, 18]) {
      expect(
        newGameSetupProblems({ ...ordinarySetup, startAge }).some((problem) =>
          problem.message.includes("school or adulthood boundary"),
        ),
      ).toBe(true);
    }
    expect(
      newGameSetupProblems({
        ...ordinarySetup,
        startingLife: "legislative-office",
      }).some((problem) => problem.message.includes("ordinary life")),
    ).toBe(true);
  });

  it("refuses a canonical death of the prospective player", () => {
    const built = createNewGameWorld(ordinarySetup);
    const deceased = recordPersonDeath(built.world, {
      stableKey: "pre-start-year:death-fixture",
      personId: built.playerPersonId,
      diedAt: built.world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [built.world.id],
      summary: "The prospective player died.",
      provenance: {
        kind: "authored",
        note: "Pre-start survival boundary fixture; no mortality rate asserted.",
      },
    });
    expect(() =>
      completePreStartWorldYear(
        deceased,
        built.playerPersonId,
        built.place.context.initialMoment.date,
      ),
    ).toThrow("The prospective player died");
  });
});
