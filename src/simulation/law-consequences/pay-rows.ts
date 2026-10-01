import type { LawConsequenceRow } from "../law-consequence-types";

export const FEDERAL_MINIMUM_WAGE_QUESTION_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
export const STATE_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";
export const PAY_SELECTOR = "active-work-payflows";
export const PAY_ACTION = "raise-hourly-floor";

/** Data-only catalog-owner payload; legal values belong to the final law terms. */
export const MINIMUM_WAGE_PAY_ROWS: Readonly<
  Record<string, LawConsequenceRow>
> = Object.fromEntries(
  [FEDERAL_MINIMUM_WAGE_QUESTION_KEY, STATE_MINIMUM_WAGE_QUESTION_KEY].map(
    (questionKey) => [
      questionKey,
      {
        id: `pay:${questionKey}`,
        kind: "pay",
        when: "payroll",
        who: { selector: PAY_SELECTOR, predicates: [] },
        what: PAY_ACTION,
        amount: {
          op: "term",
          key:
            questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY
              ? "target"
              : "floor",
          unit: "minor/hour",
        },
        conditions: [],
        lag: { days: 0, sourceIds: ["existing-contract-pay-period-boundary"] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: [
            "data/research/money/minimum-wage-2026.json",
            "https://www.dol.gov/agencies/whd/minimum-wage/state",
          ],
          population:
            "Recorded workers with an actual compensation flow, work jurisdiction and hours.",
          scope:
            "Governing federal or genuine state law, final legal floor and actual operative date; starting coverage and phase-ins belong to canonical law records.",
          why: "The operative legal minimum raises the worker's prospective recorded contract; actual payroll transfers and withholding use that contract.",
          uncertainty:
            "Existing whole-period conversion is a game simplification; missing coverage, hours, special rates and final terms are unsupported, never inferred permission or a guessed level.",
        },
      } satisfies LawConsequenceRow,
    ],
  ),
);
