/**
 * Group B mechanics that run through an engine: budget lines reaching what
 * they pay for (public staff pay, a monthly assistance benefit from the
 * treasury), acts that move budget money (highway funds to transit, pension
 * contributions, fare replacement, balancing), a treasury reserve, and the
 * law rows an income-tax act writes for payroll withholding to collect.
 * Money moves only through the accounts journal; pay only through rerateJob.
 */
import {
  appliedOn,
  appliedTo,
  lawApplied,
  lawReachRuns,
  type AppliedTarget,
} from "./applied";
import { addDays, makeIsoDate } from "../kernel/dates";
import { coreAPI } from "../state";
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
import {
  countedJob,
  residentsRuntime,
  worldPrivateTuitionAnnualUsd,
} from "../modules/residents";
import type { LawRowInput } from "../laws-starting";
import {
  graduatedSchedule,
  reachParameter,
  townFacts,
  type ResidentFacts,
  type TownFacts,
} from "./group-b-people";
import { flowWeights, fundOf } from "../counted-money";
import {
  getRow,
  putRow,
  REACH_B_MODULE_ID,
  reachTable,
  rowsOf,
} from "./group-b-store";
import type { ModuleRow } from "../module-data";
import {
  fundFederalStanding,
  noteLinePaid,
  registerLinePayments,
} from "../budgets-treasury";
import tuition from "../data/opening-private-tuition.json" with { type: "json" };

export const source = (api: CoreAPI, citation: string): Source => ({
  tag: "SOURCED",
  citation,
  asOf: api.state.date,
});

/** The engine id law-applied rows from these payments carry. */
const APPLIED_ENGINE = "law-reach-group-b-payments";

/**
 * Record that a payment applied a law to a target, with the month's money.
 * The money counts once a day: a second pass the same day (another law
 * re-running the payment) records the target again but adds nothing.
 */
export function recordApplied(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly targetId: string;
    readonly target: AppliedTarget;
    readonly what: string;
    readonly count?: number;
    readonly amountMinor?: number;
  },
): void {
  const today = api.state.date;
  const paidToday = appliedTo(api, input.targetId).some(
    (r) => r.key === input.key && !r.endedOn && r.lastOn === today,
  );
  lawApplied(api, {
    ...input,
    engine: APPLIED_ENGINE,
    amountMinor: paidToday ? 0 : (input.amountMinor ?? 0),
  });
}

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

/** A budget line's level for the town, across every government that carries it (a pure read). */
export function lineLevel(api: CoreAPI, line: string): Omit<ServiceRow, "id"> {
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
  return {
    line,
    baseTownMinor: Math.round(base),
    deltaTownMinor: Math.round(delta),
    level: base > 0 ? (base + delta) / base : 1,
    byGovernment,
  };
}

