/**
 * Health coverage (people-coverage-record-monthly-pass, part of the health
 * coverage and medical spending engine): each full person holds a coverage
 * record (plan, from, to), and the household pays a monthly premium that
 * reads it.
 *
 * Once a month, on the 1st, and on the first day played, each working adult
 * with a job is weighed twice, from records the world keeps:
 *
 * - their employer weighs offering them the plan: its staff (a larger employer
 *   spreads the plan's fixed costs and its risk), and this job's pay against
 *   what the plan would cost the employer for the worker (offerScore);
 * - the worker offered one weighs taking it: what they would pay for each
 *   person it covers, against their pay (takeScore).
 *
 * Each score is a sliding scale, and each worker's two scores multiply into
 * their own share of a plan. The town's plans are the sum of its workers'
 * shares (a counted worker's times the households the record stands for),
 * held by the workers whose shares are highest, one policyholder to a
 * household. No roll, and no share of workers to fill: a town of large,
 * well-paying employers holds more plans than a town of small shops, a plant
 * that closes takes its plans with it, and a dearer plan is offered and taken
 * less. A recession costs plans through the jobs it ends (men lose more of
 * them, Cawley, Moriya and Simon 2015), so the outcome web's
 * unemployment-to-uninsured link is not read here as well.
 *
 * The plan's price is what its members cost. Each January (and on the first
 * day played) the year's rate is set from the employer plans' own claims: the
 * insurers' part of the care their members were billed over the last twelve
 * months (medical-bills.ts), a covered person, plus the insurer's load. On the
 * first day there are no claims yet, so the rate is the same sum over the
 * care the opening's people need today, and each month of real claims takes
 * the place of a month of that estimate. The policy covers everyone else in
 * the policyholder's household under Medicare's age; the policyholder pays the
 * worker's part of each covered person's rate. People 65 and over hold
 * Medicare (no premium here). Everyone else is uninsured until another engine
 * (Medicaid, the gov-medicaid-coverage-reader item) gives them a plan. The
 * policyholder pays from what they hold to the place's outside account, where
 * the insurers are; a premium they cannot pay in full ends the policy for
 * the next month, as with any bill that goes unpaid: it is never a debt.
 *
 * Counted households are weighed with the full people, by the same employer
 * size and pay, and a counted household whose worker holds a policy holds a
 * counted-coverage record on its policyholder and pays the same premium, once
 * for each real household the record stands for (counted money). A household
 * filled in is handed its counted record the same day (onFillIn): the counted
 * record ends and its members hold full records on the same plan, with the
 * same policyholder and premium, until the next review weighs them as it weighs
 * everyone. The employer's share of the premium is part of the employer's
 * compensation and is not modeled.
 *
 * After the premiums, each household's out-of-pocket medical bills are billed
 * from these records and paid, and what goes unpaid is placed for collection
 * as a medical-debt record (medical-bills.ts).
 */
import {
  billMedicalCare,
  expectedPlanCare,
  type PlanCareMonth,
} from "../medical-bills";
import { coreAPI, registerModule } from "../state";
import { registerPlanReaders } from "../life-plan-readers";
import { outsideAccountOf } from "../budgets-treasury";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { gameStartDate } from "../game-start";
import { declareSnapshotCovered } from "../snapshot";
import { registerJournalIdReader } from "../decision-detail";
import { hasModuleState } from "../module-state";
import { countedPayment } from "../counted-money";
import {
  countedJob,
  residentsRuntime,
  unplacedPayPerWorker,
} from "./residents";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, IsoDate, Source } from "../types";

import { COVERAGE_MODULE_ID } from "../coverage-module-id";

export { COVERAGE_MODULE_ID };

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
  /** What the policyholder's plan was decided from (planScores), for dev mode's trace. */
  readonly reasons?: PlanReasons;
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
      "Employer coverage where the employer's offer (its staff, the job's pay against the plan's cost) and the worker's take-up (their part of the premium against their pay) both hold; the premium is the plans' own claims a covered person plus the insurer's load, at the worker's part of it (strengths from the KFF 2024 Employer Health Benefits Survey). Medicare at 65 (42 U.S.C. 1395c).",
    estimatedFrom:
      "The world's own records: employers' staff and pay, the employer plans' claims (medical-bills.ts) and households' members.",
  };
}

interface Plan {
  readonly plan: CoveragePlan;
  readonly holderId: string | null;
  readonly premiumMonthlyMinor: number;
}

