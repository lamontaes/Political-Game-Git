/**
 * Health coverage (people-coverage-record-monthly-pass, part of the health
 * coverage and medical spending engine): each full person holds a coverage
 * record (plan, from, to), and the policyholder's premium, which reads it,
 * is taken from their pay.
 *
 * Once a month, on the 1st, and on the first day played: an adult in the
 * years people work, with a job, holds an employer plan when the town's
 * working adults ranked by their employer's size (the larger first) and then
 * their pay reach the share who hold their own plan (a parameter, ESTIMATED).
 * The share is of the workers who have a job today: a recession costs plans
 * through the jobs it ends (men lose more of them, Cawley, Moriya and Simon
 * 2015), so the outcome web's unemployment-to-uninsured link is not read here
 * as well, which would count each lost job twice and take plans from workers
 * who kept theirs. The policy covers everyone else in the policyholder's household, at the
 * family premium when there are two or more people on it and the single
 * premium when there is one. People 65 and over hold Medicare (no premium
 * here). Everyone else is uninsured until another engine (Medicaid, the
 * gov-medicaid-coverage-reader item) gives them a plan. The worker's share
 * of the premium (KFF 2024) is taken from each paycheck, as a payroll
 * deduction is: the pay period's part of the month's premium goes to the
 * place's outside account, where the insurers are, the day the pay lands. A
 * paycheck that cannot cover it leaves a shortfall, and a policyholder whose
 * last paycheck before the review fell short loses the plan for the next
 * month: it is never a debt.
 *
 * Counted households are ranked with the full people, by the same employer
 * size and pay, and a counted household whose rank earns a policy holds a
 * counted-coverage record on its policyholder and pays the same premium, once
 * for each real household the record stands for, taken from the counted wages
 * that pay the policyholder's job (counted-money.ts payGroups). A household
 * filled in is handed its counted record the same day (onFillIn): the counted
 * record ends and its members hold full records on the same plan, with the
 * same policyholder and premium, until the next review ranks them as it ranks
 * everyone. The employer's share of the premium is part of the employer's
 * compensation and is not modeled.
 *
 * On the 1st, after the review, each household's out-of-pocket medical bills are billed
 * from these records and paid, and what goes unpaid is placed for collection
 * as a medical-debt record (medical-bills.ts).
 */
import { billMedicalCare } from "../medical-bills";
import { coreAPI, registerModule } from "../state";
import { registerPlanReaders } from "../life-plan-readers";
import { outsideAccountOf } from "../budgets-treasury";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { gameStartDate } from "../game-start";
import { declareSnapshotCovered } from "../snapshot";
import { registerJournalIdReader } from "../decision-detail";
import { hasModuleState } from "../module-state";
import { registerCountedPayDeduction } from "../counted-money";
import {
  countedJob,
  residentsRuntime,
  unplacedPayPerWorker,
} from "./residents";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, IsoDate, Source } from "../types";

export const COVERAGE_MODULE_ID = "core2-coverage-v1";

export type CoveragePlan = "employer" | "medicare" | "none";

export interface CoverageRow {
  readonly id: string;
  readonly personId: string;
  readonly householdId: string;
  readonly plan: CoveragePlan;
  /** The person whose employer plan covers this one (their own id for the policyholder). */
  readonly holderId: string | null;
  readonly from: IsoDate;
  readonly to: IsoDate | null;
  /** What the policyholder pays each month; zero for everyone else on the policy. */
  readonly premiumMonthlyMinor: number;
  readonly lastDueMinor: number;
  readonly lastPaidMinor: number;
  /** The cash journal record of the last premium paid, if any was. */
  readonly lastJournalId: string | null;
  readonly source: Source;
}

const table = (api: CoreAPI) =>
  api.moduleState(COVERAGE_MODULE_ID).table("coverage");
const rows = (api: CoreAPI) => table(api).rows() as unknown as CoverageRow[];
const current = (api: CoreAPI) => rows(api).filter((row) => row.to === null);

