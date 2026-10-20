/**
 * The counted population moves from causes (one model, two tiers; owner,
 * Oct 14, 2026: "if California repealed its state income tax, people would
 * flood in"). Every state and territory holds its people at a coarse grain
 * (age bands, from its BEA population); the town and its neighbors hold
 * theirs as counted groups. Once a month every group weighs every other
 * place: the share of its age that leaves its county in a year (ACS 2024),
 * scaled by each place's pull against home: the after-tax income it offers
 * in real terms (the state income tax in force, the region's prices) to a
 * power, and its unemployment against home's, held back by a home owned and
 * children at home. Nothing is rolled: the expected movers accrue month by
 * month and a whole household moves when one is due, toward the place that
 * pulled hardest. People arrive in the town the same way from every other
 * place. The regional engine reads each state's counts.
 */
import { createStableId, stableHash } from "../kernel/ids";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import stateTax from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import moveRows from "../data/moves/parameters.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import { scheduleTax } from "../tax-withholding";
import { ageOn, type CountedHousehold } from "../counted-groups";
import { openingTemperaments } from "../opening-personality";
import { corePlaceByJurisdictionId } from "../place-lookup";
import { stateFigures, type RegionMonth } from "../regional-model";
import { LAWS_MODULE_ID, lawInForce } from "./laws";
import { REGIONAL_MODULE_ID } from "./regional";
import { webFactorFor, type Subject } from "../outcome-web-reach";
import {
  admitCountedHousehold,
  countedParameter,
  departCountedHousehold,
  householdIncome,
  residentsRuntime,
  townPlaceOf,
  type ResidentsRuntime,
} from "./residents";
import type { ResidentHouseholdRecord } from "../residents";
import type { ModuleRow } from "../module-data";
import { registerWorldMapPart } from "../snapshot";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonInput,
  PlaceId,
  Source,
} from "../types";

export const COUNTED_MOVES_MODULE_ID = "core2-counted-moves-v1";
const TABLE = "moves";
const PULLS_TABLE = "pulls";

/** Coarse age bands and the ACS bands each averages. */
const COARSE = [
  ["under-18", "countedPeopleShareUnder18", ["30-34", "35-39", "40-44"]],
  ["18-29", "countedPeopleShare18to29", ["18-19", "20-24", "25-29"]],
  ["30-44", "countedPeopleShare30to44", ["30-34", "35-39", "40-44"]],
  ["45-64", "countedPeopleShare45to64", ["45-49", "50-54", "55-59", "60-64"]],
  ["65-plus", "countedPeopleShare65plus", ["65-69", "70-74", "75+"]],
] as const;

type Rates = Readonly<Record<string, number>>;
const RATES = moverRates as unknown as {
  ageBands: readonly string[];
  national: { departurePerYearByAge: Rates };
  places: Readonly<Record<string, { departurePerYearByAge: Rates }>>;
};
const STATES = (
  regions as unknown as {
    states: Record<
      string,
      {
        usps: string;
        rppPct: Record<string, number>;
        perCapitaIncome: number | null;
        population: number;
      }
    >;
    nation: { perCapitaIncome: number };
  }
).states;
const NATION_INCOME = (
  regions as unknown as { nation: { perCapitaIncome: number } }
).nation.perCapitaIncome;
const TAX = (
  stateTax as unknown as {
    places: Record<
      string,
      {
        wageIncomeTax: string;
        brackets: { ratePercent: number; overSingle: number }[];
        standardDeductionSingle: number | null;
      }
    >;
  }
).places;
const MOVES = moveRows as unknown as Record<string, { value: number }>;

/** One state's or territory's people at the coarse grain. */
export interface CoarsePlace {
  readonly usps: string;
  readonly fips: string;
  /** People by coarse age band (fractional: counts at this grain are expected values). */
  people: number[];
}

/** A household that moved, with the pull that moved it. */
export interface MoveRecord {
  readonly id: string;
  readonly date: string;
  readonly direction: "out" | "in";
  readonly householdId: string;
  readonly groupId: string;
  readonly fromPlace: string;
  readonly toPlace: string;
  readonly people: number;
  /** The pull toward the place it went, against staying, by cause (log units). */
  readonly reasons: Readonly<Record<string, number>>;
}

