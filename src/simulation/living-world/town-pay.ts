import { jailTermOn, heldBeforeTrialOn } from "../justice/jail-terms";
/**
 * Payday: everyone with a town job is paid, on their employer's own payday.
 *
 * Before this, only the person being played and officeholders were ever
 * paid. A town's jobs (`town-employment.ts`) were recorded as paid work with
 * no pay behind them.
 *
 * What each job pays. Its occupation's wage in its area, from the BLS May
 * 2025 OEWS tables: the metro or nonmetro area the town's county is in, else
 * the state, else the nation. Each worker sits inside that distribution by
 * tenure (`townPayPercentile`), between the 10th and 90th percentile, never
 * everyone at the median. The hourly rate is the annual wage over a
 * 2,080-hour year, never below the minimum wage where the job is: the higher
 * of the federal rate ($7.25 until an Act raises it) and the state's basic
 * rate; local minimums are NOT MODELED. A job whose occupation or
 * place has no published wage gets no pay on record, and none is invented.
 *
 * How often. Governments pay every two weeks (Claude CTO's provisional rule:
 * the BLS table covers private employers only). A private employer's pay
 * period is drawn once from the BLS shares for its industry and its size.
 * Weekly and every-two-weeks pay comes on Fridays; twice a month on the 15th
 * and the last day; monthly on the last day.
 *
 * Who pays. The employer: each paycheck is a transfer from the employing
 * organization to the worker, and it is assessed through
 * `assessPaycheckTaxes` exactly as the player's pay is, so Social Security
 * and Medicare apply to everyone at once.
 *
 * A state or federal law that raises the minimum wage raises every town job
 * paid below it, from the first pay period that begins on or after the law
 * takes effect
 * (`raiseTownPayToMinimum`). A period already running that day is paid at the
 * old rate, because a period's pay is fixed when it begins (labeled game
 * simplification: real pay changes for hours worked from the effective day).
 *
 * Cost. One scheduled transition a payday date (Fridays, the 15th and the
 * last day of each month), each writing all of that day's paychecks.
 */

import { addDays, daysBetween, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  enactedRuleChanges,
  type EnactedRuleChange,
} from "../enacted-rule-changes";
import { countyGeoidsForPlace } from "../government-units";
import {
  growingIndex,
  hasStableKey,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "../history-index";
import {
  currentLifeCutoff,
  organizationProfileAt,
  workStatusAt,
} from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  FEDERAL_MINIMUM_HOURLY_MINOR,
  federalMinimumSchedule,
  minimumHourlyAt,
  minimumWageSettingAt,
  anyMinimumWageQuestionEnacted,
  startingMinimumHourly,
} from "../minimum-wage";
import {
  menPartneredWithMen,
  payAtHire,
  UNCOVERED_PAY_NOTE,
} from "../fairness-pay-law";
import { noticeLawPayChanges } from "../law-effects-noticed";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { resourceFlowTermsAt } from "../resource-queries";
import { SeededRng } from "../rng";
import {
  createResourceFlows,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcomes,
  type CreateResourceFlowInput,
  type RecordResourceTransferOutcomeInput,
} from "../resources";
import {
  paidLeaveBenefitMinor,
  paidLeaveBenefitRate,
  paidLeaveCoveredDays,
  payPaidLeaveClaims,
  type PaidLeaveClaim,
} from "../paid-leave-benefits";
import { assessPaychecksTaxes, residenceStateKey } from "../statutory-tax";
import {
  anyTeacherFloorLawEnacted,
  TEACHER_FLOOR_EMPLOYER,
  TEACHER_FLOOR_OCCUPATION,
  teacherSalaryFloorAt,
  type TeacherSalaryFloor,
} from "../teacher-salary-floor";
import {
  epidemicWorkAbsences,
  jobPaysSickLeave,
  workdaysBetween,
  type WorkAbsence,
} from "../crisis/epidemic";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  OrganizationClassification,
  ResourceFlow,
  ResourceFlowTermsRecord,
  WorkRelationship,
  WorkRoleRecord,
  World,
} from "../types";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { TOWN_JOB_SOC } from "./town-job-soc";
import {
  TOWN_PAY_COUNTY_AREAS,
  TOWN_PAY_META,
  TOWN_PAY_PERCENTILES,
  TOWN_PAY_PERIOD_SHARES,
} from "./town-pay.generated";

export const TOWN_PAY_VERSION = "town-pay-v2";
export const PAYDAY_TRANSITION_KEY = "living-world:payday" as const;

const PAYDAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:payday:`;
const PAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:job-pay:`;
const HOURS_PER_YEAR = 2_080;
/** A job the game wrote long before pay existed is paid from then on only. */
const CATCH_UP_LIMIT_DAYS = 400;

export type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";

const PERIOD_OF_BLS: Readonly<Record<string, TownPayPeriod>> = {
  Weekly: "weekly",
  Biweekly: "biweekly",
  Semimonthly: "semimonthly",
  Monthly: "monthly",
};

/** Paychecks a year, so a period's pay is the annual rate over this. */
const PERIODS_PER_YEAR: Readonly<Record<TownPayPeriod, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

// ─── Wages ──────────────────────────────────────────────────────────────

const PERCENTILE_POINTS = [10, 25, 50, 75, 90] as const;
type Cells = readonly (number | null)[];

let wagesBySoc: ReadonlyMap<string, ReadonlyMap<string, Cells>> | null = null;
function wageTable(): ReadonlyMap<string, ReadonlyMap<string, Cells>> {
  if (wagesBySoc) return wagesBySoc;
  const parsed = new Map<string, Map<string, Cells>>();
  for (const entry of TOWN_PAY_PERCENTILES.split(";")) {
    const [soc, areas] = entry.split("=") as [string, string];
    const byArea = new Map<string, Cells>();
    for (const cell of areas.split(",")) {
      const [area, values] = cell.split(":") as [string, string];
      byArea.set(
        area,
        values.split("/").map((value) => (value === "" ? null : Number(value))),
      );
    }
    parsed.set(soc, byArea);
  }
  return (wagesBySoc = parsed);
}

