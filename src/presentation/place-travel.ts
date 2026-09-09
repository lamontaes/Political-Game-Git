import {
  addSimulationMinutes,
  canPersonAccess,
  createScheduledActivity,
  performScheduledActivity,
  recordWorldEvent,
  scheduledActivityState,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";

/** Versioned route-provider result. Durations are explicit scenario authoring
 * or sourced observations, never distance estimates or defaults. A provider
 * must establish endpoint identity and access separately from scene art.
 */
export interface PlaceTravelRoute {
  readonly version: 1;
  readonly id: string;
  readonly origin: {
    readonly key: string;
    readonly label: string;
    readonly jurisdictionId: EntityId | null;
    readonly setting: string;
  };
  readonly destination: {
    readonly key: string;
    readonly label: string;
    readonly jurisdictionId: EntityId | null;
    readonly setting: string;
  };
  readonly duration: {
    readonly minutes: number;
    readonly basis: "authored-scenario" | "source-observation";
    readonly evidence: string;
  };
  readonly originEventId: EntityId;
  readonly participantPersonIds: readonly EntityId[];
}

export type PlaceTravelOffer =
  | { readonly kind: "available"; readonly route: PlaceTravelRoute }
  | { readonly kind: "unavailable"; readonly reason: string };
export type PlaceTravelProvider = (
  world: World,
  personId: EntityId,
  destinationKey: string,
) => PlaceTravelOffer;

/** Explicit action only: schedule travel, perform its interval, then record
 * arrival. Failed preconditions/commitments return the original World. The
 * provider is rechecked after time passes so changed eligibility cannot arrive.
 */
export function travelToPlace(
  world: World,
  personId: EntityId,
  destinationKey: string,
  provider: PlaceTravelProvider,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return world;
  const offer = provider(world, personId, destinationKey);
  if (offer.kind !== "available") return world;
  const route = offer.route;
  if (
    route.version !== 1 ||
    !route.id.trim() ||
    route.destination.key !== destinationKey ||
    route.origin.key === route.destination.key ||
    !route.origin.key.trim() ||
    !route.destination.key.trim() ||
    !route.origin.label.trim() ||
    !route.destination.label.trim() ||
    !route.origin.setting.trim() ||
    !route.destination.setting.trim() ||
    !Number.isSafeInteger(route.duration.minutes) ||
    route.duration.minutes <= 0 ||
    !["authored-scenario", "source-observation"].includes(
      route.duration.basis,
    ) ||
    !route.duration.evidence.trim() ||
    !route.participantPersonIds.includes(personId) ||
    new Set(route.participantPersonIds).size !==
      route.participantPersonIds.length ||
    route.participantPersonIds.some(
      (id) =>
        !world.people[id] ||
        world.history.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= world.currentDate,
        ),
    )
  )
    return world;
  const origin = world.history.events.find(
    (event) => event.id === route.originEventId,
  );
  const latestPlaceEvent = world.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.participants.some((entry) => entry.personId === personId),
    )
    .at(-1);
  if (
    !origin ||
    origin.id !== latestPlaceEvent?.id ||
    origin.context.location?.label !== route.origin.label ||
    !origin.participants.some((entry) => entry.personId === personId) ||
    origin.context.location?.jurisdictionId !== route.origin.jurisdictionId ||
    origin.context.location?.setting !== route.origin.setting ||
    origin.occurredAt > world.currentDate
  )
    return world;
  const access = {
    kind: "private" as const,
    personIds: [...route.participantPersonIds],
  };
  if (!canPersonAccess(access, personId)) return world;
  const stableKey = `place-travel:${personId}:${route.id}:${world.history.nextSequence}`;
  let scheduled: World;
  try {
    scheduled = createScheduledActivity(world, {
      stableKey,
      title: `Travel to ${route.destination.label}`,
      summary: route.duration.evidence,
      kind: "travel",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, route.duration.minutes),
      participantPersonIds: [...route.participantPersonIds],
      responsiblePersonId: personId,
      location: {
        locationKey: `journey:${route.id}`,
        label: `${route.origin.label} to ${route.destination.label}`,
        jurisdictionId: route.origin.jurisdictionId,
      },
      sourceEntityIds: [origin.id],
      flexibility: { kind: "fixed" },
      access,
    });
  } catch {
    return world;
  }
  const activity = scheduled.history.scheduledActivities.at(-1)!;
  const next = performScheduledActivity(scheduled, activity.id, handlers);
  if (next === scheduled) return world;
  const state = scheduledActivityState(next, activity.id);
  if (state.status !== "completed") return next;
  const rechecked = provider(next, personId, destinationKey);
  if (
    rechecked.kind !== "available" ||
    JSON.stringify(rechecked.route) !== JSON.stringify(route)
  )
    return next;
  return recordWorldEvent(next, {
    stableKey: `${stableKey}:arrival`,
    type: "life.scene.arrived",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: route.destination.jurisdictionId,
    involvedEntityIds: [activity.id, ...route.participantPersonIds],
    participants: route.participantPersonIds.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: `Arrived at ${route.destination.label}`,
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "place-travel-v1",
      `route:${route.id}`,
      `place:${route.destination.key}`,
      `duration-basis:${route.duration.basis}`,
    ],
    summary: `Arrived at ${route.destination.label}.`,
    context: {
      location: {
        jurisdictionId: route.destination.jurisdictionId,
        label: route.destination.label,
        setting: route.destination.setting,
      },
      socialContext: null,
      pressure: null,
      choice: "Travel to the selected place",
      motivation: null,
      immediateReaction: null,
    },
  });
}
