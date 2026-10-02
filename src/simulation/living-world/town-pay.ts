import { settleAllOfficeSalaries } from "../office-salary";
import { assessedCompletedHourlyGrossMinor } from "../completed-hourly-gross";
import { payPayerAt, payWorkplaceAt } from "../pay-coverage-predicates";
import {
  ensureLocalPublicAccount,
  ensureTaxPublicAccount,
  publicTaxAccountForIdentity,
} from "../tax-policy";
import { attributePaycheckTaxLaws } from "../paycheck-law-attribution";
import { recordPaycheckTaxBases } from "../paycheck-tax-bases";
import { lawEffectStamp } from "../law-effect-stamp";
import { lawInForce } from "../governing/law-in-force";
import { applyLawConsequences } from "../enacted-law-effects";
import type {
  ResolvedHourlyLawPayConsequence,
  ResolvedSavedHourlyPayConsequence,
} from "../law-consequence-types";
import { createStableId } from "../ids";
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
 * tenure (`townPayPercentile`), between the 25th and 75th percentile, never
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
 * through the registered pay consequence. A period already running that day is paid at the
 * old rate, because a period's pay is fixed when it begins (labeled game
 * simplification: real pay changes for hours worked from the effective day).
 *
 * Cost. One scheduled transition a payday date (Fridays, the 15th and the
 * last day of each month), each writing all of that day's paychecks.
 */