let areaByCounty: ReadonlyMap<string, string> | null = null;
function countyArea(countyFips: string): string | undefined {
  if (!areaByCounty)
    areaByCounty = new Map(
      TOWN_PAY_COUNTY_AREAS.split(";").map(
        (pair) => pair.split(":") as [string, string],
      ),
    );
  return areaByCounty.get(countyFips);
}

const TERRITORY_FIPS: Readonly<Record<string, string>> = {
  "US-AS": "60",
  "US-GU": "66",
  "US-MP": "69",
  "US-PR": "72",
  "US-VI": "78",
};
const NOT_IN_OEWS = new Set(["60", "69"]);

/** The wage areas a job in this place is paid by, most local first. */
export function townPayAreas(jurisdictionId: EntityId | null): string[] {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  if (!place) return [];
  const geoid =
    place.sourceGeoid && /^\d{7}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  const stateFips =
    geoid?.slice(0, 2) ??
    TERRITORY_FIPS[place.stateJurisdictionKey ?? ""] ??
    null;
  // BLS publishes no wages for American Samoa or the Northern Mariana
  // Islands: pay there is UNKNOWN, not the nation's.
  if (!stateFips || NOT_IN_OEWS.has(stateFips)) return [];
  const areas: string[] = [];
  const county = geoid ? countyGeoidsForPlace(geoid)[0] : undefined;
  const area = county ? countyArea(county) : undefined;
  if (area) areas.push(area);
  areas.push(`S${stateFips}`, "US");
  return areas;
}

/**
 * GAME ASSUMPTION, labeled: where a worker sits in their occupation's wage
 * distribution. A new hire starts near the 25th percentile and moves toward
 * the 75th over 20 years at the employer; a seeded draw for the person moves
 * that 15 points either way, and the result stays between the 10th and 90th.
 */
export function townPayPercentile(tenureYears: number, draw: number): number {
  const byTenure = 25 + 50 * Math.min(1, Math.max(0, tenureYears) / 20);
  return Math.min(90, Math.max(10, byTenure + (draw * 2 - 1) * 15));
}

/** The annual wage at `percentile` in the cells, or null when BLS withheld it. */
function interpolate(cells: Cells, percentile: number): number | null {
  for (let i = 0; i + 1 < PERCENTILE_POINTS.length; i += 1) {
    const low = PERCENTILE_POINTS[i]!;
    const high = PERCENTILE_POINTS[i + 1]!;
    if (percentile < low || percentile > high) continue;
    const a = cells[i];
    const b = cells[i + 1];
    if (a === null || a === undefined || b === null || b === undefined)
      return null;
    return a + ((b - a) * (percentile - low)) / (high - low);
  }
  return null;
}

/** The state's basic minimum wage, or the federal one; null when unknown. */
export function townMinimumHourly(
  jurisdictionId: EntityId | null,
): number | null {
  return startingMinimumHourly(jurisdictionId);
}

/**
 * The minimum wage in force where the job is on `onDate`: the higher of the
 * federal rate (raised by an Act the game enacted), the state's rate and a
 * state law the game enacted, which replaces the state's rate from the day it
 * takes effect. Null when the state's rate is unknown and no enacted law sets
 * one.
 */
export function townMinimumHourlyAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  return minimumHourlyAt(world, jurisdictionId, onDate);
}

/**
 * The median annual wage for `occupation` in the state or territory where
 * `jurisdictionId` is, from the same BLS tables; the nation's when the state's
 * is withheld; null where BLS publishes none.
 */
export function stateMedianAnnualWage(
  occupation: string,
  jurisdictionId: EntityId | null,
): number | null {
  const soc = TOWN_JOB_SOC[occupation];
  const byArea = soc ? wageTable().get(soc) : undefined;
  if (!byArea) return null;
  for (const area of townPayAreas(jurisdictionId)) {
    if (area !== "US" && !area.startsWith("S")) continue;
    const median = byArea.get(area)?.[PERCENTILE_POINTS.indexOf(50)];
    if (median !== null && median !== undefined) return median;
  }
  return null;
}

export interface TownJobRate {
  readonly soc: string;
  readonly area: string;
  readonly percentile: number;
  /** Cents an hour, after the minimum-wage floor. */
  readonly hourlyMinor: number;
  readonly floored: boolean;
}

/**
 * What a job classified as `occupation` in `jurisdictionId` pays an hour for
 * a worker at `percentile`; null when no published wage covers it.
 */
export function townJobRate(
  occupation: string | null,
  jurisdictionId: EntityId | null,
  percentile: number,
  minimum: number | null = townMinimumHourly(jurisdictionId),
): TownJobRate | null {
  const soc = occupation ? TOWN_JOB_SOC[occupation] : undefined;
  const byArea = soc ? wageTable().get(soc) : undefined;
  if (!soc || !byArea) return null;
  if (minimum === null) return null;
  for (const area of townPayAreas(jurisdictionId)) {
    const cells = byArea.get(area);
    const annual = cells ? interpolate(cells, percentile) : null;
    if (annual === null) continue;
    const hourly = annual / HOURS_PER_YEAR;
    return {
      soc,
      area,
      percentile,
      hourlyMinor: Math.round(Math.max(hourly, minimum) * 100),
      floored: hourly < minimum,
    };
  }
  return null;
}

// ─── Paydays ────────────────────────────────────────────────────────────

const GOVERNMENT_CLASSIFICATIONS = new Set<string>([
  "sector:federal-government-office",
  "sector:state-government-office",
  "sector:local-government-office",
  "service:fire",
  "service:police",
  "service:public-health",
  "service:school",
]);

