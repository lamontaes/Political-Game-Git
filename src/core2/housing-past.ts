/**
 * Housing before the start (owner, Nov 13, 2026: "it's simulated... things
 * need to be simulated in order to make your modern day make sense"; Oct 27:
 * "The engines run the years before Start"). The housing engine's own rules
 * run over the world's coarse window, after the people and moves passes, so
 * day one's leases, rents and home values have a past:
 *
 * - Each household's tenancy began on one date: a full household's latest
 *   move record (the moves pass), a counted renter's years in place (the
 *   opening's `since`), a counted owner's purchase year (the opening's ACS
 *   B25038 draw the mortgages read). The household's `since` and its
 *   dwelling's are set to it, so a household has one past.
 * - Rents run forward: the town's market rent moves with pay (the economy
 *   pass's months, the renewal rule's pay ratio), its level set once per
 *   place so the median rent paid on day one is the opening's sourced median.
 *   A lease signs at the market rent then and renews on each anniversary of
 *   its signing month; day one's rent is the rent its last renewal set.
 * - Home values follow this world's price level from each purchase
 *   (`pastPriceRatio`: the housing engine's monthly price step run from the
 *   economy's months, the path play continues and the mortgages read). A
 *   full owner's mortgage is restated from the year its move record says it
 *   bought.
 * - Each place's typical rent and home value, at every step and each
 *   December, are kept as history and as the registry's year rows, so
 *   Metrics reads last year on day one as it does from month 13 on.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import { tenants } from "./housing-occupancy";
import { pastPriceRatio } from "./housing-price-path";
import {
  MORTGAGE_PREFIX,
  mortgageFrom,
  type MortgageTerms,
} from "./housing-mortgages";
import { residentsRuntime } from "./modules/residents";
import { setResidentFlowAmount } from "./residents-economy";
import { putPastYear } from "./output-numbers";
import {
  coarseSteps,
  PERSON_MOVED_IN,
  PERSON_MOVED_WITHIN,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  type HistoryRecord,
  type HistoryWriter,
  type PreStartWindow,
} from "./past-module";
import type {
  CoreAPI,
  CoreState,
  HouseholdInput,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "./types";

export const LEASE_SIGNED = "housing.lease-signed";
export const HOME_BOUGHT = "housing.home-bought";
export const TOWN_FIGURES = "housing.town-figures";

const MODULE = "housing";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(MODULE).table(name);

const SOURCE = (asOf: string, estimatedFrom: string): Source => ({
  tag: "ESTIMATED",
  asOf,
  citation:
    "The housing engine's own rules run before the start: the renewal rule's pay ratio (BLS average hourly earnings, the economy pass's months), this world's home price level (the housing engine's price step run on the economy's months, pastPriceRatio) and each household's move or purchase records.",
  estimatedFrom,
});

/** The same median the town's figures read (`townFigures`): the middle of the positive values. */
function median(values: number[]): number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
}

const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

/** The latest anniversary of a lease signed on `signed` at or before `on` (the first of its month). */
export function lastRenewalOn(signed: string, on: string): string {
  const month = signed.slice(5, 7);
  let year = Number(on.slice(0, 4));
  if (`${year}-${month}-01` > on) year -= 1;
  const at = `${year}-${month}-01`;
  return at < firstOfMonth(signed) ? firstOfMonth(signed) : at;
}

/** The economy pass's pay on a day: the latest month at or before it that has pay, else the earliest. */
function paySeries(history: HistoryWriter) {
  const rows = history
    .read({ kind: "economy.conditions" })
    .filter((row) => typeof row.facts.hourlyEarnings === "number")
    .sort((a, b) => a.date.localeCompare(b.date));
  return (date: string): { pay: number; recordId: string } | undefined => {
    let low = 0,
      high = rows.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (rows[mid]!.date <= date) low = mid + 1;
      else high = mid;
    }
    const row = rows[low - 1] ?? rows[0];
    return row
      ? { pay: Number(row.facts.hourlyEarnings), recordId: row.id }
      : undefined;
  };
}

