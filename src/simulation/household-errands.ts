import { addSimulationMinutes } from "./dates";
import { createStableId } from "./ids";
import { householdErrandsFor } from "./life-opportunities";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
  workItemState,
} from "./time-work";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
  WorkItemStateRecord,
} from "./types";

/**
 * Doing the week's errands, as opposed to deciding to.
 *
 * "Get things done" used to write only the decision. The errand item stayed
 * active, so the same list came back every week for years: in the long
 * playthrough Fatima Erickson chose it for three years in Eastport, Maine and
 * never once finished her shopping. This is the missing writer. It spends the
 * errand's own remaining minutes on the calendar, through the same performer
 * every other piece of work uses, and closes the item only when that time was
 * really spent. A calendar that refuses the time leaves the item open, and the
 * result says so rather than pretending the shopping happened.
 *
 * Nothing is bought here. What the week costs is charged by the weekly living
 * costs in `cost-of-living.ts`, so the groceries are not paid for twice.
 */
export type HouseholdErrandsResult =
  | { readonly status: "done"; readonly world: World; readonly minutes: number }
  | {
      readonly status: "not-done";
      readonly world: World;
      readonly reason: string;
    };

export function doHouseholdErrands(
  world: World,
  personId: EntityId,
  transitionHandlers?: FutureTransitionHandlerRegistry,
): HouseholdErrandsResult {
  const refuse = (reason: string): HouseholdErrandsResult => ({
    status: "not-done",
    world,
    reason,
  });
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return refuse("Only the person being played can do their own errands.");
  const item = householdErrandsFor(world, personId);
  if (!item?.effort) return refuse("There are no errands on the list.");
  const before = workItemState(world, item.id);
  if (
    before.status !== "active" ||
    before.blocker ||
    before.waitingOnPersonIds.length > 0 ||
    !before.assignedPersonIds.includes(personId)
  )
    return refuse("These errands are not yours to do right now.");
  const minutes = item.effort.requiredMinutes - before.completedEffortMinutes;
  if (minutes <= 0) return refuse("Nothing is left to do on the list.");

  const person = world.people[personId]!;
  const jurisdictionId =
    item.jurisdictionId ??
    lifePlaceByJurisdictionId(person.homeJurisdictionId)?.context.jurisdiction
      .id ??
    person.homeJurisdictionId;
  const stableKey = `household-errands-session:${item.id}:${before.id}`;
  if (
    world.history.scheduledActivities.some(
      (entry) => entry.stableKey === stableKey,
    )
  )
    return refuse("These errands are already being done.");

  let planned: World;
  try {
    planned = createScheduledActivity(world, {
      stableKey,
      title: item.title,
      summary: item.summary,
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, minutes),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        jurisdictionId,
        locationKey: `household-errands:${personId}`,
        label: "Out on the week's errands",
      },
      sourceEntityIds: [item.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
  } catch (error) {
    // The calendar is already spoken for at this hour. That is the world
    // saying not now, and the errands stay on the list.
    if (error instanceof Error && /conflict|past|overlap/i.test(error.message))
      return refuse("Something else is already on the calendar now.");
    throw error;
  }
  const activity = planned.history.scheduledActivities.find(
    (entry) => entry.stableKey === stableKey,
  )!;
  const performed = performScheduledActivity(
    planned,
    activity.id,
    transitionHandlers,
  );
  if (scheduledActivityState(performed, activity.id).status !== "completed")
    return refuse("Something else on the calendar got in the way.");
  if (workItemState(performed, item.id).id !== before.id)
    return refuse("The errands changed while you were out.");

  const stateKey = `household-errands-completed:${item.id}:${activity.id}`;
  const recorded = recordWorldEvent(performed, {
    stableKey: `${stateKey}:event`,
    type: "life.household-errands-done",
    occurredAt: performed.currentDate,
    recordedAt: performed.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId, item.id, activity.id],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: `Did the errands: ${item.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.household-errands", "work.completed"],
    summary: `You did the errands on the list: ${item.title.toLowerCase()}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Get things done",
      motivation: null,
      immediateReaction: null,
    },
  });
  const state: WorkItemStateRecord = {
    ...before,
    id: createStableId("work-item-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: recorded.history.nextSequence,
    recordedAt: recorded.currentMoment,
    status: "completed",
    playerRequirement: "none",
    completedEffortMinutes: item.effort.requiredMinutes,
    outcomeEventId: recorded.history.events.at(-1)!.id,
    supersedesStateId: before.id,
  };
  const next: World = {
    ...recorded,
    history: {
      ...recorded.history,
      nextSequence: recorded.history.nextSequence + 1,
      workItemStates: [...recorded.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return { status: "done", world: next, minutes };
}
