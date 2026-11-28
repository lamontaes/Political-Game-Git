/**
 * The counted groups' money reads: a group's fund and its balance, the
 * households and people in a group, the savings claims and their weights, and
 * how a flow's weight splits over a place's groups. They import only the
 * balance draw, which sits outside every ring, so a reader takes them without
 * loading the counted money engine's ring; counted-money.ts re-exports each one
 * and stays the one writer of the funds.
 */
import type { CountedHousehold } from "./counted-groups";
import { balanceSpreadLog, balanceDrawZ } from "./household-balance-draw";
import type { ResidentsRuntime } from "./modules/residents";
import type { ResidentFlowInput } from "./residents";
import type { CoreState, PlaceId, CoreAPI } from "./types";

/** The parts of a flow the money splits by. */
export type SplitFlow = Pick<
  ResidentFlowInput,
  | "id"
  | "kind"
  | "financeKind"
  | "placeId"
  | "perDayMinorByJob"
  | "amountByContract"
  | "quarters"
  | "organizationId"
>;

/** Each counted group's people, by group index, for the store's version. */
export function groupPeople(rt: ResidentsRuntime): Map<number, number> {
  const cache = rt.moneyCache;
  if (cache.peopleVersion === rt.store.version && cache.people)
    return cache.people;
  const people = new Map<number, number>();
  for (const h of rt.store.liveHouseholds()) {
    const n = rt.store.weightedCount(h);
    if (n) people.set(h.group, (people.get(h.group) ?? 0) + n);
  }
  cache.people = people;
  cache.peopleVersion = rt.store.version;
  return people;
}

export function peopleInGroup(rt: ResidentsRuntime, group: number): number {
  // Read from the group's own households: a regroup changes the counts often.
  let n = 0;
  for (const i of rt.store.groups[group]?.households ?? [])
    n += rt.store.weightedCount(rt.store.households[i]!);
  return n;
}

/**
 * A counted household's savings weight: its share of its group's account per
 * person, against the group's average of one. Households alike in income, age
 * and tenure still hold very different savings (the Survey of Consumer
 * Finances' means run far above its medians), so the share is spread around
 * the group's average on a log-normal of the parameter's spread, drawn once
 * per household from the world's seed and its id (who exists, not what anyone
 * does) and kept: exp(σz − σ²/2), whose mean is one, so the draws move money
 * among a group's households and never add to it.
 */
export function savingWeight(
  seed: string,
  h: { readonly id: string; saving?: number },
): number {
  if (h.saving === undefined) {
    const sigma = balanceSpreadLog();
    h.saving = Math.exp(sigma * balanceDrawZ(seed, h.id) - (sigma * sigma) / 2);
  }
  return h.saving;
}

/** A household's claim on its group's account: its people, each counted at its savings weight. */
export function savingClaim(rt: ResidentsRuntime, h: CountedHousehold): number {
  return (
    rt.store.weightedCount(h) *
    savingWeight((rt.api!.state as CoreState).seed, h)
  );
}

/**
 * The claims on a group's account: its households' people at their savings
 * weights. A group's claims change only when someone joins or leaves the
 * counts, a record's weight changes, or a household changes group, so they
 * are counted once and kept until one of those: a regroup moves one
 * household's claim (`claimMoved`) instead of counting both groups again.
 */
export function claimsInGroup(rt: ResidentsRuntime, group: number): number {
  const cache = claimsCache(rt);
  const held = cache.get(group);
  if (held !== undefined) return held;
  let n = 0;
  for (const i of rt.store.groups[group]?.households ?? [])
    n += savingClaim(rt, rt.store.households[i]!);
  cache.set(group, n);
  return n;
}

