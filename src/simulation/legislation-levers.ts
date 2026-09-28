import type {
  ClauseDimension,
  LegalInstrument,
} from "./legislation-content-contracts";

/**
 * The six levers of the decision register (Sept. 26): every part of a bill
 * changes money, a rate, who qualifies, a rule, the government's structure,
 * or a process date. The lever table in data/research/levers maps the 61
 * kinds of part in real enacted law to them; this maps the bank's own
 * clauses. The fiscal note and the enacted-law writers read the same answer.
 */
export type BillLever =
  "money" | "rate" | "who-qualifies" | "rule" | "structure" | "process";

/** A clause the bank cannot place is unclassified, never guessed. */
export function clauseLever(
  dimension: ClauseDimension | null,
  instrument: LegalInstrument | null,
): BillLever | "unclassified" {
  if (instrument === "sunset-repeal" && dimension === "timing")
    return "structure";
  if (
    instrument === "position-authorization" &&
    dimension === "eligibility-scope"
  )
    return "structure";
  switch (dimension) {
    case "funding-cap":
      return "money";
    case "revenue":
      return "rate";
    case "eligibility-scope":
      return "who-qualifies";
    case "oversight":
      return instrument === "regulatory-requirement" ? "rule" : "process";
    case "authority-reference":
      return "structure";
    case "timing":
      return "process";
    default:
      return "unclassified";
  }
}
