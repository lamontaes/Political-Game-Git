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
 * Counted households have no records yet (people-coverage-counted). The
 * employer's share of the premium is part of the employer's compensation and
 * is not modeled.
 */
import { coreAPI, registerModule } from "../state";
import { outsideAccountOf } from "../budgets-treasury";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { declareSnapshotCovered } from "../snapshot";
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

/** What every full person's coverage should be today. */
function plansToday(api: CoreAPI): Map<string, { householdId: string } & Plan> {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const date = makeIsoDate(core.date);
  const plans = new Map<string, { householdId: string } & Plan>();
  const people = [...core.people.values()].filter(
    (person) => person.alive && !person.id.startsWith("official:"),
  );
  const staff = new Map<string, number>();
  for (const job of core.jobs.values())
    if (job.endsAt === undefined)
      staff.set(job.organizationId, (staff.get(job.organizationId) ?? 0) + 1);
  const unpaid = new Set(
    current(api)
      .filter((row) => row.lastPaidMinor < row.lastDueMinor)
      .map((row) => row.holderId),
  );
  const ageOf = (birth: string) => ageOnDate(makeIsoDate(birth), date);
  const wages = (id: string) => core.jobs.get(id)?.wageDailyMinor ?? 0;
  // Employed adults in the years people work, larger employers and higher pay first.
  const candidates = people
    .filter((person) => {
      const age = ageOf(person.birthDate);
      return (
        person.jobId !== undefined &&
        core.jobs.has(person.jobId) &&
        age >= 19 &&
        age < p("healthMedicareAge")
      );
    })
    .sort((a, b) => {
      const sizeOf = (id: string) =>
        staff.get(core.jobs.get(id!)?.organizationId ?? "") ?? 0;
      return (
        sizeOf(b.jobId!) - sizeOf(a.jobId!) ||
        wages(b.jobId!) - wages(a.jobId!) ||
        a.id.localeCompare(b.id)
      );
    });
  const slots = Math.round(
    candidates.length * p("healthEmployerPolicyholderShare"),
  );
  const holderByHousehold = new Map<string, string>();
  for (const person of candidates.slice(0, slots)) {
    if (unpaid.has(person.id)) continue;
    if (!holderByHousehold.has(person.householdId))
      holderByHousehold.set(person.householdId, person.id);
  }
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

/** Writes today's coverage records: a changed plan ends the old record and starts a new one. */
function review(api: CoreAPI): void {
  // stopgapId: SG-PEOPLE-coverage-counted (counted households hold no coverage record)
  api.stopgap("SG-PEOPLE-coverage-counted");
  const today = makeIsoDate(api.state.date);
  const have = new Map(current(api).map((row) => [row.personId, row]));
  for (const [personId, plan] of plansToday(api)) {
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
      lastDueMinor: 0,
      lastPaidMinor: 0,
      lastJournalId: null,
      source: sourceFor(api),
    } as unknown as ModuleRow);
  }
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
  state: { schemaVersion: 1, tables: { coverage: {} } },
  onDay(api) {
    const first = table(api).size === 0;
    const payday = api.state.date.endsWith("-01");
    if (!first && !payday) return undefined;
    review(api);
    if (payday) payPremiums(api);
    return undefined;
  },
};
declareSnapshotCovered(COVERAGE_MODULE.id);

export function openCoverage(core: CoreState): void {
  if (core.modules.has(COVERAGE_MODULE_ID)) return;
  registerModule(core, COVERAGE_MODULE);
  review(coreAPI(core));
}
