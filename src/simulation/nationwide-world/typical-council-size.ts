import { stableHash } from "../ids";
import { municipalGovernments, primaryReading } from "../municipal-government";

/**
 * The ICMA typical council size and term draw, on its own so the local
 * ordinance game profile and `localGoverningBodyRules` count one council with
 * one number. See local-governing-body-rules.ts for the sources and the
 * placeholders this draw carries.
 */

export type LocalRuleBasis = "read" | "typical";

export interface LocalRuleValue {
  readonly value: number;
  readonly basis: LocalRuleBasis;
}

interface Share {
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
  const band = COUNCIL_SIZE_SHARES.find((share) => share.value === 8)!;
  const spread = large.length > 0 ? large : [8];
  shares = {
    seats: [
      ...COUNCIL_SIZE_SHARES.filter((share) => share !== band),
      ...spread.map((value) => ({
        value,
        percent: band.percent / spread.length,
      })),
    ],
    termYears: COUNCIL_TERM_SHARES,
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

export function draw(
  table: readonly Share[],
  unitId: string,
  what: string,
): LocalRuleValue | null {
  if (table.length === 0) return null;
  const total = table.reduce((sum, share) => sum + share.percent, 0);
  // A stable point in [0, 1) for this town and this rule.
  const point =
    Number(
      BigInt(`0x${stableHash(`local-governing-body:${what}:${unitId}`)}`) %
        1_000_000n,
    ) / 1_000_000;
  let reached = 0;
  for (const share of table) {
    reached += share.percent / total;
    if (point < reached) return { value: share.value, basis: "typical" };
  }
  return { value: table.at(-1)!.value, basis: "typical" };
}

/** The typical council size drawn for a town nothing about which was read. */
export function typicalCouncilSeats(unitId: string): number | null {
  return draw(typicalShares().seats, unitId, "seats")?.value ?? null;
}
