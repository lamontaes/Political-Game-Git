import { addDays, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { currentLifeCutoff, workStatusAt } from "./life-queries";
import {
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "./resources";
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

/**
 * PLACEHOLDER(research: what-public-officials-are-paid). Nobody has
 * researched this number. It is one national annual figure for every office
 * below, the same for a governor, a legislator, a judge and a civil servant in
 * every state, standing in until real salaries by office and state are on
 * file. Replace it; do not tune it.
 */
export const OFFICE_SALARY_PLACEHOLDER = {
  annualMinor: 6_000_000,
  currency: "USD",
  researchQuestionId: "what-public-officials-are-paid",
} as const;

/** The work kinds that are public offices. */
export const PAID_OFFICE_KINDS: readonly string[] = [
  "employment:executive-office",
  "employment:legislative-member",
  "employment:judicial-office-practice",
  "employment:state-agency-director",
  "employment:civil-service",
  "employment:executive-staff",
];

const WEEK_DAYS = 7;
const CATCH_UP_LIMIT_WEEKS = 520;

function weeklyMinor(): number {
  return Math.round(OFFICE_SALARY_PLACEHOLDER.annualMinor / 52);
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
  if (!existing) {
    if (!isActiveOn(world, work.id, world.currentDate)) return world;
    next = ensureLifePathPersonalPosition(
      next,
      work.personId,
      money(0, OFFICE_SALARY_PLACEHOLDER.currency).currency,
    );
    return createWorkCompensation(next, {
      stableKey: salaryKey(work),
      workRelationshipId: work.id,
      startsAt: next.currentDate,
      amount: money(weeklyMinor(), OFFICE_SALARY_PLACEHOLDER.currency),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: `Placeholder office salary pending research question ${OFFICE_SALARY_PLACEHOLDER.researchQuestionId}.`,
      },
    });
  }
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
    week <= paidWeeks + CATCH_UP_LIMIT_WEEKS;
    week += 1
  ) {
    const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
    const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
    if (dueOn > next.currentDate) break;
    // A week that ends after the office did is not paid, and nothing later is.
    if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
    next = resolveWorkCompensationPeriod(next, {
      stableKey: `${flow.stableKey}:${periodStartsAt}`,
      workRelationshipId: work.id,
      periodStartsAt,
      periodEndsAt: addDays(dueOn, -1),
      occurredAt: dueOn,
      status: "completed",
      reasonKind: null,
      note: "Salary for the week.",
      provenance: flow.provenance,
    });
  }
  return next;
}
