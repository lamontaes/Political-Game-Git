/**
 * Group B mechanics that run through an engine: budget lines reaching what
 * they pay for (public staff pay, a monthly assistance benefit from the
 * treasury), acts that move budget money (highway funds to transit, pension
 * contributions, fare replacement, balancing), a treasury reserve, and the
 * law rows an income-tax act writes for payroll withholding to collect.
 * Money moves only through the accounts journal; pay only through rerateJob.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreState, JobInput, Source } from "../types";
import {
  lineBeforeBill,
  amendBudget,
  BUDGETS_MODULE_ID,
  budgetsOf,
  governments,
  type BudgetRow,
  type GovernmentRow,
} from "../modules/budgets";
import { enactLaw, lawChain, lawInForce } from "../modules/laws";
import { countedJob, residentsRuntime } from "../modules/residents";
import type { LawRowInput } from "../laws-starting";
import {
  graduatedSchedule,
  reachParameter,
  townFacts,
  type ResidentFacts,
  type TownFacts,
} from "./group-b-people";
import { getRow, putRow, rowsOf } from "./group-b-store";
import { registerLinePayments } from "../budgets-treasury";
import tuition from "../data/opening-private-tuition.json" with { type: "json" };

export const source = (api: CoreAPI, citation: string): Source => ({
  tag: "SOURCED",
  citation,
  asOf: api.state.date,
});

/** The government at a law's or budget's level, if the town has one there. */
export function governmentAt(
  api: CoreAPI,
  level: string,
): GovernmentRow | undefined {
  // A world without budgets has no government books to move.
  if (!(api.state as CoreState).modules.has(BUDGETS_MODULE_ID))
    return undefined;
  return governments(api).find((g) => g.level === level);
}

/** The budget in force today for a government. */
export function budgetNow(api: CoreAPI, govId: string): BudgetRow | undefined {
  const today = api.state.date;
  return [...budgetsOf(api, govId)]
    .filter((b) => b.startsOn <= today)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
}

/** The town's residents as the government's share of its people (1 for the city). */
export function townShare(api: CoreAPI, gov: GovernmentRow): number {
  if (gov.level === "city") return 1;
  const residents = residentsOf(api, gov);
  if (residents <= 0) return 0;
  return Math.min(1, townPopulation(api) / residents);
}

/**
 * The town's population: its recorded reference population, else (a place
 * whose count isn't held, as in some island areas) everyone modeled there.
 */
export function townPopulation(api: CoreAPI): number {
  const recorded = Number(api.state.placeMetadata.referencePopulation);
  if (Number.isFinite(recorded) && recorded > 0) return recorded;
  return townFacts(api, lawChain(api).townPlaceId).modeled;
}

/** A government's residents, from the budgets module (island areas included, from the Census). */
export function residentsOf(_api: CoreAPI, gov: GovernmentRow): number {
  return gov.residents;
}

/** Modeled residents (named and counted) as a share of the town's real population. */
export function modeledShare(api: CoreAPI, facts: TownFacts): number {
  return Math.min(1, facts.modeled / Math.max(1, townPopulation(api)));
}

/** A budget line's base this fiscal year: the line as adopted, before any act changed it. */
function baseLine(
  api: CoreAPI,
  gov: GovernmentRow,
  budget: BudgetRow,
  line: string,
) {
  // The line before this year's budget bill and any act amending it: what
  // the body adopts this year is a change the line's service carries.
  return lineBeforeBill(api, gov, budget.fiscalYear, line);
}

export interface ServiceRow {
  readonly id: string;
  readonly line: string;
  /** The town's share of the line at its base, and its change, in cents a year. */
  readonly baseTownMinor: number;
  readonly deltaTownMinor: number;
  /** Line now against base (1 = base). */
  readonly level: number;
  readonly byGovernment: Readonly<Record<string, number>>;
}

