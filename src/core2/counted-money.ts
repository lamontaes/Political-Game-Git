/**
 * Counted groups' money (one model, two tiers). Each counted group holds its
 * own account, a fund under its place's residents account, so the counted
 * tier's cash balances group by group as a full person's does. Every
 * standing flow with the counted side on it pays or is paid group by group
 * in one balanced journal entry: an employer's payroll lands in each
 * group's account less what the law in force withholds there (the same
 * `withholdingFor` a full paycheck uses, on the group's pay per worker times
 * its workers); rent, a mortgage or a purchase is paid from each group's
 * account up to what it holds, and a group short of its housing payment
 * carries arrears.
 *
 * Whose part a flow is comes from the flow's own parts: a job's pay is its
 * worker's household's group, a household's purchase, mortgage or rent part
 * is that household's group. A part nobody keyed (a bill an engine sends the
 * place as a whole) is shared by the place's groups by their people
 * (SG-CORE-counted-unkeyed-money).
 */
import { transferSplit } from "./accounts";
import { withholdingFor } from "./tax-withholding";
import { governments } from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import { residentsRuntime, type ResidentsRuntime } from "./modules/residents";
import type { CountedHousehold } from "./counted-groups";
import type { ResidentFlowInput } from "./residents";
import type { CoreAPI, CoreState, PersonId, PlaceId, Source } from "./types";

export const UNKEYED_STOPGAP = "SG-CORE-counted-unkeyed-money";

/** The parts of a flow the money splits by. */
type SplitFlow = Pick<
  ResidentFlowInput,
  | "id"
  | "kind"
  | "financeKind"
  | "placeId"
  | "perDayMinorByJob"
  | "amountByContract"
>;

export const HOUSING_KINDS = new Set(["household.rent", "household.mortgage"]);

/** Each counted group's people, by group index, for the store's version. */
function groupPeople(rt: ResidentsRuntime): Map<number, number> {
  const cache = rt.moneyCache;
  if (cache.peopleVersion === rt.store.version && cache.people)
    return cache.people;
  const people = new Map<number, number>();
  for (const h of rt.store.liveHouseholds()) {
    const n = rt.store.countedMembers(h).length;
    if (n) people.set(h.group, (people.get(h.group) ?? 0) + n);
  }
  cache.people = people;
  cache.peopleVersion = rt.store.version;
  return people;
}

export function peopleInGroup(rt: ResidentsRuntime, group: number): number {
  return groupPeople(rt).get(group) ?? 0;
}

/** The place's groups weighted by their people: who shares a bill nobody keyed. */
export function placeWeights(
  rt: ResidentsRuntime,
  placeId: PlaceId,
): Map<number, number> {
  const out = new Map<number, number>();
  for (const [group, people] of groupPeople(rt))
    if (rt.store.groups[group]!.placeId === placeId) out.set(group, people);
  return out;
}

function householdById(
  rt: ResidentsRuntime,
  id: string,
): CountedHousehold | undefined {
  const ix = rt.store.householdOf.get(id);
  const h = ix === undefined ? undefined : rt.store.households[ix];
  return h && !h.gone ? h : undefined;
}

/** The counted household a flow part belongs to, from its key. */
function partHousehold(
  rt: ResidentsRuntime,
  key: string,
): CountedHousehold | undefined {
  const at = key.indexOf(":");
  const prefix = at < 0 ? "" : key.slice(0, at);
  if (prefix === "hh" || prefix === "household" || prefix === "mortgage")
    return householdById(rt, key.slice(at + 1));
  const income = rt.incomeContractHousehold.get(key);
  return income === undefined ? undefined : rt.store.households[income];
}

/**
 * How a flow's amount splits over the counted groups, by group index: each
 * part's amount (jobs' pay per day, households' parts) where it is keyed,
 * else the place's groups by their people.
 */