interface Home {
  householdId: string;
  placeId: string;
  tier: "full" | "counted";
  household: HouseholdInput | undefined;
  memberIds: readonly string[];
  /** The day this tenancy began (may be before the window). */
  since: string;
}

interface Lease extends Home {
  leaseId: string;
  /** The rent the opening gave this household (its share of the sourced median). */
  openingRentMinor: number;
}

interface Owned extends Home {
  valueMinor: number;
  usps: string;
}

/** Each person's latest move into or within the county, from the moves pass's records. */
function latestMoves(rows: readonly HistoryRecord[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (row.kind !== PERSON_MOVED_IN && row.kind !== PERSON_MOVED_WITHIN)
      continue;
    for (const id of row.personIds ?? []) {
      const held = latest.get(id);
      if (!held || row.date > held) latest.set(id, row.date);
    }
  }
  return latest;
}

/**
 * The day a full household's tenancy began: its members' latest move record,
 * else it has lived there since before the window (the earlier of its years
 * in place and the day before the window).
 */
function fullSince(
  moves: ReadonlyMap<string, string>,
  memberIds: readonly string[],
  household: HouseholdInput | undefined,
  from: string,
): string {
  let moved: string | undefined;
  for (const id of memberIds) {
    const date = moves.get(id);
    if (date && (!moved || date > moved)) moved = date;
  }
  if (moved) return moved;
  const held = household?.since;
  return held && held < from ? held : addDays(makeIsoDate(from), -1);
}

/** A counted household's record in the residents store, by id. */
function countedOf(core: CoreState, householdId: string) {
  const store = residentsRuntime(core)?.store;
  const at = store?.householdOf.get(householdId);
  return at === undefined ? undefined : store!.households[at];
}

/** The household's one past: its `since` and its dwelling's are the tenancy's start. */
function setSince(api: CoreAPI, home: Home): void {
  const since = makeIsoDate(home.since);
  if (home.household) (home.household as { since?: IsoDate }).since = since;
  const counted = countedOf(api.state as CoreState, home.householdId);
  if (counted) counted.since = since;
  const dwelling = table(api, "dwellings").get(`dwelling:${home.householdId}`);
  if (dwelling)
    table(api, "dwellings").put({ ...dwelling, since: home.since } as never);
}

/**
 * A full owner whose move record dates its purchase differently from the
 * opening's drawn year: the mortgage is the one formula again from that year
 * (price then, rate then, payments since), or ends where it would be paid.
 */
function restateMortgage(
  api: CoreAPI,
  home: Owned,
  boughtYear: number,
  oldest: number,
): { from: number; to: number } | undefined {
  const id = `${MORTGAGE_PREFIX}${home.householdId}`;
  const terms = table(api, "mortgages").get(id) as unknown as
    (MortgageTerms & { id: string }) | undefined;
  if (!terms || terms.boughtYear === boughtYear) return undefined;
  const c = api.state as CoreState;
  const loan = mortgageFrom(
    { oldest, valueMinor: home.valueMinor },
    boughtYear,
    {
      usps: home.usps,
      startedAt: c.date,
      seed: c.seed,
      p: (key) => api.parameter(key),
    },
  );
  const months = api.parameter("macroMonthsPerYear"),
    termMonths = api.parameter("housingMortgageTermYears") * months;
  if (!loan) {
    if (c.finance.contracts.get(id)) api.endStandingContract(id);
    table(api, "mortgages").remove(id);
    return { from: terms.boughtYear, to: boughtYear };
  }
  table(api, "mortgages").put({
    ...terms,
    boughtYear,
    rate: loan.rate,
    originalMinor: Math.round(loan.original),
    balanceMinor: loan.balance,
    paymentMinor: loan.payment,
    monthsLeft: termMonths - loan.paid,
  } as never);
  if (c.finance.contracts.get(id))
    api.setStandingContractAmount(id, loan.payment);
  return { from: terms.boughtYear, to: boughtYear };
}

