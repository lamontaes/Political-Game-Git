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
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { stopgap } from "./stopgaps";
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

/** The weekly benefit's share of weekly pay, from the state's fraction and the wages it applies to. */
function weeklyShareOf(
  fraction: number,
  appliesTo: string,
): number | undefined {
  const text = appliesTo.toLowerCase();
  // High-quarter wages are 13 weeks' pay; two quarters 26; a base period's annual wages 52.
  const weeks = /two highest|2 highest/.test(text)
    ? 26
    : /high[- ]?quarter|hqw/.test(text)
      ? 13
      : /annual|base[- ]period/.test(text)
        ? 52
        : /weekly wage|aww/.test(text)
          ? 1
          : undefined;
  return weeks === undefined ? undefined : fraction * weeks;
}

/** The state's program as law in force (OPUS-GOV's laws module), where the laws are open in this world. */
function fromLaw(api: CoreAPI): UnemploymentTerms | undefined {
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return undefined;
  let program, maximum;
  try {
    program = lawInForce(api, "unemployment-insurance");
    maximum = lawInForce(api, "unemployment-weekly-maximum");
  } catch {
    return undefined;
  }
  // Before the recorded provisions take effect, the earliest recorded row is the closest record of the state's program.
  const recorded = program.governing ?? program.pending[0] ?? null;
  const maximumValue =
    maximum.value ?? (maximum.pending[0]?.value as number | undefined) ?? null;
  const row = recorded as
    | (typeof program.governing & {
        terms?: {
          hasProgram?: boolean;
          weeklyBenefitFraction?: number | null;
          weeklyBenefitAppliesTo?: string;
          waitingWeek?: boolean;
          maxWeeks?: number;
          baseEarnings?: { minimumBasePeriodWages?: number | null };
        };
      })
    | null;
  if (!row?.terms) return undefined;
  const t = row.terms,
    fallback = standIn(api),
    cents = api.parameter("macroHundred");
  if (t.hasProgram === false || row.value === 0)
    return { ...fallback, hasProgram: false };
  const share =
    t.weeklyBenefitFraction != null && t.weeklyBenefitAppliesTo
      ? weeklyShareOf(t.weeklyBenefitFraction, t.weeklyBenefitAppliesTo)
      : undefined;
  return {
    hasProgram: true,
    weeklyShare: share ?? fallback.weeklyShare,
    weeklyMaximumMinor:
      maximumValue != null
        ? Math.round(maximumValue * cents)
        : fallback.weeklyMaximumMinor,
    maxWeeks: t.maxWeeks ?? fallback.maxWeeks,
    waitingWeek: t.waitingWeek ?? true,
    minimumBasePeriodMinor:
      t.baseEarnings?.minimumBasePeriodWages != null
        ? Math.round(t.baseEarnings.minimumBasePeriodWages * cents)
        : fallback.minimumBasePeriodMinor,
    source: {
      tag: program.estimate || !program.governing ? "ESTIMATED" : "SOURCED",
      asOf: api.state.date,
      citation: String(row.source ?? fallback.source.citation),
      ...(program.estimate || !program.governing
        ? {
            estimatedFrom:
              "The state's unemployment insurance provisions as recorded in its law in force.",
          }
        : {}),
    } as Source,
  };
}

export function unemploymentTerms(
  api: CoreAPI,
  placeId: string,
): UnemploymentTerms {
  return termsSource?.(api, placeId) ?? fromLaw(api) ?? standIn(api);
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