interface Runtime {
  states: Map<string, CoarsePlace>;
  townState: string;
  /** People due to leave, by group and destination state. */
  leave: Map<string, number>;
  /** People due to arrive in a place, by origin state and coarse band. */
  arrive: Map<string, number>;
  /** Each state's people at the end of each month (the regional engine reads the change). */
  totals: Map<string, Map<string, number>>;
  /** Normalizes the holds so a place's average leaving rate is the ACS rate. */
  holdNorm: Map<PlaceId, number>;
  serial: number;
  /** After-tax real income by state and wage, for this month (cleared each month). */
  netCache: Map<string, number>;
}
const runtimes = new WeakMap<CoreState, Runtime>();
registerWorldMapPart("core2-counted-moves", runtimes);

function rateFor(usps: string, band: string): number {
  return (
    (RATES.places[`US-${usps}`] ?? RATES.national).departurePerYearByAge[
      band
    ] ??
    RATES.national.departurePerYearByAge[band] ??
    0
  );
}

/** The ACS band a person's age falls in (under 18 move with their parents). */
function acsBand(age: number): string {
  for (let i = RATES.ageBands.length - 1; i >= 0; i--) {
    const band = RATES.ageBands[i]!;
    if (age >= Number(band.replace("+", "").split("-")[0])) return band;
  }
  return "30-34";
}

function coarseRate(usps: string, bands: readonly string[]): number {
  return bands.reduce((n, b) => n + rateFor(usps, b), 0) / bands.length;
}

/** A state's regional price level (nation = 100), latest year. */
function priceLevel(fips: string): number {
  const rpp = STATES[fips]?.rppPct ?? {};
  const year = Object.keys(rpp).sort().pop();
  return year ? rpp[year]! : 100;
}

/** Yearly state income tax on wages in dollars: the town's state from the law in force, others from the 2026 table. */
function stateIncomeTax(
  api: CoreAPI,
  rt: Runtime,
  usps: string,
  wages: number,
): number {
  if (usps === rt.townState && api.state.modules.has(LAWS_MODULE_ID)) {
    let tax = 0;
    for (const level of lawInForce(api, "income-tax").levels) {
      if (level.level !== "state" || level.setAside || !level.row) continue;
      const row = level.row;
      const single = (
        row.terms?.schedules as
          | Record<
              string,
              {
                standardDeduction?: number | null;
                brackets: { over: number; rate: number }[];
              }
            >
          | undefined
      )?.single;
      tax += single
        ? scheduleTax(single, wages)
        : row.unit === "percent-flat" || row.unit === "percent"
          ? (wages * (row.value ?? 0)) / 100
          : 0;
    }
    return tax;
  }
  const row = TAX[`US-${usps}`];
  if (!row || row.wageIncomeTax === "none") return 0;
  return scheduleTax(
    {
      standardDeduction: row.standardDeductionSingle ?? 0,
      brackets: row.brackets.map((b) => ({
        over: b.overSingle,
        rate: b.ratePercent,
      })),
    },
    wages,
  );
}

/** Each state's unemployment rate this month, from the regional engine where it runs. */
function unemployment(api: CoreAPI): Map<string, number> {
  const out = new Map<string, number>();
  if (!api.state.modules.has(REGIONAL_MODULE_ID)) return out;
  const latest = (
    api.moduleState("macro").table("state").get("macro:state") as
      { latestMonth?: string } | undefined
  )?.latestMonth;
  if (!latest) return out;
  const months = api
    .moduleState(REGIONAL_MODULE_ID)
    .table("months")
    .query("byMonth", [latest]) as unknown as RegionMonth[];
  for (const fips of new Set(months.map((row) => row.stateFips)))
    out.set(
      STATES[fips]?.usps ?? fips,
      stateFigures(months, fips).unemploymentPct,
    );
  return out;
}

/** What draws a person with these wages from one state to another, by cause, in log units. */
export function pullBetween(
  api: CoreAPI,
  rt: Runtime,
  from: string,
  to: string,
  wages: number,
  jobless: ReadonlyMap<string, number>,
): Record<string, number> {
  const fipsOf = (usps: string) => rt.states.get(usps)?.fips ?? "";
  const net = (usps: string) => {
    const key = `${usps}|${wages}`;
    let value = rt.netCache.get(key);
    if (value === undefined) {
      value =
        Math.max(1, wages - stateIncomeTax(api, rt, usps, wages)) /
        (priceLevel(fipsOf(usps)) / 100);
      rt.netCache.set(key, value);
    }
    return value;
  };
  const income =
    countedParameter("countedMovesIncomeElasticity") *
    Math.log(net(to) / net(from));
  const here = jobless.get(from),
    there = jobless.get(to);
  const jobs =
    here !== undefined && there !== undefined
      ? countedParameter("countedMovesUnemploymentPull") * (here - there)
      : 0;
  return { income, jobs };
}