function restatedFacts(
  restated: readonly { householdId: string; from: number }[],
  householdId: string,
): Record<string, number> {
  const change = restated.find((row) => row.householdId === householdId);
  return change ? { mortgageRestatedFromYear: change.from } : {};
}

/** The pre-start pass. Runs in housing's government-phase run, after `openHousing`. */
export function housingPast(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
  homeBought: Readonly<Record<string, number>>,
): void {
  const c = api.state as CoreState;
  const payOn = paySeries(history);
  const now = payOn(window.through);
  if (!now) return;
  // stopgapId: SG-HIST-housing-past-todays-households
  api.stopgap("SG-HIST-housing-past-todays-households");
  const from = window.from;
  const moves = latestMoves([
    ...history.read({ kind: PERSON_MOVED_IN }),
    ...history.read({ kind: PERSON_MOVED_WITHIN }),
  ]);
  const rowDate = (date: string) => (date < from ? from : date);
  // A tenancy dated on day one itself (no years in place yet) began the day before.
  const before = (date: string) =>
    date > window.through ? window.through : date;

  // Renters, both tiers, as the renewal rule reads them.
  const affordable = table(api, "affordable");
  const leases: Lease[] = [];
  for (const tenant of tenants(api)) {
    if (affordable.get(tenant.id)) continue;
    const household = c.households.get(tenant.id);
    const counted = tenant.tier === "counted";
    leases.push({
      householdId: tenant.id,
      placeId: tenant.placeId,
      tier: tenant.tier,
      household,
      memberIds: tenant.memberIds,
      leaseId: tenant.leaseId,
      openingRentMinor: tenant.rentMinor,
      since: before(
        counted
          ? (countedOf(c, tenant.id)?.since ?? addDays(makeIsoDate(from), -1))
          : fullSince(moves, tenant.memberIds, household, from),
      ),
    });
  }

  // Owners, both tiers, from the dwellings the opening wrote.
  const owned: Owned[] = [];
  const restated: { householdId: string; from: number; to: number }[] = [];
  for (const row of table(api, "dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    valueMinor?: number;
    usps?: string;
  }[]) {
    if (row.tenure !== "own" || !row.valueMinor) continue;
    const household = c.households.get(row.householdId);
    const counted = household ? undefined : countedOf(c, row.householdId);
    const placeId = household?.placeId ?? counted?.placeId;
    if (!placeId) continue;
    const memberIds =
      household?.memberIds ??
      residentsRuntime(c)?.store.memberIdsOf(counted!) ??
      [];
    const drawn = homeBought[row.householdId];
    const home: Owned = {
      householdId: row.householdId,
      placeId,
      tier: household ? "full" : "counted",
      household,
      memberIds,
      valueMinor: row.valueMinor,
      usps: row.usps ?? c.placeMetadata?.housingState ?? "",
      since: before(
        household
          ? fullSince(moves, memberIds, household, from)
          : drawn !== undefined
            ? `${drawn}-07-01`
            : (counted?.since ?? addDays(makeIsoDate(from), -1)),
      ),
    };
    owned.push(home);
    if (household) {
      const born = memberIds
        .map((id) => c.people.get(id as PersonId)?.birthDate)
        .filter((date): date is IsoDate => Boolean(date))
        .sort()[0];
      const change = born
        ? restateMortgage(
            api,
            home,
            Number(home.since.slice(0, 4)),
            Number(born.slice(0, 4)),
          )
        : undefined;
      if (change) restated.push({ householdId: home.householdId, ...change });
    }
  }

  // The market level, set once per place: day one's median paid rent is the opening's.
  const share = (lease: Lease, on: string) =>
    payOn(lastRenewalOn(lease.since, on))!.pay / now.pay;
  const level = new Map<string, number>();
  for (const placeId of new Set(leases.map((row) => row.placeId))) {
    const here = leases.filter((row) => row.placeId === placeId);
    const opening = median(here.map((row) => row.openingRentMinor));
    const run = median(
      here.map((row) => row.openingRentMinor * share(row, window.through)),
    );
    level.set(placeId, run > 0 ? opening / run : 1);
  }
  const rentOn = (lease: Lease, on: string) =>
    Math.round(
      lease.openingRentMinor * level.get(lease.placeId)! * share(lease, on),
    );
  const opened = c.date;
  // The level moves every home on one day alike.
  const p = (key: string) => api.parameter(key);
  const ratios = new Map<string, number>();
  const valueOn = (home: Owned, on: string) => {
    let ratio = ratios.get(on);
    if (ratio === undefined) {
      ratio = pastPriceRatio(
        { startedAt: opened, seed: c.seed },
        opened,
        on,
        p,
      );
      ratios.set(on, ratio);
    }
    return Math.round(home.valueMinor * ratio);
  };

  // Each household's tenancy, once; day one's lease is its last renewal's rent.
  for (const lease of leases) {
    setSince(api, lease);
    const signedRent = rentOn(lease, lease.since);
    const rent = rentOn(lease, window.through);
    const renewedAt = lastRenewalOn(lease.since, window.through);
    history.record({
      id: `${LEASE_SIGNED}:${lease.householdId}`,
      date: makeIsoDate(rowDate(lease.since)),
      kind: LEASE_SIGNED,
      placeId: lease.placeId,
      ...(lease.tier === "full"
        ? {
            personIds: lease.memberIds.filter((id) =>
              c.people.has(id as PersonId),
            ) as PersonId[],
          }
        : {}),
      facts: {
        householdId: lease.householdId,
        leaseId: lease.leaseId,
        signedOn: lease.since,
        rentMinor: signedRent,
        renewedAt,
        rentNowMinor: rent,
      },
      publicRecord: false,
      source: SOURCE(
        c.date,
        "Signed at the town's market rent that month; renewed each year since by the change in pay.",
      ),
    });
    if (lease.tier === "full")
      api.setStandingContractAmount(lease.leaseId, rent);
    else setResidentFlowAmount(c, lease.leaseId, rent);
    const dwelling = table(api, "dwellings").get(
      `dwelling:${lease.householdId}`,
    );
    if (dwelling)
      table(api, "dwellings").put({ ...dwelling, rentMinor: rent } as never);
    table(api, "renewals").put({
      id: lease.leaseId,
      householdId: lease.householdId,
      tier: lease.tier,
      renewedAt,
      rentMinor: rent,
      // The pay at that renewal against today's; the first review reads it against the region's pay.
      payShare: share(lease, window.through),
      historyRecordId: `${LEASE_SIGNED}:${lease.householdId}`,
    });
  }
  for (const home of owned) {
    setSince(api, home);
    history.record({
      id: `${HOME_BOUGHT}:${home.householdId}`,
      date: makeIsoDate(rowDate(home.since)),
      kind: HOME_BOUGHT,
      placeId: home.placeId,
      ...(home.tier === "full"
        ? {
            personIds: home.memberIds.filter((id) =>
              c.people.has(id as PersonId),
            ) as PersonId[],
          }
        : {}),
      facts: {
        householdId: home.householdId,
        boughtOn: home.since,
        priceMinor: valueOn(home, home.since),
        valueNowMinor: home.valueMinor,
        ...restatedFacts(restated, home.householdId),
      },
      publicRecord: false,
      source: SOURCE(
        c.date,
        "Bought in the year its records say; valued since by this world's home price level.",
      ),
    });
  }

  // Each place's typical rent and home value at every step, each December and the last day.
  const dates = new Set<string>(coarseSteps(window));
  for (let year = Number(from.slice(0, 4)); ; year += 1) {
    const december = `${year}-12-01`;
    if (december > window.through) break;
    if (december >= from) dates.add(december);
  }
  dates.add(window.through);
  const places = new Set([
    ...leases.map((row) => row.placeId),
    ...owned.map((row) => row.placeId),
  ]);
  const startYear = Number(c.date.slice(0, 4));
  for (const placeId of places) {
    const rented = leases.filter((row) => row.placeId === placeId);
    const homes = owned.filter((row) => row.placeId === placeId);
    const latest = new Map<
      number,
      { date: string; id: string; rent: number; value: number }
    >();
    for (const date of [...dates].sort()) {
      const renting = rented.filter((row) => row.since <= date);
      const owning = homes.filter((row) => row.since <= date);
      const rent = median(renting.map((row) => rentOn(row, date)));
      const value = median(owning.map((row) => valueOn(row, date)));
      const id = `${TOWN_FIGURES}:${placeId}:${date}`;
      history.record({
        id,
        date: makeIsoDate(date),
        kind: TOWN_FIGURES,
        placeId,
        facts: {
          medianRentMinor: rent,
          medianHomeValueMinor: value,
          // The market level the pass set once for the place, before any rent was run.
          marketLevel: level.get(placeId) ?? 1,
          renters: renting.length,
          owners: owning.length,
          payRecordId: payOn(date)!.recordId,
        },
        publicRecord: false,
        source: SOURCE(
          c.date,
          "The middle rent of the leases running that day and the middle value of the homes owned then, among the households living in the town on day one.",
        ),
      });
      latest.set(Number(date.slice(0, 4)), { date, id, rent, value });
    }
    // The year's last reading is its December (the registry's fold); the last day is day one's.
    for (const [year, row] of latest)
      putPastYear(api, {
        placeId,
        year,
        date: row.date,
        closed: year < startYear,
        recordId: row.id,
        values: {
          "housing.typical-rent": row.rent,
          "housing.home-prices": row.value,
        },
      });
  }
}

