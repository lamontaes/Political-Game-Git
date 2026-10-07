import type { LawConsequenceRow } from "../../../law-consequence-types";

/** This batch reuses the existing legal-outcome kind and adds no dispatcher. */
export const registrations = [] as const;

/**
 * Federal floor row. It records the actual enacted floor and covered offenses
 * on a defendant's saved sentencing event. The selected term is a legal input;
 * it is not an estimate of prison population or crime effects.
 */
export const FEDERAL_MANDATORY_MINIMUM_ROW: LawConsequenceRow = {
  id: "federal-justice-rights:mandatory-minimum-floor",
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
    sourceIds: ["data/research/laws/catalog-terms-batch-04.json"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: [
      "data/research/laws/catalog-terms-batch-04.json",
      "data/research/outcome-web/links.json",
    ],
    population:
      "A defendant sentenced under federal law for an offense explicitly covered by the enacted provision",
    scope:
      "The enacted custody floor in months for each explicitly covered offense",
    why: "A court's saved sentencing event is governed by the numeric floor and offense coverage in the operative federal law.",
    uncertainty:
      "The enacted bill must supply an actual floor and covered offenses. No federal-prison population or crime change is inferred from the law row.",
  },
};

/**
 * No stock-trading consequence is declared here: the current world does not
 * record member stock transactions or a complete covered-person/asset rule.
 * A generic permission record would therefore stamp people without proving
 * either congressional membership or a covered trade.
 */