const sum = (row: Record<string, number>) =>
  Object.values(row).reduce((n, v) => n + v, 0);

function openCoarse(core: CoreState, rt: Runtime): void {
  for (const [fips, row] of Object.entries(STATES))
    rt.states.set(row.usps, {
      usps: row.usps,
      fips,
      people: COARSE.map(
        ([, share]) => row.population * countedParameter(share),
      ),
    });
  // The town's state holds its counted places in detail: its coarse people are the rest.
  const residents = residentsRuntime(core);
  const home = rt.states.get(rt.townState);
  if (!residents || !home) return;
  const counted = countedPeople(residents);
  const total = home.people.reduce((n, v) => n + v, 0);
  if (total > counted)
    home.people = home.people.map((v) => (v * (total - counted)) / total);
}

function runtimeOf(api: CoreAPI): Runtime | undefined {
  const core = api.state as CoreState;
  let rt = runtimes.get(core);
  if (rt) return rt;
  const town = townPlaceOf(core);
  const key = town
    ? corePlaceByJurisdictionId(town as never)?.stateJurisdictionKey
    : undefined;
  if (!key) return undefined;
  rt = {
    states: new Map(),
    townState: key.slice("US-".length),
    leave: new Map(),
    arrive: new Map(),
    totals: new Map(),
    holdNorm: new Map(),
    serial: 0,
    netCache: new Map(),
  };
  openCoarse(core, rt);
  runtimes.set(core, rt);
  return rt;
}

/** What holds a household in place (log units): a home owned, children at home. */
function holdOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): number {
  let hold = 0;
  if (h.tenure !== "rent") hold += MOVES.movesOwnerHold!.value;
  const children = residents.store
    .countedMembers(h)
    .some((m) => ageOn(residents.store.born[m]!, date) < 18);
  if (children) hold += MOVES.movesChildrenHold!.value;
  return hold;
}

/** A counted household's head's age and wages per adult (the pull is read for them). */
function headOf(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): { age: number; wages: number; adults: number } {
  const store = residents.store;
  let age = 0,
    adults = 0;
  for (const m of store.countedMembers(h)) {
    const a = ageOn(store.born[m]!, date);
    age = Math.max(age, a);
    if (a >= 18) adults++;
  }
  return {
    age,
    adults,
    wages: householdIncome(residents, h) / 100 / Math.max(1, adults),
  };
}

const stateOfPlace = (placeId: string) =>
  corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey?.slice(
    "US-".length,
  );
/**
 * The state a counted household lives in. The town's counted households keep
 * the place id of their governing unit, which the place lookup may not know
 * (a consolidated town, a balance); they are the town's people, in its state.
 */
const homeStateOf = (rt: Pick<Runtime, "townState">, placeId: string) =>
  stateOfPlace(placeId) ?? rt.townState;