/** What a policyholder's plan was decided from, kept on their record for dev mode's trace. */
export interface PlanReasons {
  /** The employer's jobs, and this job's pay a year. */
  readonly staff: number;
  readonly payAnnualMinor: number;
  /** The employer's weighing of the offer and the worker's of taking it, each as a share from 0 to 1. */
  readonly offerShare: number;
  readonly takeShare: number;
  /** The year's rate for one covered person a month, before the worker's part is taken. */
  readonly rateMonthlyMinor: number;
  /** People on the policy. */
  readonly covered: number;
}

/** The year's rate: what one covered person costs the plans a month, with the insurer's load. */
export interface PlanRateRow {
  readonly id: "rate";
  /** The calendar year the rate holds for. */
  readonly year: number;
  readonly rateMonthlyMinor: number;
  /** The claims a covered person a month the rate was set from, before the load. */
  readonly claimsMonthlyMinor: number;
  /** The opening's estimate of a month of the plans' care (expectedPlanCare), which stands for each month with no claims yet. */
  readonly opening: PlanCareMonth;
  /** The plans' own claims, the latest twelve months. */
  readonly months: readonly ({ readonly month: string } & PlanCareMonth)[];
  readonly source: Source;
}

const rateTable = (api: CoreAPI) =>
  api.moduleState(COVERAGE_MODULE_ID).table("planRate");

/** The year's rate row, if the first review has run. */
export function planRateOf(api: CoreAPI): PlanRateRow | undefined {
  return rateTable(api).get("rate") as unknown as PlanRateRow | undefined;
}

/** Claims a covered person a month over the months kept, the opening's estimate standing for each month not yet lived. */
function claimsPerPerson(api: CoreAPI, row: Omit<PlanRateRow, "source">) {
  const window = api.parameter("monthsPerYear");
  const missing = Math.max(0, window - row.months.length);
  let insurer = row.opening.insurerMinor * missing,
    members = row.opening.members * missing;
  for (const month of row.months) {
    insurer += month.insurerMinor;
    members += month.members;
  }
  return members > 0 ? insurer / members : 0;
}

/** Sets the year's rate when there is none or the year has turned; returns the rate in force. */
function setRate(api: CoreAPI): PlanRateRow {
  const year = Number(api.state.date.slice(0, "YYYY".length));
  const old = planRateOf(api);
  if (old && old.year === year) return old;
  const base = {
    id: "rate" as const,
    year,
    opening: old?.opening ?? expectedPlanCare(api),
    months: old?.months ?? [],
  };
  const claims = claimsPerPerson(api, {
    ...base,
    rateMonthlyMinor: 0,
    claimsMonthlyMinor: 0,
  });
  const row: PlanRateRow = {
    ...base,
    claimsMonthlyMinor: Math.round(claims),
    rateMonthlyMinor: Math.round(claims * api.parameter("healthPlanLoad")),
    source: sourceFor(api),
  };
  rateTable(api).put(row as unknown as ModuleRow);
  return row;
}

/** Adds a month of the plans' claims to the rate's record, keeping the latest twelve. */
function recordClaims(api: CoreAPI, month: PlanCareMonth): void {
  const old = planRateOf(api);
  if (!old) return;
  const key = api.state.date.slice(0, "YYYY-MM".length);
  const months = [
    ...old.months.filter((row) => row.month !== key),
    { month: key, ...month },
  ].slice(-api.parameter("monthsPerYear"));
  rateTable(api).put({ ...old, months } as unknown as ModuleRow);
}

/** What the policyholder pays a month for a policy covering this many people, at the year's rate. */
export function workerPremium(
  api: CoreAPI,
  rate: number,
  covered: number,
): number {
  const p = (key: string) => api.parameter(key);
  return Math.round(
    rate *
      Math.max(p("one"), covered) *
      (covered > p("one")
        ? p("healthWorkerPremiumShareFamily")
        : p("healthWorkerPremiumShareSingle")),
  );
}

interface Candidate {
  readonly personId: string;
  readonly householdId: string;
  readonly size: number;
  readonly wage: number;
  /** Real workers the candidate stands for: 1 for a full person, the household's weight for a counted one. */
  readonly weight: number;
  /** People under Medicare's age in the worker's household, whom a policy would cover. */
  readonly covered: number;
}