/** The coverage record a person holds now, if any. */
export function coverageOf(
  api: CoreAPI,
  personId: string,
): CoverageRow | undefined {
  return current(api).find((row) => row.personId === personId);
}

function sourceFor(api: CoreAPI): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "Employer coverage by rank of employer size and pay at the share of workers holding their own plan; premium is the worker's average contribution (KFF 2024 Employer Health Benefits Survey). Medicare at 65 (42 U.S.C. 1395c).",
    estimatedFrom:
      "Census P60-284 (2023) employment-based coverage 53.7 percent of the population; KFF 2024 worker contributions.",
  };
}

interface Plan {
  readonly plan: CoveragePlan;
  readonly holderId: string | null;
  readonly premiumMonthlyMinor: number;
}

interface Candidate {
  readonly personId: string;
  readonly householdId: string;
  readonly size: number;
  readonly wage: number;
  /** Real workers the candidate stands for: 1 for a full person, the household's weight for a counted one. */
  readonly weight: number;
  /** The job whose pay the premium is taken from; none for a counted household's unplaced worker (the place's pool pays them). */
  readonly jobId: string | null;
}

/**
 * Jobs per employer, full and counted alike: a counted job stands for as many
 * jobs as the households its record stands for.
 */
export function staffOf(api: CoreAPI): Map<string, number> {
  const core = api.state as CoreState;
  const staff = new Map<string, number>();
  const add = (organizationId: string, jobs: number) =>
    staff.set(organizationId, (staff.get(organizationId) ?? 0) + jobs);
  for (const job of core.jobs.values())
    if (job.endsAt === undefined) add(job.organizationId, 1);
  const rt = residentsRuntime(core);
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      const weight = rt.store.weightOf(h);
      for (const job of h.jobs)
        if (job.endsAt === undefined && countedJob(core, job.id))
          add(job.organizationId, weight);
    }
  return staff;
}

/** Policyholders whose last premium went unpaid: they hold no policy this month. */
function unpaidHolders(api: CoreAPI): Set<string | null> {
  return new Set([
    ...current(api)
      .filter((row) => row.lastPaidMinor < row.lastDueMinor)
      .map((row) => row.holderId),
    ...countedRows(api)
      .filter((row) => row.to === null && row.lastPaidMinor < row.lastDueMinor)
      .map((row) => row.holderId),
  ]);
}

/**
 * Who holds an employer plan in their own name: the town's working adults, full
 * and counted, ranked by their employer's size and then pay (the larger first),
 * the top share by weight. One policyholder to a household.
 */
