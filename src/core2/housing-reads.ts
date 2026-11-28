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
import { residentsRuntime } from "./residents-reads";
import type { TownHousingFigures } from "./modules/housing";
import { homeValueToday } from "./housing-price-level";
import { MORTGAGE_PREFIX } from "./housing-mortgages";

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

export const HOUSING_MODULE_ID = "housing";

export const core = (api: CoreAPI) => api.state as CoreState;

/** A counted household's record in the groups' store, by household id (never built as a person record). */
export function countedHousehold(c: CoreState, householdId: string) {
  const store = residentsRuntime(c)?.store;
  const at = store?.householdOf.get(householdId);
  const h = at === undefined ? undefined : store!.households[at];
  return h && !h.gone ? h : undefined;
}

export const median = (values: number[]) => {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
};

/**
 * Each requested place's rents (a renting household's lease while it runs,
 * else the rent on its dwelling) and the renting households they stand for:
 * a counted household counts as many as its weight says.
 */
export function collectRents(
  api: CoreAPI,
  places: ReadonlyMap<string, { rents: number[]; renters: number }>,
): void {
  const c = core(api),
    residents = residentsRuntime(c);
  for (const row of housing(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    rentMinor?: number;
  }[]) {
    if (row.tenure !== "rent") continue;
    const at =
      c.households.get(row.householdId)?.placeId ??
      countedHousehold(c, row.householdId)?.placeId;
    const place = at === undefined ? undefined : places.get(at);
    if (!place) continue;
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    place.rents.push(
      lease && !lease.endedAt ? lease.amountMinor : (row.rentMinor ?? 0),
    );
    const counted = residents?.store.householdOf.get(row.householdId);
    place.renters +=
      counted === undefined
        ? 1
        : residents!.store.weightOf(residents!.store.households[counted]!);
  }
}

/** Read the requested places together without rescanning every dwelling for each place. */
export function townFiguresByPlace(
  api: CoreAPI,
  placeIds: ReadonlySet<string>,
): Map<string, TownHousingFigures> {
  const grouped = new Map(
    [...placeIds].map((id) => [
      id,
      {
        values: [] as number[],
        rents: [] as number[],
        // The renting households these rents stand for: a counted household
        // counts as many as its weight says.
        renters: 0,
      },
    ]),
  );
  if (!grouped.size) return new Map();
  const homes = ownedHomes(
    api,
    placeIds.size === 1 ? placeIds.values().next().value : undefined,
  );
  for (const row of homes)
    grouped.get(row.placeId)?.values.push(row.valueMinor);
  collectRents(api, grouped);
  const pay = townPayByPlace(api, placeIds);
  return new Map(
    [...grouped].map(([id, row]) => [
      id,
      {
        homeValueMinor: median(row.values),
        rentMinor: median(row.rents),
        monthlyPayMinor: pay.get(id) ?? 0,
        renters: row.renters,
      },
    ]),
  );
}

/** Each place's median monthly pay at the jobs its firms hold. */
export function townPayByPlace(
  api: CoreAPI,
  placeIds: ReadonlySet<string>,
): Map<string, number> {
  const c = core(api);
  const pay = new Map<string, number[]>([...placeIds].map((id) => [id, []]));
  const days = api.parameter("jobsDaysPerYear"),
    months = api.parameter("macroMonthsPerYear");
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const at = c.organizations.get(job.organizationId)?.placeId;
    if (at !== undefined)
      pay.get(at)?.push((job.wageDailyMinor * days) / months);
  }
  return new Map([...pay].map(([id, rows]) => [id, median(rows)]));
}

/** Owned homes for property tax (OPUS-GOV): each owner household's place and the home's value today. */
export function ownedHomes(
  api: CoreAPI,
  atPlaceId?: string,
): { householdId: string; placeId: string; valueMinor: number }[] {
  const c = api.state as CoreState;
  if (!c.modules.has(HOUSING_MODULE_ID)) return [];
  const out: { householdId: string; placeId: string; valueMinor: number }[] =
    [];
  for (const row of housing(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    valueMinor?: number;
    priceLevel?: number;
  }[]) {
    if (row.tenure !== "own" || !row.valueMinor) continue;
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      countedHousehold(c, row.householdId)?.placeId;
    if (!placeId || (atPlaceId !== undefined && placeId !== atPlaceId))
      continue;
    // The one value rule: the value when valued times the place's level now
    // over its level then (an opening home, the opening's level).
    out.push({
      householdId: row.householdId,
      placeId,
      valueMinor: homeValueToday(api, placeId, row.valueMinor, row.priceLevel),
    });
  }
  return out;
}

/**
 * The day a household began living in its present home, where it changed
 * homes in play (rented again after an eviction, bought a house): the
 * record's own date. Undefined for the home it opened in, whose date the
 * past moves hold, so a reader (voter registration) takes the address as
 * changed only by a move on record.
 */
export function dwellingMovedIn(
  api: CoreAPI,
  householdId: string,
): string | undefined {
  if (!(api.state as CoreState).modules.has(HOUSING_MODULE_ID))
    return undefined;
  const row = housing(api).table("dwellings").get(`dwelling:${householdId}`) as
    { since?: string; basis?: string } | undefined;
  return row?.basis && row.basis !== "opening" ? row.since : undefined;
}

/** The kind of home a household lives in (house, rowhouse, apartment, mobile-home, farmhouse), for the home picture. */
export function dwellingKind(
  api: CoreAPI,
  householdId: string,
): string | undefined {
  if (!(api.state as CoreState).modules.has(HOUSING_MODULE_ID))
    return undefined;
  return (
    housing(api).table("dwellings").get(`dwelling:${householdId}`) as
      { kind?: string } | undefined
  )?.kind;
}

/**
 * What a household pays a day for its home through the housing engine (its
 * lease or its mortgage), each living member's share; zero for a household
 * the housing engine does not charge.
 */
export function homePaidDailyMinor(api: CoreAPI, householdId: string): number {
  const state = api.state as CoreState;
  const members =
    state.households
      .get(householdId)
      ?.memberIds.filter((id) => state.people.get(id)?.alive).length ?? 0;
  if (!members) return 0;
  for (const id of [
    `lease:${householdId}`,
    `${MORTGAGE_PREFIX}${householdId}`,
  ]) {
    const home = state.finance.contracts.get(id);
    if (!home || home.endedAt || home.amountMinor <= 0) continue;
    return (
      (home.amountMinor / Math.max(home.periodMonths, 1)) *
      (api.parameter("monthsPerYear") / api.parameter("daysPerMeanYear")) *
      (1 / members)
    );
  }
  return 0;
}
