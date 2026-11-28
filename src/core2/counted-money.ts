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
import { taxIndexOf } from "./tax-index";
import {
  BUDGETS_MODULE_ID,
  governments,
  PAYROLL_TAX_SERIES,
} from "./modules/budgets";
import { withholdingFor, recordIncomeTaxApplied } from "./budgets-treasury";
import { transferSplit } from "./accounts";
import {
  PAID_LEAVE_KEY,
  paidLeaveProgram,
  paidLeavePremium,
} from "./laws-in-force";
import { lawApplied } from "./law-reach/applied";
import { lawChain, lawInForce } from "./modules/laws";
import { LAWS_MODULE_ID } from "./modules/laws-reads";
import type { ResidentsRuntime } from "./modules/residents";
import { residentsRuntime } from "./residents-reads";
import { withCountedQuarterPay } from "./pay-by-quarter";
import type { ResidentFlowInput } from "./residents";
import type { CoreAPI, CoreState, PersonId, PlaceId, Source } from "./types";
import {
  flowWeights,
  fundBalance,
  fundOf,
  householdById,
  placeWeights,
  type SplitFlow,
  splitWhole,
  workersByGroup,
} from "./counted-money-reads";
import { UNKEYED_STOPGAP, fundGroups } from "./counted-money-moves";
export {
  UNKEYED_STOPGAP,
  chargeGroups,
  countedDeposits,
  countedHouseholdCash,
  countedHouseholdSavings,
  countedHouseholdStands,
  countedHousingInArrears,
  fundGroups,
  moveShare,
  sweepResidual,
} from "./counted-money-moves";
export {
  claimMoved,
  claimsInGroup,
  flowScale,
  flowWeights,
  fundBalance,
  fundOf,
  HOUSING_KINDS,
  peopleInGroup,
  placeHasGroups,
  placeWeights,
  savingClaim,
  savingWeight,
  splitWhole,
  workersByGroup,
} from "./counted-money-reads";

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
export interface PaydayLaw {
  readonly accounts: Map<string, string>;
  readonly town: string;
  readonly incomeTax: ReturnType<typeof lawInForce>;
  readonly socialSecurity: ReturnType<typeof lawInForce>;
  readonly medicare: ReturnType<typeof lawInForce>;
}

/** The law in force on a payday and where each government is paid (once per payday). */
export function paydayLaw(api: CoreAPI): PaydayLaw | undefined {
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return undefined;
  const accounts = governmentAccounts(api);
  if (!accounts.size) return undefined;
  return {
    accounts,
    town: lawChain(api).townPlaceId,
    incomeTax: lawInForce(api, "income-tax"),
    socialSecurity: lawInForce(api, "social-security-tax"),
    medicare: lawInForce(api, "medicare-tax"),
  };
}

