import { applyLawConsequences } from "../enacted-law-effects";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { lawInForce } from "../governing/law-in-force";
import {
  recordMedicareDrugNegotiationSavings,
  MEDICARE_DRUG_NEGOTIATION_QUESTION_KEY,
} from "./medicare-drug-negotiation";
import { COVERAGE_QUESTION_KEYS } from "../law-consequences/coverage-eligibility-rows";
import type { FutureTransitionHandler } from "../types";
import {
  HEALTH_COVERAGE_KEY,
  healthCoverageRecords,
  scheduleHealthCoveragePass,
} from "./health-coverage";

/** Records eligibility and enrollment changes without replanning death. */
export const healthCoveragePassHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  if (item.transitionKey !== HEALTH_COVERAGE_KEY)
    throw new Error("The health coverage pass received another transition.");
  const before = healthCoverageRecords(world).length;
  let next = world;
  for (const questionKey of Object.values(COVERAGE_QUESTION_KEYS))
    next = applyLawConsequences(next, {
      onDate: item.dueAt,
      activity: "renewal",
      activityId: item.id,
      subjectIds: world.personOrder,
      questionKey,
    });
  const changed = healthCoverageRecords(next).slice(before);
  const drugNegotiation = Object.values(
    next.policyCatalog?.propositions ?? {},
  ).find((row) => row.stableKey === MEDICARE_DRUG_NEGOTIATION_QUESTION_KEY);
  const drugNegotiationLaw = drugNegotiation
    ? lawInForce(
        next,
        NATIONAL_ELECTION_JURISDICTION.id,
        drugNegotiation.id,
        item.dueAt,
      )
    : null;
  if (drugNegotiationLaw) {
    next = recordMedicareDrugNegotiationSavings(next, {
      measureId: drugNegotiationLaw.measureId,
      onDate: item.dueAt,
      sourceRecordId: item.id,
    });
  }
  // The registry owns the coverage record writer and exposure update.
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