function month(api: CoreAPI): void {
  const core = api.state as CoreState;
  const residents = residentsRuntime(core);
  const rt = runtimeOf(api);
  if (!residents || !rt) return;
  const date = api.state.date;
  rt.netCache.clear();
  const jobless = unemployment(api);
  const stateList = [...rt.states.values()];
  const nationPeople = stateList.reduce(
    (n, s) => n + s.people.reduce((a, b) => a + b, 0),
    0,
  );
  const inState = countedParameter("countedMovesInStateShare");
  const store = residents.store;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: date,
    citation:
      "Moves from causes: ACS 2024 county departure rates by age and state; CPS ASEC 2023 in-state share; state income tax in force (the town's) and the 2026 state income tax table (others); BEA regional price parities; the regional engine's unemployment.",
    estimatedFrom:
      "Each counted group's expected movers toward each place accrue monthly from its pull; a whole household moves when one is due.",
  };
  // Holds normalized so a place's average leaving rate is the ACS rate.
  for (const placeId of new Set(
    [...store.liveHouseholds()].map((h) => h.placeId),
  ))
    if (!rt.holdNorm.has(placeId)) {
      let people = 0,
        held = 0;
      for (const h of store.liveHouseholds()) {
        if (h.placeId !== placeId) continue;
        const n = store.weightedCount(h);
        people += n;
        held += n * Math.exp(-holdOf(residents, h, date));
      }
      rt.holdNorm.set(placeId, held > 0 ? people / held : 1);
    }

  // 1. Counted groups weigh every other state, and the rest of their own.
  const pullCache = new Map<string, Record<string, number>>();
  const pullFor = (from: string, to: string, wages: number) => {
    const key = `${from}|${to}|${Math.round(wages / 1000)}`;
    let row = pullCache.get(key);
    if (!row) {
      row = pullBetween(
        api,
        rt,
        from,
        to,
        Math.round(wages / 1000) * 1000,
        jobless,
      );
      pullCache.set(key, row);
    }
    return row;
  };
  const webCache = new Map<string, number>();
  const groupPulls = new Map<
    number,
    { total: number; byCause: Record<string, number>; people: number }
  >();
  // Each household's people times its age's leaving rate and what holds it,
  // summed by group, home state and wage step: households alike in these
  // weigh the same places the same way.
  const alike = new Map<
    string,
    {
      group: number;
      home: string;
      wages: number;
      weight: number;
      people: number;
    }
  >();
  for (const h of store.liveHouseholds()) {
    const home = homeStateOf(rt, h.placeId);
    if (!rt.states.has(home)) continue;
    // Real people: a record stands for as many households as its weight says.
    const people = store.weightedCount(h);
    if (!people) continue;
    const head = headOf(residents, h, date);
    if (head.adults === 0) continue;
    // Each adult's own age sets their rate of leaving (ACS); the household
    // goes as one, at its adults' average, with its children.
    let rates = 0,
      adultAges = 0;
    for (const m of store.countedMembers(h)) {
      const age = ageOn(store.born[m]!, date);
      if (age >= 18) {
        rates += rateFor(home, acsBand(age));
        adultAges += age;
      }
    }
    // The outcome web's links land on this household by its adults' age,
    // tenure, kind and income, as they land on a full person in town
    // (moves.ts): the same factors, once per kind of household this month.
    const group = store.groups[h.group]!;
    const age = Math.round(adultAges / head.adults);
    const webKey = `${h.placeId}|${h.group}|${age}`;
    let web = webCache.get(webKey);
    if (web === undefined) {
      const subject: Subject = {
        age,
        tenure: h.tenure === "rent" ? "rent" : "own",
        householdKind: group.kind,
        incomeFifth: group.incomeBand,
        work: group.work,
      };
      web =
        webFactorFor(api, h.placeId, "population.out-migration", subject) *
        (h.tenure === "rent"
          ? webFactorFor(api, h.placeId, "housing.renter-moves", subject)
          : 1);
      webCache.set(webKey, web);
    }
    const weight =
      people *
      (rates / head.adults) *
      web *
      Math.exp(-holdOf(residents, h, date)) *
      rt.holdNorm.get(h.placeId)!;
    const wages = Math.round(head.wages / 1000) * 1000;
    const key = `${h.group}|${home}|${wages}`;
    const row = alike.get(key) ?? {
      group: h.group,
      home,
      wages,
      weight: 0,
      people: 0,
    };
    row.weight += weight;
    row.people += people;
    alike.set(key, row);
  }
  const statePeople = new Map(
    stateList.map((s) => [s.usps, s.people.reduce((a, b) => a + b, 0)]),
  );
  for (const row of alike.values()) {
    const group = store.groups[row.group]!;
    const elsewhere = nationPeople - statePeople.get(row.home)!;
    const summary = groupPulls.get(row.group) ?? {
      total: 0,
      byCause: {},
      people: 0,
    };
    summary.people += row.people;
    // Out of state: each state by its people and its pull.
    for (const dest of stateList) {
      if (dest.usps === row.home) continue;
      const parts = pullFor(row.home, dest.usps, row.wages);
      const due =
        (row.weight *
          (1 - inState) *
          (statePeople.get(dest.usps)! / elsewhere) *
          Math.exp(sum(parts))) /
        12;
      const key = `${group.id}|${dest.usps}`;
      rt.leave.set(key, (rt.leave.get(key) ?? 0) + due);
      summary.total += due;
      for (const [cause, value] of Object.entries(parts))
        summary.byCause[cause] = (summary.byCause[cause] ?? 0) + due * value;
    }
    // Within the state (same taxes and prices).
    const due = (row.weight * inState) / 12;
    const key = `${group.id}|${row.home}`;
    rt.leave.set(key, (rt.leave.get(key) ?? 0) + due);
    summary.total += due;
    groupPulls.set(row.group, summary);
  }
  for (const [g, summary] of groupPulls) {
    const cause = summary.total > 0 ? summary.byCause : {};
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table(PULLS_TABLE)
      .put({
        id: store.groups[g]!.id,
        date,
        people: summary.people,
        moversPerMonth: summary.total,
        byCause: Object.fromEntries(
          Object.entries(cause).map(([k, v]) => [
            k,
            summary.total ? v / summary.total : 0,
          ]),
        ),
      } as unknown as ModuleRow);
  }
  // A whole household leaves as its place's movers come due, rounded to the
  // nearest household (the balance carries): from the group whose movers
  // are most due, toward the place that drew most; within a group,
  // households go in a fixed order.
  const dueOf = (g: number) => {
    const id = store.groups[g]!.id;
    const rows: (readonly [string, number])[] = [];
    let total = 0;
    for (const s of stateList) {
      const v = rt.leave.get(`${id}|${s.usps}`) ?? 0;
      if (v === 0) continue;
      rows.push([s.usps, v]);
      total += v;
    }
    return { rows, total };
  };
  const byPlace = new Map<PlaceId, number[]>();
  for (const g of groupPulls.keys()) {
    const first = store.households[[...store.groups[g]!.households][0]!];
    if (!first) continue;
    const list = byPlace.get(first.placeId) ?? [];
    list.push(g);
    byPlace.set(first.placeId, list);
  }
  const orders = new Map<number, CountedHousehold[]>();
  const orderOf = (g: number) => {
    let order = orders.get(g);
    if (!order) {
      order = [...store.groups[g]!.households]
        .map((i) => store.households[i]!)
        .filter((h) => !h.gone && store.countedMembers(h).length)
        .map((h) => [stableHash(`${core.seed}:moves:${h.id}`), h] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([, h]) => h);
      orders.set(g, order);
    }
    return order;
  };
  for (const groupsHere of byPlace.values()) {
    const dues = new Map(groupsHere.map((g) => [g, dueOf(g)]));
    for (;;) {
      let placeDue = 0;
      let g: number | undefined;
      for (const [k, d] of dues) {
        placeDue += d.total;
        if (
          orderOf(k).length &&
          (g === undefined ||
            d.total > dues.get(g)!.total ||
            (d.total === dues.get(g)!.total &&
              store.groups[k]!.id < store.groups[g]!.id))
        )
          g = k;
      }
      if (g === undefined) break;
      const next = orderOf(g)[0]!;
      const size = store.weightedCount(next);
      if (placeDue < size / 2) break;
      orderOf(g).shift();
      const group = store.groups[g]!;
      const dests = dues.get(g)!.rows;
      const home = homeStateOf(rt, next.placeId);
      const to =
        [...dests]
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ??
        home;
      // Take its people from the group's due movers, toward that place
      // first; what it lacks is owed by the group from then on.
      let take = size;
      for (const [usps] of [...dests].sort((a, b) =>
        a[0] === to ? -1 : b[0] === to ? 1 : b[1] - a[1],
      )) {
        const k = `${group.id}|${usps}`;
        const have = rt.leave.get(k) ?? 0;
        const used = Math.max(0, Math.min(have, take));
        rt.leave.set(k, have - used);
        take -= used;
        if (take <= 0) break;
      }
      if (take > 0) {
        const k = `${group.id}|${to}`;
        rt.leave.set(k, (rt.leave.get(k) ?? 0) - take);
      }
      dues.set(g, dueOf(g));
      const bands = store
        .countedMembers(next)
        .map((m) => coarseIndex(ageOn(store.born[m]!, date)));
      const weight = store.weightOf(next);
      departCountedHousehold(core, next.id);
      const dest = rt.states.get(to)!;
      for (const b of bands) dest.people[b] = dest.people[b]! + weight;
      const reasons = pullFor(home, to, headOf(residents, next, date).wages);
      record(api, {
        id: `move:out:${next.id}:${date}`,
        date,
        direction: "out",
        householdId: next.id,
        groupId: group.id,
        fromPlace: next.placeId,
        toPlace: to === home ? `${to}:rest-of-state` : to,
        people: size,
        reasons: to === home ? {} : reasons,
      });
    }
  }

  // 2. Every state and territory weighs every other at the coarse grain.
  const flows: {
    from: CoarsePlace;
    to: CoarsePlace;
    band: number;
    people: number;
  }[] = [];
  for (const from of stateList) {
    const elsewhere = nationPeople - statePeople.get(from.usps)!;
    const wages = (STATES[from.fips]?.perCapitaIncome ??
      NATION_INCOME) as number;
    // Where its people go: each place by its people and its pull (the same for every age).
    const weights = stateList.map((to) =>
      to === from
        ? 0
        : (statePeople.get(to.usps)! / elsewhere) *
          Math.exp(sum(pullFor(from.usps, to.usps, wages))),
    );
    for (const [band, [, , acs]] of COARSE.entries()) {
      const leaving =
        (from.people[band]! * coarseRate(from.usps, acs) * (1 - inState)) / 12;
      stateList.forEach((to, i) => {
        if (weights[i]! > 0)
          flows.push({ from, to, band, people: leaving * weights[i]! });
      });
    }
  }
  // People arriving in the town's state go to its counted places by their share.
  const home = rt.states.get(rt.townState);
  const placePeople = new Map<PlaceId, number>();
  for (const h of store.liveHouseholds())
    placePeople.set(
      h.placeId,
      (placePeople.get(h.placeId) ?? 0) + store.weightedCount(h),
    );
  const counted = [...placePeople.values()].reduce((a, b) => a + b, 0);
  for (const f of flows) {
    f.from.people[f.band] = f.from.people[f.band]! - f.people;
    if (f.to !== home || !home) {
      f.to.people[f.band] = f.to.people[f.band]! + f.people;
      continue;
    }
    const stateTotal = home.people.reduce((a, b) => a + b, 0) + counted;
    const toCounted = stateTotal > 0 ? (f.people * counted) / stateTotal : 0;
    home.people[f.band] = home.people[f.band]! + f.people - toCounted;
    const key = `${f.from.usps}|${f.band}`;
    rt.arrive.set(key, (rt.arrive.get(key) ?? 0) + toCounted);
  }
  // In-state movers from the rest of the state into its counted places.
  if (home) {
    const stateTotal = home.people.reduce((a, b) => a + b, 0) + counted;
    for (const [band, [, , acs]] of COARSE.entries()) {
      const moving =
        (home.people[band]! * coarseRate(home.usps, acs) * inState) / 12;
      const toCounted = stateTotal > 0 ? (moving * counted) / stateTotal : 0;
      home.people[band] = home.people[band]! - toCounted;
      const key = `${home.usps}|${band}`;
      rt.arrive.set(key, (rt.arrive.get(key) ?? 0) + toCounted);
    }
  }
  // 3. Whole households arrive as their people come due.
  arrivals(api, rt, residents, placePeople, source, jobless);

  // 4. Each state's people this month, for the regional engine.
  const monthKey = date.slice(0, 7);
  const totals = new Map<string, number>();
  for (const s of stateList)
    totals.set(
      s.usps,
      s.people.reduce((a, b) => a + b, 0),
    );
  if (home)
    totals.set(home.usps, totals.get(home.usps)! + countedPeople(residents));
  rt.totals.set(monthKey, totals);
  for (const key of [...rt.totals.keys()].sort().slice(0, -3))
    rt.totals.delete(key);
}

