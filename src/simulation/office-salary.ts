import { settleTownCompensations } from "./living-world/town-pay";
import { addDays, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { currentLifeCutoff, workStatusAt, workRoleAt } from "./life-queries";
import { recordedWorkAnnualPay } from "./recorded-work-pay";
import { officePayInForce } from "./office-pay";
import {
  townJobRate,
  townMinimumHourlyAt,
  townPayPercentile,
  weeklyHoursOf,
} from "./living-world/town-pay";
import { createWorkCompensation, money } from "./resources";
import type { EntityId, IsoDate, World, WorkRelationship } from "./types";

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
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  let next = world;
  for (const work of world.history.workRelationships) {
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
  return createWorkCompensation(next, {
    stableKey: salaryKey(work),
    workRelationshipId: work.id,
    startsAt: next.currentDate,
    amount: money(weeklyMinor(pay.annualMinor), "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: { kind: "authored", note: pay.note },
  });
}

/**
 * Pays every whole week of office salary that has come due, and stops.
 *
 * Idempotent: each week is keyed by the day it began and resumes after the
 * last one paid, so a second call or a reload writes nothing new.
 */
export function settleOfficeSalaries(world: World, personId: EntityId): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  let next = world;
  for (const work of world.history.workRelationships) {
    if (work.personId !== personId || !work.organizationId) continue;
    if (!PAID_OFFICE_KINDS.includes(work.kind)) continue;
    if (work.compensation !== "paid" && work.compensation !== "mixed") continue;
    next = settleOne(next, work);
  }
  return next;
}

function settleOne(world: World, work: WorkRelationship): World {
  const existing = world.history.resourceFlows.find(
    (flow) =>
      flow.basisReference.kind === "work" &&
      flow.basisReference.workRelationshipId === work.id,
  );
  // Pay terms somebody else recorded are theirs; this only fills the gap.
  if (existing && existing.stableKey !== salaryKey(work)) return world;
  let next = world;
  if (!existing) return initializeOneSalaryFlow(world, work);
  const flow = existing;
  let paidWeeks = 0;
  for (const outcome of next.history.resourceTransferOutcomes) {
    if (outcome.resourceFlowId !== flow.id) continue;
    const week =
      daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
    if (week > paidWeeks) paidWeeks = week;
  }
  for (
    let week = paidWeeks + 1;
    week <=
    Math.floor(daysBetween(flow.startsAt, next.currentDate) / WEEK_DAYS);
    week += 1
  ) {
    const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
    const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
    if (dueOn > next.currentDate) break;
    // A week that ends after the office did is not paid, and nothing later is.
    if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
    next = settleTownCompensations(next, [
      {
        stableKey: `${flow.stableKey}:${periodStartsAt}`,
        payFlowId: flow.id,
        activityId: flow.id,
        periodStartsAt,
        periodEndsAt: addDays(dueOn, -1),
        onDate: dueOn,
        note: "Salary for the week.",
        provenance: flow.provenance,
      },
    ]);
  }
  return next;
}
