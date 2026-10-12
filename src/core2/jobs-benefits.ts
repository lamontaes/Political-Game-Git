/**
 * Unemployment insurance: a worker laid off or put out by a closure files a
 * claim under the state's program; after the waiting week the state's fund,
 * outside the town, pays a weekly benefit (a share of the lost weekly pay up
 * to the state's maximum) until they're hired or their weeks run out. A
 * worker who quits for a better job or leaves work has no claim.
 *
 * The program's terms come from the law in force (OPUS-GOV's
 * `lawInForce(api, "unemployment-insurance")`), registered with
 * `registerUnemploymentTerms`; until that's on this branch, a national
 * estimate from DOL's state provisions stands in.
 */
import type { ModuleTable } from "./module-state";
import { stopgap } from "./stopgaps";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { transferCash } from "./world-transfer";
import type { CoreAPI, CoreState, JobInput, Source } from "./types";

export interface UnemploymentTerms {
  readonly hasProgram: boolean;
  /** The weekly benefit's share of the lost job's weekly pay. */
  readonly weeklyShare: number;
  readonly weeklyMaximumMinor: number;
  readonly maxWeeks: number;
  readonly waitingWeek: boolean;
  /** Earnings in the base period (the last year) a claim needs. */
  readonly minimumBasePeriodMinor: number;
  readonly source: Source;
}

export interface ClaimRow {
  id: string;
  personId: string;
  placeId: string;
  /** Paid into: the person, or the place's pooled residents' account for a counted worker. */
  payeeAccountOwnerId: string;
  open: boolean;
  filedAt: string;
  nextPayAt: string;
  weeklyMinor: number;
  weeksLeft: number;
  paidMinor: number;
  reasonKey: string;
  endedAt?: string;
  endReason?: "hired" | "exhausted" | "no-payer";
}

type TermsSource = (
  api: CoreAPI,
  placeId: string,
) => UnemploymentTerms | undefined;
let termsSource: TermsSource | undefined;

/** The law in force answers for the program's terms (OPUS-GOV registers it). */
export function registerUnemploymentTerms(source: TermsSource): void {
  termsSource = source;
}

function standIn(api: CoreAPI): UnemploymentTerms {
  stopgap("SG-WORLD-jobs-benefits-terms");
  const p = (key: string) => api.parameter(key);
  return {
    hasProgram: true,
    weeklyShare: p("jobsBenefitWeeklyShare"),
    weeklyMaximumMinor: p("jobsBenefitWeeklyMaximumMinor"),
    maxWeeks: p("jobsBenefitMaxWeeks"),
    waitingWeek: true,
    minimumBasePeriodMinor: p("jobsBenefitMinimumBasePeriodMinor"),
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "U.S. Department of Labor, Significant Provisions of State UI Laws, January and July 2026: medians across the states.",
      estimatedFrom:
        "Half the weekly wage (1/26 of high-quarter pay), the states' median weekly maximum and base-period minimum, 26 weeks, one waiting week.",
    },
  };
}

export function unemploymentTerms(
  api: CoreAPI,
  placeId: string,
): UnemploymentTerms {
  return termsSource?.(api, placeId) ?? standIn(api);
}

const DAYS_PER_WEEK = 7;

function weeksAfter(date: string, weeks: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + weeks * DAYS_PER_WEEK);
  return at.toISOString().slice(0, "YYYY-MM-DD".length);
}

/** Opens a claim for a worker who lost `job` through no choice of their own; returns it, or nothing when they don't qualify. */
export function fileClaim(
  api: CoreAPI,
  table: ModuleTable,
  job: Readonly<JobInput>,
  reasonKey: string,
  /** Weeks the lost job ran, for the base period. */
  weeksWorked: number,
): ClaimRow | undefined {
  const c = api.state as CoreState;
  const full = c.people.get(job.personId);
  const placeId = (full ?? residentPerson(c, job.personId))?.placeId;
  if (!placeId) return undefined;
  const payee = full
    ? full.id
    : residentsRuntime(c)?.input.accounts.find((row) => row.placeId === placeId)
        ?.accountId;
  if (!payee) return undefined;
  const terms = unemploymentTerms(api, placeId);
  if (!terms.hasProgram) return undefined;
  const weeklyPay = job.wageDailyMinor * DAYS_PER_WEEK;
  // Base-period earnings: the lost job's pay over the weeks of the last year it ran.
  const basePeriodWeeks = Math.min(
    api.parameter("jobsDaysPerYear") / DAYS_PER_WEEK,
    weeksWorked,
  );
  if (weeklyPay * basePeriodWeeks < terms.minimumBasePeriodMinor)
    return undefined;
  const weekly = Math.round(
    Math.min(terms.weeklyMaximumMinor, terms.weeklyShare * weeklyPay),
  );
  if (!(weekly > 0)) return undefined;
  const row: ClaimRow = {
    id: `claim:${job.personId}:${c.date}`,
    personId: job.personId,
    placeId,
    payeeAccountOwnerId: payee,
    open: true,
    filedAt: c.date,
    nextPayAt: weeksAfter(c.date, terms.waitingWeek ? 2 : 1),
    weeklyMinor: weekly,
    weeksLeft: terms.maxWeeks,
    paidMinor: 0,
    reasonKey,
  };
  table.put({ ...row });
  return row;
}

/** Pays every open claim due by today from the state's fund outside the town. */
export function payClaims(api: CoreAPI, table: ModuleTable): void {
  const c = api.state as CoreState;
  for (const row of table.query("open", [true]) as unknown as ClaimRow[]) {
    if (row.nextPayAt > c.date) continue;
    const fund = [...c.organizations.values()].find(
      (org) => org.placeId === row.placeId && org.outsideFlow !== undefined,
    );
    if (!fund) {
      table.put({
        ...row,
        open: false,
        endedAt: c.date,
        endReason: "no-payer",
      });
      continue;
    }
    const paid = transferCash(
      api,
      `unemployment-benefit:${row.personId}:${c.date}`,
      fund.id,
      row.payeeAccountOwnerId,
      row.weeklyMinor,
      unemploymentTerms(api, row.placeId).source,
    );
    const weeksLeft = row.weeksLeft - 1;
    table.put({
      ...row,
      paidMinor: row.paidMinor + paid,
      weeksLeft,
      nextPayAt: weeksAfter(c.date, 1),
      ...(weeksLeft > 0
        ? {}
        : { open: false, endedAt: c.date, endReason: "exhausted" as const }),
    });
  }
}

/** A hire ends the person's open claim. */
export function endClaim(
  api: CoreAPI,
  table: ModuleTable,
  personId: string,
): void {
  for (const row of table.query("byPerson", [
    personId,
    true,
  ]) as unknown as ClaimRow[])
    table.put({
      ...row,
      open: false,
      endedAt: api.state.date,
      endReason: "hired",
    });
}