export function flowWeights(
  rt: ResidentsRuntime,
  flow: SplitFlow,
): Map<number, number> {
  const out = new Map<number, number>();
  let unkeyed = 0;
  const add = (h: CountedHousehold | undefined, amount: number) => {
    if (h && !h.gone && h.group >= 0)
      out.set(h.group, (out.get(h.group) ?? 0) + amount);
    else unkeyed += amount;
  };
  if (flow.id.startsWith("rent:")) {
    const h = householdById(rt, flow.id.slice("rent:".length));
    if (h) return new Map([[h.group, 1]]);
  } else if (flow.financeKind === "work.unplaced-residents") {
    for (const h of rt.store.liveHouseholds())
      if (h.placeId === flow.placeId && h.unplacedWorkers > 0)
        out.set(h.group, (out.get(h.group) ?? 0) + h.unplacedWorkers);
    if (out.size) return out;
  } else if (flow.perDayMinorByJob) {
    for (const [jobId, perDay] of Object.entries(flow.perDayMinorByJob)) {
      const job = rt.jobs.get(jobId);
      const m = job ? rt.store.countedMember(job.personId) : undefined;
      add(
        m === undefined
          ? undefined
          : rt.store.households[rt.store.household[m]!],
        perDay,
      );
    }
  } else if (flow.amountByContract) {
    for (const [key, amount] of Object.entries(flow.amountByContract))
      add(partHousehold(rt, key), amount);
  } else unkeyed = 1;
  if (unkeyed > 0) {
    const place = placeWeights(rt, flow.placeId);
    const total = [...place.values()].reduce((n, v) => n + v, 0);
    const keyed = [...out.values()].reduce((n, v) => n + v, 0);
    if (total > 0) {
      // Unkeyed parts are shared by the place's groups, by their people.
      const scale = keyed > 0 ? unkeyed : 1;
      for (const [group, people] of place)
        out.set(group, (out.get(group) ?? 0) + (scale * people) / total);
    }
  }
  return out;
}

/** Split a whole amount by weights, the cents left by rounding to the largest share. */
export function splitWhole(
  amount: number,
  weights: ReadonlyMap<number, number>,
): Map<number, number> {
  const out = new Map<number, number>();
  const total = [...weights.values()].reduce((n, v) => n + v, 0);
  if (total <= 0 || amount === 0) return out;
  let given = 0,
    largest = -1,
    largestWeight = -1;
  for (const [group, weight] of weights) {
    if (weight <= 0) continue;
    const part = Math.floor((amount * weight) / total);
    out.set(group, part);
    given += part;
    if (weight > largestWeight) [largest, largestWeight] = [group, weight];
  }
  if (largest >= 0) out.set(largest, out.get(largest)! + amount - given);
  return out;
}

/** The fund a counted group's money is held in, opened on first use. */
export function fundOf(
  api: CoreAPI,
  rt: ResidentsRuntime,
  group: number,
): string {
  const held = rt.funds.get(group);
  if (held) return held;
  const row = rt.store.groups[group]!;
  const owner = rt.input.accounts.find(
    (account) => account.placeId === row.placeId,
  )?.accountId;
  if (!owner) throw new Error(`No residents account for ${row.placeId}`);
  const id = api.accounts().open({
    id: `fund:${row.id}`,
    ownerId: owner,
    name: row.id,
    source: rt.input.source,
  });
  rt.funds.set(group, id);
  return id;
}

export function fundBalance(
  api: CoreAPI,
  rt: ResidentsRuntime,
  group: number,
): number {
  const id = rt.funds.get(group);
  return id ? api.accounts().balance(id) : 0;
}

/**
 * The opening: each group's account takes its members' opening cash from the
 * place's residents account, in one entry per place.
 */
export function fundGroups(api: CoreAPI, rt: ResidentsRuntime): void {
  if (rt.funded) return;
  rt.funded = true;
  const byPlace = new Map<PlaceId, Map<number, number>>();
  for (const h of rt.store.liveHouseholds()) {
    let cash = 0;
    for (const m of rt.store.countedMembers(h)) cash += rt.store.liquid[m]!;
    const groups = byPlace.get(h.placeId) ?? new Map<number, number>();
    groups.set(h.group, (groups.get(h.group) ?? 0) + cash);
    byPlace.set(h.placeId, groups);
  }
  const accounts = api.accounts();
  for (const [placeId, groups] of byPlace) {
    const owner = rt.input.accounts.find(
      (row) => row.placeId === placeId,
    )?.accountId;
    if (!owner) continue;
    const residual = accounts.main(owner);
    const available = accounts.balance(residual);
    const wanted = [...groups.values()].reduce((n, v) => n + v, 0);
    // The pool already holds exactly the opening cash; scale if it holds less.
    const scale = wanted > available && wanted > 0 ? available / wanted : 1;
    const lines: { accountId: string; deltaMinor: number }[] = [];
    let total = 0;
    for (const [group, cash] of groups) {
      const amount = Math.floor(cash * scale);
      fundOf(api, rt, group);
      if (amount <= 0) continue;
      lines.push({ accountId: rt.funds.get(group)!, deltaMinor: amount });
      total += amount;
    }
    if (!total) continue;
    lines.push({ accountId: residual, deltaMinor: -total });
    transferSplit(api.state as CoreState, api, {
      id: `counted-funds:${placeId}:${api.state.date}`,
      lines,
      reasonKey: "residents.group-funds",
      source: rt.input.source,
    });
  }
}