/** GAME ASSUMPTION, labeled: the BLS industry each kind of employer is in. */
const INDUSTRY_OF: Readonly<Record<string, string>> = {
  "enterprise:agriculture": "Mining and logging",
  "enterprise:mining": "Mining and logging",
  "enterprise:construction": "Construction",
  "enterprise:manufacturing": "Manufacturing",
  "enterprise:retail": "Trade, transportation, and utilities",
  "enterprise:wholesale": "Trade, transportation, and utilities",
  "enterprise:transportation": "Trade, transportation, and utilities",
  "enterprise:utility": "Trade, transportation, and utilities",
  "enterprise:telecommunications": "Information",
  "enterprise:banking": "Financial activities",
  "enterprise:insurance": "Financial activities",
  "enterprise:real-estate": "Financial activities",
  "enterprise:professional-services": "Professional and business services",
  "enterprise:corporate-office": "Professional and business services",
  "enterprise:building-services": "Professional and business services",
  "enterprise:political-consulting": "Professional and business services",
  "service:clinic": "Education and health services",
  "service:hospital": "Education and health services",
  "service:nursing-home": "Education and health services",
  "service:private-school": "Education and health services",
  "enterprise:food-service": "Leisure and hospitality",
  "enterprise:lodging": "Leisure and hospitality",
  "enterprise:recreation": "Leisure and hospitality",
  "enterprise:repair": "Other services",
  "enterprise:personal-services": "Other services",
  "community:congregation": "Other services",
  "community:organizing-nonprofit": "Other services",
  "membership:labor-union": "Other services",
  "membership:party-chapter": "Other services",
};

function sizeGroup(staff: number): string {
  if (staff < 10) return "1–9";
  if (staff < 20) return "10–19";
  if (staff < 50) return "20–49";
  if (staff < 100) return "50–99";
  if (staff < 250) return "100–249";
  if (staff < 500) return "250–499";
  if (staff < 1000) return "500–999";
  return "1,000+";
}

/**
 * An employer's pay period. Governments: every two weeks. A private employer:
 * drawn once, seeded by the organization, from the BLS shares for its
 * industry and its size combined as if independent (each share over the
 * all-private share), a labeled simplification.
 */
export function townPayPeriod(
  world: World,
  organizationId: EntityId,
  classification: OrganizationClassification | string,
  staff: number,
): TownPayPeriod {
  if (GOVERNMENT_CLASSIFICATIONS.has(classification)) return "biweekly";
  const overall = TOWN_PAY_PERIOD_SHARES["overall|all private establishments"]!;
  const industry = INDUSTRY_OF[classification];
  const byIndustry = industry
    ? TOWN_PAY_PERIOD_SHARES[`industry|${industry}`]
    : undefined;
  const bySize =
    TOWN_PAY_PERIOD_SHARES[`establishment-size|${sizeGroup(staff)}`];
  const weights = Object.keys(PERIOD_OF_BLS).map((name) => {
    const base = overall[name] ?? 0;
    const weight =
      base <= 0
        ? 0
        : ((byIndustry?.[name] ?? base) * (bySize?.[name] ?? base)) / base;
    return [name, weight] as const;
  });
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll =
    new SeededRng(world.seed)
      .fork(`${TOWN_PAY_VERSION}:period:${organizationId}`)
      .next() * total;
  for (const [name, weight] of weights) {
    roll -= weight;
    if (roll < 0) return PERIOD_OF_BLS[name]!;
  }
  return "biweekly";
}

function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function lastDayOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  );
}

/** Whether `date` is a payday for a period, and the period it closes. */
export function payPeriodEndingOn(
  period: TownPayPeriod,
  date: IsoDate,
  phase: number,
): { readonly startsAt: IsoDate; readonly endsAt: IsoDate } | null {
  if (period === "weekly" || period === "biweekly") {
    if (weekday(date) !== 5) return null;
    if (period === "biweekly") {
      const weeks = Math.floor(
        daysBetween(makeIsoDate("2000-01-07"), date) / 7,
      );
      if ((weeks + phase) % 2 !== 0) return null;
    }
    return {
      startsAt: addDays(date, period === "weekly" ? -6 : -13),
      endsAt: date,
    };
  }
  const last = lastDayOfMonth(date);
  const day = Number(date.slice(8, 10));
  if (period === "semimonthly" && day === 15)
    return { startsAt: makeIsoDate(`${date.slice(0, 8)}01`), endsAt: date };
  if (date !== last) return null;
  return {
    startsAt:
      period === "semimonthly"
        ? makeIsoDate(`${date.slice(0, 8)}16`)
        : makeIsoDate(`${date.slice(0, 8)}01`),
    endsAt: date,
  };
}

/** The next date after `date` that is any employer's payday. */
export function nextPaydayDate(date: IsoDate): IsoDate {
  for (let n = 1; n <= 7; n += 1) {
    const next = addDays(date, n);
    if (
      weekday(next) === 5 ||
      next.slice(8, 10) === "15" ||
      next === lastDayOfMonth(next)
    )
      return next;
  }
  throw new Error("No payday within a week.");
}

// ─── Schedule ───────────────────────────────────────────────────────────

/** Schedules the first payday for a life opened at the current version. Idempotent. */
export function ensurePaydaySchedule(world: World): World {
  if (
    world.history.futureDueItems.some((item) =>
      item.stableKey.startsWith(PAYDAY_KEY_PREFIX),
    )
  )
    return world;
  return scheduleFutureDueItem(world, {
    stableKey: `${PAYDAY_KEY_PREFIX}${world.currentDate}`,
    dueAt: nextPaydayDate(world.currentDate),
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: TOWN_PAY_VERSION },
  });
}

export function paydayHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PAYDAY_TRANSITION_KEY)
    throw new Error("Payday received another transition.");
  const since = makeIsoDate(dueItem.stableKey.slice(PAYDAY_KEY_PREFIX.length));
  const played =
    world.control.kind === "person" ? world.control.personId : null;
  let next = startTownJobPay(world, played, since);
  next = raiseTownPayToMinimum(next, played);
  next = raiseTeacherPayToFloor(next, played);
  // A raise a law made reaches the person it raised.
  next = noticeLawPayChanges(next, since);
  next = payTownPaydays(next, since, played);
  next = scheduleFutureDueItem(next, {
    stableKey: `${PAYDAY_KEY_PREFIX}${next.currentDate}`,
    dueAt: nextPaydayDate(next.currentDate),
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "payday:paid",
    context: null,
    outcomeEventId: null,
  };
}

