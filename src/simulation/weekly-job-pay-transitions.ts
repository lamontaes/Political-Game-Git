import { createFutureTransitionHandlerRegistry } from "./future-transition-registry";
import { addDays, daysBetween } from "./dates";
import { workStatusAt } from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import { scheduleFutureDueItem } from "./future-transitions";
import type { EntityId, IsoDate, ResourceFlow, World } from "./types";

export const WEEKLY_JOB_PAY_TRANSITION_KEY = "job-pay:weekly-period";
const DAYS_PER_WEEK = 7;
export type SavedWeeklyJobPaySettler = (
  world: World,
  workRelationshipId: EntityId,
  resourceFlowId: EntityId,
  dueOn: IsoDate,
) => World;

function savedJobWork(world: World, flow: ResourceFlow) {
  const reference = flow.basisReference;
  if (flow.basisKind !== "compensation:work" || reference.kind !== "work")
    return null;
  const work = world.history.workRelationships.find(
    (row) => row.id === reference.workRelationshipId,
  );
  if (
    !work ||
    flow.stableKey !== `job-pay:${work.id}` ||
    flow.recipient.kind !== "person" ||
    flow.recipient.personId !== work.personId ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== work.organizationId ||
    !world.people[work.personId] ||
    !world.history.organizations.some((row) => row.id === work.organizationId)
  )
    return null;
  return work;
}

/** Admit only an existing job contract's next future week. No late-pay backfill. */
export function ensureSavedWeeklyJobPayCalendar(
  world: World,
  workRelationshipId?: EntityId,
): World {
  let next = world;
  for (const flow of world.history.resourceFlows) {
    const work = savedJobWork(next, flow);
    if (
      !work ||
      (workRelationshipId && work.id !== workRelationshipId) ||
      flow.startsAt > next.currentDate ||
      flow.recordedAt > next.currentDate ||
      workStatusAt(next, work.id)?.status !== "active"
    )
      continue;
    const terms = resourceFlowTermsAt(next, flow.id);
    if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
      continue;
    let paidWeeks = 0;
    for (const outcome of next.history.resourceTransferOutcomes) {
      if (outcome.resourceFlowId !== flow.id) continue;
      const week =
        daysBetween(flow.startsAt, outcome.periodStartsAt) / DAYS_PER_WEEK + 1;
      if (Number.isSafeInteger(week) && week > paidWeeks) paidWeeks = week;
    }
    const dueOn = addDays(flow.startsAt, (paidWeeks + 1) * DAYS_PER_WEEK);
    // Future items cannot be created on or after their due date. Older unscheduled
    // wages require an explicit recovery contract, never a silently skipped week.
    if (dueOn <= next.currentDate) continue;
    const stableKey = `job-pay:weekly:${flow.id}:${dueOn}`;
    if (next.history.futureDueItems.some((row) => row.stableKey === stableKey))
      continue;
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt: dueOn,
      transitionKey: WEEKLY_JOB_PAY_TRANSITION_KEY,
      entityIds: [work.personId, work.organizationId!].sort(),
      jurisdictionId: null,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [flow.id, work.id].sort(),
      },
    });
  }
  return next;
}

/** The complete clock supplies the sole existing payment writer. */
export function createWeeklyJobPayTransitionRegistry(
  settle: SavedWeeklyJobPaySettler,
) {
  return createFutureTransitionHandlerRegistry([
    [
      WEEKLY_JOB_PAY_TRANSITION_KEY,
      (world, due) => {
        const sources =
          due.provenance.kind === "simulated"
            ? due.provenance.sourceEntityIds
            : [];
        const flow = world.history.resourceFlows.find((row) =>
          sources.includes(row.id),
        );
        const work = flow && savedJobWork(world, flow);
        const weeks = flow
          ? daysBetween(flow.startsAt, due.dueAt) / DAYS_PER_WEEK
          : 0;
        if (
          !flow ||
          !work ||
          !Number.isSafeInteger(weeks) ||
          weeks < 1 ||
          due.stableKey !== `job-pay:weekly:${flow.id}:${due.dueAt}` ||
          !sources.includes(work.id) ||
          ![work.personId, work.organizationId!].every((id) =>
            due.entityIds.includes(id),
          )
        )
          return {
            world,
            status: "blocked",
            reasonKey: "job-pay:binding-unavailable",
            context: "The weekly payment lacks its saved job contract binding.",
            outcomeEventId: null,
          };
        const recorded = settle(world, work.id, flow.id, due.dueAt);
        const periodStartsAt = addDays(due.dueAt, -DAYS_PER_WEEK);
        const periodEndsAt = addDays(due.dueAt, -1);
        const outcome = recorded.history.resourceTransferOutcomes.find(
          (row) =>
            row.stableKey === `${flow.stableKey}:${periodStartsAt}` &&
            row.resourceFlowId === flow.id &&
            row.periodStartsAt === periodStartsAt &&
            row.periodEndsAt === periodEndsAt &&
            row.occurredAt === due.dueAt,
        );
        const next = ensureSavedWeeklyJobPayCalendar(recorded, work.id);
        if (!outcome)
          return {
            world: next,
            status: "blocked",
            reasonKey: "job-pay:payment-not-recorded",
            context: "No payment outcome exists for this saved weekly period.",
            outcomeEventId: null,
          };
        return {
          world: next,
          status: "resolved",
          reasonKey: null,
          context: `Weekly job payment processed with recorded status ${outcome.status}; transferred ${outcome.transferredAmount.minorUnits} ${outcome.transferredAmount.currency} minor units.`,
          outcomeEventId: null,
        };
      },
    ],
  ]);
}
