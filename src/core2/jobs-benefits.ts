/**
 * Unemployment insurance: a worker laid off or put out by a closure files a
 * claim under the state's program; after the waiting week the state's fund,
 * outside the town, pays a weekly benefit (a share of the lost weekly pay up
 * to the state's maximum) until they're hired or their weeks run out. A
 * worker who quits for a better job or leaves work has no claim.
 *
 * The program's terms come from the state's law in force
 * (`lawInForce(api, "unemployment-insurance")` and its weekly maximum); a term
 * the law row leaves blank, or a world without the laws module, uses the
 * states' median from DOL's provisions as the estimate.
 * `registerUnemploymentTerms` can still replace the source.
 */
import type { ModuleTable } from "./module-state";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
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

/** The states' medians from DOL's provisions: the estimate for any term the law in force leaves blank. */
function medianTerms(api: CoreAPI): UnemploymentTerms {
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

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * The law's weekly-benefit fraction as a share of weekly pay: a fraction of
 * average weekly wage is that share already; a fraction of quarterly or
 * annual wages is multiplied by the weeks those wages cover.
 */
function weeklyShareOf(
  api: CoreAPI,
  terms: Record<string, unknown>,
): number | undefined {
  const fraction = num(terms.weeklyBenefitFraction);
  if (fraction === undefined) return undefined;
  const basis = String(terms.weeklyBenefitAppliesTo ?? "");
  if (/AWW|average weekly|\/13/i.test(basis)) return fraction;
  const p = (key: string) => api.parameter(key);
  const quartersPerYear = p("macroMonthsPerYear") / p("macroMonthsPerQuarter");
  const quarters = /high.quarter/i.test(basis)
    ? p("one")
    : /\b2 (highest|consecutive)|last 2/i.test(basis)
      ? p("two")
      : quartersPerYear;
  const weeksPerQuarter =
    p("jobsDaysPerYear") / DAYS_PER_WEEK / quartersPerYear;
  return fraction * quarters * weeksPerQuarter;
}

let lawCache:
  { state: object; date: string; terms: UnemploymentTerms } | undefined;

/** The state's unemployment insurance in force, with the medians filling any blank term. */
function lawTerms(api: CoreAPI): UnemploymentTerms {
  const median = medianTerms(api);
  if (!api.state.modules.has(LAWS_MODULE_ID)) return median;
  if (lawCache?.state === api.state && lawCache.date === api.state.date)
    return lawCache.terms;
  const program = lawInForce(api, "unemployment-insurance").governing;
  const terms = (program?.terms ?? {}) as Record<string, unknown>;
  const toMinor = api.parameter("minorPerDollar");
  const weeklyMaximum = num(
    lawInForce(api, "unemployment-weekly-maximum").value,
  );
  const basePeriod = num(
    (terms.baseEarnings as Record<string, unknown> | undefined)
      ?.minimumBasePeriodWages,
  );
  const citation = program
    ? [program.source].flat().join(" ; ")
    : median.source.citation;
  const result: UnemploymentTerms = program
    ? {
        hasProgram: terms.hasProgram !== false,
        weeklyShare: weeklyShareOf(api, terms) ?? median.weeklyShare,
        weeklyMaximumMinor:
          weeklyMaximum !== undefined
            ? weeklyMaximum * toMinor
            : median.weeklyMaximumMinor,
        maxWeeks: num(terms.maxWeeks) ?? median.maxWeeks,
        waitingWeek:
          typeof terms.waitingWeek === "boolean"
            ? terms.waitingWeek
            : median.waitingWeek,
        minimumBasePeriodMinor:
          basePeriod !== undefined
            ? basePeriod * toMinor
            : median.minimumBasePeriodMinor,
        source: {
          tag: program.estimate ? "ESTIMATED" : "SOURCED",
          asOf: api.state.date,
          citation,
          ...(program.estimate
            ? { estimatedFrom: "The state's unemployment insurance in force." }
            : {}),
        } as Source,
      }
    : { ...median, hasProgram: false };
  lawCache = { state: api.state, date: api.state.date, terms: result };
  return result;
}

export function unemploymentTerms(
  api: CoreAPI,
  placeId: string,
): UnemploymentTerms {
  return termsSource?.(api, placeId) ?? lawTerms(api);
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