export const PAYDAY_HANDLERS = [
  [PAYDAY_TRANSITION_KEY, paydayHandler],
] as const;

// ─── Pay on record ──────────────────────────────────────────────────────

function statusOn(world: World, workId: EntityId, date: IsoDate) {
  return workStatusAt(world, workId, {
    ...currentLifeCutoff(world),
    asOfDate: date,
  });
}

/** The day a job's last active day was, or null while it is still held. */
function lastDayWorked(world: World, workId: EntityId): IsoDate | null {
  const status = statusOn(world, workId, world.currentDate);
  if (!status || status.status === "active") return null;
  return addDays(status.effectiveAt, -1);
}

/**
 * The day each person died, for everyone who has: the last death record of
 * each person, as reading the list from the start gives it. Kept as an index
 * that follows the list, so a payday reads only the deaths written since.
 */
const DEATH_DATES: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (dates, record) => {
    const death = record as World["history"]["personDeaths"][number];
    dates.set(death.personId, death.diedAt);
  },
};

function deathDates(world: World): ReadonlyMap<EntityId, IsoDate> {
  return growingIndex(DEATH_DATES, world.history.personDeaths);
}

function latestRoles(world: World): ReadonlyMap<EntityId, WorkRoleRecord> {
  const roles = new Map<EntityId, WorkRoleRecord>();
  for (const role of world.history.workRoles)
    roles.set(role.workRelationshipId, role);
  return roles;
}

/** The hours a week a town job is paid for. */
function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}

/** Every town pay flow, in the order the flows were written. */
const PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith(PAY_KEY_PREFIX)) flows.push(flow);
  },
};

function townPayFlows(world: World): readonly ResourceFlow[] {
  return growingIndex(PAY_FLOWS, world.history.resourceFlows);
}

/**
 * Every town pay flow's terms, oldest first: each pay flow's own terms, read
 * from an index of terms by flow rather than from every flow's terms.
 */
function termsByPayFlow(
  world: World,
): ReadonlyMap<EntityId, readonly ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, readonly ResourceFlowTermsRecord[]>();
  for (const flow of townPayFlows(world)) {
    const terms = recordsWithFieldValue(
      world.history.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    );
    if (terms.length > 0) byFlow.set(flow.id, terms);
  }
  return byFlow;
}

/** The terms in force on `date`: the latest that took effect by then. */
function termsOn(
  history: readonly ResourceFlowTermsRecord[],
  date: IsoDate,
): ResourceFlowTermsRecord | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1)
    if (history[index]!.effectiveAt <= date) return history[index];
  return undefined;
}

interface PayNote {
  readonly period: TownPayPeriod;
  readonly phase: number;
}

/** What a pay flow's cadence says about its paydays. */
function payNoteOf(cadenceKind: string): PayNote | null {
  const match =
    /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
      cadenceKind,
    );
  if (!match) return null;
  return {
    period: match[1] as TownPayPeriod,
    phase: Number(match[2] ?? 0),
  };
}

/**
 * Gives every town job with no pay on record its pay, from `since` or the
 * day it started, whichever is later: nobody is paid years of back wages for
 * a job the game wrote before pay existed.
 */
