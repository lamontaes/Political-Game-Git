import type { LawConsequenceRow } from "../law-consequence-types";

/*
 * The legal-outcome rows are plain data. They live apart from the readers so
 * the policy packs can name them without loading the simulation modules the
 * readers use, which import the packs in turn.
 */

/** Terms describe the rule; they never supply an invented sentence length. */
export const minimumCustodyRow: LawConsequenceRow = {
  id: "justice:minimum-custody-months",
  kind: "legal-outcome",
  when: "case-stage",
  who: { selector: "court.saved-defendant", predicates: [] },
  what: "minimum-custody-months",
  amount: { op: "term", key: "floor", unit: "months" },
  conditions: [
    { capability: "court.covered-offense", parameters: { term: "coverage" } },
  ],
  lag: {
    days: 0,
    sourceIds: ["data/research/laws/catalog-terms-batch-02.json"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/laws/catalog-terms-batch-02.json"],
    population:
      "Defendants convicted of an offense explicitly covered by the operative law",
    scope:
      "An enacted numeric floor in months; exact offense coverage is required",
    why: "The sentencing court must give at least the custody term the operative law requires for this offense.",
    uncertainty:
      "No starting-law floor or offense coverage is inferred from a yes/no answer.",
  },
};

/** The inclusive ceiling is a numeric rule, never a Boolean-age conversion. */
export const juvenileJurisdictionRow: LawConsequenceRow = {
  id: "justice:juvenile-jurisdiction-ceiling",
  kind: "legal-outcome",
  when: "case-stage",
  who: { selector: "court.saved-defendant", predicates: [] },
  what: "juvenile-jurisdiction-ceiling",
  amount: { op: "term", key: "age", unit: "years" },
  conditions: [],
  lag: {
    days: 0,
    sourceIds: ["data/research/laws/starting-law-2026/index.ts"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/laws/starting-law-2026/index.ts"],
    population:
      "People considered for adult charging in the incident jurisdiction",
    scope:
      "The dated law's inclusive upper age of general juvenile jurisdiction",
    why: "The operative age ceiling determines general juvenile jurisdiction before adult charging.",
    uncertainty:
      "Adult transfer requires a saved authorized decision; this row grants no transfer and fills no unread age.",
  },
};