function countedPeople(residents: ResidentsRuntime): number {
  let n = 0;
  for (const h of residents.store.liveHouseholds())
    n += residents.store.weightedCount(h);
  return n;
}

function coarseIndex(age: number): number {
  return age < 18 ? 0 : age < 30 ? 1 : age < 45 ? 2 : age < 65 ? 3 : 4;
}

function record(api: CoreAPI, row: MoveRecord): void {
  api
    .moduleState(COUNTED_MOVES_MODULE_ID)
    .table(TABLE)
    .put(row as unknown as ModuleRow);
}

/**
 * Newcomers: when an origin's arrivals for an age band reach a household,
 * one arrives, shaped like a counted household here whose head is that age
 * (the first in a fixed order this month); who they are is generated from
 * the world's seed, as all generation is.
 */
function arrivals(
  api: CoreAPI,
  rt: Runtime,
  residents: ResidentsRuntime,
  placePeople: ReadonlyMap<PlaceId, number>,
  source: Source,
  jobless: ReadonlyMap<string, number>,
): void {
  const core = api.state as CoreState;
  const store = residents.store;
  const date = api.state.date;
  const templates = new Map<number, CountedHousehold[]>();
  for (const h of store.liveHouseholds()) {
    const members = store.countedMembers(h);
    if (!members.length) continue;
    let head = 0;
    for (const m of members) head = Math.max(head, ageOn(store.born[m]!, date));
    const band = coarseIndex(head);
    const list = templates.get(band);
    if (list) list.push(h);
    else templates.set(band, [h]);
  }
  if (!placePeople.size) return;
  const rates = unplacedRates(residents, date);
  for (const [key, due] of [...rt.arrive].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    const [origin, bandText] = key.split("|");
    const band = Number(bandText);
    const shapes = templates.get(band) ?? templates.get(2) ?? [];
    if (!shapes.length) continue;
    let left = due;
    for (;;) {
      const pick = Number.parseInt(
        stableHash(`${core.seed}:arrival:${key}:${date}:${rt.serial}`).slice(
          0,
          8,
        ),
        16,
      );
      const template = shapes[pick % shapes.length]!;
      const size = store.weightedCount(template);
      if (left < size) break;
      left -= size;
      // They settle where the household they resemble lives.
      const placeId = template.placeId;
      const record = newcomers(api, rt, residents, template, origin!, source);
      // A newcomer household stands for as many as the one it resembles.
      admitCountedHousehold(core, record, store.weightOf(template));
      const h = store.households[store.householdOf.get(record.household.id)!]!;
      // Working-age newcomers share the place's unplaced workers at its rate.
      h.unplacedWorkers = jobShare(residents, h, rates, date);
      rt.serial++;
      api
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table(TABLE)
        .put({
          id: `move:in:${record.household.id}:${date}`,
          date,
          direction: "in",
          householdId: record.household.id,
          groupId: store.groups[h.group]!.id,
          fromPlace:
            origin === rt.townState ? `${origin}:rest-of-state` : origin!,
          toPlace: placeId,
          people: size,
          reasons:
            origin === rt.townState
              ? {}
              : pullBetween(
                  api,
                  rt,
                  origin!,
                  rt.townState,
                  headOf(residents, h, date).wages,
                  jobless,
                ),
        } as unknown as ModuleRow);
    }
    rt.arrive.set(key, left);
  }
}