function holdersToday(
  api: CoreAPI,
  staff: ReadonlyMap<string, number>,
  unpaid: ReadonlySet<string | null>,
): {
  full: Map<string, string>;
  counted: Map<string, CountedHolder>;
  summary: EmployerPlansSummary;
} {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const date = makeIsoDate(core.date);
  const adult = (birth: string) => {
    const age = ageOnDate(makeIsoDate(birth), date);
    return age >= 19 && age < p("healthMedicareAge");
  };
  const candidates: Candidate[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || person.id.startsWith("official:")) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job || !adult(person.birthDate)) continue;
    candidates.push({
      personId: person.id,
      householdId: person.householdId,
      size: staff.get(job.organizationId) ?? 0,
      wage: job.wageDailyMinor,
      weight: 1,
      jobId: job.id,
    });
  }
  const rt = residentsRuntime(core);
  if (rt) {
    const store = rt.store;
    // The town's usual employer size, for workers whose employer is not recorded.
    const sizes = [...staff.values()].sort((a, b) => a - b);
    const usualSize = sizes[Math.floor(sizes.length / 2)] ?? 0;
    for (const h of store.liveHouseholds()) {
      const weight = store.weightOf(h);
      // Workers with no recorded employer (the place's unplaced workers) have
      // jobs too: the same rule as a recorded worker, at the town's usual
      // employer size and the pool's pay, so a place made mostly of them is
      // not left with almost no employer plans.
      if (h.unplacedWorkers > 0) {
        const holder = store
          .countedMembers(h)
          .find(
            (m) =>
              adult(store.born[m]!) &&
              !h.jobs.some((job) => job.personId === store.ids[m]),
          );
        if (holder !== undefined)
          candidates.push({
            personId: store.ids[holder]!,
            householdId: h.id,
            size: usualSize,
            wage: Math.round(
              unplacedPayPerWorker(rt, h) / p("daysPerMeanYear"),
            ),
            weight: h.unplacedWorkers,
            jobId: null,
          });
      }
      for (const job of h.jobs) {
        if (job.endsAt !== undefined || !countedJob(core, job.id)) continue;
        const m = store.countedMember(job.personId);
        if (m === undefined || !adult(store.born[m]!)) continue;
        candidates.push({
          personId: job.personId,
          householdId: h.id,
          size: staff.get(job.organizationId) ?? 0,
          wage: job.wageDailyMinor,
          weight,
          jobId: job.id,
        });
      }
    }
  }
  candidates.sort(
    (a, b) =>
      b.size - a.size ||
      b.wage - a.wage ||
      a.personId.localeCompare(b.personId),
  );
  const total = candidates.reduce((n, c) => n + c.weight, 0);
  const share = p("healthEmployerPolicyholderShare");
  const counted = new Set(
    rt ? [...rt.store.liveHouseholds()].map((h) => h.id) : [],
  );
  const full = new Map<string, string>();
  const heldCounted = new Map<string, CountedHolder>();
  const slots = Math.round(total * share);
  let taken = 0,
    heldWeight = 0,
    lapsedWeight = 0;
  for (const c of candidates) {
    const held = taken < slots;
    taken += c.weight;
    if (!held) continue;
    if (unpaid.has(c.personId)) {
      lapsedWeight += c.weight;
      continue;
    }
    if (counted.has(c.householdId)) {
      if (heldCounted.has(c.householdId)) continue;
      heldCounted.set(c.householdId, { holderId: c.personId, jobId: c.jobId });
    } else {
      if (full.has(c.householdId)) continue;
      full.set(c.householdId, c.personId);
    }
    heldWeight += c.weight;
  }
  return {
    full,
    counted: heldCounted,
    summary: {
      date: makeIsoDate(core.date),
      workers: total,
      share,
      slots,
      held: heldWeight,
      lapsed: lapsedWeight,
      fullHolders: full.size,
      countedHolders: heldCounted.size,
    },
  };
}

/** A counted household's policyholder and the job whose pay the premium is taken from. */
interface CountedHolder {
  readonly holderId: string;
  readonly jobId: string | null;
}

/**
 * One ranking of employer plans: workers with a job (by the real workers they
 * stand for), the share who hold their own plan, the plans that share gives,
 * those held, and those left out because the holder's last premium went unpaid.
 */
export interface EmployerPlansSummary {
  readonly date: IsoDate;
  readonly workers: number;
  readonly share: number;
  readonly slots: number;
  readonly held: number;
  readonly lapsed: number;
  readonly fullHolders: number;
  readonly countedHolders: number;
}

/** What the plans in force cost their holders: a month's premiums, and the holders whose last paycheck fell short of the premium. */
export interface EmployerPremiumsSummary {
  /** A month's premiums of the plans in force, counted ones times the households they stand for. */
  readonly premiumsMonthlyMinor: number;
  /** Policyholders (by the real households they stand for) whose last paycheck did not cover the premium. */
  readonly shortNow: number;
}

