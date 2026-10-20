/**
 * A small place holds as many chronic conditions as its prevalence says
 * (pool item people-health-full-deaths-below-life-table). Its single-age cells
 * hold a handful of people each; rounding every cell alone dropped each
 * condition whose expected count in a cell was under a half, so a town of
 * about 1,700 people held a fraction of the conditions its prevalence gives.
 * The rounding left over now carries into the place's next cell.
 */
import { expect, it } from "vitest";
import type { EntityId } from "./kernel/brands";
import {
  CONDITION_PACK,
  conditionPrevalence,
  startingConditionAssignments,
} from "./condition-pack";

it("each condition's count in a small place follows its prevalence, to within one", () => {
  // 1,800 people: 20 at each age from 0 to 89, in one place.
  const subjects = Array.from({ length: 1800 }, (_, i) => ({
    personId: `person:t${i}` as EntityId,
    placeKey: "place-a",
    age: Math.floor(i / 20),
    category: "equal-mixture" as const,
    monthlyHouseholdIncomeMinor: 100_000 + i,
  }));
  const assigned = startingConditionAssignments(subjects);
  for (const condition of CONDITION_PACK) {
    const expected = subjects.reduce(
      (sum, s) => sum + conditionPrevalence(condition, s.age, s.category),
      0,
    );
    const held = [...assigned.values()].filter((keys) =>
      keys.includes(condition.key),
    ).length;
    expect(
      Math.abs(held - expected),
      `${condition.key}: ${held} held, ${expected.toFixed(1)} expected`,
    ).toBeLessThanOrEqual(1);
  }
});
