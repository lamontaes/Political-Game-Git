import {
  COUNTY_BUSINESS_ROWS,
  LOCAL_BUSINESS_COUNTS_META,
  LOCAL_BUSINESS_COUNT_KINDS,
  SALES_PER_EMPLOYEE_ROWS,
  STATE_BUSINESS_ROWS,
} from "./local-business-counts.generated";
import { countyLandSharesForPlace } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import { placeReferencePopulation } from "./nationwide-world/place-population";
import { NATIONAL_PLACES_ROWS } from "./national-places.generated";
import {
  PLACE_COUNTY_RELATIONS_META,
  PLACE_COUNTY_RELATIONS_ROWS,
} from "./place-county-relations.generated";
import type { EntityId } from "./types";

export { LOCAL_BUSINESS_COUNTS_META, LOCAL_BUSINESS_COUNT_KINDS };

/**
 * The businesses a town really has, from published counts.
 *
 * A town's businesses of one kind are its share of the county's
 * establishments of that kind, by population: the county's establishments per
 * resident (County Business Patterns 2023, with the Bureau of Economic
 * Analysis's 2024 county population) times the town's own population (the
 * Census Bureau's Vintage 2025 estimate, or the 2020-2024 American Community
 * Survey count for a census-designated town that has no estimate). A town in several counties takes
 * each county's rate for the share of its land in that county. A county with
 * no County Business Patterns rows, or whose population the Bureau does not
 * give, takes its state's rate; a place in no state we hold takes the nation's.
 * The number is a fraction (an expectation), and the caller decides how many
 * to seat.
 *
 * Staff are the county's employees per establishment for the kind (the same
 * file; the Census Bureau adds noise to the employee counts of small cells),
 * and sales are the state's sales per employee (2022 Economic Census), else
 * the nation's.
 */
export interface LocalBusinessSupply {
  readonly kind: string;
  /** Establishments of this kind the town has, before any rounding. */
  readonly expected: number;
  /** Employees per establishment; at least one. */
  readonly staffPerBusiness: number;
  /** Annual sales in dollars for each employee. */
  readonly salesPerEmployeeDollars: number;
  /** The geography the rate came from, for the largest part of the town. */
  readonly basis: "county" | "state" | "nation";
  /** ESTIMATED projection from published rates, never an observed local count. */
  readonly estimateBasis: string;
}

const KIND_COUNT = LOCAL_BUSINESS_COUNT_KINDS.length;

interface Counts {
  readonly population: number;
  readonly establishments: readonly number[];
  readonly employees: readonly number[];
}

function parseCounts(rows: string): ReadonlyMap<string, Counts> {
  const map = new Map<string, Counts>();
  for (const row of rows.split(";")) {
    const colon = row.indexOf(":");
    const numbers = row
      .slice(colon + 1)
      .split(",")
      .map(Number);
    const establishments: number[] = [];
    const employees: number[] = [];
    for (let kind = 0; kind < KIND_COUNT; kind += 1) {
      establishments.push(numbers[1 + kind * 2]!);
      employees.push(numbers[2 + kind * 2]!);
    }
    map.set(row.slice(0, colon), {
      population: numbers[0]!,
      establishments,
      employees,
    });
  }
  return map;
}

let counties: ReadonlyMap<string, Counts> | null = null;
let states: ReadonlyMap<string, Counts> | null = null;
let sales: ReadonlyMap<string, readonly number[]> | null = null;

function countyCounts(): ReadonlyMap<string, Counts> {
  return (counties ??= parseCounts(COUNTY_BUSINESS_ROWS));
}
function stateCounts(): ReadonlyMap<string, Counts> {
  return (states ??= parseCounts(STATE_BUSINESS_ROWS));
}
function salesPerEmployee(): ReadonlyMap<string, readonly number[]> {
  if (sales) return sales;
  const map = new Map<string, readonly number[]>();
  for (const row of SALES_PER_EMPLOYEE_ROWS.split(";")) {
    const colon = row.indexOf(":");
    map.set(
      row.slice(0, colon),
      row
        .slice(colon + 1)
        .split(",")
        .map(Number),
    );
  }
  return (sales = map);
}

/** A rate the table gives for a county, else the state's, else the nation's. */
function rateFor(
  countyGeoid: string,
  kind: number,
): { perPerson: number; staff: number; basis: LocalBusinessSupply["basis"] } {
  const county = countyCounts().get(countyGeoid);
  if (county && county.population > 0) {
    const establishments = county.establishments[kind]!;
    return {
      perPerson: establishments / county.population,
      staff:
        establishments > 0 ? county.employees[kind]! / establishments : NaN,
      basis: "county",
    };
  }
  const state = stateCounts().get(countyGeoid.slice(0, 2));
  return state && state.population > 0
    ? stateRate(state, kind, "state")
    : stateRate(stateCounts().get("US")!, kind, "nation");
}

function stateRate(
  counts: Counts,
  kind: number,
  basis: LocalBusinessSupply["basis"],
) {
  const establishments = counts.establishments[kind]!;
  return {
    perPerson: establishments / counts.population,
    staff: establishments > 0 ? counts.employees[kind]! / establishments : NaN,
    basis,
  };
}

