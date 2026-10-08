import { describe, expect, it } from "vitest";
import lawData from "../../data/research/laws/starting-law-2026/index";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "./life-places";
import {
  minimumWageSettingAt,
  stateMinimumSettingAt,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./minimum-wage";
import { deserializeWorld, serializeWorld } from "./serialization";

type Region = {
  workplaceKeys: readonly string[];
  operativeAt: string;
  lawTerms: readonly { value: number }[];
};
const answers = lawData.questions[STATE_MINIMUM_WAGE_QUESTION_KEY].answers;
const admitted = Object.entries(answers)
  .filter(([, row]) => "regionalTerms" in row)
  .map(([state, row]) => ({
    state,
    regions: (row as unknown as { regionalTerms: readonly Region[] })
      .regionalTerms,
  }));
const seed = "overflow3:a39:recorded-workplace";

describe("regional statutory floors use the actual recorded workplace", () => {
  it("reads all admitted county identities and preserves different regions and dated phases", () => {
    expect(admitted.length).toBeGreaterThan(0);
    for (const { state, regions } of admitted) {
      const { world } = smallWorld({
        place: regions[0]!.workplaceKeys[0]!,
        seed: `${seed}:${state}`,
        date: "2026-01-16",
        people: 3,
      });
      const laterDate = makeIsoDate("2026-10-01");
      const later = {
        ...world,
        currentDate: laterDate,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          laterDate,
        ),
      };
      for (const region of regions) {
        const onDate = makeIsoDate(
          region.operativeAt > world.currentDate
            ? region.operativeAt
            : world.currentDate,
        );
        const atDate = {
          ...later,
          currentDate: onDate,
          currentMoment: simulationMomentOnLocalDate(
            later.currentMoment,
            onDate,
          ),
        };
        for (const key of region.workplaceKeys) {
          const place = lifePlaceByKey(key)!;
          expect(place.stateJurisdictionKey).toBe(state);
          expect(
            minimumWageSettingAt(atDate, place.context.jurisdiction.id, onDate)
              ?.hourlyMinor,
            `${key}; ${onDate}`,
          ).toBe(region.lawTerms[0]!.value);
          expect(
            stateMinimumSettingAt(atDate, state, onDate, undefined, key)
              ?.hourlyMinor,
          ).toBe(region.lawTerms[0]!.value);
        }
      }
      expect(stateMinimumSettingAt(later, state, laterDate)).toBeNull();
      expect(
        minimumWageSettingAt(
          later,
          stateJurisdictionForKey(state)!.id,
          laterDate,
        ),
      ).toBeNull();
    }
  });

  it("does not turn a partially bound county or an unrelated locality into a metro-region claim", () => {
    for (const { state } of admitted) {
      const { world, jurisdictionId } = smallWorld({
        place: state,
        seed: `${seed}:unbound:${state}`,
        date: "2026-01-16",
        people: 3,
      });
      expect(
        minimumWageSettingAt(world, jurisdictionId, world.currentDate),
      ).toBeNull();
      expect(
        stateMinimumSettingAt(
          world,
          state,
          world.currentDate,
          undefined,
          "not-a-recorded-place",
        ),
      ).toBeNull();
    }
  });

  it("opens and reloads a new game in an actual random place", () => {
    const place = drawRandomPlace(seed);
    const { world } = smallWorld({ place: place.key, seed, people: 3 });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.seed).toBe(seed);
    expect(reopened.jurisdictions[place.context.jurisdiction.id]).toBeDefined();
    console.info(
      `A39 new game: ${place.displayName}; ${place.key}; seed ${seed}`,
    );
  });
});
