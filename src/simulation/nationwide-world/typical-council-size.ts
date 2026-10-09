/**
 * The typical council size and term, on its own so the local ordinance game
 * profile and `localGoverningBodyRules` count one council with one number.
 *
 * A town nothing about which was read takes the modal value of ICMA's 2018
 * Municipal Form of Government Survey shares: 5 seats (39.3%) and 4-year
 * terms (63.6%). No hash or draw decides it, so every unread town in all 56
 * places gets the same council through one path until its charter is read.
 * See local-governing-body-rules.ts for the sources.
 */

/** Where a typical council value comes from, for the record. */
export const TYPICAL_COUNCIL_SOURCE =
  "ESTIMATED FROM AVERAGE: the most common council size and at-large term in ICMA's " +
  "2018 Municipal Form of Government Survey (n=3,910 for size, n=3,254 for terms), in " +
  "docs/research/chatgpt-answers/2026-09-22-nationwide-2235/. Not a claim about this town's charter.";

export type LocalRuleBasis = "read" | "typical";

export interface LocalRuleValue {
  readonly value: number;
  readonly basis: LocalRuleBasis;
}

export interface Share {
  readonly value: number;
  /** Percent of responding municipalities. */
  readonly percent: number;
}

/** ICMA 2018, council size, n=3,910 (see the note above for the bands). */
const COUNCIL_SIZE_SHARES: readonly Share[] = [
  { value: 4, percent: 12.0 },
  { value: 5, percent: 39.3 },
  { value: 6, percent: 12.5 },
  { value: 7, percent: 26.1 },
  // Replaced below by the read sizes from 8 to 15, which share this 10.1%.
  { value: 8, percent: 10.1 },
];

/** ICMA 2018, at-large council terms in years, n=3,254; "other" left out. */
const COUNCIL_TERM_SHARES: readonly Share[] = [
  { value: 2, percent: 18.6 },
  { value: 3, percent: 13.1 },
  { value: 4, percent: 63.6 },
  { value: 6, percent: 2.8 },
];

/**
 * The modal value of a share table: the value the largest share of
 * municipalities report, ties going to the smaller value. No draw.
 */
export function modalShare(table: readonly Share[]): LocalRuleValue | null {
  if (table.length === 0) return null;
  let best = table[0]!;
  for (const share of table) {
    if (
      share.percent > best.percent ||
      (share.percent === best.percent && share.value < best.value)
    )
      best = share;
  }
  return { value: best.value, basis: "typical" };
}

/** The typical council size for a town nothing about which was read. */
export function typicalCouncilSeats(): number | null {
  return modalShare(COUNCIL_SIZE_SHARES)?.value ?? null;
}

/** The national share tables, for the spread that reads the inventory. */
export function typicalCouncilTables(): {
  readonly seats: readonly Share[];
  readonly termYears: readonly Share[];
} {
  return { seats: COUNCIL_SIZE_SHARES, termYears: COUNCIL_TERM_SHARES };
}
