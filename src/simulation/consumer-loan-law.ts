import { federalLawInForceAt } from "./federal-outlay-laws";
import {
  readFinalEnactedLawCategories,
  readFinalEnactedLawTerm,
} from "./governing/final-law-term-query";
import { recordLawExposure } from "./law-exposure";
import { peopleInHouseholdAt } from "./life-queries";
import { monthlyInterestMinor } from "./public-benefit-formulas";
import { money } from "./resources";
import type {
  HouseholdLoanKind,
  IsoDate,
  LoanTermsRecord,
  MoneyAmount,
  ResourceFlow,
  World,
} from "./types";

export const CONSUMER_LOAN_CAP_QUESTION =
  "us-federal-positions:monetary-financial.cap-consumer-loan-interest";

/** Coverage and APR are the adopted bill's terms, shared by every borrower. */
export function consumerLoanCapAt(
  world: World,
  kind: HouseholdLoanKind,
  onDate: IsoDate,
) {
  const law = federalLawInForceAt(world, CONSUMER_LOAN_CAP_QUESTION, onDate);
  if (!law) return null;
  const coverage = readFinalEnactedLawCategories(world, law, {
    questionKey: CONSUMER_LOAN_CAP_QUESTION,
    termKey: "coverage",
    onDate,
  });
  if (!coverage?.values.includes(kind)) return null;
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: CONSUMER_LOAN_CAP_QUESTION,
    termKey: "cap",
    unit: "basis-points",
    onDate,
  });
  return term && Number.isFinite(term.value) && term.value >= 0
    ? { capBasisPoints: term.value, measureId: law.measureId }
    : null;
}

/** The actual monthly charge establishes savings; opening a loan does not. */
export function recordConsumerLoanCapSavings(
  world: World,
  flow: ResourceFlow,
  terms: LoanTermsRecord,
  opening: MoneyAmount,
  dueOn: IsoDate,
): World {
  const cap = consumerLoanCapAt(world, terms.kind, dueOn);
  if (
    !cap ||
    cap.measureId !== terms.rateCapMeasureId ||
    terms.rateBeforeCapBasisPoints === undefined
  )
    return world;
  const saved =
    monthlyInterestMinor(opening.minorUnits, terms.rateBeforeCapBasisPoints) -
    monthlyInterestMinor(opening.minorUnits, terms.annualRateBasisPoints);
  if (saved <= 0) return world;
  const people =
    flow.source.kind === "person"
      ? [flow.source.personId]
      : flow.source.kind === "household"
        ? peopleInHouseholdAt(world, flow.source.householdId, {
            asOfDate: dueOn,
            historySequenceExclusive: world.history.nextSequence,
          })
        : [];
  let next = world;
  for (const personId of people)
    next = recordLawExposure(next, {
      stableKey: `consumer-loan-cap:${flow.id}:${dueOn}:${personId}`,
      personId,
      measureId: cap.measureId,
      channel: "business-rule",
      direction: "gain",
      amount: money(saved, opening.currency),
      cadence: "monthly",
      sourceRecordId: terms.id,
      includeFamily: false,
    });
  return next;
}
