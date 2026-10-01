import { expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { stateJurisdictionForKey } from "./life-places";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  minimumWageSettingAt,
} from "./minimum-wage";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createProductionPolicyCatalog } from "./production-catalog";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld } from "./world";

function fixture(stateKey: string, date = "2026-01-16") {
  const state = stateJurisdictionForKey(stateKey)!;
  const world = createWorld({
    seed: `a39-canonical-federal-fallback:${stateKey}:${date}`,
    currentDate: makeIsoDate(date),
    people: [],
    jurisdictions: [state, NATIONAL_ELECTION_JURISDICTION],
    policyCatalog: createProductionPolicyCatalog(),
  });
  return { world, state };
}

it("uses Mississippi's actual federal law term and provenance without fabricating a state floor", () => {
  const { world, state } = fixture("US-MS");
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    world.currentDate,
  )!;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    termKey: "floor",
    unit: "minor/hour",
    onDate: world.currentDate,
  })!;
  expect(term.value).toBe(725);
  const before = serializeWorld(world);
  expect(
    minimumWageSettingAt(world, state.id, world.currentDate),
  ).toMatchObject({
    hourlyMinor: term.value,
    level: "federal",
    measureId: term.measureId,
    effectiveAt: law.operativeAt,
  });
  expect(
    minimumWageSettingAt(deserializeWorld(before), state.id, world.currentDate),
  ).toEqual(minimumWageSettingAt(world, state.id, world.currentDate));
  expect(serializeWorld(world)).toBe(before);
});

it.each(["US-AS", "US-NY", "US-OR"])(
  "does not turn %s's unresolved industry or regional scope into the federal standard",
  (key) => {
    const { world, state } = fixture(key);
    expect(minimumWageSettingAt(world, state.id, world.currentDate)).toBeNull();
  },
);

it("does not infer Florida's missing historical numeric phase from a later phase or federal floor", () => {
  const { world, state } = fixture("US-FL", "2025-09-29");
  expect(minimumWageSettingAt(world, state.id, world.currentDate)).toBeNull();
});

it("keeps a stronger dated state floor above the federal standard", () => {
  const { world, state } = fixture("US-DC", "2026-07-01");
  expect(
    minimumWageSettingAt(world, state.id, world.currentDate),
  ).toMatchObject({
    hourlyMinor: 1840,
    level: "state",
  });
});
