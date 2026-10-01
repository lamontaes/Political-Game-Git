import type { LawConsequenceRow } from "../law-consequence-types";

/** Reads completed statutory records. Supplies no rate, tax base or payment. */
export const STATUTORY_WAGE_TAX_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = Object.fromEntries(
  [
    "us-policy-positions:fiscal.adopt-income-tax",
    "us-policy-positions:fiscal.graduated-income-tax",
    "us-federal-positions:tax.raise-top-income-tax-rate",
  ].map((key) => [
    key,
    (["assessment", "payment"] as const).map((when): LawConsequenceRow => ({
      id: `${key}:saved-statutory-${when}`,
      kind: "tax",
      when,
      who: { selector: "recorded-tax-base-payer", predicates: [] },
      what: "attribute-saved-statutory-tax",
      amount: { op: "record", key: "enacted-tax-assessment", unit: "minor" },
      conditions: [],
      lag: { days: 0, sourceIds: [] },
      onRepeal: "preserve-completed",
      evidence: {
        sourceIds: [
          "src/simulation/statutory-tax.ts",
          "src/simulation/statutory-tax-law-attribution.ts",
        ],
        population:
          "The named payer on the saved wage-tax liability or payment allocation.",
        scope:
          "An actual adopted law identified by the statutory wage-tax record.",
        why: "The statutory writer has already applied the wage rule; these rows attribute that existing result without reassessing or paying again.",
        uncertainty:
          "Absent historical law bindings remain unavailable; this row supplies no starting-law mapping or tax amount.",
      },
    })),
  ]),
);