/** A newcomer household's share of its place's unplaced workers, at the place's rate. */
function jobShare(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  rate: ReadonlyMap<PlaceId, number>,
  date: string,
): number {
  return openWorkers(residents, h, date) * (rate.get(h.placeId) ?? 0);
}

/** Working-age counted members of a household without a recorded job. */
function openWorkers(
  residents: ResidentsRuntime,
  h: CountedHousehold,
  date: string,
): number {
  const store = residents.store;
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  let n = 0;
  for (const m of store.countedMembers(h)) {
    const a = ageOn(store.born[m]!, date);
    if (a >= from && a < below) n++;
  }
  return Math.max(0, n - h.jobs.filter((j) => j.endsAt === undefined).length);
}

/** Each place's unplaced workers per open working-age member, today. */
function unplacedRates(
  residents: ResidentsRuntime,
  date: string,
): Map<PlaceId, number> {
  const workers = new Map<PlaceId, number>(),
    open = new Map<PlaceId, number>();
  for (const h of residents.store.liveHouseholds()) {
    workers.set(h.placeId, (workers.get(h.placeId) ?? 0) + h.unplacedWorkers);
    open.set(
      h.placeId,
      (open.get(h.placeId) ?? 0) + openWorkers(residents, h, date),
    );
  }
  return new Map(
    [...open].map(([placeId, n]) => [
      placeId,
      n > 0 ? (workers.get(placeId) ?? 0) / n : 0,
    ]),
  );
}

