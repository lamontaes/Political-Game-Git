/**
 * LAUS rows into observations.
 *
 * The Bureau's footnote codes carry the semantics, and its own la.footnote
 * table supplies their text, so nothing here paraphrases:
 *
 *   P  Preliminary.
 *   N  Not available.
 *   X  Data unavailable due to the 2025 lapse in appropriations.
 *   U  The annual average cannot be calculated due to missing monthly data.
 *
 * `P` is a release status on a value that exists, not a kind of missingness —
 * a preliminary number is a number. The others are absences of different kinds
 * and they map to different states. In particular `X` and `N` are UNKNOWN
 * rather than SUPPRESSED: the Bureau is not withholding these values, it does
 * not have them, and calling that suppression would say the number exists
 * somewhere. #73's domain-local `ObservationStatus` enum, with its own MISSING
 * and SUPPRESSED spellings, folds into the core algebra here so there is one
 * vocabulary for absence in this repository.
 */

import { known, notApplicable, unknown } from "../../core/index";
import type { BlsRow, Evidence, ReleaseStatus, Sourced } from "../../core/index";

/** Footnote codes that mean the observation is preliminary rather than final. */
export const PRELIMINARY_FOOTNOTE_CODES: readonly string[] = ["P"];

/** Footnote codes that mean no value was published, and why. */
export const ABSENCE_FOOTNOTE_CODES: readonly string[] = ["N", "X", "U"];

/** Split a LAUS footnote cell into its individual codes. */
export function splitFootnoteCodes(raw: string): readonly string[] {
  return raw
    .trim()
    .split("")
    .filter((code) => code.trim() !== "");
}

export interface LausValueContext {
  readonly footnoteCodes: readonly string[];
  readonly footnoteText: (code: string) => string;
  readonly asOf: string;
  readonly evidence: Evidence;
  readonly isAnnualAverage: boolean;
}

/** Read one observation cell into the state its footnotes imply. */
export function readLausValue(
  raw: string,
  context: LausValueContext,
): Sourced<number> {
  const trimmed = raw.trim();
  const absence = context.footnoteCodes.find((code) => ABSENCE_FOOTNOTE_CODES.includes(code));

  if (trimmed === "" || trimmed === "-") {
    const reason = absence
      ? `${absence}: ${context.footnoteText(absence)}`
      : "The Bureau published no value in this cell and attached no footnote explaining its absence.";
    // "The annual average cannot be calculated" is a statement that the figure
    // does not apply to this period, not that somebody has yet to find it.
    return absence === "U"
      ? notApplicable([context.evidence], reason)
      : unknown(reason, [context.evidence]);
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return unknown(
      `The cell reads "${trimmed}", which is not a number, and no footnote explains it.`,
      [context.evidence],
    );
  }

  const release: ReleaseStatus = context.footnoteCodes.some((code) =>
    PRELIMINARY_FOOTNOTE_CODES.includes(code),
  )
    ? "PRELIMINARY"
    : "FINAL";

  return known(value, [context.evidence], release, context.asOf);
}

/** The last day of a LAUS period, which is what the observation is as of. */
export function periodAsOf(year: string, period: string): string {
  if (period === "M13") return `${year}-12-31`;
  const month = Number(period.slice(1));
  if (!Number.isFinite(month) || month < 1 || month > 12) return `${year}-12-31`;
  const lastDay = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** Read a LAUS observation row's fields, trimming the padding the format uses. */
export function lausField(row: BlsRow, name: string): string {
  return (row.values[name] ?? "").trim();
}
