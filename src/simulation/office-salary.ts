import {
  settleTownCompensations,
  type TownCompensationPeriod,
} from "./living-world/town-pay";
import {
  growingIndex,
  recordById,
  recordsWithFieldValue,
  type GrowingIndexKind,
} from "./history-index";
import { addDays, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import {
  currentLifeCutoff,
  workStatusAt,
  workRoleAt,
  workRelationshipHistoryForPerson,
} from "./life-queries";
import { recordedWorkAnnualPay } from "./recorded-work-pay";
import { officePayInForce, paidOfficeOf } from "./office-pay";
import { stateJurisdictionForKey } from "./life-places";
import { publicTaxAccountForIdentity } from "./tax-policy";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { advanceWithWorldIntegrityAtEnd } from "./world";
import {
  townJobRate,
  townMinimumHourlyAt,
  townPayPercentile,
  weeklyHoursOf,
} from "./living-world/town-pay";
import {
  createResourceFlow,
  createResourceFlows,
  money,
  type CreateResourceFlowInput,
} from "./resources";
import type {
  EntityId,
  IsoDate,
  World,
  WorkRelationship,
  ResourceFlow,
} from "./types";

/**
 * Pay for holding a public office.
 *
 * Offices were recorded as paid work and nothing ever paid them. In the
 * corrupt-life replay Lucia's account held exactly $102,160 for her whole
 * time as governor. This pays the person being played a weekly salary for
 * each public office they hold that has no pay recorded, through the same
 * compensation records a shop job uses, so the money screen and the weekly
 * living costs read it with no extra code.
 *
 * Only offices are paid here. A job that already has pay terms keeps them,
 * and ordinary jobs from a generated past are not touched.
 */

/** The work kinds that are public offices. */
export const PAID_OFFICE_KINDS: readonly string[] = [
  "employment:executive-office",
  "employment:legislative-member",
  "employment:judicial-office-practice",
  "employment:state-agency-director",
  "employment:civil-service",
  "employment:executive-staff",
  "employment:congress-member",
];

const OFFICE_WORK: GrowingIndexKind<WorkRelationship[]> = {
  create: () => [],
  add: (works, record) => {
    const work = record as WorkRelationship;
    if (
      work.organizationId &&
      PAID_OFFICE_KINDS.includes(work.kind) &&
      (work.compensation === "paid" || work.compensation === "mixed")
    )
      works.push(work);
  },
};
const WORK_PAY_FLOWS: GrowingIndexKind<Map<EntityId, ResourceFlow>> = {
  create: () => new Map(),
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (
      flow.basisReference.kind === "work" &&
      !flows.has(flow.basisReference.workRelationshipId)
    )
      flows.set(flow.basisReference.workRelationshipId, flow);
  },
};
const OFFICE_PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (
      flow.basisReference.kind === "work" &&
      flow.stableKey.startsWith("office-salary:")
    )
      flows.push(flow);
  },
};

const WEEK_DAYS = 7;

/**
 * The annual pay for an office on a date: what the state's pay law says if one
 * is in force, else the state's published figure, else comparable recorded pay or the recorded occupation’s published wage.
 */
