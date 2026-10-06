/**
 * Sourced legislative term rules, as data.
 *
 * Kept apart from the term writers so a rule reader (the capability resolver)
 * can read the table without importing candidacy and the term transition
 * machinery. Absence stays unsupported rather than borrowing another state.
 */

import type { TermCommencementRule } from "./nationwide-world/state-executive-term-rules";

export const KY_TERM_RULE_VERSION = "ky-regular-term-2026-v1";
export const KS_TERM_RULE_VERSION = "ks-regular-term-2026-v1";
export const NE_TERM_RULE_VERSION = "ne-regular-term-2026-v1";

export interface LegislativeTermProfile {
  readonly officeKeys: readonly string[];
  readonly durationYears: number;
  readonly commencement: TermCommencementRule;
  readonly ruleVersion: string;
  readonly sourceUrl: string;
  readonly supportingSourceUrls?: readonly string[];
  readonly sourceNote: string;
  readonly sourceStatus:
    "admitted" | "official-primary-reviewed-not-source-admitted";
}

/** Only source-admitted terms may grant the existing supported-term capability. */
export const SUPPORTED_LEGISLATIVE_TERM_RULES: readonly LegislativeTermProfile[] =
  [
    {
      officeKeys: ["us-ky-general-assembly-v1:house"],
      durationYears: 2,
      commencement: { kind: "january-first-following-election" },
      ruleVersion: KY_TERM_RULE_VERSION,
      sourceUrl:
        "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
      sourceNote:
        "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
      sourceStatus: "admitted",
    },
    {
      officeKeys: ["us-ky-general-assembly-v1:senate"],
      durationYears: 4,
      commencement: { kind: "january-first-following-election" },
      ruleVersion: KY_TERM_RULE_VERSION,
      sourceUrl:
        "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
      sourceNote:
        "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
      sourceStatus: "admitted",
    },
  ];

/** Reviewed primary facts used by this bounded runtime profile, not admitted law. */
export const REVIEWED_LEGISLATIVE_TERM_PROFILES: readonly LegislativeTermProfile[] =
  [
    {
      officeKeys: ["us-ks-legislature-profile-v1:house"],
      durationYears: 2,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 1,
        offsetDays: 0,
      },
      ruleVersion: KS_TERM_RULE_VERSION,
      sourceUrl:
        "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
      sourceNote:
        "Kansas Constitution art. II §2, House term and commencement.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
    {
      officeKeys: ["us-ks-legislature-profile-v1:senate"],
      durationYears: 4,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 1,
        offsetDays: 0,
      },
      ruleVersion: KS_TERM_RULE_VERSION,
      sourceUrl:
        "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
      sourceNote:
        "Kansas Constitution art. II §2, Senate term and commencement.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
    {
      officeKeys: ["us-ne-legislature-v1:legislature"],
      durationYears: 4,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 1,
        weekday: 2,
        offsetDays: 2,
      },
      ruleVersion: NE_TERM_RULE_VERSION,
      sourceUrl:
        "https://nebraskalegislature.gov/laws/articles.php?article=XVII-5",
      supportingSourceUrls: [
        "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
      ],
      sourceNote:
        "Neb. Const. art. XVII §5 fixes commencement; Neb. Rev. Stat. §32-508 fixes the four-year legislative term.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
  ];

/**
 * The estimated rule for a state legislature with no sourced term rule above.
 *
 * ESTIMATED FROM SIMILAR PLACES: Kentucky supplies January 1; the recorded
 * office term supplies the duration when available, otherwise the lower-
 * chamber two-year and senate/unicameral four-year pattern used by the
 * researched Kentucky, Kansas, and Nebraska profiles applies. Without it a
 * winner was seated on election night, which no state does and which DEPTH2
 * A08 rules out: the result grants no authority, the term does. So every such
 * seat begins on the first of January after the election, the date Kentucky's
 * sourced rule uses, and lasts the office's recorded term length where the
 * qualification corpus knows it; otherwise two years for a lower chamber and
 * four for a senate or a unicameral legislature, the common American pattern.
 * This is wrong in some states (Nevada's members take office the day after the
 * election) and is replaced office by office as sourced rows are added above;
 * a sourced row always wins. Filed with research as
 * legislative-winner-between-election-and-seat.
 */
export const ESTIMATED_LEGISLATIVE_TERM_RULE_VERSION =
  // Persisted in term-event stable keys; keep this legacy spelling for saves.
  "blanket-legislative-term-2026-v1";

export function estimatedLegislativeTermYears(
  officeKey: string,
  knownTermYears: number | null,
): number {
  if (knownTermYears !== null) return knownTermYears;
  const chamber = officeKey.split(":").at(-1);
  return chamber === "house" || chamber === "assembly" ? 2 : 4;
}
