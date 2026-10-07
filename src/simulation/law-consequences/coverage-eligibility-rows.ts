import type { LawConsequenceRow } from "../law-consequence-types";

export const COVERAGE_QUESTION_KEYS = {
  expansion:
    "us-policy-positions:health-human-services.expand-medicaid-eligibility",
  workRequirement:
    "us-policy-positions:health-human-services.medicaid-work-requirement",
} as const;
export const COVERAGE_SELECTORS = {
  "medicaid-expansion-person": COVERAGE_QUESTION_KEYS.expansion,
  "medicaid-work-rule-person": COVERAGE_QUESTION_KEYS.workRequirement,
} as const;
export const COVERAGE_ACTION = "recompute-medicaid-coverage";
export const COVERAGE_DECISION = "medicaid-coverage-decision";
export const COVERAGE_PREDICATE = "medicaid-recorded-household";

/** Existing coverage bindings; the catalog owner admits these same rows. */
export const COVERAGE_ELIGIBILITY_ROWS: Readonly<
  Record<string, LawConsequenceRow>
> = Object.fromEntries(
  Object.entries(COVERAGE_SELECTORS).map(([selector, questionKey]) => [
    questionKey,
    {
      id: `coverage-eligibility:${selector}`,
      kind: "coverage-eligibility",
      when: "renewal",
      who: {
        selector,
        predicates: [{ capability: COVERAGE_PREDICATE, parameters: {} }],
      },
      what: COVERAGE_ACTION,
      decision: { op: "record", key: COVERAGE_DECISION, type: "boolean" },
      conditions: [],
      lag: { days: 0, sourceIds: ["existing-monthly-coverage-review"] },
      onRepeal: "recompute-prospective",
      evidence: {
        sourceIds: [
          "data/research/money/public-programs-2026.json#federal.medicaid",
          `data/research/laws/starting-law-2026.json#questions.${questionKey}`,
        ],
        population:
          "Recorded adult household members reviewed by the existing coverage writer.",
        scope:
          "Actual governing law and recorded household, pay, work and exemption facts.",
        why: "The governing eligibility rule applies to the person's recorded circumstances.",
        uncertainty:
          "Reuses the existing modeled eligibility and exemptions; missing facts are undecided and never cause loss.",
      },
    } satisfies LawConsequenceRow,
  ]),
);
