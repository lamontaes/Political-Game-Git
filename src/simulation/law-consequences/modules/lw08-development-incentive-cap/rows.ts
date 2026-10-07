import type { LawConsequenceRow } from "../../../law-consequence-types";

export const DEVELOPMENT_INCENTIVE_QUESTION =
  "us-policy-positions:business-commerce.cap-development-incentives";

/**
 * This row names the actual adopted per-award cap. It supplies no cap value:
 * the only value accepted at runtime is the final term recorded for this law.
 * Disclosure categories are read from the same operative law by the handler.
 */
export const DEVELOPMENT_INCENTIVE_AWARD_ROW: LawConsequenceRow = {
  id: "business-commerce:development-incentive-award-cap",
  kind: "business-incentive",
  when: "application",
  who: {
    selector: "recorded-business-incentive-award",
    predicates: [],
  },
  what: "record-capped-development-incentive-award",
  amount: { op: "term", key: "cap", unit: "usd-per-award" },
  conditions: [
    {
      capability: "business.incentive-award-disclosure",
      parameters: { termKey: "disclosure" },
    },
  ],
  lag: {
    days: 0,
    sourceIds: ["data/research/laws/catalog-terms-batch-03.json"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: [
      "data/research/laws/catalog-terms-batch-03.json",
      "data/research/laws/starting-law-2026.json",
      "data/research/outcome-web/links.json",
    ],
    population:
      "Organizations receiving a development-incentive award from the governing jurisdiction",
    scope:
      "The final adopted USD-per-award cap and required disclosure categories for the operative jurisdictional law",
    why: "The jurisdiction's recorded per-award cap bounds the award, and the same law's recorded disclosure categories must be present before an award record is written.",
    uncertainty:
      "Batch 03 marks both terms as needing jurisdiction-specific research and the starting-law row as missing. No cap or disclosure list is supplied by this row; without both operative terms, no award is recorded.",
  },
};