/** A budget line's level for the town, kept as a row the line's services read. */
export function serviceLevel(api: CoreAPI, line: string): ServiceRow {
  const row: ServiceRow = { id: line, ...lineLevel(api, line) };
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
      !(
        row.key.startsWith("benefit|") ||
        row.key.startsWith("voucher|") ||
        row.key.startsWith("preschool|")
      ) ||
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
/** A recipient that is a counted group's fund account, not an owner's main account. */
const FUND = "fund-account:";

export function reconcileObligations(
  api: CoreAPI,
  input: {
    readonly rowKind: "benefit" | "voucher" | "preschool";
    readonly key: string;
    readonly want: ReadonlyMap<string, number>;
    readonly line?: string;
    readonly reasonKey: string;
    readonly citation: string;
    /**
     * The laws a payment from this government carries the keys of in its id,
     * so the journal entry of its money names them (the policy's key unless
     * the payment is set by other laws too: the SNAP benefit is the
     * maximum's).
     */
    readonly cites?: (governmentId: string) => readonly string[];
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
    const cited = (input.cites?.(governmentId) ?? [input.key]).join("+");
    const today = `reach-b:${input.rowKind}:${cited}:${pair}:${api.state.date}`;
    let obligationId = today;
    for (let n = 2; accounts.obligation(obligationId); n += 1)
      obligationId = `${today}#${n}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(gov.organizationId),
      to: recipientId.startsWith(FUND)
        ? recipientId.slice(FUND.length)
        : accounts.main(recipientId),
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
  // The federal treasury, which borrows any day, covers its new shares from
  // tomorrow; a state's or a town's pays from what it holds.
  if (
    [...want.keys()].some(
      (pair) =>
        governments(api).find((g) => g.id === pair.split("|")[0])?.level ===
        "federal",
    )
  )
    fundFederalStanding(api);
}

/** An assistance work requirement in force: who it reaches and how long they may draw. */
export interface AssistanceTimeLimit {
  /** The law row the requirement was read from. */
  readonly lawId: string;
  /** The day the requirement took effect. */
  readonly since: string;
  /** The policy key the requirement is recorded under. */
  readonly key: string;
  /** Residents (named or counted) it reaches today, by hours and income. */
  readonly reachedIds: ReadonlySet<string>;
  /** The people each counted row it reaches stands for. */
  readonly counts: ReadonlyMap<string, number>;
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
 * The work requirement was read for these residents: a named person is a
 * target of its own; the counted rows are one group whose count is the
 * people they stand for.
 */
function appliedToReached(
  api: CoreAPI,
  limit: AssistanceTimeLimit,
  ids: Iterable<string>,
  what: string,
): void {
  let people = 0;
  for (const id of ids) {
    if (api.state.people.has(id))
      recordApplied(api, {
        key: limit.key,
        lawId: limit.lawId,
        targetId: id,
        target: "person",
        what,
      });
    else people += limit.counts.get(id) ?? 0;
  }
  if (people > 0)
    recordApplied(api, {
      key: limit.key,
      lawId: limit.lawId,
      targetId: `${lawChain(api).townPlaceId}:assistance-adults-under-work-rule:${what}`,
      target: "group",
      what,
      count: Math.max(1, Math.round(people)),
    });
}

/** The months ("YYYY-MM") a person has drawn the benefit under the work requirement. */
interface DrawRow {
  readonly id: string;
  readonly key: string;
  readonly months: readonly string[];
}

/**
 * Whether a resident has drawn the benefit for the requirement's whole time
 * limit: the months they drew, within the window and since the requirement
 * took effect, not counting this month.
 */
export function timeLimitUsed(
  api: CoreAPI,
  id: string,
  since: string,
): boolean {
  const today = api.state.date;
  const thisMonth = today.slice(0, 7);
  const window = reachParameter("snapWorkTimeLimitWindowMonths");
  const drawn = (
    getRow<DrawRow>(api, "taken", `draw|${id}`)?.months ?? []
  ).filter(
    (m) =>
      m !== thisMonth &&
      m >= since.slice(0, 7) &&
      monthsBetween(`${m}-01`, today) < window,
  );
  return drawn.length >= reachParameter("snapWorkTimeLimitMonths");
}

/**
 * Those the work requirement has stopped paying (7 U.S.C. 2015(o)(2): three
 * months in any 36). Each person's own months of benefit under the
 * requirement count against their own window, from the day it took effect;
 * the ids are returned so the caller keeps them off the pay list, and each
 * named person's stop is recorded with the law row that caused it.
 */
export function timeLimitedNow(
  api: CoreAPI,
  governmentId: string,
  key: string,
  limit: AssistanceTimeLimit | null | undefined,
): Set<string> {
  const stopped = new Set<string>();
  if (!limit) return stopped;
  const today = api.state.date;
  for (const id of limit.reachedIds) {
    if (!timeLimitUsed(api, id, limit.since)) continue;
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
  appliedToReached(api, limit, stopped, "assistance-stopped");
  return stopped;
}

/** Those who draw this month under the requirement have the month counted against their own limit. */
export function recordDraws(
  api: CoreAPI,
  limit: AssistanceTimeLimit | null | undefined,
  drawing: Iterable<string>,
): void {
  if (!limit) return;
  const month = api.state.date.slice(0, 7);
  const reached = [...drawing].filter((id) => limit.reachedIds.has(id));
  appliedToReached(api, limit, reached, "assistance-draw-counted");
  for (const id of reached) {
    const row = getRow<DrawRow>(api, "taken", `draw|${id}`);
    if (row?.months.includes(month)) continue;
    putRow(api, "taken", {
      id: `draw|${id}`,
      key: "draw",
      months: [...(row?.months ?? []), month],
    } satisfies DrawRow);
  }
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
  const rt = residentsRuntime(core);
  const months = reachParameter("monthsPerYear");
  const want = new Map<string, number>();
  const out = new Map<string, Record<string, number>>();
  // What each household that draws is owed a month, named or counted: the
  // cash assistance the poverty measure counts as income.
  const monthlyByHousehold: Record<string, number> = {};
  for (const [govId, delta] of Object.entries(input.service.byGovernment)) {
    const gov = governments(api).find((g) => g.id === govId);
    if (!gov || delta <= 0 || !input.heads.length) continue;
    // The work requirement lets those it reaches draw only for its time limit;
    // the line's money goes to those still drawing.
    const limited = timeLimitedNow(api, govId, input.key, input.timeLimit);
    const drawing = input.heads.filter((h) => !limited.has(h.id));
    recordDraws(
      api,
      input.timeLimit,
      drawing.map((h) => h.id),
    );
    const named = drawing.filter((h) => h.named);
    // Real heads: a counted row stands for as many households as its weight says.
    const everyone = drawing.reduce((n, h) => n + (h.scale ?? 1), 0);
    const counted = everyone - named.length;
    if (!drawing.length) continue;
    const perHousehold = Math.floor(
      (delta * input.modeledShare) / months / everyone,
    );
    if (perHousehold <= 0) continue;
    for (const head of drawing)
      monthlyByHousehold[head.householdId] =
        (monthlyByHousehold[head.householdId] ?? 0) + perHousehold;
    for (const head of named) {
      want.set(`${govId}|${head.id}`, perHousehold);
      const terms = out.get(head.id) ?? { monthlyMinor: 0 };
      terms.monthlyMinor! += perHousehold;
      out.set(head.id, terms);
    }
    if (counted && rt) {
      // Each counted household's benefit lands in its own group's fund, so the
      // group that qualifies is the group that is paid. A fitted weight is not
      // a whole number; an obligation is whole cents.
      const byGroup = new Map<number, number>();
      for (const head of drawing) {
        if (head.named) continue;
        const ix = rt.store.householdOf.get(head.householdId);
        const group =
          ix === undefined ? undefined : rt.store.households[ix]?.group;
        if (group === undefined) continue;
        byGroup.set(group, (byGroup.get(group) ?? 0) + (head.scale ?? 1));
      }
      for (const [group, households] of byGroup) {
        const amount = Math.floor(perHousehold * households);
        if (amount > 0)
          want.set(`${govId}|${FUND}${fundOf(api, rt, group)}`, amount);
      }
    }
  }
  putRow(api, "taken", {
    id: `assist|${input.key}`,
    key: "assist",
    monthlyByHousehold,
  });
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
 * The cash assistance each household draws from the welfare line, in minor
 * units a year, by household (named households and counted records alike).
 * The poverty measure reads it as income, as the Census counts public
 * assistance in the income poverty status is computed from.
 */
export function assistanceIncomeByHousehold(
  core: CoreState,
): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  if (!core.modules.has(REACH_B_MODULE_ID)) return out;
  const row = getRow<{ monthlyByHousehold: Record<string, number> }>(
    coreAPI(core),
    "taken",
    "assist|budget-line:welfareAndMedicaid",
  );
  for (const [id, monthly] of Object.entries(row?.monthlyByHousehold ?? {}))
    out.set(id, monthly * reachParameter("monthsPerYear"));
  return out;
}

/**
 * Medicaid expansion as coverage: who the expansion covers today, named and
 * counted, kept by person id as stretches of coverage (the reach's coverage
 * table): a stretch opens the day after an adult is first covered and ends
 * the day they no longer are (the work requirement ends it, they leave the
 * town, or the expansion is repealed). The coverage engine's medical bills
 * read it (medical-bills.ts: a covered member pays Medicaid's patient share),
 * and the health engine's monthly look reads a named adult's
 * (coverage-to-mortality-55-64). No payment to the adult: the bill is the
 * expansion's one path into a covered adult's money, and Medicaid's own part
 * of the care is paid to the seller (payMedicaidCare). Returns each named
 * adult's terms and how many counted adults are covered, times their weights.
 */
export function recordCoverage(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly inForce: boolean;
    readonly covered: readonly ResidentFacts[];
  },
): {
  readonly named: ReadonlyMap<string, Record<string, number>>;
  readonly counted: number;
} {
  const core = api.state as CoreState;
  if (!core.modules.has(BUDGETS_MODULE_ID))
    return { named: new Map(), counted: 0 };
  const town = lawChain(api).townPlaceId;
  const want = new Set<string>();
  const named = new Map<string, Record<string, number>>();
  let counted = 0;
  if (input.inForce && governmentAt(api, "state")) {
    let countedPeople = 0;
    for (const r of input.covered) {
      want.add(r.id);
      if (r.named) {
        named.set(r.id, {});
        recordApplied(api, {
          key: input.key,
          lawId: input.lawId,
          targetId: r.id,
          target: "person",
          what: "medicaid-coverage",
        });
      } else countedPeople += (r.weight ?? 1) * (r.scale ?? 1);
    }
    if (countedPeople > 0) {
      counted = Math.round(countedPeople);
      recordApplied(api, {
        key: input.key,
        lawId: input.lawId,
        targetId: `${town}:medicaid-covered-adults`,
        target: "group",
        what: "medicaid-coverage",
        count: counted,
      });
    }
  }
  const table = reachTable(api, "coverage");
  const today = api.state.date;
  const open = table.query("byKey", [
    input.key,
    null,
  ]) as unknown as CoverageRow[];
  for (const row of open)
    if (!want.has(row.personId))
      table.put({ ...row, to: today } as unknown as ModuleRow);
  const holding = new Set(open.map((row) => row.personId));
  const from = makeIsoDate(addDays(makeIsoDate(today), 1));
  for (const personId of want) {
    if (holding.has(personId)) continue;
    table.put({
      id: `coverage|${input.key}|${personId}|${from}`,
      key: input.key,
      personId,
      lawId: input.lawId,
      from,
      to: null,
    } satisfies CoverageRow as unknown as ModuleRow);
  }
  return { named, counted };
}

/**
 * Medicaid's own part of its covered members' care, the cost of the care less
 * what each member pays (medical-bills.ts bills them), paid to the medical
 * seller the bill names the day it is billed: the federal treasury pays its
 * share at the Medicaid match in force, read here at the moment it pays (42
 * U.S.C. 1396d(b)), and the state treasury the rest, each from its welfare and
 * Medicaid line. A payment's id names the expansion, and the federal one the
 * match too. A treasury pays what it holds. Returns what each seller was paid
 * and the journal entries.
 */
export function payMedicaidCare(
  api: CoreAPI,
  input: {
    /** The expansion's policy key, whose coverage records priced the members. */
    readonly key: string;
    /** Medicaid's part of the month's bills, by seller (owner id), in minor units. */
    readonly bySeller: ReadonlyMap<string, number>;
    readonly source: Source;
  },
): {
  readonly paidBySeller: ReadonlyMap<string, number>;
  readonly journalIds: readonly string[];
} {
  const paidBySeller = new Map<string, number>();
  const journalIds: string[] = [];
  const state = governmentAt(api, "state");
  if (!state) return { paidBySeller, journalIds };
  const federal = governmentAt(api, "federal");
  const match = lawInForce(api, "medicaid-match");
  const federalShare = federal
    ? Math.min(
        1,
        Math.max(0, (match.value ?? 0) / reachParameter("percentPerWhole")),
      )
    : 0;
  const accounts = api.accounts();
  const today = api.state.date;
  let federalMinor = 0;
  const sellers = [...input.bySeller].sort(([a], [b]) => a.localeCompare(b));
  // The federal treasury, which borrows any day, covers its shares today.
  if (federal)
    fundFederalStanding(
      api,
      sellers.reduce(
        (n, [, minor]) => n + Math.round(Math.max(0, minor) * federalShare),
        0,
      ),
    );
  for (const [sellerId, minor] of sellers) {
    if (minor <= 0) continue;
    const fromFederal = Math.round(minor * federalShare);
    const legs = [
      {
        gov: federal,
        amount: fromFederal,
        cites: `${input.key}+medicaid-match`,
      },
      { gov: state, amount: minor - fromFederal, cites: input.key },
    ];
    let paid = 0;
    for (const { gov, amount, cites } of legs) {
      if (!gov || amount <= 0) continue;
      const receipt = accounts.transfer({
        id: `reach-b:medicaid-care:${cites}:${gov.id}|${sellerId}:${today}`,
        from: accounts.main(gov.organizationId),
        to: accounts.main(sellerId),
        amountMinor: amount,
        reasonKey: "law-reach:medicaid-coverage",
        partial: true,
        source: input.source,
      });
      if (receipt.paidMinor <= 0) continue;
      paid += receipt.paidMinor;
      if (gov === federal) federalMinor += receipt.paidMinor;
      noteLinePaid(api, gov.id, "welfareAndMedicaid", receipt.paidMinor);
      if (receipt.journalSequence !== undefined)
        journalIds.push(`journal:${today}:${receipt.journalSequence}`);
    }
    paidBySeller.set(sellerId, paid);
  }
  // The match law is read here, at the moment the federal share is paid.
  if (federal && match.governing && federalMinor > 0)
    recordApplied(api, {
      key: "medicaid-match",
      lawId: match.governing.id,
      targetId: federal.id,
      target: "government",
      what: "federal-share-of-medicaid-paid",
      amountMinor: federalMinor,
    });
  return { paidBySeller, journalIds };
}

/** One stretch of a resident's coverage under a policy, as the reach keeps it. */
interface CoverageRow {
  readonly id: string;
  readonly key: string;
  readonly personId: string;
  /** The law row that first covered them in this stretch. */
  readonly lawId: string;
  readonly from: string;
  readonly to: string | null;
}

/** One stretch of a resident's coverage (its coverage records). */
export interface CoverageSpell {
  /** The first day covered. */
  readonly from: string;
  /** The day the coverage ended, or null while it holds. */
  readonly to: string | null;
  /** The reach's coverage records the stretch is joined from. */
  readonly recordIds: readonly string[];
}

/**
 * Each resident's Medicaid coverage as the reach keeps it, named and counted
 * by person id: the coverage records `recordCoverage` opened for them, open
 * and ended, joined into stretches. Null where no law reach runs with budgets
 * (the reach covers nobody there), so a caller can tell an uncovered person
 * from a world that does not model coverage. Read-only.
 */
export function medicaidCoverageSpells(
  api: CoreAPI,
  key: string,
): ReadonlyMap<string, readonly CoverageSpell[]> | null {
  const core = api.state as CoreState;
  if (!core.modules.has(BUDGETS_MODULE_ID) || !lawReachRuns(core)) return null;
  const out = new Map<string, CoverageSpell[]>();
  if (!core.modules.has(REACH_B_MODULE_ID)) return out;
  const found = new Map<
    string,
    { from: string; to: string | null; id: string }[]
  >();
  for (const row of rowsOf<CoverageRow>(api, "coverage")) {
    if (row.key !== key) continue;
    if (row.to !== null && row.to <= row.from) continue;
    const list = found.get(row.personId) ?? [];
    list.push({ from: row.from, to: row.to, id: row.id });
    found.set(row.personId, list);
  }
  for (const [personId, list] of found) {
    list.sort(
      (a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id),
    );
    const spells: { from: string; to: string | null; ids: string[] }[] = [];
    for (const stretch of list) {
      const last = spells.at(-1);
      // Overlapping or touching stretches are one: the same person, covered.
      if (last && (last.to === null || stretch.from <= last.to)) {
        last.ids.push(stretch.id);
        if (last.to !== null && (stretch.to === null || stretch.to > last.to))
          last.to = stretch.to;
      } else
        spells.push({ from: stretch.from, to: stretch.to, ids: [stretch.id] });
    }
    out.set(
      personId,
      spells.map((s) => ({ from: s.from, to: s.to, recordIds: s.ids })),
    );
  }
  return out;
}

/**
 * Universal preschool as a payment: the state treasury pays a child's
 * household the state's spending per enrolled child (NIEER), a month at a
 * time from the schools line, for each 3- and 4-year-old the law reaches,
 * times the share a universal program enrolls. The household is its oldest
 * resident; counted households are paid through the town's residents
 * account, times their weights. Repeal ends it (stopgap
 * SG-GOV-REACH-B-preschool-enrollment: no enrollment record or child-care
 * bill; the payment is the expected spending).
 */
export function payPreschool(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly inForce: boolean;
    readonly children: readonly ResidentFacts[];
    readonly residents: readonly ResidentFacts[];
  },
): {
  readonly named: ReadonlyMap<string, Record<string, number>>;
  readonly counted: number;
} {
  const core = api.state as CoreState;
  if (!core.modules.has(BUDGETS_MODULE_ID))
    return { named: new Map(), counted: 0 };
  const town = lawChain(api).townPlaceId;
  const state = governmentAt(api, "state");
  const want = new Map<string, number>();
  const named = new Map<string, Record<string, number>>();
  let counted = 0;
  if (input.inForce && state) {
    const monthly = Math.round(
      (reachParameter("preschoolStateSpendingPerChildDollars") *
        reachParameter("preschoolEnrolledShare") *
        reachParameter("centsPerDollar")) /
        reachParameter("monthsPerYear"),
    );
    const heads = new Map<string, ResidentFacts>();
    for (const r of input.residents) {
      if (!r.named || r.age < reachParameter("votingAge")) continue;
      const prior = heads.get(r.householdId);
      if (
        !prior ||
        r.age > prior.age ||
        (r.age === prior.age && r.id < prior.id)
      )
        heads.set(r.householdId, r);
    }
    const residentsOrg = residentsRuntime(core)?.input.accounts.find(
      (a) => a.placeId === town,
    )?.accountId;
    let countedChildren = 0;
    for (const child of input.children) {
      if (!child.named) {
        countedChildren += (child.weight ?? 1) * (child.scale ?? 1);
        continue;
      }
      const head = heads.get(child.householdId);
      if (!head) continue;
      const pair = `${state.id}|${head.id}`;
      want.set(pair, (want.get(pair) ?? 0) + monthly);
      named.set(head.id, { monthlyMinor: want.get(pair)! });
      recordApplied(api, {
        key: input.key,
        lawId: input.lawId,
        targetId: child.householdId,
        target: "household",
        what: "preschool-paid",
        amountMinor: monthly,
      });
    }
    if (residentsOrg && countedChildren > 0) {
      counted = Math.round(countedChildren);
      want.set(
        `${state.id}|${residentsOrg}`,
        Math.floor(monthly * countedChildren),
      );
      recordApplied(api, {
        key: input.key,
        lawId: input.lawId,
        targetId: `${town}:preschool-age-children`,
        target: "group",
        what: "preschool-paid",
        count: counted,
        amountMinor: Math.floor(monthly * countedChildren),
      });
    }
  }
  reconcileObligations(api, {
    rowKind: "preschool",
    key: input.key,
    want,
    line: "schools",
    reasonKey: "law-reach:preschool",
    citation: `Universal preschool (${input.key}): the state pays its spending for each enrolled 3- and 4-year-old`,
  });
  return { named, counted };
}

/**
 * The share of a private school's average tuition a voucher covers: the
 * voucher's amount over the NCES average tuition, never more than all of it.
 */
export function voucherShare(api: CoreAPI): number {
  return Math.min(
    1,
    reachParameter("voucherAmountDollars") /
      worldPrivateTuitionAnnualUsd(api.state.seed),
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
  input: {
    readonly key: string;
    readonly lawId: string;
    readonly inForce: boolean;
  },
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
      recordApplied(api, {
        key: input.key,
        lawId: input.lawId,
        targetId: payer,
        target: "person",
        what: "private-tuition-voucher-paid",
        amountMinor: amount,
      });
    }
    const rt = residentsRuntime(core);
    for (const flow of rt?.flows.values() ?? []) {
      if (
        flow.kind !== "purchase" ||
        flow.financeKind !== tuition.contractKind ||
        flow.placeId !== town ||
        flow.endedAt
      )
        continue;
      counted += Object.keys(flow.amountByContract ?? {}).length;
    }
    // Each group's share of the tuition flow goes to that group's fund.
    let paidGroups = 0;
    if (rt)
      for (const flow of rt.flows.values()) {
        if (
          flow.kind !== "purchase" ||
          flow.financeKind !== tuition.contractKind ||
          flow.placeId !== town ||
          flow.endedAt
        )
          continue;
        const weights = flowWeights(rt, flow);
        const total = [...weights.values()].reduce((a, b) => a + b, 0);
        if (!(total > 0)) continue;
        for (const [group, weight] of weights) {
          const amount = Math.floor(
            (flow.amountMinor * share * weight) / total,
          );
          if (amount <= 0) continue;
          const pair = `${state.id}|${FUND}${fundOf(api, rt, group)}`;
          want.set(pair, (want.get(pair) ?? 0) + amount);
          recordApplied(api, {
            key: input.key,
            lawId: input.lawId,
            targetId: `${town}:private-tuition-group:${group}`,
            target: "group",
            what: "private-tuition-voucher-paid",
            count: Math.max(1, Math.round(weight)),
            amountMinor: amount,
          });
          paidGroups += 1;
        }
      }
    if (!paidGroups) counted = 0;
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
  if (prior && !prior.undone && prior.budgetId === budget.id) {
    // Already moved (at the opening, or by an earlier review): the government
    // is still reached; record it once if no row says so.
    if (!appliedOn(api, input.key).some((r) => r.targetId === gov.id))
      recordMoved(api, input, gov.id, prior.moves);
    return prior;
  }
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
  recordMoved(api, input, gov.id, moves);
  return row;
}

/**
 * The budgets engine pays its lines as amended: the government was reached,
 * and the dollars the act moved are recorded with it.
 */
function recordMoved(
  api: CoreAPI,
  input: { readonly key: string; readonly lawId: string },
  governmentId: string,
  moves: Readonly<Record<string, number>>,
): void {
  const added = Object.values(moves).filter((d) => d > 0);
  const moved = added.length
    ? added.reduce((a, b) => a + b, 0)
    : Object.values(moves).reduce((a, b) => a + Math.abs(b), 0);
  lawApplied(api, {
    key: input.key,
    lawId: input.lawId.replace(/#.*$/, ""),
    targetId: governmentId,
    target: "government",
    engine: BUDGETS_MODULE_ID,
    what: "budget-lines-moved",
    amountMinor: moved,
  });
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
  /** The day of the last set-aside, and how many were made that day. */
  readonly setAsideOn?: string;
  readonly setAsidesThatDay?: number;
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
    readonly lawId?: string;
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
        id: `reach-b:reserve-release:${input.key}:${gov.id}:${api.state.date}`,
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
  // The law can be read twice in a day (the day it takes effect is often the
  // first of the fiscal year, when the treasury's close reads it again); a
  // set-aside the treasury could pay only in part tops up at the second
  // read, under its own transfer id.
  const prior = getRow<ReserveRow>(api, "taken", id);
  const sameDay = prior?.setAsideOn === api.state.date;
  const count = sameDay ? (prior?.setAsidesThatDay ?? 1) : 0;
  const receipt =
    need > 0
      ? accounts.transfer({
          id: `reach-b:reserve:${input.key}:${gov.id}:${api.state.date}${count ? `:${count + 1}` : ""}`,
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
    ...(receipt
      ? { setAsideOn: api.state.date, setAsidesThatDay: count + 1 }
      : sameDay
        ? { setAsideOn: prior!.setAsideOn, setAsidesThatDay: count }
        : {}),
  } satisfies ReserveRow);
  // The treasury was held to the reserve: the balance set aside is the money.
  if (input.lawId)
    lawApplied(api, {
      key: input.key,
      lawId: input.lawId,
      targetId: gov.id,
      target: "government",
      engine: BUDGETS_MODULE_ID,
      what: "reserve-held",
      amountMinor: receipt?.paidMinor ?? 0,
    });
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
  // A territory's own income tax stands in place of the federal one under
  // federal law (26 U.S.C. 931 to 933), whatever rate its legislature sets:
  // an act that rewrites the territory's tax keeps that standing.
  const standing =
    current?.terms?.replacesFederal === true
      ? { replacesFederal: true }
      : undefined;
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
      ...(terms || standing ? { terms: { ...terms, ...standing } } : {}),
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
