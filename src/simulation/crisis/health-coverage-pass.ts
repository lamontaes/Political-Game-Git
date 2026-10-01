import type { FutureTransitionHandler } from "../types";
import {
  HEALTH_COVERAGE_KEY,
  healthCoverageRecords,
  recordHealthCoverage,
  scheduleHealthCoveragePass,
} from "./health-coverage";

/** Records eligibility changes and schedules the next administrative pass. */
export const healthCoveragePassHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  if (item.transitionKey !== HEALTH_COVERAGE_KEY)
    throw new Error("The health coverage pass received another transition.");
  const before = healthCoverageRecords(world).length;
  let next = recordHealthCoverage(world, item.dueAt, item.id);
  const changed = healthCoverageRecords(next).slice(before);
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