function newcomers(
  api: CoreAPI,
  rt: Runtime,
  residents: ResidentsRuntime,
  template: CountedHousehold,
  origin: string,
  source: Source,
): ResidentHouseholdRecord {
  const core = api.state as CoreState;
  const store = residents.store;
  const date = api.state.date as IsoDate;
  const members = store.countedMembers(template);
  const householdId = createStableId(
    "household",
    `${core.seed}:${COUNTED_MOVES_MODULE_ID}:${template.id}:${date}:${rt.serial}`,
  );
  const ids = members.map((m) =>
    createStableId(
      "person",
      `${core.seed}:${COUNTED_MOVES_MODULE_ID}:${store.ids[m]}:${date}:${rt.serial}`,
    ),
  );
  // Names come from the place's own counted people (generation is seeded).
  const pickName = (salt: string, gender: string | undefined) => {
    const n = store.memberCount;
    for (let i = 0; i < 64; i++) {
      const m =
        Number.parseInt(
          stableHash(`${core.seed}:${salt}:${i}`).slice(0, 8),
          16,
        ) % n;
      if (!gender || store.text(store.genderIx[m]!) === gender) return m;
    }
    return 0;
  };
  const familySource = pickName(`${householdId}:family`, undefined);
  const traits = openingTemperaments(
    members.map((m, i) => ({
      id: ids[i]!,
      birthDate: store.born[m]! as IsoDate,
      ...(store.text(store.genderIx[m]!)
        ? { gender: store.text(store.genderIx[m]!)! }
        : {}),
      parents: [],
    })),
    { seed: core.seed, startedAt: core.startedAt as IsoDate },
  );
  const people: PersonInput[] = members.map((m, i) => {
    const gender = store.text(store.genderIx[m]!);
    const given = pickName(`${ids[i]}:given`, gender);
    return {
      id: ids[i]!,
      givenName: store.given[given]!,
      familyName: store.family[familySource]!,
      birthDate: store.born[m]! as IsoDate,
      placeId: template.placeId,
      householdId,
      tier: "weekly",
      traits: traits.get(ids[i]!) ?? {},
      liquidMinor: store.liquid[m]!,
      livingCostDailyMinor: store.living[m]!,
      source: {
        ...source,
        estimatedFrom: `Moved in from ${origin}: ${source.estimatedFrom ?? ""}`,
      },
      familyIds: ids.filter((id) => id !== ids[i]),
      knownIds: [],
      looks: gender ? { gender } : ({} as Record<string, string>),
      pastFacts: [],
    };
  });
  return {
    household: {
      id: householdId,
      placeId: template.placeId,
      memberIds: ids,
      source,
    },
    people,
    jobs: [],
    workCommitments: [],
    contracts: [],
  };
}