import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMinutesBetween,
} from "../dates";
import {
  cancelFutureDueItem,
  scheduleFutureDueItem,
  scheduledFutureDueItemsThrough,
} from "../future-transitions";
import {
  enactedRuleChangeAt,
  laborLawOfficeKey,
} from "../enacted-rule-changes";
import { countyGeoidsForPlace } from "../government-units";
import {
  growingIndex,
  withHistoryAppendTransaction,
  hasStableKey,
  recordById,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "../history-index";
import {
  currentLifeCutoff,
  educationEnrollmentStateAt,
  organizationProfileAt,
  workStatusAt,
  workRoleAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../life-places";
import { minimumHourlyAt, startingMinimumHourly } from "../minimum-wage";
import {
  menPartneredWithMen,
  payAtHire,
  UNCOVERED_PAY_NOTE,
} from "../fairness-pay-law";
import { noticeLawPayChanges } from "../law-effects-noticed";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { ensureEmployerCashPositions } from "../opening-employer-cash";
import { settleBusinessReceipts } from "../local-economy";
import {
  resourceFlowTermsAt,
  resourceTransferOutcomesForFlow,
} from "../resource-queries";
import { createDatedCashPaymentReader } from "../resource-payments";
import { writeWithWorldIntegrityOnce } from "../world";
import { hasLifePathCredential } from "../life-paths2";
import { SeededRng } from "../rng";
import {
  createResourceFlows,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcomes,
  resourceTransferTermsCutoff,
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
  TEACHER_SALARY_FLOOR_QUESTION,
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
  EarnedLawPayAssessmentRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
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
  const countyGeoid =
    place.scope === "county" &&
    place.sourceGeoid &&
    /^\d{5}$/.test(place.sourceGeoid)
      ? place.sourceGeoid
      : null;
  const stateFips =
    (geoid ?? countyGeoid)?.slice(0, 2) ??
    TERRITORY_FIPS[place.stateJurisdictionKey ?? ""] ??
    null;
  // BLS publishes no wages for American Samoa or the Northern Mariana
  // Islands: pay there is UNKNOWN, not the nation's.
  if (!stateFips || NOT_IN_OEWS.has(stateFips)) return [];
  const areas: string[] = [];
  const county =
    countyGeoid ?? (geoid ? countyGeoidsForPlace(geoid)[0] : undefined);
  const area = county ? countyArea(county) : undefined;
  if (area) areas.push(area);
  areas.push(`S${stateFips}`, "US");
  return areas;
}

/**
 * GAME ASSUMPTION, labeled: where a worker sits in their occupation's wage
 * distribution. Preserve the existing tenure calibration: a new hire starts
 * at the 25th percentile and moves toward the 75th over 20 years at the
 * employer. The retired person draw does not change pay. Recorded credentials
 * select actual paid peers for an observed hourly mean, never a fixed degree premium.
 */
export function townPayPercentile(
  tenureYears: number,
  _legacyDraw?: number,
): number {
  void _legacyDraw;
  return 25 + 50 * Math.min(1, Math.max(0, tenureYears) / 20);
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

/**
 * The national median annual wage for `occupation` (BLS OEWS, May 2025), or
 * null where BLS publishes none: the average an estimate starts from where a
 * place has no published wage.
 */
export function nationalMedianAnnualWage(occupation: string): number | null {
  const soc = TOWN_JOB_SOC[occupation];
  const median = soc
    ? wageTable().get(soc)?.get("US")?.[PERCENTILE_POINTS.indexOf(50)]
    : undefined;
  return median ?? null;
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
  if (
    GOVERNMENT_CLASSIFICATIONS.has(classification) ||
    organizationProfileAt(world, organizationId)?.publicGovernmentIdentity
  )
    return "biweekly";
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

const OFFICE_CALENDAR_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith("office-salary:")) flows.push(flow);
  },
};

/** The shared clock also visits each saved office flow's weekly due date. */
export function nextRecordedPaydayDate(world: World): IsoDate {
  let dueAt = nextPaydayDate(world.currentDate);
  for (const flow of growingIndex(
    OFFICE_CALENDAR_FLOWS,
    world.history.resourceFlows,
  )) {
    if (flow.basisReference.kind !== "work") continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
      continue;
    const work = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (!work || workStatusAt(world, work.id)?.status !== "active") continue;
    const week = Math.max(
      1,
      Math.floor(daysBetween(flow.startsAt, world.currentDate) / 7) + 1,
    );
    const officeDue = addDays(flow.startsAt, week * 7);
    if (officeDue < dueAt) dueAt = officeDue;
  }
  return dueAt;
}

// ─── Schedule ───────────────────────────────────────────────────────────

/** Refresh the existing clock when recorded office work adds an earlier due date. */
export function ensurePaydaySchedule(world: World): World {
  const dueAt = nextRecordedPaydayDate(world);
  const pending = scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    addDays(world.currentDate, 7),
  ).filter((item) => item.transitionKey === PAYDAY_TRANSITION_KEY);
  if (pending.some((item) => item.dueAt <= dueAt)) return world;
  let next = world;
  for (const item of pending) {
    next = cancelFutureDueItem(next, {
      stableKey: `${item.stableKey}:earlier-office:${next.history.nextSequence}`,
      dueItemId: item.id,
      effectiveAt: next.currentDate,
      reasonKey: "payday:earlier-recorded-office-due",
      context: null,
    });
  }
  return scheduleFutureDueItem(next, {
    stableKey: `${PAYDAY_KEY_PREFIX}${next.currentDate}:${dueAt}:${next.history.nextSequence}`,
    dueAt,
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [next.id],
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
  const since = makeIsoDate(
    dueItem.stableKey.slice(
      PAYDAY_KEY_PREFIX.length,
      PAYDAY_KEY_PREFIX.length + 10,
    ),
  );
  let next = startTownJobPay(world, null, since);
  next = raiseTeacherPayToFloor(next, null);
  next = settleAllOfficeSalaries(next);
  // A raise a law made reaches the person it raised.
  next = noticeLawPayChanges(next, since);
  next = payTownPaydays(next, since, null);
  next = scheduleFutureDueItem(next, {
    stableKey: `${PAYDAY_KEY_PREFIX}${next.currentDate}:${next.history.nextSequence}`,
    dueAt: nextRecordedPaydayDate(next),
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

export function paydayHandlers() {
  return [[PAYDAY_TRANSITION_KEY, paydayHandler]] as const;
}

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
export function weeklyHoursOf(role: WorkRoleRecord): number {
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
/** ESTIMATED FROM AVERAGE: actual paid peers at the same workplace and occupation,
 * sharing the worker's recorded completed credentials. No observed peers means
 * no adjustment to the existing tenure offer. The input world is frozen before
 * this initializer writes any offers, so actor order cannot seed its own cohort.
 */
export function recordedCredentialHourlyPay(
  world: World,
  workId: EntityId,
  onDate: IsoDate,
) {
  if (
    onDate > world.currentDate ||
    !world.history.resourceTransferOutcomes.length
  )
    return null;
  const snapshot = { ...world, currentDate: onDate };
  const target = recordById(world.history.workRelationships, workId);
  const targetRole = target ? workRoleAt(snapshot, workId) : undefined;
  if (
    !target ||
    target.recordedAt > onDate ||
    target.startedAt > onDate ||
    target.compensation !== "paid" ||
    workStatusAt(snapshot, workId)?.status !== "active" ||
    !targetRole?.occupationClassification ||
    !targetRole.locationJurisdictionId
  )
    return null;
  const credentials = world.history.educationEnrollments.filter(
    (row) =>
      row.personId === target.personId &&
      row.startedAt <= onDate &&
      row.recordedAt <= onDate &&
      hasLifePathCredential(snapshot, target.personId, row.programKind),
  );
  if (!credentials.length) return null;
  const sources: EntityId[] = credentials.flatMap((row) => {
    const state = educationEnrollmentStateAt(snapshot, row.id);
    return state ? [row.id, state.id] : [];
  });
  const rates: number[] = [];
  const countedWork = new Set<EntityId>();
  for (const flow of world.history.resourceFlows) {
    if (
      flow.basisKind !== "compensation:work" ||
      flow.basisReference.kind !== "work" ||
      flow.recordedAt > onDate ||
      flow.startsAt > onDate ||
      flow.recipient.kind !== "person"
    )
      continue;
    const work = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    );
    if (
      !work ||
      countedWork.has(work.id) ||
      work.personId === target.personId ||
      work.personId !== flow.recipient.personId ||
      work.startedAt > onDate ||
      work.recordedAt > onDate ||
      work.compensation !== "paid"
    )
      continue;
    const status = workStatusAt(snapshot, work.id);
    const role = workRoleAt(snapshot, work.id);
    if (
      status?.status !== "active" ||
      role?.occupationClassification !== targetRole.occupationClassification ||
      role.locationJurisdictionId !== targetRole.locationJurisdictionId ||
      !credentials.every((row) =>
        hasLifePathCredential(snapshot, work.personId, row.programKind),
      )
    )
      continue;
    const current = resourceFlowTermsAt(snapshot, flow.id);
    if (current?.status !== "active" || current.amount.currency !== "USD")
      continue;
    const payment = resourceTransferOutcomesForFlow(snapshot, flow.id)
      .filter(
        (row) =>
          row.status === "completed" &&
          row.transferredAmount.currency === "USD" &&
          row.transferredAmount.minorUnits > 0,
      )
      .at(-1);
    if (!payment) continue;
    const paidSnapshot = {
      ...snapshot,
      currentDate: payment.occurredAt,
      history: { ...snapshot.history, nextSequence: payment.sequence + 1 },
    };
    const paidRole = workRoleAt(paidSnapshot, work.id);
    if (
      !paidRole ||
      paidRole.occupationClassification !== role.occupationClassification ||
      paidRole.locationJurisdictionId !== role.locationJurisdictionId ||
      !credentials.every((row) =>
        hasLifePathCredential(paidSnapshot, work.personId, row.programKind),
      )
    )
      continue;
    const terms = resourceFlowTermsAt(snapshot, flow.id, {
      asOfDate: payment.occurredAt,
      historySequenceExclusive: payment.sequence + 1,
    });
    const note = terms ? payNoteOf(terms.cadenceKind) : null;
    const hours = weeklyHoursOf(paidRole);
    if (!note || hours <= 0) continue;
    rates.push(
      (payment.transferredAmount.minorUnits * PERIODS_PER_YEAR[note.period]) /
        (52 * hours),
    );
    countedWork.add(work.id);
    sources.push(
      work.id,
      status.id,
      role.id,
      paidRole.id,
      flow.id,
      terms!.id,
      payment.id,
    );
    for (const enrollment of world.history.educationEnrollments.filter(
      (row) =>
        row.personId === work.personId &&
        row.recordedAt <= onDate &&
        row.startedAt <= onDate,
    )) {
      const state = educationEnrollmentStateAt(paidSnapshot, enrollment.id);
      if (state?.status === "completed") sources.push(enrollment.id, state.id);
    }
  }
  if (!rates.length) return null;
  return {
    hourlyMinor: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
    peerCount: rates.length,
    sourceRecordIds: [...new Set(sources)],
  };
}

export function startTownJobPay(
  world: World,
  exceptPersonId: EntityId | null,
  since: IsoDate,
): World {
  let next = world;
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
    if (note) {
      const employer =
        flow.basisReference.kind === "work"
          ? recordById(
              world.history.workRelationships,
              flow.basisReference.workRelationshipId,
            )?.organizationId
          : null;
      periods.set(employer ?? flow.source.organizationId, note.period);
    }
  }
  for (const work of candidates) {
    const role = roles.get(work.id);
    if (!role) continue;
    const payer = townPaySource(next, work.organizationId!);
    next = payer.world;
    // A job held before `since` is paid from the period that was running
    // then; a later hire from the day it starts.
    const earliest = addDays(since, -31);
    const formedAt =
      world.history.organizations.find(
        (organization) => organization.id === work.organizationId,
      )?.formedAt ?? work.startedAt;
    const payerFormedAt = recordById(
      next.history.organizations,
      payer.organizationId,
    )!.formedAt;
    const startsAt = [work.startedAt, earliest, formedAt, payerFormedAt].reduce(
      (a, b) => (a > b ? a : b),
    );
    const tenure = daysBetween(work.startedAt, startsAt) / 365.25;
    // The floor on the first day paid; a later rise is recorded as a raise.
    const minimum = townMinimumHourlyAt(
      world,
      role.locationJurisdictionId,
      startsAt,
    );
    const baseline = townJobRate(
      role.occupationClassification,
      role.locationJurisdictionId,
      townPayPercentile(tenure),
      minimum,
    );
    if (!baseline) continue;
    const credentialPay = recordedCredentialHourlyPay(world, work.id, startsAt);
    const offered = credentialPay
      ? {
          ...baseline,
          hourlyMinor: Math.max(
            credentialPay.hourlyMinor,
            Math.round((minimum ?? 0) * 100),
          ),
          floored: credentialPay.hourlyMinor < Math.round((minimum ?? 0) * 100),
        }
      : baseline;
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
      source: { kind: "organization", organizationId: payer.organizationId },
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
        note: `${TOWN_PAY_VERSION}: $${(hourlyMinor / 100).toFixed(2)} an hour${hourlyMinor > rate.hourlyMinor ? " (the state's minimum teacher salary)" : rate.floored ? " (the minimum wage)" : ""}${gap && hourlyMinor === rate.hourlyMinor ? `, ${UNCOVERED_PAY_NOTE}` : ""} for ${weeklyHours} hours a week, paid ${period}; ${credentialPay ? `ESTIMATED FROM AVERAGE of ${credentialPay.peerCount} paid same-occupation/workplace credential peers; source records ${credentialPay.sourceRecordIds.join(", ")}` : `the ${Math.round(rate.percentile)}th percentile for SOC ${rate.soc} in OEWS area ${rate.area} (${TOWN_PAY_META.wages})`}.`,
      },
    });
  }
  return createResourceFlows(next, inputs);
}

/** Resolve the saved legal employer's government account, never its geography. */
export function townPaySource(
  world: World,
  employerId: EntityId,
): { readonly world: World; readonly organizationId: EntityId } {
  const profile = organizationProfileAt(world, employerId);
  if (!profile)
    throw new Error("A payroll employer needs its recorded profile.");
  const identity = profile.publicGovernmentIdentity;
  // An unbound legacy profile retains its recorded employer; never infer
  // government ownership from a classification, name or location.
  if (!identity) return { world, organizationId: employerId };
  const next =
    identity.kind === "local-government"
      ? ensureLocalPublicAccount(world, identity)
      : ensureTaxPublicAccount(world, identity.jurisdictionId);
  const account = publicTaxAccountForIdentity(next, identity);
  if (!account)
    throw new Error(
      "The recorded payroll government has no canonical public account.",
    );
  return { world: next, organizationId: account.organizationId };
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
/** Applies one resolved legal floor to an actual job's prospective pay terms. */
export function completedPayShift(
  world: World,
  flow: ResourceFlow,
  shift: NonNullable<ResolvedHourlyLawPayConsequence["completedShift"]>,
  onDate: IsoDate,
) {
  const completion = recordById(world.history.events, shift.eventId);
  if (
    !completion ||
    completion.type !== "life-paths2.work-session" ||
    completion.occurredAt !== onDate
  )
    throw new Error("Completed pay requires its actual work-session event.");
  const cutoff = resourceTransferTermsCutoff(world, flow, onDate, onDate, {
    kind: "simulated-event",
    eventId: completion.id,
  });
  const terms = resourceFlowTermsAt(world, flow.id, cutoff);
  if (!terms || terms.id !== shift.termsId || terms.status !== "active")
    throw new Error("Completed pay requires its actual earned terms.");
  const workId =
    flow.basisReference.kind === "work"
      ? flow.basisReference.workRelationshipId
      : null;
  const activities = completion.involvedEntityIds.flatMap((id) => {
    const activity = recordById(world.history.scheduledActivities, id);
    return activity ? [activity] : [];
  });
  if (activities.length !== 1)
    throw new Error("Completed pay requires exactly one saved work activity.");
  const activity = activities[0]!;
  const state = recordsWithFieldValue(
    world.history.scheduledActivityStates,
    "activityId",
    activity.id,
  )
    .filter((row) => row.sequence < cutoff.historySequenceExclusive)
    .at(-1);
  if (
    !workId ||
    flow.recipient.kind !== "person" ||
    activity.sequence >= completion.sequence ||
    !activity.sourceEntityIds.includes(workId) ||
    !activity.participantPersonIds.includes(flow.recipient.personId) ||
    !state ||
    state.status !== "completed"
  )
    throw new Error(
      "Completed pay must bind the worker and performed activity.",
    );
  const minutes = simulationMinutesBetween(state.start, state.end);
  if (!Number.isSafeInteger(minutes) || minutes <= 0)
    throw new Error("Completed pay requires a positive actual work interval.");
  return { completion, cutoff, terms, activity, state, minutes };
}

export function applyLawPayConsequence(
  world: World,
  resolved: ResolvedHourlyLawPayConsequence | ResolvedSavedHourlyPayConsequence,
): World {
  const refuse = (capability: string): never => {
    throw new Error(`Law pay consequence requires capability: ${capability}`);
  };
  if (!resolved.rowId.trim() || !resolved.activityId.trim())
    refuse("pay.row-and-activity-identity");
  if (
    resolved.amount.unit !== "minor/hour" ||
    resolved.amount.currency !== "USD"
  )
    refuse("pay.amount.minor-per-hour-USD");
  if (!Number.isFinite(resolved.amount.value) || resolved.amount.value < 0)
    refuse("pay.amount.finite-nonnegative");
  const effectiveAt = makeIsoDate(resolved.effectiveAt);
  if (effectiveAt > world.currentDate) refuse("pay.activity.current-or-past");
  let governing: Parameters<typeof lawEffectStamp>[0] = null;
  const work = recordById(world.history.workRelationships, resolved.workId);
  const flow = recordById(world.history.resourceFlows, resolved.payFlowId);
  const payerId = work
    ? payPayerAt(world, work.id, {
        asOfDate: effectiveAt,
        historySequenceExclusive: world.history.nextSequence,
      })
    : null;
  if (!world.people[resolved.personId] || work?.personId !== resolved.personId)
    refuse("pay.worker-and-job.binding");
  if (
    !flow ||
    flow.recipient.kind !== "person" ||
    flow.recipient.personId !== resolved.personId ||
    flow.basisReference.kind !== "work" ||
    flow.basisReference.workRelationshipId !== resolved.workId ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== payerId
  )
    refuse("pay.flow-worker-employer.binding");
  const completed = resolved.completedShift
    ? completedPayShift(world, flow!, resolved.completedShift, effectiveAt)
    : null;
  const cutoff = completed?.cutoff ?? {
    asOfDate: effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  if (resolved.action === "raise-hourly-floor") {
    const question = Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === resolved.questionKey,
    );
    if (!question) refuse("pay.question.canonical");
    const law = lawInForce(
      world,
      resolved.jurisdictionId,
      question!.id,
      effectiveAt,
      "all",
      cutoff,
    );
    if (
      !law ||
      law.measureId !== resolved.law.measureId ||
      law.origin !== resolved.law.origin ||
      law.operativeAt !== resolved.law.operativeAt ||
      law.answer !== resolved.law.answer
    )
      refuse("pay.law.operative");
    governing = law;
  }
  const role = workRoleAt(world, resolved.workId, cutoff);
  if (
    !role ||
    work!.startedAt > effectiveAt ||
    workStatusAt(world, resolved.workId, cutoff)?.status !== "active"
  )
    refuse("pay.job.active-with-recorded-hours");
  if (resolved.action === "raise-saved-rule-hourly-floor") {
    const authority = resolved.authority;
    const workplace = payWorkplaceAt(world, work!.id, cutoff);
    const jurisdiction = workplace.jurisdictionId
      ? world.jurisdictions[workplace.jurisdictionId]
      : null;
    const stateKey =
      (workplace.jurisdictionId
        ? lifePlaceByJurisdictionId(workplace.jurisdictionId)
            ?.stateJurisdictionKey
        : null) ??
      (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null);
    const clause = recordById(
      world.history.ruleChangeProvisions ?? [],
      authority.ruleChangeProvisionId,
    );
    const enactment = recordById(
      world.history.legislativeEnactments ?? [],
      authority.enactmentId,
    );
    const change = enactedRuleChangeAt(world, {
      stateUsps: authority.stateUsps,
      officeKey: authority.officeKey,
      field: authority.field,
      onDate: effectiveAt,
      cutoff,
    });
    if (
      authority.kind !== "enacted-hourly-pay-rule" ||
      stateKey !== `US-${authority.stateUsps}` ||
      authority.officeKey !== laborLawOfficeKey(authority.stateUsps) ||
      authority.field !== "labor.minimumWage.hourlyCents" ||
      stateJurisdictionForKey(stateKey!)?.id !== resolved.jurisdictionId ||
      (resolved.activityId !== work!.id && resolved.activityId !== flow!.id) ||
      !clause ||
      resolved.rowId !== `pay:hourly-rule:${clause.id}` ||
      clause.measureId !== authority.measureId ||
      clause.stateUsps !== authority.stateUsps ||
      clause.officeKey !== authority.officeKey ||
      clause.field !== authority.field ||
      clause.filedAt > effectiveAt ||
      !enactment ||
      enactment.outcome !== "enacted" ||
      enactment.measureId !== clause.measureId ||
      enactment.resolvedAt > effectiveAt ||
      clause.sequence >= enactment.sequence ||
      !change ||
      change.instrument !== "statute" ||
      change.measureId !== clause.measureId ||
      change.operativeAt !== authority.operativeAt ||
      change.value !== clause.value ||
      change.value !== resolved.amount.value ||
      change.applicability.appliesTo !== authority.applicability.appliesTo ||
      change.applicability.countsPriorService !==
        authority.applicability.countsPriorService ||
      (change.applicability.appliesTo === "terms-beginning-after" &&
        work!.startedAt < change.operativeAt) ||
      !resolved.sourceRecordIds.includes(clause.id) ||
      !resolved.sourceRecordIds.includes(enactment.id)
    )
      refuse("pay.hourly-rule.actual-operative-binding");
    governing = {
      measureId: change!.measureId,
      origin: "enacted",
      operativeAt: change!.operativeAt,
    };
  }
  if (!governing) refuse("pay.law.operative");
  const current = completed?.terms ?? resourceFlowTermsAt(world, flow!.id);
  if (!current || current.status !== "active") refuse("pay.flow.active-terms");
  if (current!.amount.currency !== resolved.amount.currency)
    refuse("pay.flow.currency-matches-amount");
  if (completed) {
    if (current!.cadenceKind !== "work:completed-shift")
      refuse("pay.completed-shift.hourly-earned-cadence");
    if (governing!.origin === "enacted") {
      const enactment = recordsWithFieldValue(
        world.history.legislativeEnactments ?? [],
        "measureId",
        governing!.measureId,
      ).at(-1);
      if (!enactment || enactment.sequence >= cutoff.historySequenceExclusive)
        refuse("pay.completed-shift.authority-at-earned-sequence");
    }
    const floor = assessedCompletedHourlyGrossMinor(
      resolved.amount.value,
      completed.minutes,
      current!.amount.minorUnits,
    );
    if (floor <= current!.amount.minorUnits) return world;
    const stableKey = `earned-law-pay:${flow!.id}:${completed.completion.id}:${current!.id}:${resolved.rowId}:${governing!.measureId}`;
    const id = createStableId(
      "earned-law-pay-assessment",
      `${world.id}:${stableKey}`,
    );
    const prior = recordsWithFieldValue(
      world.history.earnedLawPayAssessments ?? [],
      "stableKey",
      stableKey,
    ).at(-1);
    if (prior) {
      if (
        prior.id !== id ||
        prior.personId !== work!.personId ||
        prior.organizationId !== work!.organizationId ||
        prior.workRelationshipId !== work!.id ||
        prior.resourceFlowId !== flow!.id ||
        prior.completionEventId !== completed.completion.id ||
        prior.scheduledActivityId !== completed.activity.id ||
        prior.scheduledActivityStateId !== completed.state.id ||
        prior.earnedCutoff.asOfDate !== cutoff.asOfDate ||
        prior.earnedCutoff.historySequenceExclusive !==
          cutoff.historySequenceExclusive ||
        prior.periodStartsAt !== completed.completion.occurredAt ||
        prior.periodEndsAt !== completed.completion.occurredAt ||
        prior.contractualGross.minorUnits !== current!.amount.minorUnits ||
        prior.contractualGross.currency !== current!.amount.currency ||
        prior.assessedGross.minorUnits !== floor ||
        prior.assessedGross.currency !== current!.amount.currency ||
        prior.workedMinutes !== completed.minutes ||
        prior.earnedTermsId !== current!.id
      )
        refuse("pay.completed-shift.assessment-replay-equality");
      return world;
    }
    const sourceRecordIds = [
      ...new Set([
        ...resolved.sourceRecordIds,
        id,
        resolved.activityId,
        work!.id,
        role!.id,
        flow!.id,
        current!.id,
        completed.completion.id,
        completed.activity.id,
        completed.state.id,
      ]),
    ];
    const stamp = lawEffectStamp(governing, {
      effectKind: "pay",
      questionKey:
        resolved.action === "raise-hourly-floor" ? resolved.questionKey : null,
      ...(resolved.action === "raise-saved-rule-hourly-floor"
        ? {
            ruleAuthority: {
              ruleChangeProvisionId: resolved.authority.ruleChangeProvisionId,
              enactmentId: resolved.authority.enactmentId,
              field: resolved.authority.field,
            },
          }
        : {}),
      jurisdictionId: resolved.jurisdictionId,
      appliedAt: world.currentDate,
      sourceRecordIds,
    });
    if (!stamp) refuse("pay.attribution.canonical");
    const assessment: EarnedLawPayAssessmentRecord = {
      id,
      stableKey,
      sequence: world.history.nextSequence,
      recordedAt: world.currentDate,
      personId: work!.personId,
      organizationId: work!.organizationId!,
      workRelationshipId: work!.id,
      resourceFlowId: flow!.id,
      earnedTermsId: current!.id,
      completionEventId: completed.completion.id,
      scheduledActivityId: completed.activity.id,
      scheduledActivityStateId: completed.state.id,
      earnedCutoff: { ...completed.cutoff },
      periodStartsAt: completed.completion.occurredAt,
      periodEndsAt: completed.completion.occurredAt,
      workedMinutes: completed.minutes,
      contractualGross: { ...current!.amount },
      assessedGross: money(floor, current!.amount.currency),
      resolvedConsequence:
        resolved.action === "raise-hourly-floor"
          ? {
              ...resolved,
              law: { ...resolved.law },
              amount: { ...resolved.amount },
              completedShift: { ...resolved.completedShift! },
              sourceRecordIds: [...resolved.sourceRecordIds],
            }
          : {
              ...resolved,
              authority: {
                ...resolved.authority,
                applicability: { ...resolved.authority.applicability },
              },
              amount: { ...resolved.amount },
              completedShift: { ...resolved.completedShift! },
              sourceRecordIds: [...resolved.sourceRecordIds],
            },
      lawEffectStamps: [stamp!],
    };
    return {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 1,
        earnedLawPayAssessments: [
          ...(world.history.earnedLawPayAssessments ?? []),
          assessment,
        ],
      },
    };
  }
  const note = payNoteOf(current!.cadenceKind);
  const weekly = current!.cadenceKind === "schedule:weekly";
  if (!note && !weekly) refuse("pay.cadence.recorded-pay-period");
  const weeklyHours = weeklyHoursOf(role!);
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0)
    refuse("pay.job.positive-recorded-hours");
  const amount = Math.round(
    weekly
      ? resolved.amount.value * weeklyHours
      : (resolved.amount.value * weeklyHours * 52) /
          PERIODS_PER_YEAR[note!.period],
  );
  if (!Number.isSafeInteger(amount)) refuse("pay.period.amount-safe-integer");
  // A floor cannot cut an existing contractual wage, including after repeal.
  if (amount <= current!.amount.minorUnits) return world;
  if (effectiveAt < current!.effectiveAt || effectiveAt < flow!.startsAt)
    refuse("pay.terms.prospective");
  if (
    effectiveAt !== flow!.startsAt &&
    (weekly
      ? daysBetween(flow!.startsAt, effectiveAt) % 7 !== 0
      : !payPeriodEndingOn(note!.period, addDays(effectiveAt, -1), note!.phase))
  )
    refuse("pay.period.starts-on-effective-date");
  if (
    recordsWithFieldValue(
      world.history.resourceTransferOutcomes,
      "resourceFlowId",
      flow!.id,
    ).some(
      (paid) =>
        paid.transferredAmount.minorUnits > 0 &&
        paid.periodStartsAt <= effectiveAt &&
        effectiveAt <= paid.periodEndsAt,
    )
  )
    refuse("pay.period.unpaid");
  const revision = createStableId(
    "resource-flow-terms",
    `law-pay-revision:${JSON.stringify([
      governing!.measureId,
      governing!.operativeAt,
      [...new Set(resolved.sourceRecordIds)].sort(),
    ])}`,
  );
  const stableKey = `law-pay:${resolved.rowId}:${revision}:${flow!.id}:${resolved.activityId}:${effectiveAt}`;
  if (hasStableKey(world.history.resourceFlowTerms, stableKey))
    refuse("pay.revision.unique-amount");
  const enactment =
    governing!.origin === "enacted"
      ? recordsWithFieldValue(
          world.history.legislativeEnactments ?? [],
          "measureId",
          governing!.measureId,
        ).at(-1)
      : undefined;
  if (
    governing!.origin === "enacted" &&
    (!enactment || enactment.resolvedAt > effectiveAt)
  )
    refuse("pay.law.recorded-enactment");
  const sourceRecordIds = [
    ...new Set([
      ...resolved.sourceRecordIds,
      resolved.activityId,
      work!.id,
      role!.id,
      flow!.id,
      current!.id,
      ...(enactment ? [enactment.id] : []),
    ]),
  ];
  const stamp = lawEffectStamp(governing, {
    effectKind: "pay",
    questionKey:
      resolved.action === "raise-hourly-floor" ? resolved.questionKey : null,
    ...(resolved.action === "raise-saved-rule-hourly-floor"
      ? {
          ruleAuthority: {
            ruleChangeProvisionId: resolved.authority.ruleChangeProvisionId,
            enactmentId: resolved.authority.enactmentId,
            field: resolved.authority.field,
          },
        }
      : {}),
    jurisdictionId: resolved.jurisdictionId,
    appliedAt: effectiveAt,
    sourceRecordIds,
  });
  if (!stamp) refuse("pay.attribution.canonical");
  return recordResourceFlowTerms(world, {
    stableKey,
    resourceFlowId: flow!.id,
    effectiveAt,
    status: "active",
    amount: money(amount, current!.amount.currency),
    cadenceKind: current!.cadenceKind,
    reason: `The operative law's pay floor applies through ${resolved.rowId}.`,
    provenance: enactment
      ? { kind: "simulated-event", eventId: enactment.outcomeEventId }
      : {
          kind: "authored",
          note: `Starting law ${governing!.measureId}; resolved pay row ${resolved.rowId}.`,
        },
    supersedesTermsId: current!.id,
    lawEffectStamps: [stamp!],
  });
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
 * already paid. Each
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
    const organizationId = recordById(
      world.history.workRelationships,
      flow.basisReference.workRelationshipId,
    )?.organizationId;
    if (!organizationId) continue;
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
      const proposition = Object.values(next.policyCatalog.propositions).find(
        (row) => row.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
      );
      const jurisdictionId = role.locationJurisdictionId;
      const governing =
        proposition && jurisdictionId
          ? lawInForce(next, jurisdictionId, proposition.id, floor.from)
          : null;
      const stamp =
        governing?.measureId === floor.measureId && jurisdictionId
          ? lawEffectStamp(governing, {
              effectKind: "teacher-pay",
              questionKey: TEACHER_SALARY_FLOOR_QUESTION,
              jurisdictionId,
              appliedAt: day,
              sourceRecordIds: [flow.id, role.workRelationshipId, current.id],
            })
          : null;
      if (stamp) {
        const saved = { ...current, lawEffectStamps: [stamp] };
        next = {
          ...next,
          history: {
            ...next.history,
            resourceFlowTerms: [
              ...next.history.resourceFlowTerms.slice(0, -1),
              saved,
            ],
          },
        };
        current = saved;
      }
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
  const periods: TownCompensationPeriod[] = [];
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
      periods.push({
        payFlowId: flow.id,
        activityId: flow.id,
        stableKey,
        periodStartsAt: window.startsAt,
        periodEndsAt: window.endsAt,
        onDate: payday,
      });
    }
  }
  return settleTownCompensations(world, periods);
}

