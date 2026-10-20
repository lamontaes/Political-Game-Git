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

/** A block group's citizen voting-age people (2019-2023 ACS special tabulation; rounded, with sampling error). */
export interface CvapUnit {
  readonly geoid: string;
  readonly cvap: number;
  readonly cvapHispanic: number;
  readonly cvapNhWhite: number;
  readonly cvapNhBlack: number;
  readonly cvapNhAIAN: number;
  readonly cvapNhAsian: number;
}

const loadedCvap = new Map<string, CvapUnit[]>();

/** A state's citizen voting-age population by block group, loaded on first use. */
export async function cvapUnits(usps: string): Promise<readonly CvapUnit[]> {
  const had = loadedCvap.get(usps);
  if (had) return had;
  const pack = (
    (await import(`./data/neighborhoods/cvap/${usps}.json`, {
      with: { type: "json" },
    })) as { default: Pack }
  ).default;
  const units = Object.entries(pack.units)
    .map(([geoid, cells]) => {
      const unit: Record<string, number | string> = { geoid };
      pack.fields.forEach((field, i) => (unit[field] = cells[i]!));
      return unit as unknown as CvapUnit;
    })
    .sort((a, b) => a.geoid.localeCompare(b.geoid));
  loadedCvap.set(usps, units);
  return units;
}

/** A state, county or minor civil division covered under Section 203, for one language. */
export interface Section203Area {
  readonly level: "State" | "County" | "MCD";
  /** State FIPS, county FIPS ("000" for a state) and county subdivision ("NNNNN" for none). */
  readonly state: string;
  readonly county: string;
  readonly mcd: string;
  readonly name: string;
  readonly language: string;
}

/** The areas covered under Section 203 (2021 determinations), with each language. */
export async function section203Areas(): Promise<readonly Section203Area[]> {
  const file = (
    (await import("./data/neighborhoods/section-203-2021.json", {
      with: { type: "json" },
    })) as { default: { covered: Section203Area[] } }
  ).default;
  return file.covered;
}

/** The languages a county is covered for under Section 203 (its own, its subdivisions', or its state's). */
export async function section203Languages(
  stateFips: string,
  countyFips: string,
): Promise<readonly string[]> {
  const found = new Set<string>();
  for (const area of await section203Areas())
    if (
      area.state === stateFips &&
      (area.level === "State" ||
        (area.county === countyFips &&
          (area.level === "County" || area.level === "MCD")))
    )
      found.add(area.language);
  return [...found].sort();
}
