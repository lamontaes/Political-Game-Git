/**
 * Law reach, group A: public-sector bargaining. Where the law is in force at
 * an employer's level of government or above, the town's jobs at a police,
 * fire or school employer are one bargaining unit, and the unit's contract is
 * settled the day after the funding government's budget year begins: the pay
 * of every job in the unit rises by the growth of the employer's own budget
 * line over the year before (the budget adopted that day against the last),
 * applied through the core's `rerateJob`. A line that did not grow settles at
 * no raise, never a cut. The law is read at each contract date, so a repeal
 * stops the next contract; pay already raised stays.
 */
import data from "../data/laws/public-bargaining.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  budgetsOf,
  fiscalYearOf,
  governments,
  type GovernmentRow,
} from "../modules/budgets";
import { publicEmployerLevel } from "../public-pay-floor";
import type { CoreAPI, CoreState, Source } from "../types";
import { jobsAt } from "./group-b-money";
import type { PolicyHandler } from "./host";
import {
  ensureReachA,
  mechanicRow,
  onReachCalendar,
  putMechanic,
  REACH_A_MODULE_ID,
  tomorrow,
  yesLevels,
} from "./group-a-records";

const KEY = data.series;
const KIND = data.contractKind;
const UNITS = data.units as Readonly<Record<string, { line: string }>>;
const ABOVE = data.levelsUp as readonly string[];
const RETRY_DAYS = 7;
const SEASON_DAYS = 120;
const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;
const ORDER = ["federal", "state", "county", "city"] as const;

/** The government that pays a unit's line: the employer's own level, else the nearest above that budgets it. */
function fundingGovernment(
  api: CoreAPI,
  employerLevel: string,
  line: string,
): GovernmentRow | undefined {
  const levels = [
    employerLevel,
    ...ABOVE.slice(ABOVE.indexOf(employerLevel) + 1),
  ];
  for (const level of levels)
    for (const gov of governments(api))
      if (
        gov.level === level &&
        budgetsOf(api, gov.id).some((b) => (b.spendingMinor[line] ?? 0) > 0)
      )
        return gov;
  return undefined;
}

/** The day after a government's next budget year begins. */
function nextContractDate(date: string, gov: GovernmentRow): string {
  const fy = fiscalYearOf(date, gov.fiscalYearStart);
  const first = tomorrow(`${fy}-${gov.fiscalYearStart}`);
  return first > date ? first : tomorrow(`${fy + 1}-${gov.fiscalYearStart}`);
}

function schedule(
  api: CoreAPI,
  gov: GovernmentRow,
  lawId: string,
  at?: string,
): void {
  const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
  const date = at ?? nextContractDate(api.state.date, gov);
  const key = `bargaining:${gov.id}:${date}`;
  if (calendar.get(key)) return;
  calendar.schedule({
    key,
    date: makeIsoDate(date),
    kind: KIND,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `Public-sector bargaining in force (${lawId}).`,
      estimatedFrom:
        "A unit's pay follows the growth of its employer's budget line at the budget date.",
    },
    sourceRecordIds: [gov.id],
  });
}

/** Whether the law covers an employer class today: in force at its level of government or above. */
function covered(
  yes: readonly { level: string }[],
  classification: string,
): boolean {
  const level = publicEmployerLevel(classification);
  if (!level) return false;
  const at = ORDER.indexOf(level);
  return yes.some(
    (l) => ORDER.indexOf(l.level as (typeof ORDER)[number]) <= at,
  );
}

export const publicBargaining: PolicyHandler = (api, change) => {
  ensureReachA(api);
  if (!change.inForce) return;
  for (const gov of governments(api)) schedule(api, gov, change.lawId);
};

onReachCalendar(KIND, (api, work) => {
  const gov = governments(api).find((g) => g.id === work.sourceRecordIds[0]);
  if (!gov) return;
  // The law is read now: a repeal ends the contract cycle.
  const yes = yesLevels(api, KEY);
  if (!yes.length) return;
  schedule(api, gov, yes[0]!.lawId);
  const core = api.state as CoreState;
  const fy = fiscalYearOf(core.date, gov.fiscalYearStart);
  const budgets = budgetsOf(api, gov.id);
  let waiting = false;
  for (const [classification, unit] of Object.entries(UNITS)) {
    if (!covered(yes, classification)) continue;
    const id = `bargaining:${gov.id}:${classification}:${fy}`;
    if (mechanicRow(api, id)) continue;
    if (
      fundingGovernment(api, publicEmployerLevel(classification)!, unit.line)
        ?.id !== gov.id
    )
      continue;
    const now = budgets.find((b) => b.fiscalYear === fy)?.spendingMinor[
      unit.line
    ];
    const before = budgets.find((b) => b.fiscalYear === fy - 1)?.spendingMinor[
      unit.line
    ];
    if (!before) continue;
    // The body adopts its budget on its own date: wait for it, weekly, for a season.
    if (!now) {
      waiting = true;
      continue;
    }
    const growth = Math.max(0, now / before - 1);
    const jobs = jobsAt(api, [classification]).filter(
      (j) => (j.hourlyMinor ?? 0) > 0,
    );
    if (!jobs.length) continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: `${gov.name} ${unit.line} line, fiscal ${fy - 1} to ${fy}: the unit's contract.`,
      estimatedFrom:
        "A unit's pay follows the growth of its employer's budget line.",
    };
    let raised = 0;
    // The first named worker raised, so the contract can be followed to a person.
    let sample: { jobId: string; from: number; to: number } | undefined;
    for (const job of jobs) {
      // The job is the live record: read its pay before the re-rate changes it.
      const from = job.hourlyMinor!;
      const to = Math.round(from * (1 + growth));
      if (to <= from) continue;
      api.rerateJob(job.id, to, source);
      raised += 1;
      if (!sample && core.jobs.has(job.id))
        sample = { jobId: job.id, from, to };
    }
    putMechanic(api, {
      id,
      key: KEY,
      active: true,
      since: core.date,
      facts: {
        governmentId: gov.id,
        classification,
        line: unit.line,
        fiscalYear: fy,
        lineBeforeMinor: before,
        lineNowMinor: now,
        raisePct: Math.round(growth * 10_000) / 100,
        jobs: jobs.length,
        raised,
        lawId: yes[0]!.lawId,
        ...(sample
          ? {
              sampleJobId: sample.jobId,
              sampleFromMinor: sample.from,
              sampleToMinor: sample.to,
            }
          : {}),
      },
    });
  }
  const start = `${fy}-${gov.fiscalYearStart}`;
  const retry = addDays(makeIsoDate(core.date), RETRY_DAYS);
  if (waiting && daysBetween(start, retry) <= SEASON_DAYS)
    schedule(api, gov, yes[0]!.lawId, retry);
});
