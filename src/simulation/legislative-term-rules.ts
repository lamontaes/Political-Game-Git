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
