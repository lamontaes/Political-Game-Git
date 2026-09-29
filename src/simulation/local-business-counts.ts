import {
  COUNTY_BUSINESS_ROWS,
  LOCAL_BUSINESS_COUNTS_META,
  LOCAL_BUSINESS_COUNT_KINDS,
  SALES_PER_EMPLOYEE_ROWS,
  STATE_BUSINESS_ROWS,
} from "./local-business-counts.generated";
import { countyLandSharesForPlace } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import { placePopulation } from "./nationwide-world/place-population";
import type { EntityId } from "./types";

export { LOCAL_BUSINESS_COUNTS_META, LOCAL_BUSINESS_COUNT_KINDS };

/**
 * The businesses a town really has, from published counts.
 *
 * A town's businesses of one kind are its share of the county's
 * establishments of that kind, by population: the county's establishments per
 * resident (County Business Patterns 2023, with the Bureau of Economic
 * Analysis's 2024 county population) times the town's own population (the
 * Census Bureau's Vintage 2025 estimate). A town in several counties takes
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

/**
 * The town's businesses by kind, or null when the town's population is not
 * held (unknown is unknown; the caller keeps its marked placeholder).
 */
export function localBusinessSupplyFor(
  jurisdictionId: EntityId | null,
): readonly LocalBusinessSupply[] | null {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const geoid = place?.sourceGeoid ?? null;
  const population = geoid ? placePopulation(geoid) : null;
  if (!geoid || population === null || population <= 0) return null;
  const parts = countyLandSharesForPlace(geoid);
  const stateFips = geoid.slice(0, 2);
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
    };
  });
}
