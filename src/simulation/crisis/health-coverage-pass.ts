import { ageOnDate } from "../dates";
import type { FutureTransitionHandler } from "../types";
import {
  HEALTH_COVERAGE_KEY,
  MEDICAID_EXPANSION_RULES,
  healthCoverageRecords,
  recordHealthCoverage,
  scheduleHealthCoveragePass,
} from "./health-coverage";
import { crisisMortalityWindowAt, scheduleMortalityWithin } from "./mortality";

/**
 * The monthly coverage pass: records who gained or lost coverage, then
 * re-plans this quarter's death day for each of them whose hazard it moves
 * (a covered person aged 55 to 64), as any other hazard change does.
 */
export const healthCoveragePassHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  if (item.transitionKey !== HEALTH_COVERAGE_KEY)
    throw new Error("The health coverage pass received another transition.");
  const before = healthCoverageRecords(world).length;
  let next = recordHealthCoverage(world, item.dueAt, item.id);
  const changed = healthCoverageRecords(next).slice(before);
  const window = crisisMortalityWindowAt(next, item.dueAt);
  const ages = MEDICAID_EXPANSION_RULES.mortality;
  if (window)
    for (const record of changed) {
      const person = next.people[record.personId];
      if (!person) continue;
      const age = ageOnDate(person.birthDate, item.dueAt);
      if (age < ages.minimumAge || age > ages.maximumAge) continue;
      next = scheduleMortalityWithin(
        next,
        record.personId,
        window.effectiveAt,
        window.windowEnd,
        { sourceEntityId: record.id },
      );
    }
  next = scheduleHealthCoveragePass(next, item.dueAt, next.id);
  const gained = changed.filter((record) => record.covered).length;
  return {
    world: next,
    status: "resolved",
    reasonKey: "crisis:health-coverage",
    context: `${gained} gained coverage, ${changed.length - gained} lost it.`,
    outcomeEventId: null,
  };
};
