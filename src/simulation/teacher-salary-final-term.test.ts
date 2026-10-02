import { expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { makeIsoDate } from "./dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { createProductionPolicyCatalog } from "./production-catalog";
import { createPolicyCatalog, createSyntheticPolicyCatalog } from "./policy";
import { deserializeWorld, serializeWorld } from "./serialization";
import { teacherSalaryFloorAt } from "./teacher-salary-floor";

function fixture(stateKey: string) {
  const demo = createSyntheticPolicyCatalog();
  const production = createProductionPolicyCatalog();
  const catalog = createPolicyCatalog({
    catalogVersion: "fixture:sourced-teacher-floor",
    domains: Object.values({ ...demo.domains, ...production.domains }),
    issues: Object.values({ ...demo.issues, ...production.issues }),
    propositions: Object.values({
      ...demo.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({ ...demo.subjects, ...production.subjects }),
    principles: Object.values({ ...demo.principles, ...production.principles }),
  });
  const state = stateJurisdictionForKey(stateKey)!;
  const place = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).find((row) => row.scope === "locality")!;
  const scenario = createScenarioWorld("sourced-teacher-floor", place.context, {
    peopleCount: 8,
  });
  const world = ensureJurisdiction(
    { ...scenario, policyCatalog: catalog },
    state,
  );
  return { world, jurisdictionId: place.context.jurisdiction.id };
}

it.each(["US-AR", "US-IA"])(
  "%s reads its already sourced $50,000 starting-teacher floor without a wage-survey input",
  (stateKey) => {
    const { world, jurisdictionId } = fixture(stateKey);
    const floor = teacherSalaryFloorAt(
      world,
      jurisdictionId,
      world.currentDate,
      null,
    );
    expect(floor?.annual).toBe(50_000);
    expect(floor?.measureId).toContain(`starting-law:${stateKey}:`);
    expect(
      teacherSalaryFloorAt(
        { ...world, seed: "different-seed" },
        jurisdictionId,
        world.currentDate,
        1,
      ),
    ).toEqual(floor);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      teacherSalaryFloorAt(
        reopened,
        jurisdictionId,
        reopened.currentDate,
        null,
      ),
    ).toEqual(floor);
  },
);

it("does not invent an amount for a starting salary schedule without a numeric term", () => {
  const { world, jurisdictionId } = fixture("US-AL");
  expect(
    teacherSalaryFloorAt(world, jurisdictionId, world.currentDate, 70_000),
  ).toBeNull();
});

it("reads all 56 places without manufacturing a floor from their median wage", () => {
  const { world } = fixture("US-AR");
  let numeric = 0;
  for (const state of lifePlaceStateIdentities()) {
    const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
    const floor = teacherSalaryFloorAt(
      world,
      jurisdiction.id,
      makeIsoDate(world.currentDate),
      null,
    );
    if (floor) {
      expect(floor.annual, state.jurisdictionKey).toBe(50_000);
      expect(["US-AR", "US-IA"]).toContain(state.jurisdictionKey);
      numeric += 1;
    }
  }
  expect(numeric).toBe(2);
});
