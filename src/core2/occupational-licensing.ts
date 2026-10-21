/**
 * The share of workers who hold a state or federal license, by occupation
 * group (BLS CPS Table 53, 2025). The national row is the start for every
 * place until a state table is found (`byState` in the data file names the
 * spread to check against). A license held on a worker (pool item
 * world-license-held-on-worker) reads this share; nothing else does yet.
 */
import shares from "../../data/research/jobs/occupational-licensing-shares.json" with { type: "json" };

export interface LicensedShare {
  readonly occupation: string;
  readonly share: number;
  readonly tag: "SOURCED" | "ESTIMATED";
}

const ROWS = shares.nationalByOccupation;

/** The licensed share (0 to 1) for an occupation group, or the all-worker share where the group has no row. */
export function licensedShare(occupation: string): LicensedShare {
  const row =
    ROWS.find((r) => r.occupation === occupation) ??
    ROWS.find((r) => r.occupation.startsWith("Total"))!;
  return {
    occupation: row.occupation,
    share: row.percentLicense / 100,
    tag:
      row === ROWS.find((r) => r.occupation === occupation)
        ? "SOURCED"
        : "ESTIMATED",
  };
}

/** The state-to-state spread a place's share is checked against, as fractions. */
export function licensedShareSpread(): { low: number; high: number } {
  return {
    low: shares.byState.spread.low / 100,
    high: shares.byState.spread.high / 100,
  };
}