/** The town's employer plans as the review would rank them today, and what they cost their holders, for dev mode. Reads only. */
export function employerPlansToday(
  api: CoreAPI,
): (EmployerPlansSummary & EmployerPremiumsSummary) | null {
  if (!api.state.modules.has(COVERAGE_MODULE_ID)) return null;
  const rt = residentsRuntime(api.state as CoreState);
  let premiumsMonthlyMinor = 0,
    shortNow = 0;
  for (const row of current(api))
    if (row.plan === "employer" && row.holderId === row.personId) {
      premiumsMonthlyMinor += row.premiumMonthlyMinor;
      if (row.lastPaidMinor < row.lastDueMinor) shortNow += 1;
    }
  for (const row of countedRows(api)) {
    const h =
      row.to === null ? rt?.store.liveHousehold(row.householdId) : undefined;
    if (!h || !rt) continue;
    const weight = rt.store.weightOf(h);
    premiumsMonthlyMinor += row.premiumMonthlyMinor * weight;
    if (row.lastPaidMinor < row.lastDueMinor) shortNow += weight;
  }
  return {
    ...holdersToday(api, staffOf(api), unpaidHolders(api)).summary,
    premiumsMonthlyMinor: Math.round(premiumsMonthlyMinor),
    shortNow,
  };
}

/** The day of the last review: the 1st, or the opening day in the opening month. */
function lastReview(date: IsoDate): IsoDate {
  const first = makeIsoDate(`${date.slice(0, 8)}01`);
  const opening = gameStartDate();
  return first < opening ? opening : first;
}

/** What every full person's coverage should be today (or a few households', for a fill-in). */
function plansToday(
  api: CoreAPI,
  holderByHousehold: ReadonlyMap<string, string>,
  /** Only these households (a fill-in's); every full household when absent. */
  only?: ReadonlySet<string>,
  /** The day ages are taken on: today at a review, the last review's day at a fill-in. */
  agesOn: IsoDate = makeIsoDate(api.state.date),
): Map<string, { householdId: string } & Plan> {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const plans = new Map<string, { householdId: string } & Plan>();
  const everyone = only
    ? [...only].flatMap((id) =>
        (core.households.get(id)?.memberIds ?? []).flatMap((memberId) => {
          const member = core.people.get(memberId);
          return member ? [member] : [];
        }),
      )
    : [...core.people.values()];
  const people = everyone.filter(
    (person) => person.alive && !person.id.startsWith("official:"),
  );
  const ageOf = (birth: string) => ageOnDate(makeIsoDate(birth), agesOn);
  const members = new Map<string, string[]>();
  for (const person of people)
    members.set(person.householdId, [
      ...(members.get(person.householdId) ?? []),
      person.id,
    ]);
  const perMonth = (usd: number) =>
    Math.round((usd * p("minorPerDollar")) / p("monthsPerYear"));
  for (const person of people) {
    const holder = holderByHousehold.get(person.householdId);
    if (ageOf(person.birthDate) >= p("healthMedicareAge")) {
      plans.set(person.id, {
        householdId: person.householdId,
        plan: "medicare",
        holderId: null,
        premiumMonthlyMinor: 0,
      });
    } else if (holder) {
      const covered = (members.get(person.householdId) ?? []).filter(
        (id) => ageOf(core.people.get(id)!.birthDate) < p("healthMedicareAge"),
      );
      plans.set(person.id, {
        householdId: person.householdId,
        plan: "employer",
        holderId: holder,
        premiumMonthlyMinor:
          person.id === holder
            ? perMonth(
                covered.length > 1
                  ? p("healthWorkerContributionFamilyAnnualUsd")
                  : p("healthWorkerContributionSingleAnnualUsd"),
              )
            : 0,
      });
    } else {
      plans.set(person.id, {
        householdId: person.householdId,
        plan: "none",
        holderId: null,
        premiumMonthlyMinor: 0,
      });
    }
  }
  return plans;
}

export interface CountedCoverageRow {
  readonly id: string;
  readonly householdId: string;
  readonly placeId: string;
  readonly holderId: string;
  /** The counted job whose pay the premium is taken from; null for the place's unplaced workers' pay. */
  readonly jobId: string | null;
  /** People under Medicare age on the policy. */
  readonly covered: number;
  /** What one real household pays each month; the record stands for its weight of them. */
  readonly premiumMonthlyMinor: number;
  readonly from: IsoDate;
  readonly to: IsoDate | null;
  /** The last payday whose pay could not cover the premium: what was due and what was taken (equal once a later payday covers it). */
  readonly lastDueMinor: number;
  readonly lastPaidMinor: number;
  readonly source: Source;
}

