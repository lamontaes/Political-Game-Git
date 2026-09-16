import { districtIdentityCatalog } from "../../districts/catalog";
import { listDistrictIdentities } from "../../districts/query";
import { makeIsoDate } from "../dates";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import type { IsoDate } from "../types";
import type { ChamberKey } from "./contract";

/** Institutional facts only. People, parties and tenures are fictional. */
export const CONGRESS_SEAT_SOURCES = {
  constitution:
    "https://www.archives.gov/founding-docs/constitution-transcript",
  twentiethAmendment: "https://www.archives.gov/founding-docs/amendments-11-27",
  houseDistricts:
    "U.S. Census Bureau Gazetteer congressional districts (census-gazetteer-2025, as of 2025-01-01)",
  senateClasses:
    "https://www.senate.gov/general/contact_information/senators_cfm.xml (fetched 2026-09-15, sha256 984865a4a6e00af68c9617ea45f52b8939f49143780c832cb68c747fa4bfef5e)",
  senateClassCycle:
    "https://www.senate.gov/about/origins-foundations/senate-and-constitution/senate-classes.htm",
} as const;

/**
 * Which classes each state's two seats belong to, as senate.gov published it.
 * Classes are an institutional fact; the members this game seats are not.
 */
export const SENATE_CLASSES_BY_STATE: Readonly<
  Record<string, readonly [1 | 2 | 3, 1 | 2 | 3]>
> = {
  AK: [2, 3],
  AL: [2, 3],
  AR: [2, 3],
  AZ: [1, 3],
  CA: [1, 3],
  CO: [2, 3],
  CT: [1, 3],
  DE: [1, 2],
  FL: [1, 3],
  GA: [2, 3],
  HI: [1, 3],
  IA: [2, 3],
  ID: [2, 3],
  IL: [2, 3],
  IN: [1, 3],
  KS: [2, 3],
  KY: [2, 3],
  LA: [2, 3],
  MA: [1, 2],
  MD: [1, 3],
  ME: [1, 2],
  MI: [1, 2],
  MN: [1, 2],
  MO: [1, 3],
  MS: [1, 2],
  MT: [1, 2],
  NC: [2, 3],
  ND: [1, 3],
  NE: [1, 2],
  NH: [2, 3],
  NJ: [1, 2],
  NM: [1, 2],
  NV: [1, 3],
  NY: [1, 3],
  OH: [1, 3],
  OK: [2, 3],
  OR: [2, 3],
  PA: [1, 3],
  RI: [1, 2],
  SC: [2, 3],
  SD: [2, 3],
  TN: [1, 2],
  TX: [1, 2],
  UT: [1, 3],
  VA: [1, 2],
  VT: [1, 3],
  WA: [1, 3],
  WI: [1, 3],
  WV: [1, 2],
  WY: [1, 2],
};

/**
 * One lawful commencement per term cycle. Terms begin January 3 (Twentieth
 * Amendment); House terms are two years and Senate terms six (Article I).
 * Senate.gov lists Class I terms expiring in 2025, Class II in 2027 and
 * Class III in 2023 on the same six-year rotation.
 */
const TERM_REFERENCE: Readonly<
  Record<string, { readonly referenceStart: string; readonly years: number }>
> = {
  "us-house": { referenceStart: "2025-01-03", years: 2 },
  "us-senate:1": { referenceStart: "2025-01-03", years: 6 },
  "us-senate:2": { referenceStart: "2021-01-03", years: 6 },
  "us-senate:3": { referenceStart: "2023-01-03", years: 6 },
};

/** Constitutional minimum ages (Article I, sections 2 and 3). */
export const MINIMUM_AGE: Readonly<Record<ChamberKey, number>> = {
  "us-house": 25,
  "us-senate": 30,
};

export interface CongressSeat {
  readonly seatKey: string;
  readonly chamberKey: ChamberKey;
  readonly stateUsps: string;
  readonly district: string | null;
  readonly senateClass: 1 | 2 | 3 | null;
}

let seatCache: readonly CongressSeat[] | null = null;

/** Every voting seat, in a stable order. Delegates are not chamber seats. */
export function congressSeats(): readonly CongressSeat[] {
  if (seatCache) return seatCache;
  const catalog = districtIdentityCatalog();
  const seats: CongressSeat[] = [];
  for (const stateUsps of [...US_STATE_USPS].sort()) {
    for (const district of listDistrictIdentities(catalog, {
      stateUsps,
      chamber: "congressional",
    })
      .map((record) => record.districtCode)
      .sort()) {
      seats.push({
        seatKey: `us-house:${stateUsps}-${district}`,
        chamberKey: "us-house",
        stateUsps,
        district,
        senateClass: null,
      });
    }
  }
  for (const stateUsps of [...US_STATE_USPS].sort()) {
    const classes = SENATE_CLASSES_BY_STATE[stateUsps];
    if (!classes) throw new Error(`No Senate classes for ${stateUsps}.`);
    for (const senateClass of classes) {
      seats.push({
        seatKey: `us-senate:${stateUsps}:class-${senateClass}`,
        chamberKey: "us-senate",
        stateUsps,
        district: null,
        senateClass,
      });
    }
  }
  seatCache = seats;
  return seats;
}

export interface SeatTermWindow {
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate;
  readonly years: number;
}

/** The term in progress on a date for a seat, from the references above. */
export function seatTermWindow(
  seat: CongressSeat,
  onDate: IsoDate,
): SeatTermWindow {
  const reference =
    TERM_REFERENCE[
      seat.chamberKey === "us-house"
        ? "us-house"
        : `us-senate:${seat.senateClass}`
    ]!;
  const monthDay = reference.referenceStart.slice(4);
  const referenceYear = Number(reference.referenceStart.slice(0, 4));
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    referenceYear +
    Math.floor((onYear - referenceYear) / reference.years) * reference.years;
  if (`${startYear}${monthDay}` > onDate) startYear -= reference.years;
  return {
    startsAt: makeIsoDate(`${startYear}${monthDay}`),
    endExclusive: makeIsoDate(`${startYear + reference.years}${monthDay}`),
    years: reference.years,
  };
}
