import { addDays } from "../dates";
import { eventById } from "../event-index";
import {
  scheduleFutureDueItem,
  createFutureTransitionHandlerRegistry,
} from "../future-transitions";
import type {
  EntityId,
  HistoricalEvent,
  FutureTransitionHandler,
  World,
} from "../types";
import { advanceProsecutions, PROSECUTION_REFERRED_EVENT } from "./prosecution";
import { REFERRAL_TAG } from "./jail-terms";

export const PROSECUTION_STAGE_TRANSITION_KEY = "justice:prosecution-stage";

/** Explicit opening/load recovery at today's date; never backdates a deadline. */
export function recoverOverdueProsecutions(world: World): World {
  return advanceProsecutions(world);
}

/** A saved case stage supplies the deadline; no clock or timing rule is invented. */
export function ensureProsecutionStageSchedule(
  world: World,
  stage: HistoricalEvent,
  referralId: EntityId,
  delayDays: number,
): World {
  const referral = eventById(world, referralId);
  if (
    referral?.type !== PROSECUTION_REFERRED_EVENT ||
    (stage.id !== referralId &&
      !stage.tags.includes(`${REFERRAL_TAG}${referralId}`))
  )
    return world;
  const stableKey = `justice:prosecution-stage:${stage.id}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  const subjectId = stage.participants.find(
    (participant) =>
      participant.role === "focus:subject" ||
      participant.role === "focus:defendant",
  )?.personId;
  if (
    !subjectId ||
    !world.people[subjectId] ||
    eventById(world, stage.id) !== stage
  )
    return world;
  const dueAt = addDays(stage.occurredAt, delayDays);
  if (dueAt <= world.currentDate) return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: PROSECUTION_STAGE_TRANSITION_KEY,
    entityIds: [subjectId],
    jurisdictionId: stage.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [subjectId] },
  });
}

export const prosecutionStageHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const stageId = item.stableKey.slice(
    "justice:prosecution-stage:".length,
  ) as EntityId;
  const stage = eventById(world, stageId);
  const referralId =
    stage?.type === PROSECUTION_REFERRED_EVENT
      ? stage.id
      : (stage?.tags
          .find((tag) => tag.startsWith(REFERRAL_TAG))
          ?.slice(REFERRAL_TAG.length) as EntityId | undefined);
  const subjectId = stage?.participants.find(
    (participant) =>
      participant.role === "focus:subject" ||
      participant.role === "focus:defendant",
  )?.personId;
  if (
    !stage ||
    !referralId ||
    !subjectId ||
    !item.entityIds.includes(subjectId)
  )
    return {
      world,
      status: "cancelled",
      reasonKey: "justice:missing-case-stage",
      context: "The saved case stage or its actual defendant is unavailable.",
      outcomeEventId: null,
    };
  const advanced = advanceProsecutions(world, referralId);
  const latest = advanced.history.events.at(-1);
  return {
    world: advanced,
    status: "resolved",
    reasonKey:
      advanced === world
        ? "justice:case-stage-pending"
        : "justice:case-stage-reviewed",
    context:
      advanced === world
        ? "The due review produced no new case stage; the saved case remains pending for an actual bench change or explicit recovery boundary."
        : "The saved prosecution stage was reviewed on its own due date.",
    outcomeEventId: advanced === world ? null : (latest?.id ?? null),
  };
};

export function createProsecutionTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [PROSECUTION_STAGE_TRANSITION_KEY, prosecutionStageHandler],
  ]);
}