/** A budget line's level for the town, across every government that carries it. */
export function serviceLevel(api: CoreAPI, line: string): ServiceRow {
  let base = 0;
  let delta = 0;
  const byGovernment: Record<string, number> = {};
  for (const gov of governments(api)) {
    const share = townShare(api, gov);
    const budget = budgetNow(api, gov.id);
    if (!share || !budget) continue;
    const b = baseLine(api, gov, budget, line);
    const now = budget.spendingMinor[line] ?? 0;
    base += b * share;
    delta += (now - b) * share;
    if (now !== b) byGovernment[gov.id] = Math.round((now - b) * share);
  }
  const row: ServiceRow = {
    id: line,
    line,
    baseTownMinor: Math.round(base),
    deltaTownMinor: Math.round(delta),
    level: base > 0 ? (base + delta) / base : 1,
    byGovernment,
  };
  putRow(api, "services", row);
  return row;
}

/** Jobs at the town's employers of these classifications, named and counted. */
export function jobsAt(
  api: CoreAPI,
  classifications: readonly string[],
  occupation?: string,
): JobInput[] {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const fits = (job: JobInput) => {
    const org = core.organizations.get(job.organizationId);
    return (
      !!org &&
      org.placeId === town &&
      classifications.includes(org.classification ?? "") &&
      (occupation === undefined || job.occupationClassification === occupation)
    );
  };
  const out: JobInput[] = [];
  for (const job of core.jobs.values())
    if (job.endsAt === undefined && fits(job)) out.push(job);
  const rt = residentsRuntime(core);
  if (rt)
    for (const job of rt.jobs.values())
      if (!core.jobs.has(job.id) && countedJob(core, job.id) && fits(job))
        out.push(countedJob(core, job.id)!);
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

interface PayBase {
  readonly id: string;
  readonly key: string;
  readonly jobId: string;
  readonly hourlyMinor: number;
  readonly dailyMinor: number;
  /** The rate this line last wrote (the base until it first writes). */
  readonly appliedMinor?: number;
  /** The factor the line last applied to the base (1 until it first writes). */
  readonly factor?: number;
}

/**
 * A line's change reaches its public staff's pay: the town's share of the
 * change, times the share of such spending that is compensation, spread over
 * the staff's base payroll, from each job's base rate (so a reversed change
 * returns pay to base). Returns each named worker's new hourly rate.
 */
export function scalePayroll(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jobs: readonly JobInput[];
    readonly townDeltaMinor: number;
    readonly compensationShare: number;
    readonly modeledShare: number;
  },
): Map<string, number> {
  const core = api.state as CoreState;
  const jobOf = (jobId: string) =>
    core.jobs.get(jobId) ?? countedJob(core, jobId) ?? undefined;
  const bases = input.jobs.map((job) => {
    const id = `pay|${input.key}|${job.id}`;
    const prior = getRow<PayBase>(api, "taken", id);
    if (!prior) {
      const row: PayBase = {
        id,
        key: input.key,
        jobId: job.id,
        hourlyMinor: job.hourlyMinor ?? 0,
        dailyMinor: job.wageDailyMinor,
        appliedMinor: job.hourlyMinor ?? 0,
        factor: 1,
      };
      putRow(api, "taken", row);
      return row;
    }
    // Another rule re-rated this job since this line last wrote it (a salary
    // floor, a raise): the base follows that rate, less this line's own
    // factor, so returning to base never undoes the other rule's raise.
    const live = job.hourlyMinor ?? 0;
    const applied = prior.appliedMinor ?? prior.hourlyMinor;
    if (live > 0 && live !== applied) {
      const factor = prior.factor ?? 1;
      const row: PayBase = {
        ...prior,
        hourlyMinor: Math.round(live / factor),
        dailyMinor: Math.round(job.wageDailyMinor / factor),
        appliedMinor: live,
      };
      putRow(api, "taken", row);
      return row;
    }
    return prior;
  });
  const payroll =
    bases.reduce((n, b) => n + b.dailyMinor, 0) * reachParameter("daysPerYear");
  const raise =
    payroll > 0
      ? (input.townDeltaMinor * input.compensationShare * input.modeledShare) /
        payroll
      : 0;
  const out = new Map<string, number>();
  for (const base of bases) {
    if (base.hourlyMinor <= 0) continue;
    const hourly = Math.max(1, Math.round(base.hourlyMinor * (1 + raise)));
    const job = jobOf(base.jobId);
    if (!job) continue;
    if (job.hourlyMinor !== hourly) {
      api.rerateJob(
        base.jobId,
        hourly,
        source(api, `Budget line ${input.key} as amended`),
      );
      out.set(base.jobId, hourly);
    }
    putRow(api, "taken", {
      ...base,
      // What the job now pays, read back (a counted job may store it rounded).
      appliedMinor: jobOf(base.jobId)?.hourlyMinor ?? hourly,
      factor: 1 + raise,
    });
  }
  return out;
}

