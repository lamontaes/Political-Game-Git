import type { EducationInstitution } from "./types";

/**
 * Everything that depends on which directory vintage a row came from.
 *
 * A directory row carries an academic-year label ("2024-25", "2025-26") and
 * nothing else about when it was observed. Three separate places used to turn
 * that label into a date by writing the two shipped labels out as literals —
 * `catalog.ts` derived the coverage window with a ternary, `compact.ts`
 * derived the release wording with another, and the player panel picked the
 * preferred vintage by comparing `world.currentDate` against a hardcoded
 * "2025-07-01". A third vintage therefore could not be added by shipping data:
 * it needed an edit in each of those places, and until then a 2026-27 row
 * would have been silently labelled and dated as the older one.
 *
 * The window is arithmetic on the label, so any vintage works. The release
 * wording is genuinely per-vintage provenance and stays a table — but an
 * unknown vintage now throws here rather than being described with another
 * vintage's words.
 */

/** An academic-year label as the directories write it, e.g. `2025-26`. */
export type AcademicYear = string;

export interface AcademicYearWindow {
  /** First day the label covers, `YYYY-07-01`. */
  readonly start: string;
  /** Last day the label covers, `YYYY-06-30`. */
  readonly endInclusive: string;
}

const ACADEMIC_YEAR = /^(\d{4})-(\d{2})$/;

/**
 * The July-to-June window an academic-year label names.
 *
 * `2025-26` is July 1 2025 through June 30 2026. A label whose second half is
 * not the following year is refused rather than guessed at.
 */
export function academicYearWindow(year: AcademicYear): AcademicYearWindow {
  const parts = ACADEMIC_YEAR.exec(year);
  if (!parts) {
    throw new Error(`Not an academic-year label: ${year}`);
  }
  const first = Number(parts[1]);
  const second = Number(parts[2]);
  if ((first + 1) % 100 !== second) {
    throw new Error(`Academic-year label does not span one year: ${year}`);
  }
  return {
    start: `${first}-07-01`,
    endInclusive: `${first + 1}-06-30`,
  };
}

/** True when the label's window contains this date. */
export function academicYearCovers(year: AcademicYear, date: string): boolean {
  const window = academicYearWindow(year);
  return date >= window.start && date <= window.endInclusive;
}

/**
 * The vintage a save dated `date` should read: the newest one that has already
 * begun, or — before any of them had — the oldest available.
 *
 * Returns null only when there is nothing to choose from.
 */
export function preferredAcademicYear(
  years: Iterable<AcademicYear>,
  date: string,
): AcademicYear | null {
  const sorted = [...new Set(years)].sort((left, right) =>
    academicYearWindow(left).start.localeCompare(
      academicYearWindow(right).start,
    ),
  );
  if (sorted.length === 0) return null;
  let chosen: AcademicYear | null = null;
  for (const year of sorted) {
    if (academicYearWindow(year).start <= date) chosen = year;
  }
  return chosen ?? sorted[0]!;
}

/**
 * How each shipped vintage describes its own release, per directory.
 *
 * This is provenance wording taken from the releases themselves, so it cannot
 * be derived; it is a table so that a vintage nobody has written wording for
 * is refused instead of borrowing another vintage's.
 */
const RELEASE_LABELS: Readonly<
  Record<AcademicYear, Readonly<Record<string, string>>>
> = {
  "2024-25": {
    postsecondary: "HD2024; IC2024 revised September 2026",
    school: "CCD preliminary v0a",
    district: "CCD preliminary v0a",
  },
  "2025-26": {
    // IPEDS only. Schools and districts are CCD, a different collection with
    // its own release identifiers, so they get no entry here: the 2025-26 CCD
    // release has been observed (preliminary, 14 July 2026, snapshot 1 Oct
    // 2025) but its version suffix was never established, and last year's
    // "v0a" is not evidence for this year's. No school or district row is
    // dated 2025-26 today, so nothing loses wording by this; what it prevents
    // is the day one is imported and silently inherits a postsecondary
    // designation. An unwritten vintage is refused, which is what the table
    // above exists to do.
    postsecondary: "HD2025/IC2025 provisional",
  },
};

/**
 * Every vintage this build has written release wording for.
 *
 * Exported so an invariant can be asserted across all of them rather than
 * against a hand-written list that drifts as vintages are added.
 */
export const ACADEMIC_YEARS: readonly AcademicYear[] = Object.freeze(
  Object.keys(RELEASE_LABELS),
);

export function releaseLabel(
  year: AcademicYear,
  kind: EducationInstitution["kind"],
): string {
  const label = RELEASE_LABELS[year]?.[kind];
  if (label === undefined) {
    throw new Error(
      `No release wording is recorded for the ${year} ${kind} directory.`,
    );
  }
  return label;
}