const countedTable = (api: CoreAPI) =>
  api.moduleState(COVERAGE_MODULE_ID).table("countedCoverage");
const countedRows = (api: CoreAPI) =>
  countedTable(api).rows() as unknown as CountedCoverageRow[];

/** The counted-coverage record a counted household holds now, if any. */
export function countedCoverageOf(
  api: CoreAPI,
  householdId: string,
): CountedCoverageRow | undefined {
  return (
    countedTable(api).query("byHousehold", [
      householdId,
    ]) as unknown as CountedCoverageRow[]
  ).find((row) => row.to === null);
}

/** Each counted household's policy today: the holders the shared ranking picks. */
function reviewCounted(
  api: CoreAPI,
  held: ReadonlyMap<string, CountedHolder>,
): void {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  const today = makeIsoDate(core.date);
  const p = (key: string) => api.parameter(key);
  const have = new Map(
    countedRows(api)
      .filter((row) => row.to === null)
      .map((row) => [row.householdId, row]),
  );
  const perMonth = (usd: number) =>
    Math.round((usd * p("minorPerDollar")) / p("monthsPerYear"));
  const wanted = new Map<
    string,
    Omit<
      CountedCoverageRow,
      "id" | "from" | "to" | "lastDueMinor" | "lastPaidMinor" | "source"
    >
  >();
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      const holder = held.get(h.id);
      if (!holder) continue;
      const { holderId, jobId } = holder;
      const covered = rt.store
        .countedMembers(h)
        .filter(
          (m) =>
            ageOnDate(makeIsoDate(rt.store.born[m]!), makeIsoDate(core.date)) <
            p("healthMedicareAge"),
        ).length;
      wanted.set(h.id, {
        householdId: h.id,
        placeId: h.placeId,
        holderId,
        jobId,
        covered,
        premiumMonthlyMinor: perMonth(
          covered > 1
            ? p("healthWorkerContributionFamilyAnnualUsd")
            : p("healthWorkerContributionSingleAnnualUsd"),
        ),
      });
    }
  for (const [householdId, old] of have) {
    const next = wanted.get(householdId);
    if (
      next &&
      next.holderId === old.holderId &&
      next.jobId === old.jobId &&
      next.premiumMonthlyMinor === old.premiumMonthlyMinor
    )
      continue;
    countedTable(api).put({ ...old, to: today } as unknown as ModuleRow);
  }
  for (const [householdId, next] of wanted) {
    const old = have.get(householdId);
    if (
      old &&
      old.holderId === next.holderId &&
      old.jobId === next.jobId &&
      old.premiumMonthlyMinor === next.premiumMonthlyMinor
    )
      continue;
    countedTable(api).put({
      ...next,
      id: `coverage-counted:${householdId}:${today}`,
      from: today,
      to: null,
      lastDueMinor: 0,
      lastPaidMinor: 0,
      source: sourceFor(api),
    } as unknown as ModuleRow);
  }
  countedChanged(api);
}

/** Writes these plans as full records: a changed plan ends the old record and starts a new one. */
function putPlans(
  api: CoreAPI,
  plans: ReadonlyMap<string, { householdId: string } & Plan>,
  have: ReadonlyMap<string, CoverageRow>,
  /** What a record being handed over already owed and paid (a counted record's last month). */
  carried: ReadonlyMap<
    string,
    { readonly lastDueMinor: number; readonly lastPaidMinor: number }
  > = new Map(),
): void {
  const today = makeIsoDate(api.state.date);
  for (const [personId, plan] of plans) {
    const old = have.get(personId);
    if (
      old &&
      old.plan === plan.plan &&
      old.holderId === plan.holderId &&
      old.premiumMonthlyMinor === plan.premiumMonthlyMinor
    )
      continue;
    if (old) table(api).put({ ...old, to: today } as unknown as ModuleRow);
    table(api).put({
      id: `coverage:${personId}:${today}`,
      personId,
      householdId: plan.householdId,
      plan: plan.plan,
      holderId: plan.holderId,
      from: today,
      to: null,
      premiumMonthlyMinor: plan.premiumMonthlyMinor,
      lastDueMinor: carried.get(personId)?.lastDueMinor ?? 0,
      lastPaidMinor: carried.get(personId)?.lastPaidMinor ?? 0,
      lastJournalId: null,
      source: sourceFor(api),
    } as unknown as ModuleRow);
  }
}

