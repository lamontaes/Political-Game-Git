import { describe, expect, it } from "vitest";
import startingLaw from "../../data/research/laws/starting-law-2026/index";
import { createScenarioWorld } from "./demo";
import { searchLifePlaces, stateJurisdictionForKey } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { createPolicyCatalog, createSyntheticPolicyCatalog } from "./policy";
import { createProductionPolicyCatalog } from "./production-catalog";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  TEACHER_SALARY_FLOOR_QUESTION,
  teacherSalaryFloorAt,
} from "./teacher-salary-floor";
import type { EntityId, World } from "./types";

const rows = Object.entries(
  startingLaw.questions[TEACHER_SALARY_FLOOR_QUESTION].answers,
);

function fixture(stateKey: string) {
  const demo = createSyntheticPolicyCatalog();
  const production = createProductionPolicyCatalog();
  const catalog = createPolicyCatalog({
    catalogVersion: "fixture:recorded-teacher-floor",
    domains: Object.values({ ...demo.domains, ...production.domains }),
    issues: Object.values({ ...demo.issues, ...production.issues }),
    propositions: Object.values({
      ...demo.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({ ...demo.subjects, ...production.subjects }),
    principles: Object.values({ ...demo.principles, ...production.principles }),
  });
  const towns = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).filter((place) => place.scope === "locality");
  const first = towns[0]!;
  const state = stateJurisdictionForKey(stateKey)!;
  const scenario = createScenarioWorld(
    "recorded-teacher-floor",
    first.context,
    { peopleCount: 8 },
  );
  const world = ensureJurisdiction(
    { ...scenario, policyCatalog: catalog },
    state,
  );
  return {
    world,
    first,
    sameState: towns.find((place) => place.key !== first.key)!,
    state,
  };
}

describe("the recorded teacher salary floor", () => {
  it("shares the recorded amount across a state's towns and survives save reload without a draw", () => {
    const numericRows = rows.filter(([, row]) => "lawTerms" in row);
    expect(numericRows.length).toBeGreaterThan(1);
    const floors = numericRows.map(([stateKey, row]) => {
      const term =
        "lawTerms" in row
          ? row.lawTerms.find(
              (term) => term.key === "floor" && term.unit === "minor",
            )
          : undefined;
      expect(term).toBeDefined();
      const { world, first, sameState, state } = fixture(stateKey);
      const before = serializeWorld(world);
      const floor = teacherSalaryFloorAt(
        world,
        first.context.jurisdiction.id,
        world.currentDate,
        null,
      );
      expect(floor).not.toBeNull();
      expect(floor!.annual).toBe(term!.value / 100);
      expect(
        teacherSalaryFloorAt(
          world,
          sameState.context.jurisdiction.id,
          world.currentDate,
          null,
        ),
      ).toEqual(floor);
      expect(
        teacherSalaryFloorAt(world, state.id, world.currentDate, null),
      ).toEqual(floor);
      const reopened = deserializeWorld(before);
      expect(
        teacherSalaryFloorAt(
          reopened,
          first.context.jurisdiction.id,
          reopened.currentDate,
          null,
        ),
      ).toEqual(floor);
      expect(
        teacherSalaryFloorAt(
          { ...world, seed: "another-teacher-world" },
          first.context.jurisdiction.id,
          world.currentDate,
          null,
        ),
      ).toEqual(floor);
      expect(serializeWorld(world)).toBe(before);
      return floor!;
    });
    // Equal recorded amounts can still come from different state laws.
    expect(new Set(floors.map((floor) => floor.measureId)).size).toBe(
      floors.length,
    );
  });

  it("returns no floor for missing terms or a seedless fixture instead of a central estimate", () => {
    const [stateKey] = rows.find(
      ([, row]) => row.answer === "yes" && !("lawTerms" in row),
    )!;
    const { world, first } = fixture(stateKey);
    expect(
      teacherSalaryFloorAt(
        world,
        first.context.jurisdiction.id,
        world.currentDate,
        null,
      ),
    ).toBeNull();
    expect(
      teacherSalaryFloorAt(
        {} as World,
        "fixture_place" as EntityId,
        world.currentDate,
        null,
      ),
    ).toBeNull();
  });
});