interface BenefitRow {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
  readonly amountMinor: number;
  /** The budget line the benefit is paid from. */
  readonly line?: string;
}

/**
 * Each month's close counts the benefits and vouchers a treasury pays in town
 * as that line's spending, so the line pays only the rest outside.
 */
registerLinePayments((api, gov) => {
  const accounts = api.accounts();
  const out: Record<string, number> = {};
  for (const row of rowsOf<BenefitRow>(api, "taken")) {
    if (
      !(row.key.startsWith("benefit|") || row.key.startsWith("voucher|")) ||
      row.governmentId !== gov.id
    )
      continue;
    if (accounts.obligation(row.obligationId)?.endedAt) continue;
    const line = row.line ?? "welfareAndMedicaid";
    out[line] = (out[line] ?? 0) + row.amountMinor;
  }
  return out;
});

/**
 * The monthly payments a law has a treasury owe, kept as accounts obligations:
 * `want` maps "governmentId|recipientId" to the monthly amount. A payment that
 * is no longer wanted, or whose amount changed, is ended; a new or changed one
 * opens from tomorrow, a month at a time. A treasury pays what it holds.
 */
function reconcileObligations(
  api: CoreAPI,
  input: {
    readonly rowKind: "benefit" | "voucher";
    readonly key: string;
    readonly want: ReadonlyMap<string, number>;
    readonly line?: string;
    readonly reasonKey: string;
    readonly citation: string;
  },
): void {
  const accounts = api.accounts();
  const { want } = input;
  const first = makeIsoDate(addDays(makeIsoDate(api.state.date), 1));
  const existing = rowsOf<BenefitRow>(api, "taken").filter(
    (r) => r.key === `${input.rowKind}|${input.key}`,
  );
  for (const row of existing) {
    if (want.get(`${row.governmentId}|${row.recipientId}`) === row.amountMinor)
      continue;
    if (!accounts.obligation(row.obligationId)?.endedAt)
      accounts.endObligation(row.obligationId);
    putRow(api, "taken", { ...row, key: `ended|${input.key}` });
  }
  const kept = new Set(
    existing
      .filter(
        (r) => want.get(`${r.governmentId}|${r.recipientId}`) === r.amountMinor,
      )
      .map((r) => `${r.governmentId}|${r.recipientId}`),
  );
  for (const [pair, amountMinor] of want) {
    if (kept.has(pair)) continue;
    const [governmentId, recipientId] = pair.split("|") as [string, string];
    const gov = governments(api).find((g) => g.id === governmentId)!;
    // A second change the same day (two amendments) opens a new obligation beside the one it ended.
    const today = `reach-b:${input.rowKind}:${pair}:${api.state.date}`;
    let obligationId = today;
    for (let n = 2; accounts.obligation(obligationId); n += 1)
      obligationId = `${today}#${n}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(gov.organizationId),
      to: accounts.main(recipientId),
      amountMinor,
      firstDueAt: first,
      cadence: { kind: "months", every: reachParameter("reviewEveryMonths") },
      accruesArrears: false,
      reasonKey: input.reasonKey,
      source: source(api, input.citation),
    });
    putRow(api, "taken", {
      id: `${input.rowKind}|${obligationId}`,
      key: `${input.rowKind}|${input.key}`,
      governmentId,
      recipientId,
      obligationId,
      amountMinor,
      ...(input.line ? { line: input.line } : {}),
    } satisfies BenefitRow);
  }
}

/** An assistance work requirement in force: who it reaches and how long they may draw. */
export interface AssistanceTimeLimit {
  /** The law row the requirement was read from. */
  readonly lawId: string;
  /** The day the requirement took effect. */
  readonly since: string;
  /** Residents (named or counted) it reaches today, by hours and income. */
  readonly reachedIds: ReadonlySet<string>;
}

/** Whole months from one day to another. */
function monthsBetween(from: string, to: string): number {
  const months =
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) *
      reachParameter("monthsPerYear") +
    (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
  return to.slice(8, 10) < from.slice(8, 10) ? months - 1 : months;
}

/**
 * Those the work requirement has stopped paying. The clock starts the day the
 * benefit first paid under the requirement (7 U.S.C. 2015(o)(2): three months
 * in any 36), the same clock for everyone reached; the ids are returned so the
 * caller keeps them off the pay list, and each named person's stop is recorded
 * with the law row that caused it.
 */
function timeLimitedNow(
  api: CoreAPI,
  governmentId: string,
  key: string,
  limit: AssistanceTimeLimit | null | undefined,
): Set<string> {
  const stopped = new Set<string>();
  if (!limit) return stopped;
  const today = api.state.date;
  const clockId = `clock|${key}|${governmentId}`;
  const clock =
    getRow<{ id: string; startedOn: string }>(api, "taken", clockId) ??
    (() => {
      const row = {
        id: clockId,
        key: `clock|${key}`,
        startedOn: today > limit.since ? today : limit.since,
      };
      putRow(api, "taken", row);
      return row;
    })();
  const start = clock.startedOn < limit.since ? limit.since : clock.startedOn;
  const cyclePosition =
    monthsBetween(start, today) %
    reachParameter("snapWorkTimeLimitWindowMonths");
  if (cyclePosition < reachParameter("snapWorkTimeLimitMonths")) return stopped;
  for (const id of limit.reachedIds) {
    stopped.add(id);
    if (api.state.people.has(id))
      putRow(api, "taken", {
        id: `limit|${key}|${governmentId}|${id}`,
        key: `limit|${key}`,
        recipientId: id,
        lawId: limit.lawId,
        stoppedOn: today,
      });
  }
  return stopped;
}

/**
 * The assistance benefit a welfare line's increase pays: the town's share of
 * the increase, a month at a time, split evenly over the eligible households
 * (named household heads and counted households, scaled to the town), owed
 * each month from that government's treasury. A treasury pays what it holds;
 * the rest is short that month (accounts records it). Returns each named
 * recipient's monthly amount.
 */
export function payBenefits(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly service: ServiceRow;
    readonly heads: readonly ResidentFacts[];
    readonly modeledShare: number;
    /** A work requirement in force: who it reaches, and how long it lets them draw. */
    readonly timeLimit?: AssistanceTimeLimit | null;
  },
): Map<string, Record<string, number>> {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const rt = residentsRuntime(core);
  const residentsOrg = rt?.input.accounts.find(
    (a) => a.placeId === town,
  )?.accountId;
  const months = reachParameter("monthsPerYear");
  const want = new Map<string, number>();
  const out = new Map<string, Record<string, number>>();
  for (const [govId, delta] of Object.entries(input.service.byGovernment)) {
    const gov = governments(api).find((g) => g.id === govId);
    if (!gov || delta <= 0 || !input.heads.length) continue;
    // The work requirement lets those it reaches draw only for its time limit;
    // the line's money goes to those still drawing.
    const limited = timeLimitedNow(api, govId, input.key, input.timeLimit);
    const drawing = input.heads.filter((h) => !limited.has(h.id));
    const named = drawing.filter((h) => h.named);
    // Real heads: a counted row stands for as many households as its weight says.
    const everyone = drawing.reduce((n, h) => n + (h.scale ?? 1), 0);
    const counted = everyone - named.length;
    if (!drawing.length) continue;
    const perHousehold = Math.floor(
      (delta * input.modeledShare) / months / everyone,
    );
    if (perHousehold <= 0) continue;
    for (const head of named) {
      want.set(`${govId}|${head.id}`, perHousehold);
      const terms = out.get(head.id) ?? { monthlyMinor: 0 };
      terms.monthlyMinor! += perHousehold;
      out.set(head.id, terms);
    }
    if (counted && residentsOrg)
      // A fitted weight is not a whole number; an obligation is whole cents.
      want.set(`${govId}|${residentsOrg}`, Math.floor(perHousehold * counted));
  }
  reconcileObligations(api, {
    rowKind: "benefit",
    key: input.key,
    want,
    line: input.service.line,
    reasonKey: "law-reach:assistance-benefit",
    citation: `Budget line ${input.key} as amended`,
  });
  return out;
}

/**
 * The share of a private school's average tuition a voucher covers: the
 * voucher's amount over the NCES average tuition, never more than all of it.
 */
export function voucherShare(api: CoreAPI): number {
  return Math.min(
    1,
    reachParameter("voucherAmountDollars") /
      api.parameter("openingPrivateTuitionAnnualUsd"),
  );
}

/**
 * A public-funds-for-private-schooling law makes the state treasury pay its
 * share of the tuition the town's households already pay the private school
 * (`opening-private-tuition.ts`, a monthly contract per household). A full
 * household is paid on the adult who pays the contract; the counted
 * households' tuition is one monthly flow, so the share of it is paid through
 * the town's residents account, as the assistance benefit is. A repeal, or a
 * household whose tuition ended, ends the payment. Tuition is the town's
 * average spread over its families, not a choice of who goes private, so the
 * voucher follows the contract, not an enrollment (stopgap
 * SG-GOV-REACH-B-voucher-payment). Returns each named household's monthly
 * voucher and how many counted households are paid.
 */
export function payVouchers(
  api: CoreAPI,
  input: { readonly key: string; readonly inForce: boolean },
): {
  readonly named: ReadonlyMap<string, Record<string, number>>;
  readonly counted: number;
} {
  const core = api.state as CoreState;
  // With no budgets module there is no state treasury to pay from, and no
  // obligation of this law to end.
  if (!core.modules.has(BUDGETS_MODULE_ID))
    return { named: new Map(), counted: 0 };
  const town = lawChain(api).townPlaceId;
  const state = governmentAt(api, "state");
  const want = new Map<string, number>();
  const named = new Map<string, Record<string, number>>();
  let counted = 0;
  if (input.inForce && state) {
    const share = voucherShare(api);
    for (const contract of core.finance.contracts.values()) {
      if (contract.kind !== tuition.contractKind || contract.endedAt) continue;
      const payer = contract.payerIds[0];
      if (!payer || core.people.get(payer)?.placeId !== town) continue;
      const amount = Math.floor(contract.amountMinor * share);
      if (amount <= 0) continue;
      const pair = `${state.id}|${payer}`;
      want.set(pair, (want.get(pair) ?? 0) + amount);
      named.set(payer, { monthlyMinor: want.get(pair)! });
    }
    const rt = residentsRuntime(core);
    const residentsOrg = rt?.input.accounts.find(
      (a) => a.placeId === town,
    )?.accountId;
    let countedTuition = 0;
    for (const flow of rt?.flows.values() ?? []) {
      if (
        flow.kind !== "purchase" ||
        flow.financeKind !== tuition.contractKind ||
        flow.placeId !== town ||
        flow.endedAt
      )
        continue;
      countedTuition += flow.amountMinor;
      counted += Object.keys(flow.amountByContract ?? {}).length;
    }
    const amount = Math.floor(countedTuition * share);
    if (residentsOrg && amount > 0)
      want.set(`${state.id}|${residentsOrg}`, amount);
    else counted = 0;
  }
  reconcileObligations(api, {
    rowKind: "voucher",
    key: input.key,
    want,
    line: "schools",
    reasonKey: "law-reach:school-voucher",
    citation: `Public funds for private schooling (${input.key}): the state pays its share of private tuition`,
  });
  return { named, counted };
}

interface MoveRow {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly budgetId: string;
  readonly moves: Readonly<Record<string, number>>;
  readonly undone: boolean;
}

/**
 * An act that moves budget money at its level: `plan` says how much each line
 * changes in the budget in force; applied once per fiscal year while the act
 * stands, reversed for the current year on repeal.
 */
export function moveBudget(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly level: string;
    readonly inForce: boolean;
    readonly lawId: string;
    readonly plan: (
      gov: GovernmentRow,
      budget: BudgetRow,
    ) => Record<string, number>;
  },
): MoveRow | null {
  const gov = governmentAt(api, input.level);
  if (!gov) return null;
  const budget = budgetNow(api, gov.id);
  if (!budget) return null;
  const id = `move|${input.key}|${gov.id}`;
  const prior = getRow<MoveRow>(api, "taken", id);
  const stamp = `${input.lawId}#${api.state.date}`;
  if (!input.inForce) {
    if (!prior || prior.undone || prior.budgetId !== budget.id)
      return prior ?? null;
    for (const [line, delta] of Object.entries(prior.moves))
      if (delta)
        amendBudget(api, {
          governmentId: gov.id,
          line,
          deltaMinor: -delta,
          measureId: `${stamp}#undo`,
        });
    const row = { ...prior, undone: true };
    putRow(api, "taken", row);
    return row;
  }
  if (prior && !prior.undone && prior.budgetId === budget.id) return prior;
  const moves = input.plan(gov, budget);
  for (const [line, delta] of Object.entries(moves))
    if (delta)
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: delta,
        measureId: stamp,
      });
  const row: MoveRow = {
    id,
    key: input.key,
    governmentId: gov.id,
    budgetId: budget.id,
    moves,
    undone: false,
  };
  putRow(api, "taken", row);
  return row;
}