export function groupWithholding(
  api: CoreAPI,
  rt: ResidentsRuntime,
  group: number,
  grossMinor: number,
  workers: number,
  periodDays: number,
  law: PaydayLaw | undefined = paydayLaw(api),
): Withheld[] {
  if (grossMinor <= 0 || workers <= 0 || !law) return [];
  const accounts = law.accounts;
  const row = rt.store.groups[group]!;
  const year = api.state.date.slice(0, 4);
  const ytdKey = `${row.id}|${year}`;
  const ytd = rt.withholdingYtd.get(ytdKey) ?? 0;
  const perWorker = grossMinor / workers;
  const town = law.town;
  const lines = withholdingFor({
    paidMinor: Math.round(perWorker),
    periodDays,
    yearToDateMinor: Math.round(ytd),
    incomeTax: law.incomeTax,
    socialSecurity: law.socialSecurity,
    medicare: law.medicare,
    index: taxIndexOf(api),
  });
  rt.withholdingYtd.set(ytdKey, ytd + perWorker);
  const out: Withheld[] = [];
  const kept: (typeof lines)[number][] = [];
  for (const line of lines) {
    if (row.placeId !== town && line.level === "city") continue;
    const accountId = accounts.get(line.jurisdiction);
    if (!accountId) continue;
    kept.push(line);
    const series = PAYROLL_TAX_SERIES[line.tax];
    if (series && line.minor > 0)
      lawApplied(api, {
        key: series,
        lawId: line.lawId,
        targetId: `counted-workers:${row.id}`,
        target: "group",
        engine: BUDGETS_MODULE_ID,
        what: "withheld",
        count: workers,
        amountMinor: Math.round(line.minor * workers),
      });
    out.push({
      accountId,
      minor: Math.round(line.minor * workers),
      jurisdiction: line.jurisdiction,
      tax: line.tax,
    });
  }
  // The group's workers were taxed by the law in force, as a full worker is.
  recordIncomeTaxApplied(api, {
    targetId: row.id,
    target: "group",
    count: workers,
    lines: kept,
  });
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
    /** A wage flow's workers by group, when the caller already counted them (`workersByGroup`). */
    workers?: Map<number, number>;
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
  const workers = wages
    ? (input.workers ?? workersByGroup(rt, input.flow))
    : undefined;
  const law = wages ? paydayLaw(api) : undefined;
  const leave = wages ? paidLeaveProgram(api) : undefined;
  const periodDays =
    input.flow.cadence.kind === "days"
      ? input.flow.cadence.every
      : Math.round((365 / 12) * input.flow.cadence.every);
  for (const [group, gross] of shares) {
    let taxes = 0;
    // The base period's wage of one worker of the group, gross before withholding.
    const heads = workers?.get(group) ?? 0;
    if (wages && heads > 0 && input.flow.organizationId) {
      const key = `${rt.store.groups[group]!.id}|${input.flow.organizationId}`;
      api.state.work.countedPayByQuarter.set(
        key,
        withCountedQuarterPay(
          api.state.work.countedPayByQuarter.get(key),
          api.state.date,
          Math.round(gross / heads),
        ),
      );
    }
    if (wages)
      for (const line of groupWithholding(
        api,
        rt,
        group,
        gross,
        workers!.get(group) ?? 0,
        periodDays,
        law,
      )) {
        const minor = Math.min(line.minor, gross - taxes);
        if (minor <= 0) continue;
        lines.push({ accountId: line.accountId, deltaMinor: minor });
        taxes += minor;
        const key = `${rt.store.groups[group]!.id}|${api.state.date.slice(0, 4)}|${line.jurisdiction}|${line.tax}`;
        rt.withheld.set(key, (rt.withheld.get(key) ?? 0) + minor);
      }
    if (leave && rt.store.groups[group]!.placeId === leave.townPlaceId) {
      const premium = paidLeavePremium(
        gross,
        gross - taxes,
        leave.share,
        workers!.get(group) ?? 0,
      );
      if (premium > 0) {
        lines.push({
          accountId: `cash:${leave.treasuryId}:residual`,
          deltaMinor: premium,
        });
        taxes += premium;
        lawApplied(api, {
          key: PAID_LEAVE_KEY,
          lawId: leave.lawId,
          targetId: `counted-workers:${rt.store.groups[group]!.id}`,
          target: "group",
          engine: BUDGETS_MODULE_ID,
          what: "leave-premium-withheld",
          count: workers!.get(group) ?? 0,
          amountMinor: premium,
        });
        const key = `${rt.store.groups[group]!.id}|${api.state.date.slice(0, 4)}|${leave.lawId}|paid-leave`;
        rt.withheld.set(key, (rt.withheld.get(key) ?? 0) + premium);
      }
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
      source: leave
        ? {
            ...input.source,
            citation: `${input.source.citation}; paid-leave contribution under ${leave.lawId}`,
          }
        : input.source,
    });
  return net;
}

/**
 * The counted group, by its own id, that holds a counted household's money: the
 * name an engine records a payment under when it says whom it reached (the
 * group's fund account carries the same id).
 */
export function countedGroupIdOf(
  api: CoreAPI,
  householdId: string,
): string | undefined {
  const rt = residentsRuntime(api.state as CoreState);
  const h = rt ? householdById(rt, householdId) : undefined;
  return rt && h ? rt.store.groups[h.group]?.id : undefined;
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
    /** The amount is the whole record's, not one household's; the return is what moved. */
    whole?: true;
    reasonKey: string;
    source: Source;
  },
): number {
  const rt = residentsRuntime(api.state as CoreState);
  if (!rt || !input.amountMinor) return 0;
  const asked = input.amountMinor;
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
  // The engine's amount is for one household; the record stands for its weight.
  const times = h && !h.gone && !input.whole ? rt.store.weightOf(h) : 1;
  const amountMinor = times === 1 ? asked : Math.round(asked * times);
  // What the caller is told is in its own units: one household's.
  const perHousehold = (moved: number) =>
    times === 1 ? moved : Math.min(Math.abs(asked), Math.round(moved / times));
  if (h && !h.gone) weights = new Map([[h.group, 1]]);
  else {
    api.stopgap(UNKEYED_STOPGAP);
    weights = placeWeights(rt, input.placeId);
  }
  const other = api.accounts().main(input.otherOwnerId);
  if (![...weights.values()].some((v) => v > 0)) {
    // No counted groups here: the place's residents account pays or is paid itself.
    const owner = rt.input.accounts.find(
      (row) => row.placeId === input.placeId,
    )?.accountId;
    if (!owner) return 0;
    const residents = api.accounts().main(owner);
    return api.accounts().transfer({
      id: input.id,
      from: amountMinor > 0 ? residents : other,
      to: amountMinor > 0 ? other : residents,
      amountMinor: Math.abs(amountMinor),
      reasonKey: input.reasonKey,
      source: input.source,
      partial: true,
    }).paidMinor;
  }
  const flow: SplitFlow = {
    id: input.id,
    kind: amountMinor > 0 ? "purchase" : "retirement",
    financeKind: input.reasonKey,
    placeId: input.placeId,
  };
  if (amountMinor > 0) {
    const shares = splitWhole(amountMinor, weights);
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
    return perHousehold(paid);
  }
  const amount = Math.min(
    -amountMinor,
    (api.state as CoreState).organizations.get(input.otherOwnerId)
      ?.outsideFlow !== undefined
      ? -amountMinor
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
  return perHousehold(amount);
}