/**
 * Money a group's account takes from the place's residents account when a
 * household joins it (a regroup moves the household's share with it).
 */
export function moveShare(
  api: CoreAPI,
  rt: ResidentsRuntime,
  fromGroup: number,
  toGroup: number,
  people: number,
  peopleBefore: number,
): void {
  if (!rt.funded || fromGroup === toGroup || fromGroup < 0) return;
  const balance = fundBalance(api, rt, fromGroup);
  const amount =
    peopleBefore > 0 ? Math.floor((balance * people) / peopleBefore) : 0;
  const to = fundOf(api, rt, toGroup);
  if (amount <= 0) return;
  transferSplit(api.state as CoreState, api, {
    id: `counted-regroup:${fromGroup}:${toGroup}:${api.state.date}:${rt.moneyCache.serial++}`,
    lines: [
      { accountId: rt.funds.get(fromGroup)!, deltaMinor: -amount },
      { accountId: to, deltaMinor: amount },
    ],
    reasonKey: "residents.regroup",
    source: rt.input.source,
  });
}

interface Withheld {
  readonly accountId: string;
  readonly minor: number;
  readonly jurisdiction: string;
  readonly tax: string;
}

/** Each government's residual account by jurisdiction, where budgets run. */
function governmentAccounts(api: CoreAPI): Map<string, string> {
  const out = new Map<string, string>();
  try {
    for (const row of governments(api))
      out.set(row.id, `cash:${row.organizationId}:residual`);
  } catch {
    // No budgets engine in this world: nothing is withheld.
  }
  return out;
}

/**
 * What the law in force withholds from one group's pay on one payday: the
 * full paycheck's function on the group's pay per worker, times its
 * workers. Outside the town, only the federal, state and county levels apply.
 */
export function groupWithholding(
  api: CoreAPI,
  rt: ResidentsRuntime,
  group: number,
  grossMinor: number,
  workers: number,
  periodDays: number,
): Withheld[] {
  if (grossMinor <= 0 || workers <= 0) return [];
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return [];
  const accounts = governmentAccounts(api);
  if (!accounts.size) return [];
  const row = rt.store.groups[group]!;
  const year = api.state.date.slice(0, 4);
  const ytdKey = `${row.id}|${year}`;
  const ytd = rt.withholdingYtd.get(ytdKey) ?? 0;
  const perWorker = grossMinor / workers;
  const town = lawChain(api).townPlaceId;
  const lines = withholdingFor({
    paidMinor: Math.round(perWorker),
    periodDays,
    yearToDateMinor: Math.round(ytd),
    incomeTax: lawInForce(api, "income-tax"),
    socialSecurity: lawInForce(api, "social-security-tax"),
    medicare: lawInForce(api, "medicare-tax"),
  });
  rt.withholdingYtd.set(ytdKey, ytd + perWorker);
  const out: Withheld[] = [];
  for (const line of lines) {
    if (row.placeId !== town && line.level === "city") continue;
    const accountId = accounts.get(line.jurisdiction);
    if (!accountId) continue;
    out.push({
      accountId,
      minor: Math.round(line.minor * workers),
      jurisdiction: line.jurisdiction,
      tax: line.tax,
    });
  }
  return out;
}