/** Debt interest lines: the state and local name, and the federal one. */

/** Cuts every line but debt interest in proportion until spending fits revenue. */
export interface BalanceRule {
  /** Lines the law never cuts (debt service; at the federal level, the benefits sequestration exempts). */
  readonly exempt: readonly string[];
  /** Lines cut at most this share of themselves (Medicare under sequestration). */
  readonly caps: Readonly<Record<string, number>>;
  /** Fiscal years over which the gap is closed in equal steps (1: at once). */
  readonly phaseYears: number;
}

/** A budget's gap: spending over revenue (zero or less when it balances). */
export function budgetGap(budget: BudgetRow): number {
  const spending = Object.values(budget.spendingMinor).reduce(
    (a, b) => a + b,
    0,
  );
  const revenue = Object.values(budget.revenueMinor).reduce((a, b) => a + b, 0);
  return spending - revenue;
}

/**
 * The cuts that balance a budget: its gap spread as one share across the
 * lines the law lets it cut, a capped line cut no deeper than its cap (the
 * rest falls on the others). Exempt lines, and the revenue, are untouched.
 * Where the law phases the balance in, the deficit allowed falls in equal
 * steps from the gap the law first met (`firstGap`) to none in its last
 * year, and a year cuts only what exceeds its step (`yearsApplied` years
 * already done of `phaseYears`).
 */