function annualPay(
  world: World,
  work: WorkRelationship,
  onDate: IsoDate,
): { readonly annualMinor: number; readonly note: string } | null {
  const inForce = officePayInForce(world, work, onDate);
  if (inForce?.law)
    return {
      annualMinor: inForce.annualDollars * 100,
      note: `${inForce.law.designation} set this office's salary to $${inForce.annualDollars.toLocaleString("en-US")} a year.`,
    };
  const role = workRoleAt(world, work.id, {
    ...currentLifeCutoff(world),
    asOfDate: onDate,
  });
  if (!inForce) {
    const recorded = recordedWorkAnnualPay(world, {
      occupation: role?.occupationClassification ?? null,
      workKind: work.kind,
      jurisdictionId: role?.locationJurisdictionId ?? null,
      weeklyHours: role ? weeklyHoursOf(role) : 0,
      onDate,
      excludeWorkId: work.id,
    });
    if (recorded) return recorded;
    if (!role?.locationJurisdictionId) return null;
    const tenure = Math.max(0, daysBetween(work.startedAt, onDate) / 365.25);
    // Use the existing tenure mechanism's central position, with no person draw.
    // Credential sizing remains the separate A40 contract, not an invented step.
    const rate = townJobRate(
      role.occupationClassification,
      role.locationJurisdictionId,
      townPayPercentile(tenure),
      townMinimumHourlyAt(world, role.locationJurisdictionId, onDate),
    );
    const hours = weeklyHoursOf(role);
    if (!rate || hours <= 0) return null;
    return {
      annualMinor: Math.round(rate.hourlyMinor * hours * 52),
      note: `Recorded ${hours} hours a week at $${(rate.hourlyMinor / 100).toFixed(2)} an hour; SOC ${rate.soc}, OEWS area ${rate.area}, ${Math.round(rate.percentile)}th percentile from recorded tenure.`,
    };
  }
  return inForce
    ? {
        annualMinor: inForce.annualDollars * 100,
        note:
          inForce.estimatedBecause ??
          `Salary for this office, published (The Book of the States 2023; Congressional Research Service 97-1011 for Congress).`,
      }
    : null;
}

function weeklyMinor(annualMinor: number): number {
  return Math.round(annualMinor / 52);
}

function salaryKey(work: WorkRelationship): string {
  return `office-salary:${work.id}`;
}

function isActiveOn(world: World, workId: EntityId, date: IsoDate): boolean {
  return (
    workStatusAt(world, workId, {
      ...currentLifeCutoff(world),
      asOfDate: date,
    })?.status === "active"
  );
}

/**
 * Open missing office salary agreements at the actual current date only.
 * This creates no payment and leaves every existing agreement unchanged.
 * Opening and monthly scheduling callers share the settlement writer's
 * eligibility and amount calculation; old saves are never backdated.
 */
export function initializeOfficeSalaryFlows(
  world: World,
  personId: EntityId,
): World {
  let next = world;
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (work.personId !== personId || !work.organizationId) continue;
    if (!PAID_OFFICE_KINDS.includes(work.kind)) continue;
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    next = initializeOneSalaryFlow(next, work);
  }
  return next;
}

function initializeOneSalaryFlow(world: World, work: WorkRelationship): World {
  if (
    world.history.resourceFlows.some(
      (flow) =>
        flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === work.id,
    ) ||
    !isActiveOn(world, work.id, world.currentDate)
  )
    return world;
  const pay = annualPay(world, work, world.currentDate);
  if (!pay) return world;
  const next = ensureLifePathPersonalPosition(
    world,
    work.personId,
    money(0, "USD").currency,
  );
  return createResourceFlow(next, officeSalaryInput(next, work, pay));
}

/** The office's actual saved public account pays when its ownership is recorded. */
function officeSalaryInput(
  world: World,
  work: WorkRelationship,
  pay: { annualMinor: number; note: string },
  accounts?: Map<EntityId, EntityId | null>,
): CreateResourceFlowInput {
  const held = paidOfficeOf(world, work);
  const jurisdiction =
    held?.state === "US"
      ? NATIONAL_ELECTION_JURISDICTION
      : held
        ? stateJurisdictionForKey(`US-${held.state}`)
        : null;
  let accountId = jurisdiction ? accounts?.get(jurisdiction.id) : undefined;
  if (jurisdiction && accountId === undefined) {
    accountId =
      publicTaxAccountForIdentity(world, {
        kind: "jurisdiction",
        jurisdictionId: jurisdiction.id,
      })?.organizationId ?? null;
    accounts?.set(jurisdiction.id, accountId);
  }
  return {
    stableKey: salaryKey(work),
    source: {
      kind: "organization",
      organizationId: accountId ?? work.organizationId!,
    },
    recipient: { kind: "person", personId: work.personId },
    startsAt: world.currentDate,
    amount: money(weeklyMinor(pay.annualMinor), "USD"),
    cadenceKind: "schedule:weekly",
    basisKind: "compensation:work",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    jurisdictionId: jurisdiction?.id ?? null,
    provenance: { kind: "authored", note: pay.note },
  };
}

