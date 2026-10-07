import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import { createWorld } from "../world";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import {
  placeOutcomesForMonth,
  PLACE_OUTCOME_BASES,
  type PlaceOutcomeRecord,
} from "../outcome-web/place-outcomes";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  HOUSING_SUPPLY_LAWS,
  withHousingSupplyLawStamps,
} from "./housing-market";

const QUESTION = HOUSING_SUPPLY_LAWS[0];
const MEASURE = "housing.new-large-buildings";
const SEED = "team4-housing-supply-five-states-20260930";
const answers = (
  startingLaw.questions as Record<
    string,
    { answers: Record<string, { answer: "yes" | "no" }> }
  >
)[QUESTION]!.answers;
const available = Object.keys(PLACE_OUTCOME_BASES[MEASURE]!.places).filter(
  (key) => answers[key]?.answer === "no",
);
const rng = new SeededRng(SEED);
const states: string[] = [];
while (states.length < 5)
  states.push(...available.splice(rng.integer(0, available.length), 1));

function fixture(
  stateKey: string,
  answer: "yes" | "no" = "yes",
  effective = "2026-07-01",
) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  const world = createWorld({
    seed: SEED,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: [jurisdiction],
    people: [],
    lineage: "production",
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === QUESTION,
  )!;
  const measure: LegislativeMeasureRecord = {
    id: "measure_housing_supply" as EntityId,
    stableKey: "test:housing:supply",
    sequence: 1,
    jurisdictionId: jurisdiction.id,
    rulePackId: "test",
    designation: "Act 1",
    shortTitle: "Housing supply",
    summary: "Controlled housing supply law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_housing_supply" as EntityId,
    stableKey: "test:housing:supply:enactment",
    sequence: 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-02-16"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effective),
    outcomeEventId: "event_housing_supply" as EntityId,
  };
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [measure],
      legislativeEnactments: [enactment],
    },
  };
}
function record(world: World, state: string, month = "2027-08-01") {
  return placeOutcomesForMonth(world, makeIsoDate(month), [MEASURE]).find(
    (row) => row.placeKey === state,
  )!;
}

describe("housing supply provenance on changed permit-unit records", () => {
  it.each(states)(
    "retains the changed %s consequence and exact stamp after persistence",
    (state) => {
      const world = fixture(state);
      const original = record(world, state);
      expect(original.value, `${state}, seed ${SEED}`).not.toBe(
        original.structural,
      );
      const stamped = withHousingSupplyLawStamps(world, original);
      expect(stamped.value).toBe(original.value);
      expect(stamped.causes).toBe(original.causes);
      expect(stamped.lawEffectStamps).toHaveLength(1);
      expect(isLawEffectStamp(stamped.lawEffectStamps![0])).toBe(true);
      expect(stamped.lawEffectStamps![0]).toMatchObject({
        governingLawKey: "measure_housing_supply",
        questionKey: QUESTION,
        jurisdictionId: stateJurisdictionForKey(state)!.id,
        operativeAt: "2026-07-01",
        appliedAt: "2027-08-01",
        effectKind: "housing-permit-units",
      });
      const saved = {
        ...world,
        placeOutcomes: {
          months: [{ month: stamped.month, records: [stamped] }],
        },
      };
      const reopened = JSON.parse(JSON.stringify(saved)) as World;
      const row = reopened.placeOutcomes!.months[0]!
        .records[0]! as PlaceOutcomeRecord & LawEffectStampedRecord;
      expect(row.lawEffectStamps).toEqual(stamped.lawEffectStamps);
      expect(withHousingSupplyLawStamps(reopened, row)).toBe(row);
      console.info(
        JSON.stringify({
          state,
          seed: SEED,
          permitUnitsPer10000: original.value,
          structural: original.structural,
          stampCount: row.lawEffectStamps?.length,
        }),
      );
    },
  );
  it("does not stamp unchanged, not-yet-effective, pre-lag or unrecorded causes", () => {
    const state = states[0]!;
    for (const world of [
      fixture(state, "no"),
      fixture(state, "yes", "2028-01-01"),
    ]) {
      const row = record(world, state);
      expect(withHousingSupplyLawStamps(world, row)).toBe(row);
      expect(
        withHousingSupplyLawStamps(world, row).lawEffectStamps,
      ).toBeUndefined();
    }
    const world = fixture(state);
    const beforeLag = record(world, state, "2026-08-01");
    expect(withHousingSupplyLawStamps(world, beforeLag)).toBe(beforeLag);
    const changed = record(world, state);
    const noLaw = {
      ...world,
      history: {
        ...world.history,
        legislativeMeasures: [],
        legislativeEnactments: [],
      },
    };
    expect(
      withHousingSupplyLawStamps(noLaw, changed).lawEffectStamps,
    ).toBeUndefined();
    const noCause = { ...changed, causes: [] };
    expect(withHousingSupplyLawStamps(world, noCause)).toBe(noCause);
    expect(
      withHousingSupplyLawStamps(world, {
        ...changed,
        value: Math.round((changed.structural ?? changed.base) * 100) / 100,
      }).lawEffectStamps,
    ).toBeUndefined();
  });
});