/** The history's tenancy rows by id, read once per world (a fill-in looks its household up, never the whole history). */
const tenancies = new WeakMap<CoreState, Map<string, HistoryRecord>>();
function tenancyRows(core: CoreState): Map<string, HistoryRecord> {
  let rows = tenancies.get(core);
  if (!rows) {
    rows = new Map();
    for (const kind of [LEASE_SIGNED, HOME_BOUGHT])
      for (const row of preStartHistory(core, { kind })) rows.set(row.id, row);
    tenancies.set(core, rows);
  }
  return rows;
}

/**
 * People filled in after the run (a counted household met in play): their
 * own moves were just written (the people engine's later pass), so the
 * household's tenancy row is restated from them, one past.
 */
export function housingPastLater(
  core: CoreState,
  people: readonly PersonState[],
): void {
  const window = preStartWindowOf(core);
  if (!window) return;
  const seen = new Set<string>();
  for (const person of people) {
    const household = core.households.get(person.householdId ?? "");
    if (!household || seen.has(household.id)) continue;
    seen.add(household.id);
    for (const kind of [LEASE_SIGNED, HOME_BOUGHT]) {
      const id = `${kind}:${household.id}`;
      const held = tenancyRows(core).get(id);
      if (!held) continue;
      const since = fullSince(
        latestMoves(
          household.memberIds.flatMap((member) =>
            preStartHistory(core, { personId: member }),
          ),
        ),
        household.memberIds,
        household,
        window.from,
      );
      if (since === held.facts[kind === LEASE_SIGNED ? "signedOn" : "boughtOn"])
        continue;
      const date = since < window.from ? window.from : since;
      recordPreStartLater(
        core,
        MODULE,
        [
          {
            id,
            date: makeIsoDate(date),
            kind,
            placeId: held.placeId,
            personIds: household.memberIds.filter((member) =>
              core.people.has(member),
            ),
            facts: {
              ...held.facts,
              [kind === LEASE_SIGNED ? "signedOn" : "boughtOn"]: since,
              restatedFor: person.id,
            },
            publicRecord: false,
            source: held.source,
          },
        ],
        { person: person.id, drop: [id] },
      );
      tenancyRows(core).set(
        id,
        preStartHistory(core, { kind, personId: person.id }).find(
          (row) => row.id === id,
        ) ?? held,
      );
      (household as { since?: IsoDate }).since = makeIsoDate(since);
    }
  }
}
