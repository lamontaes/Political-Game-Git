import type { LawConsequenceRow } from "../law-consequence-types";

export const FEDERAL_MINIMUM_WAGE_QUESTION_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
export const STATE_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";
export const CITY_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.city-minimum-wage";
export const PAY_SELECTOR = "active-work-payflows";
export const ANNUAL_OFFICE_PAY_ACTION = "set-annual-office-salary";
export const NON_ELECTIVE_PAY_PREDICATE = "pay-not-elective-public-office";
export const PAY_ACTION = "raise-hourly-floor";

/** Data-only catalog-owner payload; legal values belong to the final law terms. */
export const MINIMUM_WAGE_PAY_ROWS: Readonly<
  Record<string, LawConsequenceRow>
> = Object.fromEntries(
  [
    FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
    CITY_MINIMUM_WAGE_QUESTION_KEY,
  ].map((questionKey) => [
    questionKey,
    {
      id: `pay:${questionKey}`,
      kind: "pay",
      when: "payroll",
      who: {
        selector: PAY_SELECTOR,
        predicates: [
          { capability: NON_ELECTIVE_PAY_PREDICATE, parameters: {} },
        ],
      },
      what: PAY_ACTION,
      amount: {
        op: "term",
        key:
          questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
            ? "floor"
            : "target",
        unit: "minor/hour",
      },
      conditions: [],
      lag: { days: 0, sourceIds: ["existing-contract-pay-period-boundary"] },
      onRepeal: "preserve-completed",
      evidence: {
        sourceIds: [
          "data/research/money/minimum-wage-2026.json",
          "https://www.dol.gov/agencies/whd/minimum-wage/state",
          "https://www.law.cornell.edu/uscode/text/29/203#e_2_C",
        ],
        population:
          "Recorded workers with actual compensation flows and hours; federal authority applies without a saved workplace location, while state/local floors require a dated workplace.",
        scope:
          "Governing federal, genuine state or authorized city law, final legal floor and actual operative date; starting coverage and phase-ins belong to canonical law records.",
        why: "The operative legal minimum raises the worker's prospective recorded contract; actual payroll transfers and withholding use that contract.",
        uncertainty:
          "Existing whole-period conversion is a game simplification; standard coverage is the approved default and exceptions require saved facts. The approved elective-public-office exclusion uses the actual paid office role; it does not exclude appointed staff or infer how judicial offices are selected. Missing hours, exception rates and final terms remain unsupported, never guessed levels.",
      },
    } satisfies LawConsequenceRow,
  ]),
);
