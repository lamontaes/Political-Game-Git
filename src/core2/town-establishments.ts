/**
 * How big one business of a kind runs in a town (owner, Nov 17: "Everything
 * comes from the simulation. Stop pegging things to real numbers."). A kind's
 * usual size is its sector's private employment over its establishments in
 * the town's counties (Census 2023 County Business Patterns), the strength
 * that says how much one business serves; a county whose sector figure the
 * Census withheld reads its state's counties, and a state with none reads the
 * nation's. It sets no count: a town opens with one business of each kind and
 * the business engine founds more where demand outgrows it.
 */
import type { EntityId } from "./kernel/brands";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { placeCountyGeoids } from "./place-map";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  COUNTY_SECTOR_ESTABLISHMENTS,
  TOWN_EMPLOYMENT_META,
} from "./reference/town-employment.generated";
import { workplaceSector } from "./town-employment-mix";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "./business-books";

type Sector = (typeof TOWN_EMPLOYMENT_META.sectors)[number];

/** Where a kind's usual business size was read. */
export type BusinessSizeBasis = "county" | "state" | "national";

export interface SectorBusinessSize {
  readonly sector: Sector;
  /** Workers per business: `employment` over `establishments`. */
  readonly size: number;
  readonly employment: number;
  readonly establishments: number;
  readonly basis: BusinessSizeBasis;
}

/** What a town opened with for one kind of work. */
export interface TownBusinessCount {
  /** The workplace kind (`TOWN_WORKPLACES` key). */
  readonly kind: string;
  /** How many businesses the town opens with: the seed, one. */
  readonly count: number;
  /** The town's workers in the kind at its real size. */
  readonly workers: number;
  /** The sector's usual business size, or null for a public employer (one per town). */
  readonly size: SectorBusinessSize | null;
  /**
   * True when the town's real workers would fill more businesses than it has
   * generated worker records in the kind: each business needs one, so each
   * business on the books stands for several real ones.
   */
  readonly heldToRecords: boolean;
}

let tables: {
  employment: ReadonlyMap<string, readonly (number | null)[]>;
  establishments: ReadonlyMap<string, readonly (number | null)[]>;
} | null = null;

function parse(rows: string): ReadonlyMap<string, readonly (number | null)[]> {
  const map = new Map<string, readonly (number | null)[]>();
  for (const row of rows.split(";")) {
    const colon = row.indexOf(":");
    map.set(
      row.slice(0, colon),
      row
        .slice(colon + 1)
        .split(",")
        .map((value) => (value === "" ? null : Number(value))),
    );
  }
  return map;
}

function read() {
  return (tables ??= {
    employment: parse(COUNTY_SECTOR_EMPLOYMENT),
    establishments: parse(COUNTY_SECTOR_ESTABLISHMENTS),
  });
}

/** Employment and establishments of one sector over these counties, counting only counties that publish both. */
function sum(counties: Iterable<string>, column: number) {
  const { employment, establishments } = read();
  let workers = 0,
    places = 0;
  for (const county of counties) {
    const e = employment.get(county)?.[column];
    const n = establishments.get(county)?.[column];
    if (e === null || e === undefined || !n) continue;
    workers += e;
    places += n;
  }
  return { workers, places };
}

const bySector = new Map<string, SectorBusinessSize | null>();

/**
 * A sector's usual business size for a town: its counties' employment over
 * their establishments, else its state's counties, else the nation's.
 */
export function sectorBusinessSize(
  town: EntityId,
  sector: Sector,
): SectorBusinessSize | null {
  const key = `${town}|${sector}`;
  if (bySector.has(key)) return bySector.get(key)!;
  const column = TOWN_EMPLOYMENT_META.sectors.indexOf(sector);
  const geoid = corePlaceByJurisdictionId(town)?.sourceGeoid ?? null;
  const all = [...read().employment.keys()];
  const tries: [BusinessSizeBasis, readonly string[]][] = [
    ["county", geoid ? placeCountyGeoids(geoid) : []],
    [
      "state",
      geoid ? all.filter((county) => county.startsWith(geoid.slice(0, 2))) : [],
    ],
    ["national", all],
  ];
  let found: SectorBusinessSize | null = null;
  for (const [basis, counties] of tries) {
    const { workers, places } = sum(counties, column);
    if (places > 0 && workers > 0) {
      found = {
        sector,
        size: workers / places,
        employment: workers,
        establishments: places,
        basis,
      };
      break;
    }
  }
  bySector.set(key, found);
  return found;
}

/**
 * A kind's usual business size in a town: how many workers one business of
 * the kind runs, from its Census sector (`censusSector` on the kind). It is
 * how much demand one business serves, never how many there are.
 */
export function kindBusinessSize(
  town: string,
  kindId: string,
): SectorBusinessSize | null {
  const sector = DEFAULT_BUSINESS_BOOKS_DATA.kinds.find(
    (row) => row.id === kindId,
  )?.censusSector;
  return sector ? sectorBusinessSize(town as EntityId, sector as Sector) : null;
}

/**
 * The one business a town opens with for a kind (`records` generated worker
 * records, each standing for `scale` real workers): the first of its kind,
 * which every opening job of the kind belongs to. The rest are founded by the
 * business engine where demand outgrows it, so `size` is read for the Businesses
 * view and nothing here sets a count.
 */
export function townSeedBusiness(
  town: EntityId,
  kind: string,
  records: number,
  scale: number,
): TownBusinessCount {
  const sector = workplaceSector(kind);
  return {
    kind,
    count: 1,
    workers: records * scale,
    size: sector ? sectorBusinessSize(town, sector) : null,
    heldToRecords: false,
  };
}
