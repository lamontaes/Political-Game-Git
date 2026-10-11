import type { Share } from "../../simulation/nationwide-world/typical-council-size";
interface TypicalShares {
  readonly seats: readonly Share[];
  readonly termYears: readonly Share[];
}

export function typicalShares(
  bodySizes: readonly (number | null)[],
  tables: TypicalShares,
): TypicalShares {
  const readLarge = new Set<number>();
  for (const size of bodySizes) {
    if (size !== null && size >= 8 && size <= 15) readLarge.add(size);
  }
  const large = [...readLarge].sort((a, b) => a - b);
  const band = tables.seats.find((share) => share.value === 8)!;
  const spread = large.length > 0 ? large : [8];
  const shares = {
    seats: [
      ...tables.seats.filter((share) => share !== band),
      ...spread.map((value) => ({
        value,
        percent: band.percent / spread.length,
      })),
    ],
    termYears: tables.termYears,
  };
  return shares;
}

export function localGoverningBodyReadSpread(
  bodySizes: readonly (number | null)[],
  tables: TypicalShares,
): {
  readonly seats: readonly number[];
  readonly termYears: readonly number[];
} {
  const { seats, termYears } = typicalShares(bodySizes, tables);
  return {
    seats: seats.map((share) => share.value).sort((a, b) => a - b),
    termYears: termYears.map((share) => share.value),
  };
}