export function startTownJobPay(
  world: World,
  exceptPersonId: EntityId | null,
  since: IsoDate,
): World {
  const paid = new Set<EntityId>();
  for (const flow of world.history.resourceFlows)
    if (flow.basisReference.kind === "work")
      paid.add(flow.basisReference.workRelationshipId);
  const roles = latestRoles(world);
  const dead = deathDates(world);
  // An employer's size counts everyone it employs in town, paid yet or not.
  const staff = new Map<EntityId, number>();
  const candidates: WorkRelationship[] = [];
  for (const work of world.history.workRelationships) {
    if (
      !work.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) ||
      work.compensation !== "paid" ||
      !work.organizationId ||
      statusOn(world, work.id, world.currentDate)?.status !== "active"
    )
      continue;
    staff.set(work.organizationId, (staff.get(work.organizationId) ?? 0) + 1);
    if (
      work.personId === exceptPersonId ||
      paid.has(work.id) ||
      dead.has(work.personId)
    )
      continue;
    candidates.push(work);
  }
  const inputs: CreateResourceFlowInput[] = [];
  const floorLaws = anyTeacherFloorLawEnacted(world);
  let coveredMen: ReadonlySet<EntityId> | null = null;
  // An employer keeps the payday its workers already have.
  const periods = new Map<EntityId, TownPayPeriod>();
  for (const flow of world.history.resourceFlows) {
    if (
      !flow.stableKey.startsWith(PAY_KEY_PREFIX) ||
      flow.source.kind !== "organization"
    )
      continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    const note = terms ? payNoteOf(terms.cadenceKind) : null;
    if (note) periods.set(flow.source.organizationId, note.period);
  }
  for (const work of candidates) {
    const role = roles.get(work.id);
    if (!role) continue;
    // A job held before `since` is paid from the period that was running
    // then; a later hire from the day it starts.
    const earliest = addDays(since, -31);
    const formedAt =
      world.history.organizations.find(
        (organization) => organization.id === work.organizationId,
      )?.formedAt ?? work.startedAt;
    const startsAt = [work.startedAt, earliest, formedAt].reduce((a, b) =>
      a > b ? a : b,
    );
    const tenure = daysBetween(work.startedAt, startsAt) / 365.25;
    const draw = new SeededRng(world.seed)
      .fork(`${TOWN_PAY_VERSION}:place:${work.personId}`)
      .next();
    // The floor on the first day paid; a later rise is recorded as a raise.
    const minimum = townMinimumHourlyAt(
      world,
      role.locationJurisdictionId,
      startsAt,
    );
    const offered = townJobRate(
      role.occupationClassification,
      role.locationJurisdictionId,
      townPayPercentile(tenure, draw),
      minimum,
    );
    if (!offered) continue;
    // A man partnered with a man is hired below the job's rate where no
    // fairness law covers him (`fairness-pay-law.ts`), never below the floor.
    coveredMen ??= menPartneredWithMen(world, world.currentDate);
    const paid = coveredMen.has(work.personId)
      ? payAtHire(world, {
          personId: work.personId,
          jobJurisdictionId: role.locationJurisdictionId,
          date: startsAt,
          amountMinor: offered.hourlyMinor,
          floorMinor: (minimum ?? 0) * 100,
        })
      : null;
    const gap = paid?.belowRate === true;
    const rate = gap ? { ...offered, hourlyMinor: paid.amountMinor } : offered;
    const organizationId = work.organizationId!;
    // A public school teacher is paid at least the state's minimum teacher
    // salary a law enacted in play set.
    const floor = floorLaws
      ? teacherFloorFor(world, role, organizationId, startsAt)
      : null;
    const floorHourlyMinor = floor ? floorHourlyMinorOf(floor) : 0;
    const hourlyMinor = Math.max(rate.hourlyMinor, floorHourlyMinor);
    let period = periods.get(organizationId);
    if (!period) {
      const profile = organizationProfileAt(world, organizationId);
      period = townPayPeriod(
        world,
        organizationId,
        profile?.classification ?? "",
        staff.get(organizationId) ?? 1,
      );
      periods.set(organizationId, period);
    }
    const phase =
      period === "biweekly"
        ? Math.floor(
            new SeededRng(world.seed)
              .fork(`${TOWN_PAY_VERSION}:phase:${organizationId}`)
              .next() * 2,
          )
        : 0;
    const weeklyHours = weeklyHoursOf(role);
    const perPeriod = Math.round(
      (hourlyMinor * weeklyHours * 52) / PERIODS_PER_YEAR[period],
    );
    if (perPeriod <= 0) continue;
    inputs.push({
      stableKey: `${PAY_KEY_PREFIX}${work.id}`,
      source: { kind: "organization", organizationId },
      recipient: { kind: "person", personId: work.personId },
      startsAt,
      amount: money(perPeriod, "USD"),
      cadenceKind: `schedule:town-${period}${period === "biweekly" ? `-${phase}` : ""}`,
      basisKind: "compensation:work",
      basisReference: { kind: "work", workRelationshipId: work.id },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: `${TOWN_PAY_VERSION}: $${(hourlyMinor / 100).toFixed(2)} an hour${hourlyMinor > rate.hourlyMinor ? " (the state's minimum teacher salary)" : rate.floored ? " (the minimum wage)" : ""}${gap && hourlyMinor === rate.hourlyMinor ? `, ${UNCOVERED_PAY_NOTE}` : ""} for ${weeklyHours} hours a week, paid ${period}; the ${Math.round(rate.percentile)}th percentile for SOC ${rate.soc} in OEWS area ${rate.area} (${TOWN_PAY_META.wages}).`,
      },
    });
  }
  return createResourceFlows(world, inputs);
}

/** Enacted minimum-wage changes by state postal code, in operative order. */
function minimumWageLaws(
  world: World,
): ReadonlyMap<string, readonly EnactedRuleChange[]> {
  const byState = new Map<string, EnactedRuleChange[]>();
  for (const change of enactedRuleChanges(world)) {
    if (change.field !== "labor.minimumWage.hourlyCents") continue;
    const list = byState.get(change.stateUsps) ?? [];
    list.push(change);
    byState.set(change.stateUsps, list);
  }
  return byState;
}

/**
 * The day each job ended, when its latest status ended it: every payday's pay
 * floors read this, and reading every status ever recorded to find it grew
 * with the world's years.
 */
const JOB_ENDINGS: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (index, record) => {
    const status = record as World["history"]["workStatuses"][number];
    if (status.status === "ended")
      index.set(status.workRelationshipId, status.effectiveAt);
    else index.delete(status.workRelationshipId);
  },
};

/** The end of the latest pay period each resource flow has paid. */
const LAST_PERIOD_PAID: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (index, record) => {
    const outcome =
      record as World["history"]["resourceTransferOutcomes"][number];
    const previous = index.get(outcome.resourceFlowId);
    if (!previous || previous < outcome.periodEndsAt)
      index.set(outcome.resourceFlowId, outcome.periodEndsAt);
  },
};

/**
 * Raises every town job paid below the minimum wage in force (the higher of
 * the federal and the state floor), from the first pay period that begins on
 * or after the day a law raised it and after the last period already paid. Each rise between the last paycheck and today is
 * recorded in turn, and each names its law. A law that lowers or repeals the
 * rate cuts nobody's pay. Run before paying, so the period is paid at the new
 * rate.
 *
 * NOT MODELED: back pay. A law whose effective date comes before the day it
 * was recorded raises pay from the first period after it was recorded.
 */