/** Writes today's coverage records: a changed plan ends the old record and starts a new one. */
function review(api: CoreAPI): void {
  const today = makeIsoDate(api.state.date);
  const have = new Map(current(api).map((row) => [row.personId, row]));
  const holders = holdersToday(api, staffOf(api), unpaidHolders(api));
  reviewCounted(api, holders.counted);
  putPlans(api, plansToday(api, holders.full), have);
  // Anyone who died or left the records has no current plan.
  const alive = new Set(
    [...(api.state as CoreState).people.values()]
      .filter((person) => person.alive)
      .map((person) => person.id),
  );
  for (const row of have.values())
    if (!alive.has(row.personId))
      table(api).put({ ...row, to: today } as unknown as ModuleRow);
}

/**
 * A household filled in from the counts takes its coverage with it (one model,
 * two tiers): its counted record ends and its members hold full records on the
 * same plan, with the same policyholder and premium, from the day they are
 * filled in. What the counted record had paid last month goes with it, so a
 * policy that lapsed still lapses. The next review ranks them as everyone.
 */
function handOff(api: CoreAPI, householdId: string): void {
  // Before the first review there is nothing to take over.
  if (table(api).size === 0 && countedTable(api).size === 0) return;
  const counted = countedCoverageOf(api, householdId);
  if (counted) {
    countedTable(api).put({
      ...counted,
      to: makeIsoDate(api.state.date),
    } as unknown as ModuleRow);
    countedChanged(api);
  }
  // Ages as of the last review, as the counted record and a full household's
  // plans were set then: someone who turned 65 since moves at the next review.
  const plans = plansToday(
    api,
    new Map(counted ? [[householdId, counted.holderId]] : []),
    new Set([householdId]),
    lastReview(makeIsoDate(api.state.date)),
  );
  // The policyholder pays what the counted record said.
  const held = counted ? plans.get(counted.holderId) : undefined;
  if (
    counted &&
    held?.plan === "employer" &&
    held.holderId === counted.holderId
  )
    plans.set(counted.holderId, {
      ...held,
      premiumMonthlyMinor: counted.premiumMonthlyMinor,
    });
  const have = new Map(
    (table(api).query("byHousehold", [householdId]) as unknown as CoverageRow[])
      .filter((row) => row.to === null)
      .map((row) => [row.personId, row]),
  );
  putPlans(
    api,
    plans,
    have,
    new Map(
      counted
        ? [
            [
              counted.holderId,
              {
                lastDueMinor: counted.lastDueMinor,
                lastPaidMinor: counted.lastPaidMinor,
              },
            ],
          ]
        : [],
    ),
  );
}

/** The month's out-of-pocket medical bills, priced by the coverage records as they stand after the premiums. */
function billMedical(api: CoreAPI): void {
  billMedicalCare(api, {
    module: COVERAGE_MODULE_ID,
    coverage: new Map(current(api).map((row) => [row.personId, row.plan])),
    countedHolders: new Set(
      countedRows(api)
        .filter((row) => row.to === null)
        .map((row) => row.householdId),
    ),
  });
}

/** The days in a pay period between two dates, both counted. */
function periodDaysOf(fromAt: string, throughAt: string): number {
  return Math.max(
    1,
    Math.round((Date.parse(throughAt) - Date.parse(fromAt)) / 86_400_000) + 1,
  );
}

/** One pay period's part of a monthly premium. */
function premiumForPeriod(
  api: CoreAPI,
  monthlyMinor: number,
  periodDays: number,
): number {
  return Math.round(
    (monthlyMinor * api.parameter("monthsPerYear") * periodDays) /
      api.parameter("daysPerMeanYear"),
  );
}

