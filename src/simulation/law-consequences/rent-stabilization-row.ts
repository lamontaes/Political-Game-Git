import type { LawConsequenceRow } from "../law-consequence-types";

export const RENT_STABILIZATION_QUESTION =
  "us-policy-positions:housing-land-use.rent-stabilization";
export const RENT_CAP_TERM = "cap";
export const RENT_COVERAGE_PREDICATE = "recorded-rent-tenancy-coverage";

// Closed identifiers of recorded tenancy regimes and dwelling classifications,
// not a default legal coverage selection.
export const RENT_COVERAGE_VALUES = ["market", "public", "affordable"].flatMap(
  (regime) =>
    [
      "residential:apartment",
      "residential:rowhouse",
      "residential:house",
      "residential:large-house",
      "residential:mobile-home",
      "residential:farmhouse",
    ].map((classification) => `${regime}:${classification}`),
);

export const RENT_STABILIZATION_ROW: LawConsequenceRow = {
  id: "price-cost:recorded-rent-stabilization",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      {
        op: "sum",
        operands: [
          { op: "record", key: "prior-flow-minor", unit: "minor" },
          {
            op: "product",
            left: { op: "record", key: "prior-flow-minor", unit: "minor" },
            right: { op: "term", key: RENT_CAP_TERM, unit: "ratio" },
          },
        ],
      },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "housing:rent" },
    },
    { capability: RENT_COVERAGE_PREDICATE, parameters: {} },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: [
      "data/research/laws/catalog-terms-batch-02.json#us-policy-positions:housing-land-use.rent-stabilization",
    ],
    population:
      "Actual saved rent payer whose tenancy regime and dwelling classification are explicitly covered by the adopted clause.",
    scope:
      "Final adopted cap and coverage only; no default amount or inferred scope.",
    why: "The adopted annual ratio limits the increase over the prior recorded rent.",
    uncertainty:
      "Missing numeric or closed coverage terms leave this row unsupported; no real jurisdiction's selection bounds are inferred.",
  },
};
