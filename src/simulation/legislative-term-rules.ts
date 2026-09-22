/**
 * Sourced legislative term rules, as data.
 *
 * Kept apart from the term writers so a rule reader (the capability resolver)
 * can read the table without importing candidacy and the term transition
 * machinery. Absence stays unsupported rather than borrowing another state.
 */

export const KY_TERM_RULE_VERSION = "ky-regular-term-2026-v1";

export const SUPPORTED_LEGISLATIVE_TERM_RULES = [
  {
    officeKeys: ["us-ky-general-assembly-v1:house"],
    durationYears: 2,
    commencement: "january-first-following-election" as const,
    ruleVersion: KY_TERM_RULE_VERSION,
    sourceUrl:
      "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
    sourceNote:
      "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
  },
  {
    officeKeys: ["us-ky-general-assembly-v1:senate"],
    durationYears: 4,
    commencement: "january-first-following-election" as const,
    ruleVersion: KY_TERM_RULE_VERSION,
    sourceUrl:
      "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
    sourceNote:
      "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
  },
] as const;

/**
 * The blanket rule for a state legislature with no sourced term rule above.
 *
 * NOT RESEARCHED PER STATE. Without it a winner in such a state was seated on
 * election night, which no state does and which DEPTH2 A08 rules out: the
 * result grants no authority, the term does. So every such seat begins on the
 * first of January after the election, the date Kentucky's sourced rule uses,
 * and lasts the office's recorded term length where the qualification corpus
 * knows it; otherwise two years for a lower chamber and four for a senate or a
 * unicameral legislature, the common American pattern. This is wrong in some
 * states (Nevada's members take office the day after the election) and is
 * replaced office by office as sourced rows are added above; a sourced row
 * always wins. Filed with research as legislative-winner-between-election-and-seat.
 */
export const BLANKET_LEGISLATIVE_TERM_RULE_VERSION =
  "blanket-legislative-term-2026-v1";

export function blanketLegislativeTermYears(
  officeKey: string,
  knownTermYears: number | null,
): number {
  if (knownTermYears !== null) return knownTermYears;
  const chamber = officeKey.split(":").at(-1);
  return chamber === "house" || chamber === "assembly" ? 2 : 4;
}
