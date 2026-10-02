import { describe, expect, it } from "vitest";
import { authoredWageTerm } from "../../tests/fixtures/authored-wage-term";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  federalMinimumSchedule,
  federalMinimumHourlyMinorAt,
  localMinimumSettingAt,
  stateMinimumSettingAt,
} from "./minimum-wage";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { pickDistinct, SeededRng } from "./rng";
import type { IsoDate, World } from "./types";

const SEED = "a38-explicit-wage-text-all56";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const enactedAt = makeIsoDate("2026-01-16");
const effectiveAt = makeIsoDate("2026-02-01");
const laterAt = makeIsoDate("2026-03-01");

function on(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}

// Donor controls read explicit adopted text; they do not prove desk passage.
describe("A39 adopted federal floor", () => {
  it.each(places)(
    "reads the adopted amount and dated snapshots in $jurisdictionKey",
    (place) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        date: enactedAt,
        seed: `${SEED}:${place.jurisdictionKey}`,
      });
      const enacted = authoredWageTerm(world, {
        key: `${SEED}:${place.jurisdictionKey}:federal`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        answer: "yes",
        effectiveAt,
        designation: "Authored $17.37 control",
        termKey: "floor",
        amountMinor: 1737,
      });
      const history = JSON.stringify(enacted.history);
      expect(federalMinimumSchedule(enacted)).toEqual([]);
      expect(federalMinimumHourlyMinorAt(enacted, enactedAt)).toBe(725);
      const operative = on(enacted, effectiveAt);
      expect(federalMinimumSchedule(operative)).toEqual([
        {
          from: effectiveAt,
          hourlyMinor: 1737,
          measureId: enacted.history.legislativeMeasures!.at(-1)!.id,
          designation: "Authored $17.37 control",
        },
      ]);
      expect(federalMinimumHourlyMinorAt(operative, effectiveAt)).toBe(1737);
      expect(federalMinimumSchedule(enacted)).toEqual([]);
      const missing = on(
        authoredWageTerm(operative, {
          key: `${SEED}:${place.jurisdictionKey}:missing`,
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
          answer: "yes",
          effectiveAt: laterAt,
          designation: "No numeric floor",
          termKey: "floor",
          amountMinor: null,
        }),
        laterAt,
      );
      expect(federalMinimumSchedule(missing)).toHaveLength(1);
      expect(federalMinimumHourlyMinorAt(missing, laterAt)).toBe(1737);
      expect(JSON.stringify(enacted.history)).toBe(history);
    },
  );
});

describe.each(
  pickDistinct(
    new SeededRng(SEED),
    places.filter(
      (place) =>
        !["US-AS", "US-GU", "US-MP", "US-PR", "US-VI", "US-DC"].includes(
          place.jurisdictionKey,
        ),
    ),
    2,
  ),
)("A39 state and local adopted targets in $jurisdictionKey", (place) => {
  it("reads a state's explicit amount without an average annual step", () => {
    const { world, stateJurisdictionId } = smallWorld({
      place: place.jurisdictionKey,
      date: enactedAt,
      seed: `${SEED}:state:${place.jurisdictionKey}`,
    });
    const before = stateMinimumSettingAt(
      world,
      place.jurisdictionKey,
      enactedAt,
    );
    const enacted = authoredWageTerm(world, {
      key: `${SEED}:state:${place.jurisdictionKey}`,
      jurisdictionId: stateJurisdictionId,
      questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "Authored $23.41 state floor",
      termKey: "target",
      amountMinor: 2341,
    });
    expect(
      stateMinimumSettingAt(enacted, place.jurisdictionKey, effectiveAt),
    ).toEqual(before);
    const operative = on(enacted, effectiveAt);
    expect(
      stateMinimumSettingAt(operative, place.jurisdictionKey, effectiveAt),
    ).toMatchObject({
      hourlyMinor: 2341,
      measureId: enacted.history.legislativeMeasures!.at(-1)!.id,
    });
    expect(
      stateMinimumSettingAt(
        on(enacted, makeIsoDate("2030-02-01")),
        place.jurisdictionKey,
        makeIsoDate("2030-02-01"),
      )?.hourlyMinor,
    ).toBe(2341);
    const missing = on(
      authoredWageTerm(world, {
        key: `${SEED}:state-missing:${place.jurisdictionKey}`,
        jurisdictionId: stateJurisdictionId,
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        answer: "yes",
        effectiveAt,
        designation: "No numeric state target",
        termKey: "target",
        amountMinor: null,
      }),
      effectiveAt,
    );
    expect(
      stateMinimumSettingAt(missing, place.jurisdictionKey, effectiveAt),
    ).toEqual(before);
  });

  it("reads a city's own target and supplies no premium without one", () => {
    const { world, jurisdictionId, stateJurisdictionId } = smallWorld({
      place: place.jurisdictionKey,
      date: enactedAt,
      seed: `${SEED}:city:${place.jurisdictionKey}`,
    });
    const authorized = authoredWageTerm(world, {
      key: `${SEED}:city-authority:${place.jurisdictionKey}`,
      jurisdictionId: stateJurisdictionId,
      questionKey: LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
      answer: "yes",
      effectiveAt: enactedAt,
      designation: "Explicit local authority control",
      termKey: "target",
      amountMinor: null,
    });
    const enact = (amountMinor: number | null) =>
      authoredWageTerm(authorized, {
        key: `${SEED}:city:${place.jurisdictionKey}:${amountMinor}`,
        jurisdictionId,
        questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
        answer: "yes",
        effectiveAt,
        designation: "Authored city target control",
        termKey: "target",
        amountMinor,
      });
    const enacted = enact(2341);
    expect(
      localMinimumSettingAt(enacted, jurisdictionId, 1500, effectiveAt),
    ).toBeNull();
    const operative = on(enacted, effectiveAt);
    expect(
      localMinimumSettingAt(operative, jurisdictionId, 1500, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
    expect(
      localMinimumSettingAt(operative, jurisdictionId, 1700, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
    expect(
      localMinimumSettingAt(
        on(enact(null), effectiveAt),
        jurisdictionId,
        1500,
        effectiveAt,
      ),
    ).toBeNull();
  });
});