/** Each state's or territory's people this month, as the counts hold them (both tiers' counted people). */
export function countedStatePeople(
  core: CoreState,
  usps: string,
  monthKey: string,
): number | undefined {
  return runtimes.get(core)?.totals.get(monthKey)?.get(usps);
}

/**
 * How a state's people changed over the last month the counts were moved
 * (latest over the month before), for the regional engine; undefined until
 * two months are counted.
 */
export function countedStateGrowth(
  core: CoreState,
  usps: string,
): number | undefined {
  const totals = runtimes.get(core)?.totals;
  if (!totals || totals.size < 2) return undefined;
  const [before, latest] = [...totals.keys()].sort().slice(-2);
  const a = totals.get(before!)?.get(usps),
    b = totals.get(latest!)?.get(usps);
  return a && b ? b / a : undefined;
}

/** The pull toward each place for one counted group, as last weighed. */
export function countedPull(
  api: CoreAPI,
  groupId: string,
): { moversPerMonth: number; byCause: Record<string, number> } | undefined {
  return api
    .moduleState(COUNTED_MOVES_MODULE_ID)
    .table(PULLS_TABLE)
    .get(groupId) as unknown as
    { moversPerMonth: number; byCause: Record<string, number> } | undefined;
}

/** The moves recorded so far, oldest first. */
export function countedMoves(api: CoreAPI): readonly MoveRecord[] {
  return (
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table(TABLE)
      .rows() as unknown as MoveRecord[]
  )
    .slice()
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1,
    );
}

/** The coarse people of a state or territory by age band (for proof and reach). */
export function coarsePlace(
  core: CoreState,
  usps: string,
): CoarsePlace | undefined {
  return runtimes.get(core)?.states.get(usps);
}

export const COUNTED_MOVES_MODULE: CoreModule = {
  id: COUNTED_MOVES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { [TABLE]: {}, [PULLS_TABLE]: {} },
  },
  onDay(api) {
    if (!api.state.date.endsWith("-01")) return;
    if (!residentsRuntime(api.state as CoreState)) return;
    month(api);
  },
};