let populationTotals: ReadonlyMap<string, number> | null = null;
let populationMeans: ReadonlyMap<
  string,
  { population: number; places: number; stateFips: string }
> | null = null;

/** Recorded 2020 county-part totals and arithmetic means of real populated places. */
function populationBasis(
  place: NonNullable<ReturnType<typeof lifePlaceByJurisdictionId>>,
) {
  const geoid = place.sourceGeoid;
  const reference = geoid ? placeReferencePopulation(geoid) : null;
  if (reference && reference.value > 0)
    return {
      value: reference.value,
      stateFips: geoid!.slice(0, 2),
      note: reference.source,
    };
  if (!populationTotals) {
    const totals = new Map<string, number>();
    for (const [key, , , population] of JSON.parse(
      PLACE_COUNTY_RELATIONS_ROWS,
    ) as [string, string, number, number][])
      totals.set(key, (totals.get(key) ?? 0) + population);
    populationTotals = totals;
  }
  const historical = geoid ? populationTotals.get(geoid) : undefined;
  if (historical !== undefined && historical > 0)
    return {
      value: historical,
      stateFips: geoid!.slice(0, 2),
      note: `Census POP100 county-part total, ${PLACE_COUNTY_RELATIONS_META.geographyAsOf}`,
    };
  if (!populationMeans) {
    const means = new Map<
      string,
      { population: number; places: number; stateFips: string }
    >();
    for (const [key, , usps] of JSON.parse(NATIONAL_PLACES_ROWS) as [
      string,
      string,
      string,
    ][]) {
      const reference = placeReferencePopulation(key);
      const value =
        reference && reference.value > 0
          ? reference.value
          : populationTotals.get(key);
      if (value === undefined || value <= 0) continue;
      for (const region of [usps, "US"]) {
        const prior = means.get(region) ?? {
          population: 0,
          places: 0,
          stateFips: key.slice(0, 2),
        };
        means.set(region, {
          population: prior.population + value,
          places: prior.places + 1,
          stateFips: prior.stateFips,
        });
      }
    }
    populationMeans = means;
  }
  const region = place.stateJurisdictionKey?.replace(/^US-/, "") ?? "US";
  const regional = populationMeans.get(region);
  const mean = regional ?? populationMeans.get("US")!;
  return {
    value: mean.population / mean.places,
    stateFips: regional ? mean.stateFips : "US",
    note: `ESTIMATED FROM AVERAGE: ${regional ? region : "national"} mean of ${mean.places} real populated Census places (${mean.population} residents / ${mean.places} places); basis uses those listed places because this place has no positive population row`,
  };
}

/** The town's estimated businesses from recorded regional rates and population. */
export function localBusinessSupplyFor(
  jurisdictionId: EntityId | null,
): readonly LocalBusinessSupply[] | null {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  if (!place) return null;
  const geoid = place.sourceGeoid;
  const populationSource = populationBasis(place);
  const population = populationSource.value;
  const parts = geoid ? countyLandSharesForPlace(geoid) : [];
  const stateFips = populationSource.stateFips;
  const nation = stateCounts().get("US")!;
  const sale = salesPerEmployee();
  const stateSales = sale.get(stateFips);
  const nationSales = sale.get("US")!;
  return LOCAL_BUSINESS_COUNT_KINDS.map((kind, index) => {
    const sources = parts.length
      ? parts.map(
          ([countyGeoid, share]) =>
            [rateFor(countyGeoid, index), share] as const,
        )
      : [
          [
            stateCounts().get(stateFips)
              ? stateRate(stateCounts().get(stateFips)!, index, "state")
              : stateRate(nation, index, "nation"),
            1,
          ] as const,
        ];
    let expected = 0;
    let staffWeight = 0;
    let staffTotal = 0;
    for (const [rate, share] of sources) {
      expected += population * share * rate.perPerson;
      if (Number.isFinite(rate.staff)) {
        staffWeight += share * rate.perPerson;
        staffTotal += share * rate.perPerson * rate.staff;
      }
    }
    const nationStaff =
      nation.establishments[index]! > 0
        ? nation.employees[index]! / nation.establishments[index]!
        : 1;
    const staff = staffWeight > 0 ? staffTotal / staffWeight : nationStaff;
    const perEmployee =
      stateSales && stateSales[index]! > 0
        ? stateSales[index]!
        : nationSales[index]!;
    return {
      kind,
      expected,
      staffPerBusiness: Math.max(1, staff),
      salesPerEmployeeDollars: perEmployee,
      basis: sources[0]![0].basis,
      estimateBasis: `ESTIMATED FROM AVERAGE: CBP 2023 establishments per resident (${sources[0]![0].basis}), scaled by ${populationSource.note} population ${population}; staff from ${staffWeight > 0 ? "weighted geographic" : "national"} CBP employees/establishment; sales from Economic Census 2022 receipts/employee (${stateSales && stateSales[index]! > 0 ? "state" : "nation"}).`,
    };
  });
}
