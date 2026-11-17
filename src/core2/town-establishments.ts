/**
 * How many businesses of each kind a town opens with (owner, Nov 16: every
 * town's stores, restaurants and clinics sized from its own people, not a
 * fixed three). A kind's usual business size is its sector's private
 * employment over its establishments in the town's counties (Census 2023
 * County Business Patterns); the town opens with as many businesses of the
 * kind as its own workers in that kind fill at that size. Nothing is drawn
 * and nothing is tuned: a county whose sector figure the Census withheld
 * reads its state's counties, and a state with none reads the nation's.
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

/** Why a town opens with the businesses of one kind it does. */
export interface TownBusinessCount {
  /** The workplace kind (`TOWN_WORKPLACES` key). */
  readonly kind: string;
  /** How many businesses the town opens with. */
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
 * How many businesses of a kind the town opens with: its real workers in the
 * kind (`records` generated worker records, each standing for `scale` real
 * workers) over the sector's usual business size, at least one. A business
 * needs a worker record, so it is never more than the records. A workplace no
 * private sector lists (a police department, a post office) is one public
 * employer.
 */
export function townBusinessCount(
  town: EntityId,
  kind: string,
  records: number,
  scale: number,
): TownBusinessCount {
  const workers = records * scale;
  const sector = workplaceSector(kind);
  const size = sector ? sectorBusinessSize(town, sector) : null;
  if (!size || records <= 0)
    return { kind, count: 1, workers, size, heldToRecords: false };
  const wanted = Math.max(1, Math.round(workers / size.size));
  const most = Math.max(1, Math.round(records));
  return {
    kind,
    count: Math.min(wanted, most),
    workers,
    size,
    heldToRecords: wanted > most,
  };
}
