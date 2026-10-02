import type { LawConsequenceRow } from "../law-consequence-types";

/** Catalog identities admitted to the existing saved typed-levy contract.
 * These rows supply no authority, rate, taxable occurrence or receipt.
 */
export const TYPED_TAX_QUESTION_KEYS: readonly string[] = [
  "us-tax-terms:state.excise-tax-terms",
  "us-policy-positions:business-commerce.legalize-cannabis-sales",
];

/** One tax-kind row shape; all quantities come from the adopted typed levy. */
export function typedTaxQuestionRow(id: string): LawConsequenceRow {
  return {
    id: `${id}:recorded-base`,
    kind: "tax" as const,
    when: "assessment" as const,
    who: {
      selector: "recorded-tax-base-payer",
      predicates: [
        {
          capability: "has-operative-typed-tax-policy",
          parameters: {},
        },
      ],
    },
    what: "assess-enacted-tax-base",
    amount: {
      op: "record" as const,
      key: "enacted-tax-assessment",
      unit: "minor" as const,
    },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed" as const,
    evidence: {
      sourceIds: [
        "src/simulation/tax-policy.ts",
        "src/fiscal-authority/tax-powers.generated.json",
      ],
      population: "The actual payer of a saved taxable occurrence.",
      scope:
        "Only an operative law with supported saved taxing authority and exact adopted terms.",
      why: "The adopted rate and allowance apply to the saved base; collection uses the existing due payment writer.",
      uncertainty:
        "This row supplies no rate, authority, taxable occurrence or recipient. Missing bindings refuse assessment.",
    },
  };
}
