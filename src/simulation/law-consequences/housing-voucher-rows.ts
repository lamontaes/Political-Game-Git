import type { LawConsequenceRow } from "../law-consequence-types";

export const HOUSING_VOUCHER_QUESTION =
  "us-federal-positions:housing.vouchers-for-every-eligible-family";

export const HOUSING_VOUCHER_ROWS: readonly LawConsequenceRow[] = (
  ["renewal"] as const
).map((when) => ({
  id: `housing-voucher:income-entitlement:${when}`,
  kind: "right-permission",
  when,
  who: {
    selector: "recorded-person-permission",
    predicates: [
      { capability: "permission-voucher-income-scope", parameters: {} },
    ],
  },
  what: "permit-on-yes",
  decision: { op: "term", key: "law-answer", type: "boolean" },
  conditions: [{ capability: "permission-enacted-law", parameters: {} }],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: [
      "data/research/money/housing-voucher-income-scope.json",
      "24 CFR 982.201(b)",
    ],
    population:
      "Recorded household members with income within the modeled HUD very-low-income limit.",
    scope:
      "The federal guarantee and its income qualification, for the person's actual household and place.",
    why: "A yes law grants an income-scoped voucher entitlement; a no law or income above the limit grants no guarantee. The saved entitlement appears with the person's existing legal permissions.",
    uncertainty:
      "Missing income or local limits use marked source estimates. Citizenship, immigration status and assets are not determined by this income review. An entitlement is not enrollment, funding, a dwelling assignment or a benefit payment.",
  },
}));
