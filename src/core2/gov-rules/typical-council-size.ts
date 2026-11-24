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
import { shareTable } from "../shares";

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
  return {
    seats: shareTable("councilSize"),
    termYears: shareTable("councilTermYears"),
  };
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