/** All actually recorded paid offices, including NPCs, share the existing salary agreement writer. */
export function initializeAllOfficeSalaryFlows(world: World): World {
  const existing = growingIndex(WORK_PAY_FLOWS, world.history.resourceFlows);
  const missing = growingIndex(
    OFFICE_WORK,
    world.history.workRelationships,
  ).filter(
    (work) =>
      !existing.has(work.id) &&
      paidOfficeOf(world, work) &&
      isActiveOn(world, work.id, world.currentDate),
  );
  if (missing.length === 0) return world;
  return advanceWithWorldIntegrityAtEnd(() => {
    let next = world;
    const inputs: CreateResourceFlowInput[] = [];
    const accounts = new Map<EntityId, EntityId | null>();
    for (const work of missing) {
      const pay = annualPay(world, work, world.currentDate);
      if (!pay) continue;
      next = ensureLifePathPersonalPosition(
        next,
        work.personId,
        money(0, "USD").currency,
      );
      inputs.push(officeSalaryInput(next, work, pay, accounts));
    }
    return createResourceFlows(next, inputs);
  }, world);
}

/** Calendar adapter only; every transfer still uses settleTownCompensations. */
export function settleAllOfficeSalaries(world: World): World {
  return advanceWithWorldIntegrityAtEnd(() => {
    const next = initializeAllOfficeSalaryFlows(world);
    const periods: TownCompensationPeriod[] = [];
    for (const flow of growingIndex(
      OFFICE_PAY_FLOWS,
      next.history.resourceFlows,
    )) {
      if (flow.basisReference.kind !== "work") continue;
      const work = recordById(
        next.history.workRelationships,
        flow.basisReference.workRelationshipId,
      );
      if (!work || !paidOfficeOf(next, work)) continue;
      periods.push(...dueOfficePeriods(next, work, flow));
    }
    return periods.length ? settleTownCompensations(next, periods) : next;
  }, world);
}

/** Read each flow's indexed recorded periods before the one common batch settlement. */
function dueOfficePeriods(
  world: World,
  work: WorkRelationship,
  flow: ResourceFlow,
): TownCompensationPeriod[] {
  let paidWeeks = 0;
  for (const outcome of recordsWithFieldValue(
    world.history.resourceTransferOutcomes,
    "resourceFlowId",
    flow.id,
  )) {
    const week =
      daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
    if (week > paidWeeks) paidWeeks = week;
  }
  const periods: TownCompensationPeriod[] = [];
  const weeksDue = Math.floor(
    daysBetween(flow.startsAt, world.currentDate) / WEEK_DAYS,
  );
  for (let week = paidWeeks + 1; week <= weeksDue; week += 1) {
    const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
    const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
    if (!isActiveOn(world, work.id, addDays(dueOn, -1))) break;
    periods.push({
      stableKey: `${flow.stableKey}:${periodStartsAt}`,
      payFlowId: flow.id,
      activityId: flow.id,
      periodStartsAt,
      periodEndsAt: addDays(dueOn, -1),
      onDate: dueOn,
      note: "Salary for the week.",
      provenance: flow.provenance,
    });
  }
  return periods;
}

/**
 * Pays every whole week of office salary that has come due, and stops.
 *
 * Idempotent: each week is keyed by the day it began and resumes after the
 * last one paid, so a second call or a reload writes nothing new.
 */
export function settleOfficeSalaries(world: World, personId: EntityId): World {
  let next = world;
  for (const work of workRelationshipHistoryForPerson(world, personId)) {
    if (work.personId !== personId || !work.organizationId) continue;
    if (!PAID_OFFICE_KINDS.includes(work.kind)) continue;
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    next = settleOne(next, work);
  }
  return next;
}

function settleOne(world: World, work: WorkRelationship): World {
  const existing = growingIndex(
    WORK_PAY_FLOWS,
    world.history.resourceFlows,
  ).get(work.id);
  // Pay terms somebody else recorded are theirs; this only fills the gap.
  if (existing && existing.stableKey !== salaryKey(work)) return world;
  let next = world;
  if (!existing) return initializeOneSalaryFlow(world, work);
  const flow = existing;
  for (const period of dueOfficePeriods(next, work, flow))
    next = settleTownCompensations(next, [period]);
  return next;
}