export function balancePlan(
  budget: BudgetRow,
  rule: BalanceRule,
  yearsApplied = 0,
  firstGap = budgetGap(budget),
): Record<string, number> {
  const lines = Object.entries(budget.spendingMinor).sort();
  const spending = lines.reduce((a, [, minor]) => a + minor, 0);
  const revenue = Object.values(budget.revenueMinor).reduce((a, b) => a + b, 0);
  const allowed =
    firstGap *
    Math.max(0, 1 - (yearsApplied + 1) / Math.max(1, rule.phaseYears));
  let gap = spending - revenue - allowed;
  if (gap <= 0) return {};
  const out: Record<string, number> = {};
  let open = lines.filter(
    ([line, minor]) => minor > 0 && !rule.exempt.includes(line),
  );
  // A capped line takes its cap when the common share would cut it deeper;
  // the share is then found again over the rest.
  for (;;) {
    const base = open.reduce((a, [, minor]) => a + minor, 0);
    if (base <= 0) break;
    const ratio = Math.min(1, gap / base);
    const capped = open.filter(
      ([line]) => rule.caps[line] !== undefined && rule.caps[line]! < ratio,
    );
    if (!capped.length) {
      for (const [line, minor] of open) out[line] = -Math.ceil(minor * ratio);
      break;
    }
    for (const [line, minor] of capped) {
      const cut = Math.ceil(minor * rule.caps[line]!);
      out[line] = -cut;
      gap -= cut;
    }
    open = open.filter(([line]) => !capped.some(([c]) => c === line));
  }
  return out;
}

