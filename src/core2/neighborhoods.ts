/**
 * Neighborhood make-up: for each block group of a state, its total and
 * voting-age population split by Hispanic origin and, among those who are not
 * Hispanic, by race (2020 Census P.L. 94-171, compiled by
 * tooling/build-neighborhood-packs.ts). It describes a unit of land, the way a
 * court weighs a district under the Voting Rights Act. No person has a race,
 * ethnicity or language field, and none may be added.
 */

export interface NeighborhoodUnit {
  readonly geoid: string;
  readonly population: number;
  readonly hispanic: number;
  readonly nhWhite: number;
  readonly nhBlack: number;
  readonly nhAIAN: number;
  readonly nhAsian: number;
  /** Pacific Islander, some other race and two or more races, not Hispanic. */
  readonly nhOther: number;
  readonly vap: number;
  readonly vapHispanic: number;
  readonly vapNhWhite: number;
  readonly vapNhBlack: number;
  readonly vapNhAIAN: number;
  readonly vapNhAsian: number;
  readonly vapNhOther: number;
}

interface Pack {
  readonly source: string;
  readonly fields: readonly string[];
  readonly units: Readonly<Record<string, readonly number[]>>;
}

const loaded = new Map<string, NeighborhoodUnit[]>();

/** A state's block groups, loaded on first use (its two-letter postal code). */
export async function neighborhoodUnits(
  usps: string,
): Promise<readonly NeighborhoodUnit[]> {
  const had = loaded.get(usps);
  if (had) return had;
  const pack = (
    (await import(`./data/neighborhoods/${usps}.json`, {
      with: { type: "json" },
    })) as { default: Pack }
  ).default;
  const units = Object.entries(pack.units)
    .map(([geoid, cells]) => {
      const unit: Record<string, number | string> = { geoid };
      pack.fields.forEach((field, i) => (unit[field] = cells[i]!));
      return unit as unknown as NeighborhoodUnit;
    })
    .sort((a, b) => a.geoid.localeCompare(b.geoid));
  loaded.set(usps, units);
  return units;
}

/** The share of a unit's (or a district's) voting-age people who are not White alone and not Hispanic. */
export function minorityVapShare(
  units: readonly Pick<NeighborhoodUnit, "vap" | "vapNhWhite">[],
): number {
  let vap = 0,
    white = 0;
  for (const unit of units) {
    vap += unit.vap;
    white += unit.vapNhWhite;
  }
  return vap > 0 ? (vap - white) / vap : 0;
}
