import { eventById } from "../event-index";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import type { EntityId, FutureTransitionHandler, World } from "../types";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  nextClemencyPetitionDueAt,
} from "./clemency";
import { CLEMENCY_PETITION_EVENT, petitionerOf } from "./clemency-records";

export const CLEMENCY_PETITION_TRANSITION_KEY = "justice:clemency-petition";
const PREFIX = `${CLEMENCY_PETITION_TRANSITION_KEY}:`;

/** Saved petition and existing writer dates supply the deadline, never a poll. */
export function ensureClemencyPetitionSchedule(
  world: World,
  petitionId: EntityId,
): World {
  const petition = eventById(world, petitionId);
  const personId = petition && petitionerOf(petition);
  if (
    petition?.type !== CLEMENCY_PETITION_EVENT ||
    !personId ||
    !world.people[personId]
  )
    return world;
  const dueAt = nextClemencyPetitionDueAt(world, petitionId);
  if (!dueAt) return world;
  const stableKey = `${PREFIX}${petitionId}:${dueAt}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: CLEMENCY_PETITION_TRANSITION_KEY,
    entityIds: [personId],
    jurisdictionId: petition.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [personId] },
  });
}

export const clemencyPetitionHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const suffix = item.stableKey.startsWith(PREFIX)
    ? item.stableKey.slice(PREFIX.length)
    : "";
  const petitionId = suffix.slice(0, suffix.lastIndexOf(":")) as EntityId;
  const petition = eventById(world, petitionId);
  const personId = petition && petitionerOf(petition);
  if (
    petition?.type !== CLEMENCY_PETITION_EVENT ||
    !personId ||
    !item.entityIds.includes(personId)
  )
    return {
      world,
      status: "cancelled",
      reasonKey: "justice:missing-clemency-petition",
      context: "The saved petition or its actual petitioner is unavailable.",
      outcomeEventId: null,
    };
  if (clemencyPetitionStatus(world, petitionId) !== "open")
    return {
      world,
      status: "resolved",
      reasonKey: "justice:clemency-already-closed",
      context: "The saved petition already has an actual closing record.",
      outcomeEventId: null,
    };
  const advanced = advanceClemencyPetition(world, petitionId);
  const latest = advanced.history.events.at(-1);
  return {
    world: advanced,
    status: "resolved",
    reasonKey:
      advanced.history.events.length === world.history.events.length
        ? "justice:clemency-pending"
        : "justice:clemency-reviewed",
    context: "The saved petition was reviewed at its existing writer boundary.",
    outcomeEventId:
      advanced.history.events.length === world.history.events.length
        ? null
        : (latest?.id ?? null),
  };
};

export function createClemencyTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [CLEMENCY_PETITION_TRANSITION_KEY, clemencyPetitionHandler],
  ]);
}
