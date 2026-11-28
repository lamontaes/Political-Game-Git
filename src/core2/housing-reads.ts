/**
 * The housing market's front door for reads: a household's tenure and its
 * housing-status row, a place's rental stock and its latest homeless count,
 * and the eviction cases. Each function answers one question; none returns a
 * table. The ids are written here (the engines' own files name the same
 * strings) so a door reads its table without loading the engine, and a reader
 * outside the homes family does not import the engine's ring.
 */
import type { HousingStatusRow } from "./housing-homeless";
import type { CoreAPI, CoreState } from "./types";

const HOUSING_ID = "housing";
const HOMELESS_COUNT_ID = "core2-homeless-count-v1";

const housing = (api: CoreAPI) => api.moduleState(HOUSING_ID);
const kept = (api: CoreAPI, id: string) =>
  (api.state as CoreState).modules.has(id);

/**
 * Whether a household owns or rents its home, from its dwelling record, and
 * for a renter the rent it pays (the dwelling's, else its lease's); undefined
 * with no dwelling.
 */
export function dwellingTenure(
  api: CoreAPI,
  householdId: string,
):
  { tenure: "own" | "rent"; recordId: string; rentMinor?: number } | undefined {
  if (!kept(api, HOUSING_ID)) return undefined;
  const recordId = `dwelling:${householdId}`;
  const row = housing(api).table("dwellings").get(recordId) as
    { tenure?: string; rentMinor?: number } | undefined;
  if (row?.tenure === "own") return { tenure: "own", recordId };
  if (row?.tenure !== "rent") return undefined;
  const rentMinor =
    row.rentMinor ??
    (api.state as CoreState).finance.contracts.get(`lease:${householdId}`)
      ?.amountMinor;
  return { tenure: "rent", recordId, ...(rentMinor ? { rentMinor } : {}) };
}

/** A household's housing-status row (it is housed when there is none), where the housing engine keeps one. */
export function householdStatusRow(
  api: CoreAPI,
  householdId: string,
): HousingStatusRow | undefined {
  if (!kept(api, HOUSING_ID)) return undefined;
  return housing(api).table("statuses").get(householdId) as unknown as
    HousingStatusRow | undefined;
}

/** One household's mortgage as the housing engine keeps it. */
export interface MortgageRow {
  readonly id: string;
  readonly holderId: string;
  readonly householdId: string;
  readonly balanceMinor: number;
  readonly monthsLeft: number;
  readonly foreclosedAt?: string;
}

/** Every mortgage the housing engine keeps, named and counted households alike; none before the engine has opened its table. */
export function allMortgageRows(api: CoreAPI): readonly MortgageRow[] {
  if (!kept(api, HOUSING_ID)) return [];
  return housing(api).table("mortgages").rows() as unknown as MortgageRow[];
}

/** A place's rental stock as the housing engine keeps it (units, and how many of them are vacant). */
export interface HousingStockRow {
  readonly id: string;
  readonly placeId: string;
  readonly rentalUnits: number;
  readonly vacantRental: number;
}

/** One place's housing stock, if the engine keeps it. */
export function housingStockOf(
  api: CoreAPI,
  placeId: string,
): HousingStockRow | undefined {
  if (!kept(api, HOUSING_ID)) return undefined;
  return housing(api).table("stock").get(`stock:${placeId}`) as unknown as
    HousingStockRow | undefined;
}

/** An eviction case with each dated step and the law it followed (the housing engine's case record). */
export interface EvictionCaseRow {
  readonly id: string;
  readonly householdId: string;
  readonly judgmentAt?: string;
  readonly removedAt?: string;
  readonly [field: string]: unknown;
}

/** Every eviction case the housing engine keeps, open and closed. */
export function evictionCases(api: CoreAPI): readonly EvictionCaseRow[] {
  if (!kept(api, HOUSING_ID)) return [];
  return housing(api).table("cases").rows() as unknown as EvictionCaseRow[];
}

/** The latest count of people without a home at a place, if the homeless count has counted it. */
export function homelessCountOf(
  api: CoreAPI,
  placeId: string,
): number | undefined {
  if (!kept(api, HOMELESS_COUNT_ID)) return undefined;
  return (
    api.moduleState(HOMELESS_COUNT_ID).table("counts").get(placeId) as
      { homeless: number } | undefined
  )?.homeless;
}

export const DWELLINGS_KEY = "housingDwellings";

/** Each town home's tenure as the opening wrote it (`withHousing`), by household id; empty before it. */
export function openingTenureOf(world: {
  readonly placeMetadata?: Readonly<Record<string, string>>;
}): ReadonlyMap<string, "own" | "rent"> {
  const rows = JSON.parse(world.placeMetadata?.[DWELLINGS_KEY] ?? "[]") as [
    string,
    string,
  ][];
  const tenure = new Map<string, "own" | "rent">();
  for (const [id, kind] of rows)
    if (kind === "own" || kind === "rent") tenure.set(id, kind);
  return tenure;
}