/**
 * A full policyholder's premium is taken from each paycheck, as a payroll
 * deduction is: the pay period's part of the month's premium goes from the
 * worker's cash to the place's outside account, where the insurers are, as
 * soon as the pay lands. What the pay could not cover is the shortfall the next
 * review reads; a later paycheck that covers it clears it.
 */
// stopgapId: SG-HEALTH-premium-after-tax — the premium is taken after the
// law's withholding, from the pay that lands, not before it as a section 125
// plan takes it, so the income and payroll taxes read the whole wage.
function deductFullPremium(
  api: CoreAPI,
  receipt: Parameters<NonNullable<CoreModule["onWorkPayroll"]>>[1],
): void {
  if (receipt.paidMinor <= 0) return;
  const person = api.state.people.get(receipt.personId);
  if (!person) return;
  const row = (
    table(api).query("byHousehold", [
      person.householdId,
    ]) as unknown as CoverageRow[]
  ).find(
    (r) =>
      r.to === null &&
      r.personId === person.id &&
      r.plan === "employer" &&
      r.holderId === person.id &&
      r.premiumMonthlyMinor > 0,
  );
  const outside = row ? outsideAccountOf(api) : undefined;
  if (!row || !outside) return;
  const due = premiumForPeriod(
    api,
    row.premiumMonthlyMinor,
    periodDaysOf(receipt.fromAt, receipt.throughAt),
  );
  const accounts = api.accounts();
  const receiptOut = accounts.transfer({
    id: `premium:${receipt.id}`,
    from: accounts.main(person.id),
    to: accounts.main(outside),
    amountMinor: due,
    reasonKey: "health.premium",
    partial: true,
    source: { ...row.source, asOf: api.state.date },
  });
  table(api).put({
    ...row,
    lastDueMinor: due,
    lastPaidMinor: receiptOut.paidMinor,
    lastJournalId:
      receiptOut.journalSequence === undefined
        ? row.lastJournalId
        : `journal:${api.state.date}:${receiptOut.journalSequence}`,
  } as unknown as ModuleRow);
}

/** Counted policies by the job whose pay carries them, and the unplaced workers' ones by place, kept until a counted record starts or ends. */
const countedIndex = new WeakMap<
  object,
  { byJob: Map<string, string>; unplaced: Map<string, string[]> }
>();
/** A counted record started or ended: the index is read again. */
function countedChanged(api: CoreAPI): void {
  countedIndex.delete(api.state);
}
function countedPolicies(api: CoreAPI) {
  const held = countedIndex.get(api.state);
  if (held) return held;
  const all = countedTable(api).rows();
  const byJob = new Map<string, string>();
  const unplaced = new Map<string, string[]>();
  for (const row of all as unknown as CountedCoverageRow[]) {
    if (row.to !== null || row.premiumMonthlyMinor <= 0) continue;
    if (row.jobId) byJob.set(row.jobId, row.householdId);
    else
      unplaced.set(row.placeId, [
        ...(unplaced.get(row.placeId) ?? []),
        row.householdId,
      ]);
  }
  const next = { byJob, unplaced };
  countedIndex.set(api.state, next);
  return next;
}

/**
 * A counted policyholder's premium is taken from the counted wages that pay
 * their job, in the same entry as the law's withholding (counted-money.ts
 * payGroups): the pay period's part of one household's premium times the
 * real households the record stands for. The unplaced workers' pay carries the
 * policies of the households whose holder is one of them.
 */