/** Workers a wage flow pays in each group (its jobs; unplaced workers by their share). */
function workersByGroup(
  rt: ResidentsRuntime,
  flow: SplitFlow,
): Map<number, number> {
  const out = new Map<number, number>();
  if (flow.financeKind === "work.unplaced-residents") {
    for (const h of rt.store.liveHouseholds())
      if (h.placeId === flow.placeId && h.unplacedWorkers > 0)
        out.set(h.group, (out.get(h.group) ?? 0) + h.unplacedWorkers);
    return out;
  }
  for (const jobId of Object.keys(flow.perDayMinorByJob ?? {})) {
    const job = rt.jobs.get(jobId);
    const m = job ? rt.store.countedMember(job.personId) : undefined;
    if (m === undefined) continue;
    const g = rt.store.households[rt.store.household[m]!]!.group;
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/**
 * The counted side is paid: `paid` from `fromAccount` lands in each group's
 * account by the flow's weights, wages less the law's withholding, which
 * goes to each government in the same entry. Returns each group's net.
 */
export function payGroups(
  api: CoreAPI,
  rt: ResidentsRuntime,
  input: {
    id: string;
    flow: SplitFlow & { cadence: ResidentFlowInput["cadence"] };
    fromAccount: string;
    paid: number;
    reasonKey: string;
    source: Source;
    weights?: Map<number, number>;
  },
): Map<number, number> {
  const weights = input.weights ?? flowWeights(rt, input.flow);
  if (![...weights.values()].some((v) => v > 0)) {
    // Nobody counted is left to take it (all filled in or gone): the place shares it.
    for (const [g, v] of placeWeights(rt, input.flow.placeId))
      weights.set(g, v);
  }
  const shares = splitWhole(input.paid, weights);
  const lines: { accountId: string; deltaMinor: number }[] = [
    { accountId: input.fromAccount, deltaMinor: -input.paid },
  ];
  const net = new Map<number, number>();
  const wages = input.flow.kind === "wages";
  const workers = wages ? workersByGroup(rt, input.flow) : undefined;
  const periodDays =
    input.flow.cadence.kind === "days"
      ? input.flow.cadence.every
      : Math.round((365 / 12) * input.flow.cadence.every);
  for (const [group, gross] of shares) {
    let taxes = 0;
    if (wages)
      for (const line of groupWithholding(
        api,
        rt,
        group,
        gross,
        workers!.get(group) ?? 0,
        periodDays,
      )) {
        const minor = Math.min(line.minor, gross - taxes);
        if (minor <= 0) continue;
        lines.push({ accountId: line.accountId, deltaMinor: minor });
        taxes += minor;
        const key = `${rt.store.groups[group]!.id}|${api.state.date.slice(0, 4)}|${line.jurisdiction}|${line.tax}`;
        rt.withheld.set(key, (rt.withheld.get(key) ?? 0) + minor);
      }
    lines.push({
      accountId: fundOf(api, rt, group),
      deltaMinor: gross - taxes,
    });
    net.set(group, gross - taxes);
  }
  if (input.paid > 0)
    transferSplit(api.state as CoreState, api, {
      id: input.id,
      lines,
      reasonKey: input.reasonKey,
      source: input.source,
    });
  return net;
}

/**
 * The counted side pays: each group's share of `requested` (times its
 * spending scale, for spending that follows income), up to what its account
 * holds, to `toAccount` in one entry. Housing payments carry each group's
 * arrears into the next one. Returns what each group paid and was asked.
 */
export function chargeGroups(
  api: CoreAPI,
  rt: ResidentsRuntime,
  input: {
    id: string;
    flow: SplitFlow;
    requested: number;
    /** Who is paid what the groups pay: one account, or lines summing to the total. */
    toAccount?: string;
    payees?: (total: number) => { accountId: string; deltaMinor: number }[];
    reasonKey: string;
    source: Source;
    scaleOf?: (group: number) => number;
  },
): {
  paid: number;
  /** What reached the first payee (the rest went to the others). */
  toPayee: number;
  byGroup: Map<number, { asked: number; paid: number }>;
} {
  const weights = flowWeights(rt, input.flow);
  const housing = HOUSING_KINDS.has(input.flow.financeKind);
  const shares = splitWhole(input.requested, weights);
  const byGroup = new Map<number, { asked: number; paid: number }>();
  const lines: { accountId: string; deltaMinor: number }[] = [];
  let paid = 0;
  for (const [group, share] of shares) {
    const scaled = input.scaleOf
      ? Math.round(share * input.scaleOf(group))
      : share;
    const arrears = housing ? (rt.arrears.get(group) ?? 0) : 0;
    const asked = scaled + arrears;
    const pay = Math.max(0, Math.min(asked, fundBalance(api, rt, group)));
    if (housing) rt.arrears.set(group, asked - pay);
    byGroup.set(group, { asked, paid: pay });
    if (pay <= 0) continue;
    lines.push({ accountId: fundOf(api, rt, group), deltaMinor: -pay });
    paid += pay;
  }
  if (housing) {
    const month = api.state.date.slice(0, 7);
    for (const [group, row] of byGroup) {
      const prior = rt.housingMonth.get(group);
      const same = prior?.month === month;
      rt.housingMonth.set(group, {
        month,
        asked: (same ? prior.asked : 0) + row.asked,
        paid: (same ? prior.paid : 0) + row.paid,
      });
    }
  }
  let toPayee = 0;
  if (paid > 0) {
    const payees = input.payees
      ? input.payees(paid)
      : [{ accountId: input.toAccount!, deltaMinor: paid }];
    toPayee = payees[0]?.deltaMinor ?? 0;
    lines.push(...payees.filter((row) => row.deltaMinor > 0));
    transferSplit(api.state as CoreState, api, {
      id: input.id,
      lines,
      reasonKey: input.reasonKey,
      source: input.source,
    });
  }
  return { paid, toPayee, byGroup };
}

/**
 * Whether a counted household's group fell short on its latest month of
 * housing payments (the housing engine pays no principal on a loan in
 * arrears, as for a full household).
 */
export function countedHousingInArrears(
  core: CoreState,
  householdId: string,
): boolean {
  const rt = residentsRuntime(core);
  const ix = rt?.store.householdOf.get(householdId);
  if (!rt || ix === undefined) return false;
  const row = rt.housingMonth.get(rt.store.households[ix]!.group);
  return !!row && row.paid < row.asked;
}

/**
 * A payment between a counted person, household or place and another owner,
 * for engines outside the residents engine (benefits, an owner's draw, a
 * tax bill): positive `amountMinor` is paid by the counted side, negative is
 * paid to it. The counted side is the person's or household's group, else
 * the place's groups by their people. Pays what the groups hold. Returns the
 * amount moved.
 */
export function countedPayment(
  api: CoreAPI,
  input: {
    id: string;
    placeId: PlaceId;
    personId?: PersonId;
    householdId?: string;
    otherOwnerId: string;
    amountMinor: number;
    reasonKey: string;
    source: Source;
  },
): number {
  const rt = residentsRuntime(api.state as CoreState);
  if (!rt || !input.amountMinor) return 0;
  fundGroups(api, rt);
  let weights: Map<number, number>;
  const m =
    input.personId !== undefined
      ? rt.store.countedMember(input.personId)
      : undefined;
  const h =
    m !== undefined
      ? rt.store.households[rt.store.household[m]!]
      : input.householdId
        ? householdById(rt, input.householdId)
        : undefined;
  if (h && !h.gone) weights = new Map([[h.group, 1]]);
  else {
    api.stopgap(UNKEYED_STOPGAP);
    weights = placeWeights(rt, input.placeId);
  }
  const other = api.accounts().main(input.otherOwnerId);
  const flow: SplitFlow = {
    id: input.id,
    kind: input.amountMinor > 0 ? "purchase" : "retirement",
    financeKind: input.reasonKey,
    placeId: input.placeId,
  };
  if (input.amountMinor > 0) {
    const shares = splitWhole(input.amountMinor, weights);
    const lines: { accountId: string; deltaMinor: number }[] = [];
    let paid = 0;
    for (const [group, share] of shares) {
      const pay = Math.max(0, Math.min(share, fundBalance(api, rt, group)));
      if (pay <= 0) continue;
      lines.push({ accountId: fundOf(api, rt, group), deltaMinor: -pay });
      paid += pay;
    }
    if (!paid) return 0;
    lines.push({ accountId: other, deltaMinor: paid });
    transferSplit(api.state as CoreState, api, {
      id: input.id,
      lines,
      reasonKey: input.reasonKey,
      source: input.source,
    });
    return paid;
  }
  const amount = Math.min(
    -input.amountMinor,
    (api.state as CoreState).organizations.get(input.otherOwnerId)
      ?.outsideFlow !== undefined
      ? -input.amountMinor
      : api.accounts().balance(other),
  );
  if (amount <= 0) return 0;
  payGroups(api, rt, {
    id: input.id,
    flow: { ...flow, cadence: { kind: "days", every: 1 } },
    fromAccount: other,
    paid: amount,
    reasonKey: input.reasonKey,
    source: input.source,
    weights,
  });
  return amount;
}

/**
 * What landed in a place's residents account from an engine that didn't key
 * it to anyone goes to the place's groups by their people, monthly.
 */
export function sweepResidual(api: CoreAPI, rt: ResidentsRuntime): void {
  if (!rt.funded) return;
  const accounts = api.accounts();
  for (const row of rt.input.accounts) {
    const residual = accounts.main(row.accountId);
    const amount = accounts.balance(residual);
    if (amount <= 0) continue;
    const weights = placeWeights(rt, row.placeId);
    if (!weights.size) continue;
    api.stopgap(UNKEYED_STOPGAP);
    const shares = splitWhole(amount, weights);
    const lines = [
      { accountId: residual, deltaMinor: -amount },
      ...[...shares].map(([group, share]) => ({
        accountId: fundOf(api, rt, group),
        deltaMinor: share,
      })),
    ];
    transferSplit(api.state as CoreState, api, {
      id: `counted-sweep:${row.placeId}:${api.state.date}`,
      lines,
      reasonKey: "residents.unkeyed",
      source: rt.input.source,
    });
  }
}