export function raiseTownPayToMinimum(
  world: World,
  exceptPersonId: EntityId | null,
): World {
  const laws = minimumWageLaws(world);
  const federalRaised = federalMinimumSchedule(world).some(
    (step) => step.hourlyMinor > FEDERAL_MINIMUM_HOURLY_MINOR,
  );
  // Only a law can move the floor after pay began.
  if (
    laws.size === 0 &&
    !federalRaised &&
    !anyMinimumWageQuestionEnacted(world)
  )
    return world;
  const recordedOn = new Map<EntityId, IsoDate>();
  const eventOf = new Map<EntityId, EntityId>();
  for (const enactment of world.history.legislativeEnactments ?? []) {
    recordedOn.set(enactment.measureId, enactment.resolvedAt);
    eventOf.set(enactment.measureId, enactment.outcomeEventId);
  }
  const roles = latestRoles(world);
  const termsByFlow = termsByPayFlow(world);
  // The day each job ended, if it did: a job that has ended has no pay to raise.
  const endedOn = growingIndex(JOB_ENDINGS, world.history.workStatuses);
  const lastPaid = growingIndex(
    LAST_PERIOD_PAID,
    world.history.resourceTransferOutcomes,
  );
  let next = world;
  for (const flow of world.history.resourceFlows) {
    if (
      !flow.stableKey.startsWith(PAY_KEY_PREFIX) ||
      flow.basisReference.kind !== "work" ||
      (flow.recipient.kind === "person" &&
        flow.recipient.personId === exceptPersonId)
    )
      continue;
    const role = roles.get(flow.basisReference.workRelationshipId);
    if (!role) continue;
    let current = termsByFlow.get(flow.id)?.at(-1);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!current || current.status !== "active" || !note) continue;
    const weeklyHours = weeklyHoursOf(role);
    // The first period that begins after the current terms and the last
    // paycheck, within one transition's catch-up.
    const after = [
      current.effectiveAt,
      lastPaid.get(flow.id) ?? current.effectiveAt,
      addDays(world.currentDate, -CATCH_UP_LIMIT_DAYS),
    ].reduce((a, b) => (a > b ? a : b));
    for (
      let day = addDays(after, 1);
      day <= world.currentDate;
      day = addDays(day, 1)
    ) {
      if (!payPeriodEndingOn(note.period, addDays(day, -1), note.phase))
        continue;
      const ended = endedOn.get(flow.basisReference.workRelationshipId);
      if (ended !== undefined && ended <= day) break;
      // Only a law enacted in play raises pay after it began: the rate on
      // file at the start, and the unraised federal rate, set nothing to
      // raise to. A law counts from the day it was recorded.
      const setting = minimumWageSettingAt(
        world,
        role.locationJurisdictionId ?? null,
        day,
      );
      if (
        !setting ||
        setting.measureId === null ||
        (recordedOn.get(setting.measureId) ?? day) > day
      )
        continue;
      const hourly = setting.hourlyMinor / 100;
      // The same arithmetic as a new job's pay, so a job hired at the floor
      // is never "raised" by a cent of rounding.
      const amount = Math.round(
        (Math.round(hourly * 100) * weeklyHours * 52) /
          PERIODS_PER_YEAR[note.period],
      );
      if (amount <= current.amount.minorUnits) continue;
      const setBy = {
        measureId: setting.measureId,
        designation: setting.designation ?? "A law",
      };
      const event = eventOf.get(setBy.measureId);
      const rate = `$${hourly.toFixed(2)} an hour`;
      const which = setting.level === "local" ? "city" : setting.level;
      next = recordResourceFlowTerms(next, {
        stableKey: `${flow.stableKey}:minimum-wage:${day}`,
        resourceFlowId: flow.id,
        effectiveAt: day,
        status: "active",
        amount: money(amount, current.amount.currency),
        cadenceKind: current.cadenceKind,
        reason: `${setBy.designation} raised the ${which} minimum wage to ${rate}.`,
        provenance: event
          ? { kind: "simulated-event", eventId: event }
          : {
              kind: "authored",
              note: `${TOWN_PAY_VERSION}: raised to the minimum wage ${setBy.designation} set, ${rate}.`,
            },
        supersedesTermsId: current.id,
      });
      current = next.history.resourceFlowTerms.at(-1)!;
    }
  }
  return next;
}

/**
 * The state's minimum teacher salary for this job on `onDate`: a public
 * school's teacher only, and only where a law enacted in play set one.
 */
function teacherFloorFor(
  world: World,
  role: WorkRoleRecord,
  organizationId: EntityId,
  onDate: IsoDate,
): TeacherSalaryFloor | null {
  if (role.occupationClassification !== TEACHER_FLOOR_OCCUPATION) return null;
  if (
    organizationProfileAt(world, organizationId)?.classification !==
    TEACHER_FLOOR_EMPLOYER
  )
    return null;
  return teacherSalaryFloorAt(
    world,
    role.locationJurisdictionId,
    onDate,
    stateMedianAnnualWage(
      TEACHER_FLOOR_OCCUPATION,
      role.locationJurisdictionId,
    ),
  );
}

/** A floor in dollars a year as cents an hour over a 2,080-hour year. */
function floorHourlyMinorOf(floor: TeacherSalaryFloor): number {
  return Math.round((floor.annual / HOURS_PER_YEAR) * 100);
}

/**
 * Raises every public school teacher paid below the state's minimum teacher
 * salary (`teacher-salary-floor.ts`), from the first pay period that begins
 * on or after the floor's school year starts and after the last period
 * already paid, as `raiseTownPayToMinimum` does for the minimum wage. Each
 * raise names its law. A law that ends the floor cuts nobody's pay. Run
 * before paying, so the period is paid at the new rate.
 */
export function raiseTeacherPayToFloor(
  world: World,
  exceptPersonId: EntityId | null,
): World {
  if (!anyTeacherFloorLawEnacted(world)) return world;
  const designationOf = new Map<EntityId, string>();
  for (const measure of world.history.legislativeMeasures ?? [])
    designationOf.set(measure.id, measure.designation);
  const eventOf = new Map<EntityId, EntityId>();
  for (const enactment of world.history.legislativeEnactments ?? [])
    eventOf.set(enactment.measureId, enactment.outcomeEventId);
  const roles = latestRoles(world);
  const termsByFlow = termsByPayFlow(world);
  const endedOn = growingIndex(JOB_ENDINGS, world.history.workStatuses);
  const lastPaid = growingIndex(
    LAST_PERIOD_PAID,
    world.history.resourceTransferOutcomes,
  );
  let next = world;
  for (const flow of townPayFlows(world)) {
    if (
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization" ||
      (flow.recipient.kind === "person" &&
        flow.recipient.personId === exceptPersonId)
    )
      continue;
    const role = roles.get(flow.basisReference.workRelationshipId);
    if (!role || role.occupationClassification !== TEACHER_FLOOR_OCCUPATION)
      continue;
    const organizationId = flow.source.organizationId;
    let current = termsByFlow.get(flow.id)?.at(-1);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!current || current.status !== "active" || !note) continue;
    const weeklyHours = weeklyHoursOf(role);
    const after = [
      current.effectiveAt,
      lastPaid.get(flow.id) ?? current.effectiveAt,
      addDays(world.currentDate, -CATCH_UP_LIMIT_DAYS),
    ].reduce((a, b) => (a > b ? a : b));
    for (
      let day = addDays(after, 1);
      day <= world.currentDate;
      day = addDays(day, 1)
    ) {
      if (!payPeriodEndingOn(note.period, addDays(day, -1), note.phase))
        continue;
      const ended = endedOn.get(flow.basisReference.workRelationshipId);
      if (ended !== undefined && ended <= day) break;
      const floor = teacherFloorFor(next, role, organizationId, day);
      if (!floor) continue;
      const amount = Math.round(
        (floorHourlyMinorOf(floor) * weeklyHours * 52) /
          PERIODS_PER_YEAR[note.period],
      );
      if (amount <= current.amount.minorUnits) continue;
      const designation = designationOf.get(floor.measureId) ?? "A state law";
      const event = eventOf.get(floor.measureId);
      const salary = `$${floor.annual.toLocaleString("en-US")} a year`;
      next = recordResourceFlowTerms(next, {
        stableKey: `${flow.stableKey}:teacher-floor:${day}`,
        resourceFlowId: flow.id,
        effectiveAt: day,
        status: "active",
        amount: money(amount, current.amount.currency),
        cadenceKind: current.cadenceKind,
        reason: `${designation} set the state's minimum teacher salary at ${salary}.`,
        provenance: event
          ? { kind: "simulated-event", eventId: event }
          : {
              kind: "authored",
              note: `${TOWN_PAY_VERSION}: raised to the minimum teacher salary ${designation} set, ${salary}.`,
            },
        supersedesTermsId: current.id,
      });
      current = next.history.resourceFlowTerms.at(-1)!;
    }
  }
  return next;
}

