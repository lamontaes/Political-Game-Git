import { describe, expect, it, vi } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  TOWN_FAMILIES_VERSION,
  TOWN_FAMILY_EVENTS,
  reviewTownFamilies,
} from "../../src/simulation/living-world/town-families";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type * as PeopleFamily from "../../src/simulation/people-family";

// Every birth the review draws is refused by the family writer here, the way
// a rule the draw did not know about would refuse it.
vi.mock("../../src/simulation/people-family", async (importOriginal) => {
  const original = await importOriginal<typeof PeopleFamily>();
  return {
    ...original,
    recordFamilyAddition: () => {
      throw new Error("The record refused this birth.");
    },
  };
});

const BOISE = "1608830";

describe("a birth the record refuses", { timeout: 300_000 }, () => {
  it("is kept as a private refusal and never stops the review", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "families-refused",
        placeKey: BOISE,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const town = game.world.people[personId]!.homeJurisdictionId;
    let world = game.world;
    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < 8; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownFamilies(world, town, personId, `refused-${round}`);
      }
    });
    const refusals = world.history.events.filter(
      (event) =>
        event.stableKey.startsWith(`${TOWN_FAMILIES_VERSION}:${town}:`) &&
        event.type === TOWN_FAMILY_EVENTS.birthRefused,
    );
    expect(refusals.length).toBeGreaterThan(0);
    for (const refusal of refusals) {
      expect(refusal.visibility).toBe("private");
      expect(refusal.summary).toContain("The record refused this birth.");
    }
    expect(
      world.history.events.some(
        (event) => event.type === "life.family-member-added",
      ),
    ).toBe(false);
  });
});
