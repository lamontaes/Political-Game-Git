import { describe, expect, it } from "vitest";
import {
  CONDITION_PACK,
  conditionPrevalence,
  startingConditionAssignments,
} from "./condition-pack";
import type { EntityId } from "./kernel/brands";

describe("starting conditions in a small set of people", () => {
  it("hold each condition at its prevalence in total, even where no single age cell holds a whole case", () => {
    // 20 people at each age 20 to 79: a set the size of a town's full people,
    // where a rare condition's expected count in one cell is a fraction.
    const subjects = Array.from({ length: 60 * 20 }, (_, i) => ({
      personId: `person:${i}` as EntityId,
      placeKey: "place:fixture",
      age: 20 + Math.floor(i / 20),
      category: "equal-mixture" as const,
      monthlyHouseholdIncomeMinor: i,
    }));
    const assigned = startingConditionAssignments(subjects);
    for (const condition of CONDITION_PACK) {
      const expected = subjects.reduce(
        (n, s) => n + conditionPrevalence(condition, s.age, s.category),
        0,
      );
      const held = [...assigned.values()].filter((keys) =>
        keys.includes(condition.key),
      ).length;
      expect(Math.abs(held - expected), condition.key).toBeLessThanOrEqual(1);
    }
  });
});