/**
 * Pays every town job's paydays that fell after `since`, up to today. A
 * period is paid only when the job was held all of it.
 * Each paycheck is assessed for payroll taxes as the player's is.
 */
export function payTownPaydays(
  world: World,
  since: IsoDate,
  exceptPersonId: EntityId | null,
): World {
  const flows = townPayFlows(world).filter(
    (flow) =>
      flow.recipient.kind === "person" &&
      flow.recipient.personId !== exceptPersonId,
  );
  if (flows.length === 0) return world;
  const outcomes = world.history.resourceTransferOutcomes;
  const earliest =
    daysBetween(since, world.currentDate) > CATCH_UP_LIMIT_DAYS
      ? addDays(world.currentDate, -CATCH_UP_LIMIT_DAYS)
      : since;
  const dead = deathDates(world);
  const termsByFlow = termsByPayFlow(world);
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  const claims: PaidLeaveClaim[] = [];
  const recipients = new Set<EntityId>();
  const defendants = new Set(
    world.history.events
      .filter(
        (e) =>
          e.type === "justice.sentenced" ||
          e.type === "justice.held-before-trial",
      )
      .flatMap((e) =>
        e.participants
          .filter((p) => p.role === "focus:defendant")
          .map((p) => p.personId),
      ),
  );
  // Days missed to the illness, read once per pay period.
  const absencesByWindow = new Map<
    string,
    ReadonlyMap<EntityId, WorkAbsence>
  >();
  const absencesIn = (from: IsoDate, to: IsoDate) => {
    const key = `${from}|${to}`;
    let found = absencesByWindow.get(key);
    if (!found) {
      found = epidemicWorkAbsences(world, from, to);
      absencesByWindow.set(key, found);
    }
    return found;
  };
  for (const flow of flows) {
    if (flow.basisReference.kind !== "work") continue;
    const history = termsByFlow.get(flow.id) ?? [];
    const current = termsOn(history, world.currentDate);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!current || current.status !== "active" || !note) continue;
    const workId = flow.basisReference.workRelationshipId;
    // A worker who died is paid through the day before; the job itself is
    // ended at the town's next quarterly review.
    const worked = lastDayWorked(world, workId);
    const died = dead.get((flow.recipient as { personId: EntityId }).personId);
    const lastDay =
      died !== undefined && (worked === null || addDays(died, -1) < worked)
        ? addDays(died, -1)
        : worked;
    for (
      let payday = addDays(earliest, 1);
      payday <= world.currentDate;
      payday = addDays(payday, 1)
    ) {
      const window = payPeriodEndingOn(note.period, payday, note.phase);
      if (!window) continue;
      // GAME SIMPLIFICATION, labeled: a period is paid when the job was held
      // all of it, so a new hire's first part-period and a leaver's last one
      // go unpaid, and so does a payday falling on the day the game opens.
      if (window.startsAt < flow.startsAt) continue;
      if (lastDay !== null && lastDay < window.endsAt) continue;
      const stableKey = `${flow.stableKey}:${window.startsAt}`;
      if (hasStableKey(outcomes, stableKey)) continue;
      // A raise takes effect on the first day of a period, and a period is
      // paid at the terms in force the day it began.
      const terms = termsOn(history, window.startsAt);
      if (!terms || terms.status !== "active") continue;
      // Days out sick, or home with a sick child, go unpaid in a job that
      // carries no paid sick leave.
      const recipientId = (flow.recipient as { personId: EntityId }).personId;
      const absence = absencesIn(window.startsAt, window.endsAt).get(
        recipientId,
      );
      const workdays = workdaysBetween(window.startsAt, window.endsAt);
      let jailedDays = 0;
      if (defendants.has(recipientId))
        for (
          let date = window.startsAt;
          date <= window.endsAt;
          date = addDays(date, 1)
        ) {
          if (
            workdaysBetween(date, date) > 0 &&
            (jailTermOn(world, recipientId, date) ||
              heldBeforeTrialOn(world, recipientId, date))
          )
            jailedDays += 1;
        }
      const sickUnpaidDays =
        absence && workdays > 0 && !jobPaysSickLeave(world, workId)
          ? Math.min(absence.missedDays, workdays)
          : 0;
      const unpaidDays = Math.min(workdays, jailedDays + sickUnpaidDays);
      const hiringStep = (world.history.jobApplicationSteps ?? []).find(
        (s) => s.workRelationshipId === workId,
      );
      const application = hiringStep
        ? (world.history.jobApplications ?? []).find(
            (a) => a.id === hiringStep.applicationId,
          )
        : null;
      const opening = application
        ? (world.history.jobOpenings ?? []).find(
            (o) => o.id === application.openingId,
          )
        : null;
      const hourly = opening
        ? opening.pay.basis === "hourly"
        : flow.stableKey.startsWith(PAY_KEY_PREFIX) &&
          "note" in flow.provenance &&
          flow.provenance.note?.includes("an hour") === true;
      const idTripMinutes = (
        hourly ? (world.voterIdentification?.trips ?? []) : []
      )
        .filter(
          (trip) => trip.on >= window.startsAt && trip.on <= window.endsAt,
        )
        .flatMap((trip) => trip.missedWork)
        .filter((missed) => missed.workRelationshipId === workId)
        .reduce((sum, missed) => sum + missed.minutes, 0);
      const role = latestRoles(world).get(workId);
      const paidMinutes = role
        ? (weeklyHoursOf(role) * 60 * workdays) / 5
        : null;
      const idTripFraction =
        paidMinutes && paidMinutes > 0
          ? Math.min(
              (workdays - unpaidDays) / workdays,
              idTripMinutes / paidMinutes,
            )
          : 0;
      const amount =
        unpaidDays === 0 && idTripFraction === 0
          ? terms.amount
          : money(
              Math.round(
                terms.amount.minorUnits *
                  ((workdays - unpaidDays) / workdays - idTripFraction),
              ),
              terms.amount.currency,
            );
      const caring =
        !!absence && absence.caringDays > 0 && absence.sickDays === 0;
      // A state paid leave program in force replaces part of the pay lost
      // to a serious illness, the worker's own or a child's.
      const coveredDays =
        absence && sickUnpaidDays > 0
          ? paidLeaveCoveredDays(
              absence,
              Math.min(sickUnpaidDays, workdays - jailedDays),
            )
          : 0;
      const stateKey =
        coveredDays > 0 ? residenceStateKey(world, recipientId) : null;
      const rate = stateKey
        ? paidLeaveBenefitRate(world, stateKey, payday)
        : null;
      if (stateKey && rate)
        claims.push({
          paycheckKey: stableKey,
          personId: recipientId,
          stateKey,
          coveredDays,
          caring: absence!.seriousOwnDaysSinceOnset.length === 0,
          amountMinor: paidLeaveBenefitMinor(
            rate,
            terms.amount.minorUnits,
            workdays,
            coveredDays,
          ),
          rate,
        });
      inputs.push({
        stableKey,
        resourceFlowId: flow.id,
        periodStartsAt: window.startsAt,
        periodEndsAt: window.endsAt,
        occurredAt: payday,
        status:
          unpaidDays === 0 && idTripFraction === 0
            ? "completed"
            : amount.minorUnits > 0
              ? "partial"
              : "missed",
        attemptedAmount: terms.amount,
        transferredAmount: amount,
        reasonKind:
          unpaidDays === 0 && idTripFraction === 0
            ? null
            : idTripFraction > 0
              ? "custom:unpaid-voter-id-trip"
              : jailedDays > 0
                ? "custom:unpaid-days-in-custody"
                : caring
                  ? "custom:unpaid-days-home-with-sick-child"
                  : "custom:unpaid-sick-days",
        note:
          unpaidDays === 0 && idTripFraction === 0
            ? "Pay for the period."
            : idTripFraction > 0
              ? `Pay less ${idTripMinutes} recorded minutes spent obtaining voter identification and ${unpaidDays} other unpaid days.`
              : `Pay for the period, less ${unpaidDays} unpaid ${unpaidDays === 1 ? "day" : "days"} ${jailedDays > 0 ? "in custody or otherwise absent" : caring ? "home with a sick child" : "out sick"}.`,
        provenance: flow.provenance,
      });
      recipients.add((flow.recipient as { personId: EntityId }).personId);
    }
  }
  if (inputs.length === 0) return world;
  let next = world;
  for (const personId of recipients)
    next = ensureLifePathPersonalPosition(
      next,
      personId,
      money(0, "USD").currency,
    );
  const first = next.history.resourceTransferOutcomes.length;
  next = recordResourceTransferOutcomes(next, inputs);
  const ids = next.history.resourceTransferOutcomes
    .slice(first)
    .map((outcome) => outcome.id);
  next = assessPaychecksTaxes(next, ids);
  // Benefits are paid after the premiums of the same paychecks reach the
  // state's account.
  return payPaidLeaveClaims(next, claims);
}