/**
 * The employer's weighing of offering this job the plan, and the worker's of
 * taking it. Sliding scales, read from the world's records: the employer's
 * staff, the job's pay, the year's rate and the people the policy would cover.
 */
export function planScores(
  api: CoreAPI,
  input: {
    readonly staff: number;
    readonly wageDailyMinor: number;
    readonly covered: number;
    readonly rateMonthlyMinor: number;
  },
): {
  offerScore: number;
  takeScore: number;
  /** Each score as a share from 0 to 1 (its log-odds), for the town's count. */
  offerShare: number;
  takeShare: number;
  payAnnualMinor: number;
} {
  const p = (key: string) => api.parameter(key);
  const pay = input.wageDailyMinor * p("daysPerMeanYear");
  const rateYear = input.rateMonthlyMinor * p("monthsPerYear");
  const covered = Math.max(p("one"), input.covered);
  // No pay, or a plan that costs nothing, leaves nothing to weigh.
  if (!(pay > 0) || !(rateYear > 0)) {
    const all = pay > 0;
    return {
      offerScore: all ? Infinity : -Infinity,
      takeScore: all ? Infinity : -Infinity,
      offerShare: all ? p("one") : p("zero"),
      takeShare: all ? p("one") : p("zero"),
      payAnnualMinor: pay,
    };
  }
  const employerCost =
    rateYear * (p("one") - p("healthWorkerPremiumShareSingle"));
  const workerCost =
    workerPremium(api, input.rateMonthlyMinor, covered) * p("monthsPerYear");
  const offerScore =
    p("healthOfferBaseline") +
    p("healthOfferSizeWeight") * Math.log(Math.max(p("one"), input.staff)) +
    p("healthOfferPayWeight") * Math.log(pay / employerCost);
  const takeScore =
    p("healthTakeBurdenWeight") *
    Math.log(
      (p("healthTakeBurdenTolerance") * pay * covered) /
        Math.max(p("one"), workerCost),
    );
  const share = (score: number) => p("one") / (p("one") + Math.exp(-score));
  return {
    offerScore,
    takeScore,
    offerShare: share(offerScore),
    takeShare: share(takeScore),
    payAnnualMinor: pay,
  };
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
 * Who holds an employer plan in their own name. Each of the town's working
 * adults, full and counted, has their own share of a plan (planScores: the
 * employer's offer times the worker's take-up); the town's plans are the sum
 * of those shares, held from the highest share down. One policyholder to a
 * household.
 */
function holdersToday(
  api: CoreAPI,
  staff: ReadonlyMap<string, number>,
  unpaid: ReadonlySet<string | null>,
  rate: PlanRateRow,
): {
  full: Map<string, string>;
  counted: Map<string, string>;
  reasons: Map<string, PlanReasons>;
  summary: EmployerPlansSummary;
} {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const date = makeIsoDate(core.date);
  const ageOf = (birth: string) => ageOnDate(makeIsoDate(birth), date);
  const adult = (birth: string) => {
    const age = ageOf(birth);
    return age >= 19 && age < p("healthMedicareAge");
  };
  // People under Medicare's age in each full household.
  const coveredIn = new Map<string, number>();
  for (const person of core.people.values())
    if (
      person.alive &&
      !person.id.startsWith("official:") &&
      ageOf(person.birthDate) < p("healthMedicareAge")
    )
      coveredIn.set(
        person.householdId,
        (coveredIn.get(person.householdId) ?? 0) + 1,
      );
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
      covered: coveredIn.get(person.householdId) ?? 1,
    });
  }
  const rt = residentsRuntime(core);
  const counted = new Set<string>();
  if (rt) {
    const store = rt.store;
    // The town's usual employer size, for workers whose employer is not recorded.
    const sizes = [...staff.values()].sort((a, b) => a - b);
    const usualSize = sizes[Math.floor(sizes.length / 2)] ?? 0;
    for (const h of store.liveHouseholds()) {
      counted.add(h.id);
      const weight = store.weightOf(h);
      const members = store.countedMembers(h);
      const covered = members.filter(
        (m) => ageOf(store.born[m]!) < p("healthMedicareAge"),
      ).length;
      // Workers with no recorded employer (the place's unplaced workers) have
      // jobs too: the same rule as a recorded worker, at the town's usual
      // employer size and the pool's pay, so a place made mostly of them is
      // weighed like any other.
      if (h.unplacedWorkers > 0) {
        const holder = members.find(
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
            // The policyholders the record stands for, one to a household:
            // `unplacedWorkers` is one real household's, as a recorded job is.
            weight: Math.min(1, h.unplacedWorkers) * weight,
            covered,
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
          covered,
        });
      }
    }
  }
  const scored = candidates.map((c) => ({
    c,
    ...planScores(api, {
      staff: c.size,
      wageDailyMinor: c.wage,
      covered: c.covered,
      rateMonthlyMinor: rate.rateMonthlyMinor,
    }),
  }));
  const shareOf = (row: (typeof scored)[number]) =>
    row.offerShare * row.takeShare;
  // The highest share first: their own records decide who, the sum how many.
  scored.sort(
    (a, b) =>
      shareOf(b) - shareOf(a) ||
      b.c.wage - a.c.wage ||
      a.c.personId.localeCompare(b.c.personId),
  );
  const full = new Map<string, string>();
  const heldCounted = new Map<string, string>();
  const reasons = new Map<string, PlanReasons>();
  let total = 0,
    offered = 0,
    plans = 0;
  for (const row of scored) {
    total += row.c.weight;
    offered += row.c.weight * row.offerShare;
    plans += row.c.weight * shareOf(row);
  }
  let taken = 0,
    heldWeight = 0,
    lapsedWeight = 0;
  for (const row of scored) {
    const { c } = row;
    const held = taken < Math.round(plans);
    taken += c.weight;
    if (!held) break;
    if (unpaid.has(c.personId)) {
      lapsedWeight += c.weight;
      continue;
    }
    const into = counted.has(c.householdId) ? heldCounted : full;
    if (into.has(c.householdId)) continue;
    into.set(c.householdId, c.personId);
    reasons.set(c.personId, {
      staff: c.size,
      payAnnualMinor: row.payAnnualMinor,
      offerShare: row.offerShare,
      takeShare: row.takeShare,
      rateMonthlyMinor: rate.rateMonthlyMinor,
      covered: c.covered,
    });
    heldWeight += c.weight;
  }
  return {
    full,
    counted: heldCounted,
    reasons,
    summary: {
      date: makeIsoDate(core.date),
      workers: total,
      offered,
      plans,
      held: heldWeight,
      lapsed: lapsedWeight,
      fullHolders: full.size,
      countedHolders: heldCounted.size,
      rateYear: rate.year,
      rateMonthlyMinor: rate.rateMonthlyMinor,
      claimsMonthlyMinor: rate.claimsMonthlyMinor,
      claimMonths: rate.months.length,
    },
  };
}

