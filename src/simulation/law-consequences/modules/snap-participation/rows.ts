import type { LawConsequenceRow } from "../../../law-consequence-types";

/** Light rows file: the policy-pack registry reads these without loading the handlers. */
export const SNAP_WORK_REQUIREMENT_QUESTION =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
export const SNAP_PARTICIPATION_ROW: LawConsequenceRow = {
  id: "program.snap-receipt:household-participation",
  kind: "snap-participation",
  when: "renewal",
  who: {
    selector: "snap-households-in-state",
    predicates: [
      { capability: "snap-recorded-household-facts", parameters: {} },
    ],
  },
  what: "record-ranked-snap-household-enrollment",
  decision: { op: "record", key: "snap-household-enrolled", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: ["snap-work-requirement-to-participation"] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: [
      "data/research/outcome-web/links.json#snap-work-requirement-to-participation",
      "data/research/outcome-web/place-outcome-bases-2024.json#program.snap-receipt",
      "data/research/money/public-programs-2026.json#federal.snap.grossIncomeTestPctFpl",
      "data/research/money/snap-average-monthly-benefit-by-state-fy2023.json",
    ],
    population:
      "Households with recorded residence, people, income and work facts.",
    scope:
      "A state's actual work-requirement law and its monthly SNAP participation outcome.",
    why: "A recorded household enrollment changes only as far as the law-linked participation outcome changes.",
    uncertainty:
      "Benefit values are ESTIMATED from the published FY2023 state average; participation ranking uses only recorded household facts.",
  },
};
