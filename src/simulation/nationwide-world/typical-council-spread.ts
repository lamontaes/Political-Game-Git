import { municipalGovernments, primaryReading } from "../municipal-government";
import { typicalCouncilTables, type Share } from "./typical-council-size";

/**
 * The typical council spread, with the "8 or more" band spread over the sizes
 * the inventory read. It lives apart from typical-council-size.ts so the cold
 * legislative lookup (the local ordinance game profile) takes the typical
 * council without loading the municipal inventory; that band never holds the
 * mode, so both files agree on one typical council.
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

/** Every value a typical draw can give, for tests and the record. */
export function localGoverningBodyReadSpread(): {
  readonly seats: readonly number[];
  readonly termYears: readonly number[];
} {
  const { seats, termYears } = typicalShares();
  return {
    seats: seats.map((share) => share.value).sort((a, b) => a - b),
    termYears: termYears.map((share) => share.value),
  };
}