/**
 * One weighing of employer plans: workers with a job (by the real workers
 * they stand for), the sum of their employers' offers, the plans their own
 * shares add up to (offer times take-up), those held, and those left out
 * because their last premium went unpaid; and the year's rate the weighing
 * read.
 */
export interface EmployerPlansSummary {
  readonly date: IsoDate;
  readonly workers: number;
  readonly offered: number;
  readonly plans: number;
  readonly held: number;
  readonly lapsed: number;
  readonly fullHolders: number;
  readonly countedHolders: number;
  readonly rateYear: number;
  /** One covered person's month at the year's rate, and the claims a person it was set from. */
  readonly rateMonthlyMinor: number;
  readonly claimsMonthlyMinor: number;
  /** Months of the plans' own claims behind the rate (the opening's estimate stands for the rest of twelve). */
  readonly claimMonths: number;
}

/** The town's employer plans as the review would weigh them today, for dev mode. Reads only. */
export function employerPlansToday(api: CoreAPI): EmployerPlansSummary | null {
  if (!api.state.modules.has(COVERAGE_MODULE_ID)) return null;
  const rate = planRateOf(api);
  if (!rate) return null;
  return holdersToday(api, staffOf(api), unpaidHolders(api), rate).summary;
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
  rateMonthlyMinor: number = planRateOf(api)?.rateMonthlyMinor ?? 0,
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
            ? workerPremium(api, rateMonthlyMinor, covered.length)
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
  /** People under Medicare age on the policy. */
  readonly covered: number;
  /** What one real household pays each month; the record stands for its weight of them. */
  readonly premiumMonthlyMinor: number;
  readonly from: IsoDate;
  readonly to: IsoDate | null;
  readonly lastDueMinor: number;
  readonly lastPaidMinor: number;
  /** What the policy was decided from (planScores), for dev mode's trace. */
  readonly reasons?: PlanReasons;
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
  held: ReadonlyMap<string, string>,
  rate: PlanRateRow,
  reasons: ReadonlyMap<string, PlanReasons>,
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
  const wanted = new Map<
    string,
    Omit<
      CountedCoverageRow,
      "id" | "from" | "to" | "lastDueMinor" | "lastPaidMinor" | "source"
    >
  >();
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      const holderId = held.get(h.id);
      if (!holderId) continue;
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
        covered,
        premiumMonthlyMinor: workerPremium(api, rate.rateMonthlyMinor, covered),
        ...(reasons.has(holderId) ? { reasons: reasons.get(holderId)! } : {}),
      });
    }
  for (const [householdId, old] of have) {
    const next = wanted.get(householdId);
    if (
      next &&
      next.holderId === old.holderId &&
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
}

/** Each counted policyholder's household pays the month's premium, once for each real household the record stands for. */
function payCountedPremiums(api: CoreAPI): void {
  const outside = outsideAccountOf(api);
  if (!outside) return;
  const today = api.state.date;
  for (const row of countedRows(api)) {
    if (row.to !== null || row.premiumMonthlyMinor <= 0) continue;
    const paid = countedPayment(api, {
      id: `premium:${row.householdId}:${today}`,
      placeId: row.placeId,
      householdId: row.householdId,
      otherOwnerId: outside,
      amountMinor: row.premiumMonthlyMinor,
      reasonKey: "health.premium",
      source: { ...row.source, asOf: today },
    });
    // A fresh row over the stored one's frozen parts: frozen in place, not copied.
    countedTable(api).putOwned({
      ...row,
      lastDueMinor: row.premiumMonthlyMinor,
      lastPaidMinor: paid,
    } as unknown as ModuleRow);
  }
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
  reasons: ReadonlyMap<string, PlanReasons> = new Map(),
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
      ...(plan.plan === "employer" && reasons.has(personId)
        ? { reasons: reasons.get(personId)! }
        : {}),
      source: sourceFor(api),
    } as unknown as ModuleRow);
  }
}