/** The kept claims, emptied when anyone joins or leaves the counts or a weight changes. */
export function claimsCache(rt: ResidentsRuntime): Map<number, number> {
  const store = rt.store;
  const held = rt.moneyCache.claims;
  if (
    held &&
    held.members === store.membersVersion &&
    held.weights === store.weightsVersion
  )
    return held.groups;
  const groups = new Map<number, number>();
  rt.moneyCache.claims = {
    members: store.membersVersion,
    weights: store.weightsVersion,
    groups,
  };
  return groups;
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

export function householdById(
  rt: ResidentsRuntime,
  id: string,
): CountedHousehold | undefined {
  const ix = rt.store.householdOf.get(id);
  const h = ix === undefined ? undefined : rt.store.households[ix];
  return h && !h.gone ? h : undefined;
}

/**
 * Each flow part's household index (-1 for none), kept until a household is
 * added: the id and contract indexes are written only beside a new household.
 */
const partIndex = new WeakMap<
  readonly CountedHousehold[],
  { length: number; income: Map<string, number>; ix: Map<string, number> }
>();

/** The counted household a flow part belongs to, from its key (gone ones too: `add` skips them). */
function partHousehold(
  rt: ResidentsRuntime,
  key: string,
): CountedHousehold | undefined {
  const households = rt.store.households;
  let memo = partIndex.get(households);
  if (
    !memo ||
    memo.length !== households.length ||
    memo.income !== rt.incomeContractHousehold
  ) {
    memo = {
      length: households.length,
      income: rt.incomeContractHousehold,
      ix: new Map(),
    };
    partIndex.set(households, memo);
  }
  let ix = memo.ix.get(key);
  if (ix === undefined) {
    const at = key.indexOf(":");
    const prefix = at < 0 ? "" : key.slice(0, at);
    ix =
      prefix === "hh" || prefix === "household" || prefix === "mortgage"
        ? (rt.store.householdOf.get(key.slice(at + 1)) ?? -1)
        : (rt.incomeContractHousehold.get(key) ?? -1);
    memo.ix.set(key, ix);
  }
  return ix < 0 ? undefined : households[ix];
}

/**
 * How a flow's amount splits over the counted groups, by group index: each
 * part's amount (jobs' pay per day, households' parts) where it is keyed,
 * else the place's groups by their people.
 */
const weightCache = new WeakMap<
  object,
  {
    parts: unknown;
    version: number;
    amount: number;
    weighed: Weighed;
  }
>();

/** A flow's shares by group, and by how much the household weights scale its amount. */
interface Weighed {
  readonly weights: Map<number, number>;
  readonly scale: number;
}

export function flowWeights(
  rt: ResidentsRuntime,
  flow: SplitFlow,
): Map<number, number> {
  return new Map(weigh(rt, flow).weights);
}

export function weigh(rt: ResidentsRuntime, flow: SplitFlow): Weighed {
  // Kept until the flow's parts or the counts change.
  const parts = flow.amountByContract ?? flow.perDayMinorByJob;
  const held = weightCache.get(flow);
  const amount = (flow as { amountMinor?: number }).amountMinor ?? 0;
  if (
    held &&
    held.parts === parts &&
    held.version === rt.store.version &&
    held.amount === amount
  )
    return held.weighed;
  const weighed = weighFlow(rt, flow);
  weightCache.set(flow, {
    parts,
    version: rt.store.version,
    amount,
    weighed,
  });
  return weighed;
}

function weighFlow(rt: ResidentsRuntime, flow: SplitFlow): Weighed {
  const out = new Map<number, number>();
  let unkeyed = 0;
  let plain = 0;
  let weighted = 0;
  const add = (
    h: CountedHousehold | undefined,
    amount: number,
    jobId?: string,
  ) => {
    if (h && !h.gone && h.group >= 0) {
      // A wage moves for the jobs its counted job stands for; anything else
      // for the households its record stands for.
      const times =
        jobId === undefined
          ? rt.store.weightOf(h)
          : rt.store.headsOfJob(h, jobId);
      out.set(h.group, (out.get(h.group) ?? 0) + amount * times);
      plain += amount;
      weighted += amount * times;
    } else unkeyed += amount;
  };
  if (flow.id.startsWith("rent:")) {
    const h = householdById(rt, flow.id.slice("rent:".length));
    if (h)
      return {
        weights: new Map([[h.group, 1]]),
        scale: rt.store.weightOf(h),
      };
  } else if (flow.financeKind === "work.unplaced-residents") {
    for (const h of rt.store.liveHouseholds())
      if (
        h.placeId === flow.placeId &&
        h.unplacedWorkers > 0 &&
        !h.quarters === !flow.quarters
      )
        out.set(
          h.group,
          (out.get(h.group) ?? 0) + h.unplacedWorkers * rt.store.weightOf(h),
        );
    if (out.size) return { weights: out, scale: 1 };
  } else if (flow.perDayMinorByJob) {
    for (const [jobId, perDay] of Object.entries(flow.perDayMinorByJob)) {
      const job = rt.jobs.get(jobId);
      const m = job ? rt.store.countedMember(job.personId) : undefined;
      add(
        m === undefined
          ? undefined
          : rt.store.households[rt.store.household[m]!],
        perDay,
        jobId,
      );
    }
  } else if (flow.amountByContract) {
    const parts = flow.amountByContract;
    for (const key in parts) add(partHousehold(rt, key), parts[key]!);
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
  // Only the keyed parts are scaled; the place's own bill stays as sent.
  const whole = plain + unkeyed;
  return {
    weights: out,
    scale: plain > 0 && whole > 0 ? (weighted + unkeyed) / whole : 1,
  };
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
