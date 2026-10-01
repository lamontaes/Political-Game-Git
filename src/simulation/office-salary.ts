import { assessPaycheckTaxes } from "./statutory-tax";
import { addDays, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { currentLifeCutoff, workStatusAt } from "./life-queries";
import { officePayInForce } from "./office-pay";
import {
  createWorkCompensation,
  money,
  recordResourceFlowTerms,
  resolveWorkCompensationPeriod,
} from "./resources";
import { resourceFlowTermsHistory } from "./resource-queries";
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
 * PLACEHOLDER(research: what-public-officials-are-paid). A governor, a state
 * legislator, a judge and a member of Congress are paid the published salary
 * (`office-pay.ts`). Every other office, and a state whose tables give no single annual figure, is paid this
 * one national annual figure: nobody has researched it, and it is the same for
 * a judge, a mayor and a civil servant in every state. Replace it; do not tune
 * it.
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
  "employment:congress-member",
];

const WEEK_DAYS = 7;
const CATCH_UP_LIMIT_WEEKS = 520;

/**
 * The annual pay for an office on a date: what the state's pay law says if one
 * is in force, else the state's published figure, else the placeholder.
 */
function annualPay(
  world: World,
  work: WorkRelationship,
  onDate: IsoDate,
): { readonly annualMinor: number; readonly note: string } {
  const inForce = officePayInForce(world, work, onDate);
  if (inForce?.law)
    return {
      annualMinor: inForce.annualDollars * 100,
      note: `${inForce.law.designation} set this office's salary to $${inForce.annualDollars.toLocaleString("en-US")} a year.`,
    };
  return inForce
    ? {
        annualMinor: inForce.annualDollars * 100,
        note:
          inForce.estimatedBecause ??
          `Salary for this office, published (The Book of the States 2023; Congressional Research Service 97-1011 for Congress).`,
      }
    : {
        annualMinor: OFFICE_SALARY_PLACEHOLDER.annualMinor,
        note: `Placeholder office salary pending research question ${OFFICE_SALARY_PLACEHOLDER.researchQuestionId}.`,
      };
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
  const next = ensureLifePathPersonalPosition(
    world,
    work.personId,
    money(0, OFFICE_SALARY_PLACEHOLDER.currency).currency,
  );
  const pay = annualPay(world, work, world.currentDate);
  return createWorkCompensation(next, {
    stableKey: salaryKey(work),
    workRelationshipId: work.id,
    startsAt: next.currentDate,
    amount: money(
      weeklyMinor(pay.annualMinor),
      OFFICE_SALARY_PLACEHOLDER.currency,
    ),
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
    week <= paidWeeks + CATCH_UP_LIMIT_WEEKS;
    week += 1
  ) {
    const periodStartsAt = addDays(flow.startsAt, (week - 1) * WEEK_DAYS);
    const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
    if (dueOn > next.currentDate) break;
    // A week that ends after the office did is not paid, and nothing later is.
    if (!isActiveOn(next, work.id, addDays(dueOn, -1))) break;
    next = raiseToPayInForce(next, work, flow.id, periodStartsAt);
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
    next = assessPaycheckTaxes(
      next,
      next.history.resourceTransferOutcomes.at(-1)!.id,
    );
  }
  return next;
}

/**
 * Moves a salary to what a state's pay law sets, from the first week that
 * begins on or after the day the law is operative. The change is recorded as
 * new terms that name the law, so an earlier week keeps the pay it was paid
 * at. A salary no law has touched keeps the terms it was created with.
 */
function raiseToPayInForce(
  world: World,
  work: WorkRelationship,
  flowId: EntityId,
  weekStartsAt: IsoDate,
): World {
  const inForce = officePayInForce(world, work, weekStartsAt);
  if (!inForce?.law) return world;
  const current = resourceFlowTermsHistory(world, flowId).at(-1);
  if (!current || current.status !== "active") return world;
  const weekly = weeklyMinor(inForce.annualDollars * 100);
  if (current.amount.minorUnits === weekly) return world;
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === inForce.law!.measureId,
  );
  return recordResourceFlowTerms(world, {
    stableKey: `${salaryKey(work)}:pay-law:${inForce.law.measureId}:${weekStartsAt}`,
    resourceFlowId: flowId,
    effectiveAt:
      weekStartsAt > current.effectiveAt ? weekStartsAt : current.effectiveAt,
    status: "active",
    amount: money(weekly, current.amount.currency),
    cadenceKind: current.cadenceKind,
    reason: `${inForce.law.designation} set this office's salary to $${inForce.annualDollars.toLocaleString("en-US")} a year.`,
    provenance: enactment
      ? { kind: "simulated-event", eventId: enactment.outcomeEventId }
      : {
          kind: "authored",
          note: `${inForce.law.designation} set this office's salary.`,
        },
    supersedesTermsId: current.id,
  });
}