/** Writes today's coverage records: a changed plan ends the old record and starts a new one. */
function review(api: CoreAPI): void {
  const today = makeIsoDate(api.state.date);
  const have = new Map(current(api).map((row) => [row.personId, row]));
  const rate = setRate(api);
  const holders = holdersToday(api, staffOf(api), unpaidHolders(api), rate);
  reviewCounted(api, holders.counted, rate, holders.reasons);
  putPlans(
    api,
    plansToday(api, holders.full, undefined, today, rate.rateMonthlyMinor),
    have,
    undefined,
    holders.reasons,
  );
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
  if (counted)
    countedTable(api).put({
      ...counted,
      to: makeIsoDate(api.state.date),
    } as unknown as ModuleRow);
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
  const month = billMedicalCare(api, {
    module: COVERAGE_MODULE_ID,
    coverage: new Map(current(api).map((row) => [row.personId, row.plan])),
    countedHolders: new Set(
      countedRows(api)
        .filter((row) => row.to === null)
        .map((row) => row.householdId),
    ),
  });
  recordClaims(api, month);
}

/** Each policyholder pays the month's premium to the outside account, from what they hold. */
function payPremiums(api: CoreAPI): void {
  const outside = outsideAccountOf(api);
  if (!outside) return;
  const accounts = api.accounts();
  const today = api.state.date;
  for (const row of current(api)) {
    if (row.plan !== "employer" || row.holderId !== row.personId) continue;
    if (row.premiumMonthlyMinor <= 0) continue;
    const receipt = accounts.transfer({
      id: `premium:${row.personId}:${today}`,
      from: accounts.main(row.personId),
      to: accounts.main(outside),
      amountMinor: row.premiumMonthlyMinor,
      reasonKey: "health.premium",
      partial: true,
      source: { ...row.source, asOf: today },
    });
    table(api).put({
      ...row,
      lastDueMinor: row.premiumMonthlyMinor,
      lastPaidMinor: receipt.paidMinor,
      lastJournalId:
        receipt.journalSequence === undefined
          ? null
          : `journal:${today}:${receipt.journalSequence}`,
    } as unknown as ModuleRow);
  }
}

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
      // One row: the year's rate and the twelve months of claims behind it.
      planRate: {},
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
    if (payday) {
      payPremiums(api);
      payCountedPremiums(api);
      billMedical(api);
    }
    return undefined;
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