/** A calendar request backed by an existing compensation flow and activity. */
export interface TownCompensationPeriod {
  readonly payFlowId: EntityId;
  readonly activityId: EntityId;
  readonly stableKey: string;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly onDate: IsoDate;
  readonly note?: string;
  readonly provenance?: RecordResourceTransferOutcomeInput["provenance"];
  /** Existing completed-work evidence and the earnings calculated by its caller. */
  readonly completedShift?: {
    readonly eventId: EntityId;
    readonly termsId: EntityId;
    readonly amount: MoneyAmount;
  };
}

/** One period writer for actual job contracts: laws, earned pay, tax and leave. */
export function settleTownCompensations(
  world: World,
  periods: readonly TownCompensationPeriod[],
): World {
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  const claims: PaidLeaveClaim[] = [];
  const recipients = new Set<EntityId>();
  let next = world;
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
  const pending = new Set<string>();
  for (const period of periods) {
    if (
      pending.has(period.stableKey) ||
      hasStableKey(next.history.resourceTransferOutcomes, period.stableKey)
    )
      continue;
    const flow = recordById(next.history.resourceFlows, period.payFlowId);
    if (
      !flow ||
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person"
    )
      throw new Error(
        "Pay period requires an actual worker's compensation flow.",
      );
    const workId = flow.basisReference.workRelationshipId;
    const work = recordById(next.history.workRelationships, workId);
    const payerCutoff = {
      asOfDate: period.periodStartsAt,
      historySequenceExclusive: next.history.nextSequence,
    };
    const payerId = work ? payPayerAt(next, work.id, payerCutoff) : null;
    if (
      !work ||
      work.personId !== flow.recipient.personId ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== payerId
    )
      throw new Error("Pay period must bind the recorded worker and employer.");
    if (period.activityId !== flow.id && period.activityId !== work.id)
      throw new Error(
        "Pay period requires its saved pay-flow or work identity.",
      );
    const completion = period.completedShift
      ? recordById(next.history.events, period.completedShift.eventId)
      : null;
    const earnedTerms = completion
      ? resourceFlowTermsAt(next, flow.id, {
          asOfDate: completion.occurredAt,
          historySequenceExclusive: completion.sequence + 1,
        })
      : null;
    if (
      period.completedShift &&
      (!completion ||
        completion.type !== "life-paths2.work-session" ||
        !completion.involvedEntityIds.includes(work.id) ||
        !completion.involvedEntityIds.includes(work.personId) ||
        completion.occurredAt !== period.periodStartsAt ||
        completion.occurredAt !== period.periodEndsAt ||
        earnedTerms?.id !== period.completedShift.termsId ||
        earnedTerms.status !== "active" ||
        period.completedShift.amount.currency !== earnedTerms.amount.currency ||
        !Number.isSafeInteger(period.completedShift.amount.minorUnits) ||
        period.completedShift.amount.minorUnits !==
          earnedTerms.amount.minorUnits)
    )
      throw new Error(
        "Completed shift pay must bind its saved work and earned terms.",
      );
    if (period.completedShift)
      completedPayShift(
        next,
        flow,
        period.completedShift,
        period.periodStartsAt,
      );
    const window = {
      startsAt: period.periodStartsAt,
      endsAt: period.periodEndsAt,
    };
    const payday = period.onDate;
    const stableKey = period.stableKey;
    if (window.startsAt < flow.startsAt) continue;
    const recipientId = (flow.recipient as { personId: EntityId }).personId;
    next = applyLawConsequences(next, {
      onDate: window.startsAt,
      activity: "payroll",
      activityId: period.activityId,
      subjectIds: [recipientId],
      ...(period.completedShift
        ? {
            completedShift: {
              eventId: period.completedShift.eventId,
              termsId: period.completedShift.termsId,
            },
          }
        : {}),
    });
    // A raise takes effect on the first day of a period, and a period is
    // paid at the terms in force the day it began.
    const terms =
      earnedTerms ??
      resourceFlowTermsAt(next, flow.id, {
        asOfDate: window.startsAt,
        historySequenceExclusive: next.history.nextSequence,
      });
    if (!terms || terms.status !== "active") continue;
    // Days out sick, or home with a sick child, go unpaid in a job that
    // carries no paid sick leave.
    // A saved completed shift is work actually performed, not an inferred absence.
    const absence = completion
      ? undefined
      : absencesIn(window.startsAt, window.endsAt).get(recipientId);
    const workdays = workdaysBetween(window.startsAt, window.endsAt);
    const unpaidDays =
      absence && workdays > 0 && !jobPaysSickLeave(world, workId)
        ? Math.min(absence.missedDays, workdays)
        : 0;
    const assessment = completion
      ? recordsWithFieldValue(
          next.history.earnedLawPayAssessments ?? [],
          "resourceFlowId",
          flow.id,
        )
          .filter(
            (record) =>
              record.earnedTermsId === earnedTerms?.id &&
              record.completionEventId === completion.id &&
              record.workRelationshipId === work.id &&
              record.periodStartsAt === window.startsAt &&
              record.periodEndsAt === window.endsAt,
          )
          .reduce<EarnedLawPayAssessmentRecord | null>(
            (highest, record) =>
              !highest ||
              record.assessedGross.minorUnits > highest.assessedGross.minorUnits
                ? record
                : highest,
            null,
          )
      : null;
    const gross =
      assessment?.assessedGross ??
      period.completedShift?.amount ??
      terms.amount;
    const amount =
      unpaidDays === 0
        ? gross
        : money(
            Math.round(
              (terms.amount.minorUnits * (workdays - unpaidDays)) / workdays,
            ),
            terms.amount.currency,
          );
    const caring =
      !!absence && absence.caringDays > 0 && absence.sickDays === 0;
    // A state paid leave program in force replaces part of the pay lost
    // to a serious illness, the worker's own or a child's.
    const coveredDays =
      absence && unpaidDays > 0 ? paidLeaveCoveredDays(absence, unpaidDays) : 0;
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
        unpaidDays === 0
          ? "completed"
          : amount.minorUnits > 0
            ? "partial"
            : "missed",
      attemptedAmount: gross,
      transferredAmount: amount,
      ...(assessment ? { earnedLawPayAssessmentId: assessment.id } : {}),
      reasonKind:
        unpaidDays === 0
          ? null
          : caring
            ? "custom:unpaid-days-home-with-sick-child"
            : "custom:unpaid-sick-days",
      note:
        unpaidDays === 0
          ? (period.note ?? "Pay for the period.")
          : `Pay for the period, less ${unpaidDays} unpaid ${unpaidDays === 1 ? "day" : "days"} ${caring ? "home with a sick child" : "out sick"}.`,
      provenance: completion
        ? { kind: "simulated-event", eventId: completion.id }
        : (period.provenance ?? flow.provenance),
    });
    recipients.add((flow.recipient as { personId: EntityId }).personId);
    pending.add(stableKey);
  }
  if (inputs.length === 0) return next;
  next = ensureEmployerCashPositions(next, "later");
  // Existing business contracts settle actual customer payments into the same
  // canonical payer position before payroll. Saved sales estimates alone
  // cannot fund a receipt: settlement debits the customer's dated cash.
  const employers = new Set<EntityId>();
  for (const input of inputs) {
    const flow = recordById(next.history.resourceFlows, input.resourceFlowId);
    if (flow?.source.kind === "organization")
      employers.add(flow.source.organizationId);
  }
  for (const organizationId of employers)
    next = settleBusinessReceipts(next, organizationId);
  for (const personId of recipients)
    next = ensureLifePathPersonalPosition(
      next,
      personId,
      money(0, "USD").currency,
    );
  const first = next.history.resourceTransferOutcomes.length;
  next = writeWithWorldIntegrityOnce(next, () =>
    withHistoryAppendTransaction(
      next,
      ["resourceTransferOutcomes"],
      (initial) => {
        let settled = initial;
        const assessCash = createDatedCashPaymentReader(initial);
        // Settle in payday order, reading each prior payment before the next worker.
        // The shared dated-cash reader also preserves cash spent after an overdue day.
        for (const input of inputs.sort((a, b) =>
          a.occurredAt.localeCompare(b.occurredAt),
        )) {
          const flow = recordById(
            settled.history.resourceFlows,
            input.resourceFlowId,
          )!;
          const payment = assessCash(
            settled,
            flow.source,
            input.transferredAmount,
            makeIsoDate(input.occurredAt),
          );
          settled = recordResourceTransferOutcomes(settled, [
            {
              ...input,
              status:
                payment.availableMinor === null
                  ? "blocked"
                  : payment.status === "completed"
                    ? input.status
                    : payment.status,
              transferredAmount: payment.transferredAmount,
              reasonKind:
                payment.availableMinor === null
                  ? "capacity:unrecorded-employer-cash"
                  : payment.status === "completed"
                    ? input.reasonKind
                    : "capacity:insufficient-employer-cash",
            },
          ]);
        }
        return settled;
      },
    ),
  );
  const ids = next.history.resourceTransferOutcomes
    .slice(first)
    .map((outcome) => outcome.id);
  // Keep sequential withholding reads while materializing each payment list once.
  next = withHistoryAppendTransaction(
    next,
    ["resourceFlows", "resourceFlowTerms", "resourceTransferOutcomes"],
    (initial) => assessPaychecksTaxes(initial, ids),
  );
  next = recordPaycheckTaxBases(next, ids);

  next = attributePaycheckTaxLaws(next, ids);
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
