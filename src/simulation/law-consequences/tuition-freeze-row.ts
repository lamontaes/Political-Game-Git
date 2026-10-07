import type { LawConsequenceRow } from "../law-consequence-types";

export const TUITION_FREEZE_QUESTION =
  "us-policy-positions:education.freeze-public-tuition";
export const TUITION_COVERAGE_PREDICATE = "recorded-public-tuition-coverage";
export const TUITION_FREEZE_ROW: LawConsequenceRow = {
  id: "price-cost:recorded-public-tuition-freeze",
  kind: "price-cost",
  when: "payment",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      { op: "record", key: "operative-tuition-minor", unit: "minor" },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "obligation:tuition" },
    },
    { capability: TUITION_COVERAGE_PREDICATE, parameters: {} },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["data/source/education-tuition/tuition-input.json"],
    population:
      "Saved students paying a recorded state-controlled college in its governing state.",
    scope:
      "Operative dated tuition price allocated over saved school terms; completed payments remain unchanged.",
    why: "The enacted freeze holds each new tuition charge to its operative recorded price.",
    uncertainty:
      "Missing recorded ownership, operative price or billing terms leaves the charge unchanged.",
  },
};
