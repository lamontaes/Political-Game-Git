/**
 * The typical council size and term. Ported from the old engine's
 * `nationwide-world/typical-council-size.ts` and `typical-council-spread.ts`.
 *
 * A town nothing about which was read takes the modal value of ICMA's 2018
 * Municipal Form of Government Survey shares: 5 seats (39.3%) and 4-year
 * terms (63.6%). No hash or draw decides it, so every unread town in all 56
 * places gets the same council through one path until its charter is read.
 * See local-governing-body-rules.ts for the sources.
 */
import { municipalGovernments, primaryReading } from "./municipal-government";

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

/** The national share tables, for the spread that reads the inventory. */
export function typicalCouncilTables(): {
  readonly seats: readonly Share[];
  readonly termYears: readonly Share[];
} {
  return { seats: COUNCIL_SIZE_SHARES, termYears: COUNCIL_TERM_SHARES };
}

/**
 * The typical council spread, with the "8 or more" band spread over the sizes
 * the compiled governments read; that band never holds the mode.
 */
interface TypicalShares {
  readonly seats: readonly Share[];
  readonly termYears: readonly Share[];
}

let shares: TypicalShares | null = null;

/** The national shares, with the "8 or more" band spread over read sizes. */
export function typicalShares(): TypicalShares {
  if (shares) return shares;
  const readLarge = new Set<number>();
  for (const government of municipalGovernments()) {
    const size = primaryReading(government)?.bodySize ?? null;
    if (size !== null && size >= 8 && size <= 15) readLarge.add(size);
  }
  const large = [...readLarge].sort((a, b) => a - b);
  const band = typicalCouncilTables().seats.find((share) => share.value === 8)!;
  const spread = large.length > 0 ? large : [8];
  shares = {
    seats: [
      ...typicalCouncilTables().seats.filter((share) => share !== band),
      ...spread.map((value) => ({
        value,
        percent: band.percent / spread.length,
      })),
    ],
    termYears: typicalCouncilTables().termYears,
  };
  return shares;
}