interface ReserveRow {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly accountId: string;
  readonly targetMinor: number;
}

/**
 * A minimum reserve: the treasury sets aside its share of the year's
 * spending (scaled to the modeled town) in a reserve account, as its cash
 * allows; topped up on each review, released on repeal.
 */
export function holdReserve(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly level: string;
    readonly inForce: boolean;
    readonly modeledShare: number;
  },
): { held: number; target: number } | null {
  const gov = governmentAt(api, input.level);
  if (!gov) return null;
  const core = api.state as CoreState;
  const accounts = api.accounts();
  const main = accounts.main(gov.organizationId);
  const accountId = `reserve:${gov.organizationId}`;
  if (!core.cashJournal.accounts.has(accountId))
    accounts.open({
      id: accountId,
      ownerId: gov.organizationId,
      name: "minimum reserve",
      source: source(api, "Minimum reserve balance act"),
    });
  const held = accounts.balance(accountId);
  const id = `reserve|${input.key}|${gov.id}`;
  if (!input.inForce) {
    if (held > 0)
      accounts.transfer({
        id: `reach-b:reserve-release:${gov.id}:${api.state.date}`,
        from: accountId,
        to: main,
        amountMinor: held,
        reasonKey: "law-reach:reserve-released",
        source: source(api, "Minimum reserve balance repealed"),
      });
    putRow(api, "taken", {
      id,
      key: input.key,
      governmentId: gov.id,
      accountId,
      targetMinor: 0,
    } satisfies ReserveRow);
    return { held: 0, target: 0 };
  }
  const budget = budgetNow(api, gov.id);
  const spending = budget
    ? Object.values(budget.spendingMinor).reduce((a, b) => a + b, 0)
    : 0;
  const target = Math.round(
    spending *
      reachParameter("reserveShareOfSpending") *
      townShare(api, gov) *
      input.modeledShare,
  );
  const need = Math.max(0, target - held);
  const receipt =
    need > 0
      ? accounts.transfer({
          id: `reach-b:reserve:${gov.id}:${api.state.date}`,
          from: main,
          to: accountId,
          amountMinor: need,
          reasonKey: "law-reach:reserve-set-aside",
          source: source(api, "Minimum reserve balance act"),
          partial: true,
        })
      : null;
  putRow(api, "taken", {
    id,
    key: input.key,
    governmentId: gov.id,
    accountId,
    targetMinor: target,
  } satisfies ReserveRow);
  return { held: held + (receipt?.paidMinor ?? 0), target };
}

