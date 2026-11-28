/**
 * The counted groups' money moves: a share moved between funds, a group's fund
 * topped up, charged or swept, and a counted household's cash, savings and
 * deposits as the funds hold them. They are counted-money.ts's own writers,
 * moved here as written so a payer takes them without loading the counted money
 * engine's ring; counted-money.ts re-exports each one and they stay its only
 * writers of the funds. They import only the money reads, accounts.ts and the
 * residents runtime, none of them in a ring.
 */
import { depositsHeld, transferSplit } from "./accounts";
import type { CountedHousehold } from "./counted-groups";
import {
  fundOf,
  claimsInGroup,
  savingWeight,
  householdById,
  fundBalance,
  type SplitFlow,
  flowWeights,
  HOUSING_KINDS,
  splitWhole,
  flowScale,
  placeWeights,
} from "./counted-money-reads";
import type { ResidentsRuntime } from "./modules/residents";
import { residentsRuntime } from "./residents-reads";
import type { CoreAPI, CoreState, PlaceId, Source } from "./types";

export const UNKEYED_STOPGAP = "SG-CORE-counted-unkeyed-money";

/**
 * A counted household's bank savings: its share of its group's deposits, by
 * the same claim `householdCash` reads of the group's cash (its people at its
 * savings weight over the group's claims). A group's savings are banked as the
 * group's, under its own account (`fundOf`), because its cash is one pooled
 * account: a household's wallet and its savings are then the same share of
 * the group's money, and together they are its share of all of it. `standing`
 * is the people the share is for: one real household of the record (the
 * default) or the whole record's.
 */
export function countedDeposits(
  api: CoreAPI,
  rt: ResidentsRuntime,
  h: CountedHousehold,
  standing = Math.min(rt.store.countedCount(h), rt.store.weightedCount(h)),
): number {
  if (!rt.funded || h.group < 0) return 0;
  const held = depositsHeld(api.state as CoreState, fundOf(api, rt, h.group));
  if (held <= 0) return 0;
  const claims = claimsInGroup(rt, h.group);
  return claims > 0
    ? Math.floor((held * standing * savingWeight(api.state.seed, h)) / claims)
    : 0;
}

/** One counted household's bank savings by its id (`countedDeposits`) and the holder they are banked under; undefined when the id is not a counted household here. */
export function countedHouseholdSavings(
  api: CoreAPI,
  householdId: string,
): { holderId: string; minor: number } | undefined {
  const rt = residentsRuntime(api.state as CoreState);
  const h = rt ? householdById(rt, householdId) : undefined;
  if (!rt || !h || h.group < 0) return undefined;
  return {
    holderId: fundOf(api, rt, h.group),
    minor: countedDeposits(api, rt, h),
  };
}

/**
 * The people (counted members times weight) and real households a counted
 * household record stands for, or nothing when the id is not a counted
 * household here. Engines that apply a law to one record it with this count.
 */
export function countedHouseholdStands(
  api: CoreAPI,
  householdId: string,
): { readonly people: number; readonly households: number } | undefined {
  const rt = residentsRuntime(api.state as CoreState);
  const h = rt ? householdById(rt, householdId) : undefined;
  return h
    ? {
        people: Math.max(1, rt!.store.weightedCount(h)),
        households: rt!.store.weightOf(h),
      }
    : undefined;
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
    cash *= rt.store.weightOf(h);
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
    /** Money a group keeps back from this payment (its housing due this month). */
    reserveOf?: (group: number) => number;
    /** What each group still owes on a payment that is carried until paid (outside living costs); housing uses `rt.arrears`. */
    carry?: Map<number, number>;
    /** The charge-off age of what a group carries, in its own monthly bills: what it owes past that is written off, as for a full household. */
    carryCeilingBills?: number;
  },
): {
  paid: number;
  /** What the groups still owe after this payment, and what was written off past the charge-off age (carried payments only). */
  carried: number;
  writtenOff: number;
  /** What reached the first payee (the rest went to the others). */
  toPayee: number;
  byGroup: Map<number, { asked: number; paid: number }>;
} {
  const weights = flowWeights(rt, input.flow);
  const housing = HOUSING_KINDS.has(input.flow.financeKind);
  const shares = splitWhole(input.requested, weights);
  // On a day with no new bill, the groups that still owe are asked for what they owe.
  if (input.carry && input.requested === 0)
    for (const [group, owed] of input.carry)
      if (owed > 0 && (weights.get(group) ?? 0) > 0) shares.set(group, 0);
  // A group's monthly bill, for the charge-off ceiling on what it carries.
  const bill =
    input.carry && input.carryCeilingBills !== undefined
      ? splitWhole(
          Math.round(
            ((input.flow as { amountMinor?: number }).amountMinor ?? 0) *
              flowScale(rt, input.flow),
          ),
          weights,
        )
      : undefined;
  const byGroup = new Map<number, { asked: number; paid: number }>();
  const lines: { accountId: string; deltaMinor: number }[] = [];
  let paid = 0;
  let carried = 0;
  let writtenOff = 0;
  for (const [group, share] of shares) {
    const scaled = input.scaleOf
      ? Math.round(share * input.scaleOf(group))
      : share;
    const book = housing ? rt.arrears : input.carry;
    const arrears = book?.get(group) ?? 0;
    const asked = scaled + arrears;
    const pay = Math.max(
      0,
      Math.min(
        asked,
        fundBalance(api, rt, group) - (input.reserveOf?.(group) ?? 0),
      ),
    );
    let owes = asked - pay;
    if (bill && book === input.carry) {
      const ceiling = Math.round(
        (bill.get(group) ?? 0) * input.carryCeilingBills!,
      );
      if (owes > ceiling) {
        writtenOff += owes - ceiling;
        owes = ceiling;
      }
      carried += owes;
    }
    book?.set(group, owes);
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
  return { paid, carried, writtenOff, toPayee, byGroup };
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
 * One household's cash: its share of its group's account, by its people,
 * the same account `countedPayment` pays from, so an engine that weighs a
 * cost against a counted household's cash weighs what it can pay. Zero when
 * the id is not a counted household here.
 */
export function countedHouseholdCash(
  api: CoreAPI,
  householdId: string,
): number {
  const rt = residentsRuntime(api.state as CoreState);
  const h = rt ? householdById(rt, householdId) : undefined;
  if (!rt || !h) return 0;
  fundGroups(api, rt);
  const claims = claimsInGroup(rt, h.group);
  if (claims <= 0 || rt.store.weightOf(h) <= 0) return 0;
  // One household of the record: its members at its savings weight.
  const claim = rt.store.countedCount(h) * savingWeight(api.state.seed, h);
  return Math.max(
    0,
    Math.floor((fundBalance(api, rt, h.group) * claim) / claims),
  );
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
