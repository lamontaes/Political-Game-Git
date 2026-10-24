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
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { residentFacts, residentsRuntime } from "./modules/residents";
import { countedPersonOf } from "./counted-actor";
import { appraiseEvent } from "./emotion";
import { parameter, parameterValues } from "./parameters";
import { initialPersonState } from "./person-state";
import { decisionLean, hardshipReason } from "./trait-decisions";
import { transferCash } from "./world-transfer";
import type {
  Affect,
  CoreAPI,
  CoreEventInput,
  CoreState,
  JobInput,
  PersonInput,
  Source,
} from "./types";

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
  /** Why they filed, for the player and the people they deal with: the base, their traits' lean and the stress the loss left. */
  reasons?: Readonly<Record<string, number>>;
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

/**
 * What a claimant is under today, for the filing decision. A full person is
 * read as they stand (the layoff just emitted has already raised their
 * stress). A counted worker stores no stress, so the layoff's own appraisal of
 * them stands for it on the day: their traits, the same rule that raised a full
 * person's. With no layoff to appraise (a closure) a counted worker reads none.
 */
export function claimantFeeling(
  c: CoreState,
  full: { affect?: Affect } | undefined,
  counted: PersonInput | undefined,
  lost: CoreEventInput | undefined,
): { affect?: Affect } {
  if (full) return full;
  if (!counted || !lost) return {};
  return {
    affect: appraiseEvent(
      initialPersonState(c, counted, false),
      lost,
      parameter("zero", c.data.parameters),
      parameterValues(c.data.parameters),
      c.data.appraisalTraits,
    ).affect,
  };
}

/**
 * An eligible worker files unless their traits lean hard toward skipping,
 * less the stress the loss left them under, which pulls toward filing (help
 * sought for a hardship, sized from a study). The record's traits are the full
 * person's or the counted worker's own. Reads, in order: the base, the trait
 * lean toward filing over skipping, the hardship stress.
 */
export function filingDecision(
  api: CoreAPI,
  filer: Pick<PersonInput, "traits"> & { id?: string },
  feeling: { affect?: Affect },
) {
  const c = api.state as CoreState;
  const baseline = api.parameter("benefitsFileBase");
  const lean = decisionLean(
    c,
    filer,
    "jobs-benefits.file-claim",
    "file",
    "skip",
  );
  const hardship = hardshipReason(c, feeling, "jobs-benefits.file-claim");
  return {
    files: baseline + hardship.term + lean > api.parameter("zero"),
    baseline,
    lean,
    hardship,
  };
}

/**
 * Opens a claim for a worker who lost `job` through no choice of their own;
 * returns it, or nothing when they don't qualify. `lost` is the layoff event
 * just emitted (see `claimantFeeling`).
 */
export function fileClaim(
  api: CoreAPI,
  table: ModuleTable,
  job: Readonly<JobInput>,
  reasonKey: string,
  /** Weeks the lost job ran, for the base period. */
  weeksWorked: number,
  lost?: CoreEventInput,
): ClaimRow | undefined {
  const c = api.state as CoreState;
  const full = c.people.get(job.personId);
  const placeId = (full ?? residentFacts(c, job.personId))?.placeId;
  if (!placeId) return undefined;
  const filer = full ?? residentFacts(c, job.personId);
  let reasons: Record<string, number> | undefined;
  if (filer) {
    const decision = filingDecision(
      api,
      filer,
      claimantFeeling(
        c,
        full,
        full || !lost ? undefined : countedPersonOf(c, filer.id),
        lost,
      ),
    );
    if (!decision.files) return undefined;
    // Why they filed is kept for the player and the people they deal with.
    if (c.observer || c.focusPersonIds.has(filer.id) || filer.id === c.playerId)
      reasons = {
        baseline: decision.baseline,
        lean: decision.lean,
        hardshipStress: decision.hardship.term,
        stress: decision.hardship.stress,
      };
  }
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
    ...(reasons ? { reasons } : {}),
  };
  table.put({ ...row });
  return row;
}

/** Pays every open claim due by today from the state's unemployment fund: its treasury. */
export function payClaims(api: CoreAPI, table: ModuleTable): void {
  const c = api.state as CoreState;
  for (const row of table.query("open", [true]) as unknown as ClaimRow[]) {
    if (row.nextPayAt > c.date) continue;
    // The state's unemployment fund is its treasury, which the employers'
    // state unemployment tax pays into (employer-taxes); a world with no
    // state treasury open pays from the town's outside account.
    const state = c.modules.has(BUDGETS_MODULE_ID)
      ? governments(api).find((g) => g.level === "state")
      : undefined;
    const fund = state
      ? c.organizations.get(state.organizationId)
      : [...c.organizations.values()].find(
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
    const source = row.source ?? unemploymentTerms(api).source;
    const payee = c.people.has(row.personId)
      ? row.personId
      : row.payeeAccountOwnerId;
    let paid = transferCash(
      api,
      `unemployment-benefit:${row.personId}:${c.date}`,
      fund.id,
      // A claimant filled in since filing is paid as a full person; a counted
      // one lands in their own household's group account.
      payee,
      row.weeklyMinor,
      source,
      { personId: row.personId },
    );
    // A state fund that cannot cover the week borrows the rest from outside
    // the town, as a state borrows from the federal government when its fund
    // runs short (26 U.S.C. 1201, Title XII advances).
    if (state && paid < row.weeklyMinor) {
      const advance = [...c.organizations.values()].find(
        (org) => org.placeId === row.placeId && org.outsideFlow !== undefined,
      );
      if (advance)
        paid += transferCash(
          api,
          `unemployment-advance:${row.personId}:${c.date}`,
          advance.id,
          payee,
          row.weeklyMinor - paid,
          source,
          { personId: row.personId },
        );
    }
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