/**
 * What each of the town's paid jobs pays an hour today, in cents: the terms
 * in force today over the hours the job is paid for. One entry per job held
 * today; a job whose pay is not on record yet is left out, never read as
 * zero.
 */
export function townHourlyPayCents(
  world: World,
  town: EntityId,
): readonly number[] {
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const latest = new Map<EntityId, string>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= world.currentDate)
      latest.set(status.workRelationshipId, status.status);
  const held = new Set(
    world.history.workRelationships
      .filter(
        (work) =>
          work.stableKey.startsWith(prefix) && latest.get(work.id) === "active",
      )
      .map((work) => work.id),
  );
  if (held.size === 0) return [];
  const roles = latestRoles(world);
  const terms = termsByPayFlow(world);
  const rates: number[] = [];
  for (const flow of world.history.resourceFlows) {
    if (!flow.stableKey.startsWith(PAY_KEY_PREFIX)) continue;
    const basis = flow.basisReference;
    if (basis?.kind !== "work" || !held.has(basis.workRelationshipId)) continue;
    const workId = basis.workRelationshipId;
    const role = roles.get(workId);
    const current = termsOn(terms.get(flow.id) ?? [], world.currentDate);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!role || !current || !note || current.status === "ended") continue;
    const hours = weeklyHoursOf(role);
    if (hours <= 0) continue;
    rates.push(
      Math.round(
        (current.amount.minorUnits * PERIODS_PER_YEAR[note.period]) /
          (52 * hours),
      ),
    );
  }
  return rates;
}