interface TaxRow {
  readonly id: string;
  readonly key: string;
  readonly level: string;
  readonly lawRowId: string | null;
  readonly prior: {
    value: number | null;
    unit: string | null;
    terms: Record<string, unknown> | null;
  } | null;
  readonly undone: boolean;
  /** This row flattened a starting schedule, rather than adopting a new tax. */
  readonly flattened?: boolean;
}

function levelRow(api: CoreAPI, level: string): LawRowInput | null {
  return (
    lawInForce(api, "income-tax").levels.find((l) => l.level === level)?.row ??
    null
  );
}

/** Flat taxes may also carry a one-bracket schedule for deductions. */
function graduatedTax(row: LawRowInput | null): boolean {
  if (!row?.terms?.schedules || row.terms.system === "flat") return false;
  if (row.terms.system === "graduated") return true;
  const schedules = row.terms.schedules as Record<
    string,
    { brackets?: { rate: number }[] }
  >;
  return Object.values(schedules).some(
    (schedule) => new Set(schedule.brackets?.map((b) => b.rate) ?? []).size > 1,
  );
}

/**
 * An income-tax act at a level: adopt a flat tax where the level has none, or
 * replace a flat tax with a graduated schedule. The new row is law today, and
 * payroll withholding (budgets module) collects it from the next paycheck. A
 * repeal restores the level's prior row (or no tax).
 */