registerCountedPayDeduction({
  key: "health.premium",
  due(api, rt, flow, periodDays) {
    const outside = outsideAccountOf(api);
    const out = new Map<
      number,
      { accountId: string; parts: { householdId: string; minor: number }[] }
    >();
    if (!outside || !api.state.modules.has(COVERAGE_MODULE_ID)) return out;
    const { byJob, unplaced } = countedPolicies(api);
    const households =
      flow.financeKind === "work.unplaced-residents"
        ? (unplaced.get(flow.placeId) ?? [])
        : Object.keys(flow.perDayMinorByJob ?? {}).flatMap((jobId) => {
            const id = byJob.get(jobId);
            return id ? [id] : [];
          });
    const accountId = api.accounts().main(outside);
    for (const householdId of households) {
      const h = rt.store.liveHousehold(householdId);
      if (!h || h.gone) continue;
      if (
        flow.financeKind === "work.unplaced-residents" &&
        !h.quarters !== !flow.quarters
      )
        continue;
      const row = countedCoverageOf(api, householdId);
      if (!row) continue;
      const minor = premiumForPeriod(
        api,
        row.premiumMonthlyMinor * rt.store.weightOf(h),
        periodDays,
      );
      if (minor <= 0) continue;
      const entry = out.get(h.group) ?? { accountId, parts: [] };
      entry.parts.push({ householdId, minor });
      out.set(h.group, entry);
    }
    return out;
  },
  paid(api, householdId, dueMinor, paidMinor) {
    const row = countedCoverageOf(api, householdId);
    if (!row) return;
    // Only a shortfall, or the payday that clears one, is written.
    if (paidMinor >= dueMinor && row.lastPaidMinor >= row.lastDueMinor) return;
    countedTable(api).putOwned({
      ...row,
      lastDueMinor: dueMinor,
      lastPaidMinor: Math.min(paidMinor, dueMinor),
    } as unknown as ModuleRow);
  },
});

export const COVERAGE_MODULE: CoreModule = {
  id: COVERAGE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      coverage: { indexes: { byHousehold: { fields: ["householdId"] } } },
      countedCoverage: {
        indexes: { byHousehold: { fields: ["householdId"] } },
      },
      // Each household's latest month of medical bills (medical-bills.ts).
      medicalBills: {},
    },
  },
  onFillIn(api, { householdId }) {
    handOff(api, householdId);
  },
  onDay(api) {
    const first = table(api).size === 0;
    const payday = api.state.date.endsWith("-01");
    if (!first && !payday) return undefined;
    review(api);
    if (payday) billMedical(api);
    return undefined;
  },
  onWorkPayroll(api, receipt) {
    deductFullPremium(api, receipt);
  },
};
declareSnapshotCovered(COVERAGE_MODULE.id);
// A row names the journal receipt of its last premium, an ended row too; the
// journal's fold keeps every receipt a row names (decision-detail.ts).
// The views engine's life term reads who holds a plan (src/core2/life-plan-readers.ts).
registerPlanReaders({
  fullPlan: (core, householdId, personId) =>
    core.modules.has(COVERAGE_MODULE_ID)
      ? (
          table(coreAPI(core)).query("byHousehold", [
            householdId,
          ]) as unknown as CoverageRow[]
        ).find((row) => row.personId === personId && row.to === null)?.plan
      : null,
  countedCovered: (core, householdId, placeId) => {
    if (!core.modules.has(COVERAGE_MODULE_ID)) return null;
    const api = coreAPI(core);
    return countedPlacesOf(api).has(placeId)
      ? (countedCoverageOf(api, householdId)?.covered ?? 0)
      : null;
  },
});

/** The places where the coverage engine keeps counted households' plans, kept for the month. */
const countedPlaces = new WeakMap<
  object,
  { month: string; places: Set<string> }
>();
function countedPlacesOf(api: CoreAPI): ReadonlySet<string> {
  const month = api.state.date.slice(0, "YYYY-MM".length);
  const held = countedPlaces.get(api.state);
  if (held?.month === month) return held.places;
  const places = new Set(countedRows(api).map((row) => row.placeId));
  countedPlaces.set(api.state, { month, places });
  return places;
}

registerJournalIdReader((core) =>
  hasModuleState(core, COVERAGE_MODULE_ID)
    ? rows(coreAPI(core)).map((row) => row.lastJournalId)
    : [],
);

export function openCoverage(core: CoreState): void {
  if (core.modules.has(COVERAGE_MODULE_ID)) return;
  registerModule(core, COVERAGE_MODULE);
  review(coreAPI(core));
}
