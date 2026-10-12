import type { EntityId } from "../../simulation/types";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type { placeReferencePopulation as nativePopulation } from "../../simulation/nationwide-world/place-population";
import type { countyLandSharesForPlace as nativeParts } from "../../simulation/government-units";
import type { LocalBusinessSupply } from "../../simulation/local-business-counts";
export interface BusinessSupplyFacts {
  readonly kinds: readonly string[];
  readonly countyRows: string;
  readonly stateRows: string;
  readonly salesRows: string;
  readonly countyRelationsRows: string;
  readonly nationalPlacesRows: string;
  readonly geographyAsOf: string;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly populations: ReadonlyMap<
    string,
    ReturnType<typeof nativePopulation>
  >;
  readonly landShares: ReadonlyMap<string, ReturnType<typeof nativeParts>>;
}
/** Raw source rows plus separately owned geography/reference-population records. The cache binds to this immutable fact snapshot. */
const readers = new WeakMap<
  BusinessSupplyFacts,
  (id: EntityId | null) => readonly LocalBusinessSupply[] | null
>();
export function localBusinessSupplyFor(
  facts: BusinessSupplyFacts,
  id: EntityId | null,
) {
  let read = readers.get(facts);
  if (!read) {
    read = compileBusinessSupply(facts);
    readers.set(facts, read);
  }
  return read(id);
}
// stopgapId: "economy.source-business-count-estimate"
function compileBusinessSupply(facts: BusinessSupplyFacts) {
  const LOCAL_BUSINESS_COUNT_KINDS = facts.kinds,
    COUNTY_BUSINESS_ROWS = facts.countyRows,
    STATE_BUSINESS_ROWS = facts.stateRows,
    SALES_PER_EMPLOYEE_ROWS = facts.salesRows,
    PLACE_COUNTY_RELATIONS_ROWS = facts.countyRelationsRows,
    NATIONAL_PLACES_ROWS = facts.nationalPlacesRows;
  const PLACE_COUNTY_RELATIONS_META = { geographyAsOf: facts.geographyAsOf };
  const lifePlaceByJurisdictionId = (id: EntityId) =>
    facts.places.get(id) ?? null;
  const placeReferencePopulation = (geoid: string) =>
    facts.populations.get(geoid) ?? null;
  const countyLandSharesForPlace = (geoid: string) =>
    facts.landShares.get(geoid) ?? [];
  interface LocalBusinessSupply {
    readonly kind: string;
    readonly expected: number;
    readonly staffPerBusiness: number;
    readonly salesPerEmployeeDollars: number;
    readonly basis: "county" | "state" | "nation";
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

  function rateFor(
    countyGeoid: string,
    kind: number,
  ): {
    perPerson: number;
    staff: number;
    basis: LocalBusinessSupply["basis"];
  } {
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
      staff:
        establishments > 0 ? counts.employees[kind]! / establishments : NaN,
      basis,
    };
  }

  let populationTotals: ReadonlyMap<string, number> | null = null;

  let populationMeans: ReadonlyMap<
    string,
    {
      population: number;
      places: number;
      stateFips: string;
    }
  > | null = null;

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
        {
          population: number;
          places: number;
          stateFips: string;
        }
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
      note: `ESTIMATED FROM AVERAGE: ${regional ? region : "national"} mean of ${mean.places} real populated Census places (${mean.population} residents / ${mean.places} places); local population/size not recorded`,
    };
  }

  function computeLocalBusinessSupplyFor(
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
  return computeLocalBusinessSupplyFor;
}