export function incomeTaxAct(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly level: string;
    readonly lawId: string;
    readonly enacting: boolean;
    readonly graduated: boolean;
  },
): TaxRow | null {
  const chain = lawChain(api);
  const at = chain.levels.find((l) => l.level === input.level);
  if (!at) return null;
  const id = `tax|${input.key}|${input.level}`;
  const prior = getRow<TaxRow>(api, "taken", id);
  const current = levelRow(api, input.level);
  const enact = (
    value: number,
    unit: string,
    terms: Record<string, unknown> | undefined,
    tag: string,
  ) =>
    enactLaw(api, {
      jurisdiction: at.jurisdiction,
      level: at.level,
      series: "income-tax",
      value,
      unit,
      effectiveDate: api.state.date,
      measureId: `${tag}:${input.lawId}`,
      citation: `Act ${input.lawId}`,
      ...(terms ? { terms } : {}),
    });
  const hasTax = !!current && (current.value ?? 0) > 0;
  const scope = input.level === "state" ? "state" : "local";
  if (!input.enacting) {
    // Repeated reviews leave the flattened schedule (or a later independent act) alone.
    if (prior?.flattened && !prior.undone) return prior;
    if (prior?.undone && !prior.flattened) return prior;
    if (!prior || prior.undone || !prior.lawRowId) {
      if (!input.graduated || !hasTax || !graduatedTax(current))
        return prior ?? null;
      // stopgapId: SG-GOV-REACH-B-flat-tax-replacement — the catalog's binary
      // question carries no enacted replacement rate or deduction rules.
      api.stopgap("SG-GOV-REACH-B-flat-tax-replacement");
      const flat = enact(
        reachParameter(
          scope === "state"
            ? "stateFlatIncomeTaxPercent"
            : "localFlatIncomeTaxPercent",
        ),
        "percent-flat",
        undefined,
        "flatten",
      );
      const row: TaxRow = {
        id,
        key: input.key,
        level: input.level,
        lawRowId: flat.id,
        prior: {
          value: current!.value,
          unit: current!.unit ?? null,
          terms: current!.terms as Record<string, unknown>,
        },
        undone: false,
        flattened: true,
      };
      putRow(api, "taken", row);
      return row;
    }
    if (current?.id === prior.lawRowId)
      enact(
        prior.prior?.value ?? 0,
        prior.prior?.unit ?? "percent-flat",
        prior.prior?.terms ?? undefined,
        "repeal",
      );
    const row = { ...prior, undone: true };
    putRow(api, "taken", row);
    return row;
  }
  if (prior?.flattened) {
    // Restore once, only while the replacement is still our own law row.
    if (prior.undone) return prior;
    if (current?.id === prior.lawRowId)
      enact(
        prior.prior?.value ?? 0,
        prior.prior?.unit ?? "percent",
        prior.prior?.terms ?? undefined,
        "restore",
      );
    const row = { ...prior, undone: true };
    putRow(api, "taken", row);
    return row;
  }
  if (prior && !prior.undone) return prior;
  const graduatedNow = hasTax && graduatedTax(current);
  let written: LawRowInput | null = null;
  if (!input.graduated && !hasTax)
    written = enact(
      reachParameter(
        scope === "state"
          ? "stateFlatIncomeTaxPercent"
          : "localFlatIncomeTaxPercent",
      ),
      "percent-flat",
      undefined,
      "adopt",
    );
  if (input.graduated && !graduatedNow) {
    const schedule = graduatedSchedule(scope);
    written = enact(
      Math.max(...schedule.brackets.map((b) => b.rate)),
      "percent",
      { system: "graduated", schedules: { single: schedule } },
      "graduate",
    );
  }
  const row: TaxRow = {
    id,
    key: input.key,
    level: input.level,
    lawRowId: written?.id ?? null,
    prior: current
      ? {
          value: current.value,
          unit: current.unit ?? null,
          terms: (current.terms as Record<string, unknown> | undefined) ?? null,
        }
      : null,
    undone: false,
  };
  putRow(api, "taken", row);
  return row;
}

/** Raise every covered teacher paid under the floor to it (through rerateJob). */
export function raiseToSalaryFloor(
  api: CoreAPI,
  jobs: readonly JobInput[],
  floorDollars: number,
  lawId: string,
): Map<string, { fromMinor: number; toMinor: number }> {
  const floorDaily =
    (floorDollars * reachParameter("centsPerDollar")) /
    reachParameter("daysPerYear");
  const out = new Map<string, { fromMinor: number; toMinor: number }>();
  for (const job of jobs) {
    const hourly = job.hourlyMinor ?? 0;
    if (hourly <= 0 || job.wageDailyMinor >= floorDaily) continue;
    const to = Math.ceil((hourly * floorDaily) / job.wageDailyMinor);
    api.rerateJob(job.id, to, source(api, `Teacher minimum salary (${lawId})`));
    out.set(job.id, { fromMinor: hourly, toMinor: to });
  }
  return out;
}
