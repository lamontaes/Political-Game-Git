/**
 * Unemployment insurance: a worker laid off or put out by a closure files a
 * claim under the state's program; after the waiting week the state's fund,
 * outside the town, pays a weekly benefit (a share of the lost weekly pay up
 * to the state's maximum) until they're hired or their weeks run out. A
 * worker who quits for a better job or leaves work has no claim.
 *
 * Every claim reads the law in force directly (`lawInForce` on the
 * `unemployment-insurance` and `unemployment-weekly-maximum` series), so a
 * law enacted in play changes the next claim; a filed claim keeps the terms
 * it was filed under and cites the law row.
 */
import type { ModuleTable } from "./module-state";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { decisionLean } from "./trait-decisions";
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
  /** The law row the terms were read from. */
  readonly lawId?: string;
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
  /** The law row whose terms fixed this claim. */
  lawId?: string;
  source?: Source;
  endedAt?: string;
  endReason?: "hired" | "exhausted" | "no-payer" | "left";
}

const DAYS_PER_WEEK = 7;
const QUARTERS_PER_YEAR = 4;

function lawSource(row: LawRowInput, asOf: string): Source {
  const where = Array.isArray(row.source)
    ? row.source.join(" ; ")
    : (row.source as string);
  const citation = `${row.id}: ${where}`;
  return row.estimate
    ? { tag: "ESTIMATED", asOf, citation, estimatedFrom: citation }
    : { tag: "SOURCED", asOf, citation };
}

const NO_PROGRAM = (asOf: string): UnemploymentTerms => ({
  hasProgram: false,
  weeklyShare: 0,
  weeklyMaximumMinor: 0,
  maxWeeks: 0,
  waitingWeek: false,
  minimumBasePeriodMinor: 0,
  source: {
    tag: "ESTIMATED",
    asOf,
    citation: "No unemployment insurance law is in force here.",
    estimatedFrom: "The laws module's starting law records no program.",
  },
});

/**
 * The state's unemployment insurance as the law in force records it (the
 * laws module's `unemployment-insurance` and `unemployment-weekly-maximum`
 * series). A world without the laws module open, or a state whose row says
 * it has no program, has no claims.
 */
export function unemploymentTerms(api: CoreAPI): UnemploymentTerms {
  const asOf = api.state.date;
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID))
    return NO_PROGRAM(asOf);
  const row = lawInForce(api, "unemployment-insurance").governing;
  const t = row?.terms as
    | {
        hasProgram?: boolean;
        waitingWeek?: boolean;
        maxWeeks?: number | null;
        weeklyBenefitFraction?: number | null;
        weeklyBenefitBasisQuarters?: number | null;
        baseEarnings?: {
          minimumBasePeriodWages?: number | null;
          minimumHighQuarterWages?: number | null;
        };
      }
    | undefined;
  const maximum = lawInForce(api, "unemployment-weekly-maximum").value;
  if (!row || !t || t.hasProgram !== true) return NO_PROGRAM(asOf);
  if (typeof t.maxWeeks !== "number" || maximum === null)
    return NO_PROGRAM(asOf);
  const minor = api.parameter("minorPerDollar");
  const quarterWeeks =
    api.parameter("jobsDaysPerYear") / DAYS_PER_WEEK / QUARTERS_PER_YEAR;
  const quarters = t.weeklyBenefitBasisQuarters ?? undefined;
  // A fraction of the basis wages is a share of weekly pay once the basis's
  // weeks are counted; a row that gives none falls to the program's median.
  const weeklyShare =
    typeof t.weeklyBenefitFraction === "number" && quarters !== undefined
      ? t.weeklyBenefitFraction * (quarters === 0 ? 1 : quarters * quarterWeeks)
      : api.parameter("jobsBenefitWeeklyShare");
  const wages =
    t.baseEarnings?.minimumBasePeriodWages ??
    t.baseEarnings?.minimumHighQuarterWages;
  return {
    hasProgram: true,
    weeklyShare,
    weeklyMaximumMinor: maximum * minor,
    maxWeeks: t.maxWeeks,
    waitingWeek: t.waitingWeek === true,
    minimumBasePeriodMinor:
      typeof wages === "number"
        ? Math.round(wages * minor)
        : api.parameter("jobsBenefitMinimumBasePeriodMinor"),
    lawId: row.id,
    source: lawSource(row, asOf),
  };
}

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
  // An eligible worker files unless their traits lean hard toward skipping;
  // the record's traits are the full person's or the counted worker's own.
  const filer = full ?? residentPerson(c, job.personId);
  if (
    filer &&
    api.parameter("benefitsFileBase") +
      decisionLean(c, filer, "jobs-benefits.file-claim", "file", "skip") <=
      api.parameter("zero")
  )
    return undefined;
  const payee = full
    ? full.id
    : residentsRuntime(c)?.input.accounts.find((row) => row.placeId === placeId)
        ?.accountId;
  if (!payee) return undefined;
  const terms = unemploymentTerms(api);
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
    lawId: terms.lawId,
    source: terms.source,
  };
  table.put({ ...row });
  return row;
}

/** Pays every open claim due by today from the state's fund outside the town. */
export function payClaims(api: CoreAPI, table: ModuleTable): void {
  const c = api.state as CoreState;
  for (const row of table.query("open", [true]) as unknown as ClaimRow[]) {
    if (row.nextPayAt > c.date) continue;
    // stopgapId: SG-WORLD-jobs-benefits (paid from the town's outside account, not a state fund)
    api.stopgap("SG-WORLD-jobs-benefits");
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
    // A claimant who is neither a full person nor still counted has left the
    // town's records (moved away): there is no one to pay.
    if (
      !c.people.has(row.personId) &&
      residentsRuntime(c)?.store.countedMember(row.personId) === undefined
    ) {
      table.put({
        ...row,
        open: false,
        endedAt: c.date,
        endReason: "left",
      });
      continue;
    }
    const paid = transferCash(
      api,
      `unemployment-benefit:${row.personId}:${c.date}`,
      fund.id,
      // A claimant filled in since filing is paid as a full person; a counted
      // one lands in their own household's group account.
      c.people.has(row.personId) ? row.personId : row.payeeAccountOwnerId,
      row.weeklyMinor,
      row.source ?? unemploymentTerms(api).source,
      { personId: row.personId },
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
