import type { LawConsequenceRow } from "../law-consequence-types";

const QUESTION_ACTIONS = {
  "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax":
    "record-road-charge-exposure",
  "us-policy-positions:transportation-infrastructure.public-broadband":
    "record-public-broadband-exposure",
  "us-policy-positions:transportation-infrastructure.fix-it-first":
    "record-road-maintenance-exposure",
} as const;

export const INFRASTRUCTURE_EXPOSURE_ROWS: Readonly<
  Record<string, LawConsequenceRow>
> = Object.fromEntries(
  Object.entries(QUESTION_ACTIONS).map(([questionKey, action]) => [
    questionKey,
    {
      id: `${questionKey}:named-resident-exposure`,
      kind: "infrastructure-exposure",
      when: "effective",
      who: { selector: "infrastructure.recorded-residents", predicates: [] },
      what: action,
      amount: {
        op: "constant",
        value: 1,
        unit: "count",
        sourceIds: [
          "data/research/laws/starting-law-2026.json",
          "data/research/laws/catalog-terms-batch-02.json",
        ],
      },
      conditions: [],
      lag: { days: 0, sourceIds: [] },
      onRepeal: "preserve-completed",
      evidence: {
        sourceIds: [
          "data/research/laws/starting-law-2026.json",
          "data/research/laws/catalog-terms-batch-02.json",
        ],
        population:
          "Named people with a recorded home in the jurisdiction when the law becomes effective.",
        scope:
          "One non-money exposure records that the existing infrastructure effect reached each resident; it does not replace the budget, service or outcome-web effect.",
        why: "The operative law changes the infrastructure rules and services attached to the resident's recorded home.",
        uncertainty:
          "The person count is exact from saved residents. A missing monetary or service quantity remains unmeasured rather than being estimated as zero.",
      },
    } satisfies LawConsequenceRow,
  ]),
);
