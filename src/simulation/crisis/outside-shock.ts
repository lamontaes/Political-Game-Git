import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { crisisRecords } from "./records";
import { internationalCrisisState } from "./international";
import type { InternationalCrisisRecord } from "./types";

export const OUTSIDE_SHOCK_EVENT_TAG = "crisis.outside-shock";
export const OUTSIDE_SHOCK_ONSET_PHASE = "outside-shock:onset";
export const OUTSIDE_SHOCK_LASTING_PHASE = "outside-shock:lasting";
export const OUTSIDE_SHOCK_ENDED_PHASE = "outside-shock:ended";
export const OUTSIDE_SHOCK_LIFECYCLE_VERSION = "outside-shock-lifecycle-v1";

function outsidePressure(world: World): {
  count: number;
  sourceIds: EntityId[];
} {
  const active = crisisRecords(world).filter(
    (record): record is InternationalCrisisRecord => {
      if (record.kind !== "international-crisis") return false;
      const state = internationalCrisisState(world, record.id);
      return (
        !state.ended &&
        (state.tension === "high" ||
          state.tension === "severe" ||
          state.forcesIn)
      );
    },
  );
  return {
    count: active.length,
    sourceIds: active
      .flatMap((crisis) => (crisis.eventId ? [crisis.eventId] : []))
      .sort(),
  };
}

function latestShockEvent(world: World) {
  return world.history.events
    .filter((event) => event.tags.includes(OUTSIDE_SHOCK_EVENT_TAG))
    .at(-1);
}

export function reconcileOutsidePressureIncident(world: World): World {
  const pressure = outsidePressure(world);
  const prior = latestShockEvent(world);
  const priorPhase = prior?.tags.find((tag) =>
    [
      OUTSIDE_SHOCK_ONSET_PHASE,
      OUTSIDE_SHOCK_LASTING_PHASE,
      OUTSIDE_SHOCK_ENDED_PHASE,
    ].includes(tag),
  );
  const active =
    priorPhase === OUTSIDE_SHOCK_ONSET_PHASE ||
    priorPhase === OUTSIDE_SHOCK_LASTING_PHASE;
  const phase =
    pressure.count > 0
      ? active
        ? priorPhase === OUTSIDE_SHOCK_ONSET_PHASE
          ? OUTSIDE_SHOCK_LASTING_PHASE
          : null
        : OUTSIDE_SHOCK_ONSET_PHASE
      : active
        ? OUTSIDE_SHOCK_ENDED_PHASE
        : null;
  if (!phase) return world;

  const sourceIds =
    phase === OUTSIDE_SHOCK_ENDED_PHASE
      ? (prior?.context.pressure?.match(/event_[a-z0-9]+/g) ?? [])
      : pressure.sourceIds;
  const summary =
    phase === OUTSIDE_SHOCK_ONSET_PHASE
      ? `A lasting outside shock began as ${pressure.count} recorded international crisis${pressure.count === 1 ? "" : "es"} crossed into high tension or deployed U.S. forces.`
      : phase === OUTSIDE_SHOCK_LASTING_PHASE
        ? "The outside shock continued as recorded foreign tension or deployed U.S. forces kept pressure high."
        : "The outside shock ended after recorded foreign tension fell and U.S. forces withdrew.";
  const next = recordWorldEvent(world, {
    stableKey: `${OUTSIDE_SHOCK_LIFECYCLE_VERSION}:${world.currentDate}:${world.history.nextSequence}:${phase}`,
    type: "crisis.international-incident",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0] ?? null,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      OUTSIDE_SHOCK_EVENT_TAG,
      "crisis.international",
      phase,
      `outside-pressure-count:${pressure.count}`,
    ],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: `Recorded crisis event source(s): ${sourceIds.join(", ") || "none"}`,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  assertWorldIntegrity(next);
  return next;
}

export function outsideShockResponseHandler(
  world: World,
  item: FutureDueItem,
  underlying: (
    world: World,
    item: FutureDueItem,
  ) => FutureTransitionHandlerResult,
): FutureTransitionHandlerResult {
  const result = underlying(world, item);
  return { ...result, world: reconcileOutsidePressureIncident(result.world) };
}
