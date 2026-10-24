/**
 * Health coverage (people-coverage-record-monthly-pass, part of the health
 * coverage and medical spending engine): each full person holds a coverage
 * record (plan, from, to), and the household pays a monthly premium that
 * reads it.
 *
 * Once a month, on the 1st, and on the first day played: an adult in the
 * years people work, with a job, holds an employer plan when the town's
 * working adults ranked by their employer's size (the larger first) and then
 * their pay reach the share who hold their own plan (a parameter, ESTIMATED).
 * The policy covers everyone else in the policyholder's household, at the
 * family premium when there are two or more people on it and the single
 * premium when there is one. People 65 and over hold Medicare (no premium
 * here). Everyone else is uninsured until another engine (Medicaid, the
 * gov-medicaid-coverage-reader item) gives them a plan. The policyholder pays
 * the worker's share of the premium (KFF 2024) from what they hold to the
 * place's outside account, where the insurers are; a premium they cannot
 * pay in full ends the policy for the next month, as with any bill that goes
 * unpaid: it is never a debt.
 *
 * Counted households are ranked with the full people, by the same employer
 * size and pay, and a counted household whose rank earns a policy holds a
 * counted-coverage record on its policyholder and pays the same premium, once
 * for each real household the record stands for (counted money). A household
 * filled in is handed its counted record the same day (onFillIn): the counted
 * record ends and its members hold full records on the same plan, with the
 * same policyholder and premium, until the next review ranks them as it ranks
 * everyone. The employer's share of the premium is part of the employer's
 * compensation and is not modeled.
 */
import { coreAPI, registerModule } from "../state";
import { outsideAccountOf } from "../budgets-treasury";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { declareSnapshotCovered } from "../snapshot";
import { countedPayment } from "../counted-money";
import { countedJob, residentsRuntime } from "./residents";
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
): { full: Map<string, string>; counted: Map<string, string> } {
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
    });
  }
  const rt = residentsRuntime(core);
  if (rt) {
    const store = rt.store;
    for (const h of store.liveHouseholds()) {
      const weight = store.weightOf(h);
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
  const slots = Math.round(total * p("healthEmployerPolicyholderShare"));
  const counted = new Set(
    rt ? [...rt.store.liveHouseholds()].map((h) => h.id) : [],
  );
  const full = new Map<string, string>();
  const heldCounted = new Map<string, string>();
  let taken = 0;
  for (const c of candidates) {
    if (taken >= slots) break;
    taken += c.weight;
    if (unpaid.has(c.personId)) continue;
    const into = counted.has(c.householdId) ? heldCounted : full;
    if (!into.has(c.householdId)) into.set(c.householdId, c.personId);
  }
  return { full, counted: heldCounted };
}

/** What every full person's coverage should be today (or a few households', for a fill-in). */
function plansToday(
  api: CoreAPI,
  holderByHousehold: ReadonlyMap<string, string>,
  /** Only these households (a fill-in's); every full household when absent. */
  only?: ReadonlySet<string>,
): Map<string, { householdId: string } & Plan> {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const date = makeIsoDate(core.date);
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
  const ageOf = (birth: string) => ageOnDate(makeIsoDate(birth), date);
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
  /** People under Medicare age on the policy. */
  readonly covered: number;
  /** What one real household pays each month; the record stands for its weight of them. */
  readonly premiumMonthlyMinor: number;
  readonly from: IsoDate;
  readonly to: IsoDate | null;
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
function reviewCounted(api: CoreAPI, held: ReadonlyMap<string, string>): void {
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
    countedTable(api).put({
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
  if (counted)
    countedTable(api).put({
      ...counted,
      to: makeIsoDate(api.state.date),
    } as unknown as ModuleRow);
  const plans = plansToday(
    api,
    new Map(counted ? [[householdId, counted.holderId]] : []),
    new Set([householdId]),
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
    }
    return undefined;
  },
};
declareSnapshotCovered(COVERAGE_MODULE.id);

export function openCoverage(core: CoreState): void {
  if (core.modules.has(COVERAGE_MODULE_ID)) return;
  registerModule(core, COVERAGE_MODULE);
  review(coreAPI(core));
}
