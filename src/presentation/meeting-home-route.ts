import {
  ageOnDate,
  canPersonAccess,
  householdMembershipsAt,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type World,
} from "../simulation";
import type { PlaceTravelOffer } from "./place-travel";

/** Reciprocal leg of the existing authored local-meeting scenario only.
 * It is not a rule that transit routes, fares or arbitrary venues are reversible.
 * The canonical outward leg and unchanged home identify this route in older
 * saves too; a missing/ambiguous endpoint leaves it unavailable.
 */
export function meetingHomeRoute(
  world: World,
  personId: EntityId,
): PlaceTravelOffer {
  return resolveMeetingHomeRoute(world, personId, false);
}

/** Pure disclosure for an explicit early departure. The action must cancel
 * the meeting before travel; merely inspecting this offer creates no records. */
export function meetingDepartureRoute(
  world: World,
  personId: EntityId,
): PlaceTravelOffer {
  return resolveMeetingHomeRoute(world, personId, true);
}

function resolveMeetingHomeRoute(
  world: World,
  personId: EntityId,
  allowScheduled: boolean,
): PlaceTravelOffer {
  const unavailable = (reason: string): PlaceTravelOffer => ({
    kind: "unavailable",
    reason,
  });
  const person = world.people[personId];
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !person ||
    ageOnDate(person.birthDate, world.currentDate) < 18 ||
    world.history.personDeaths.some(
      (entry) =>
        entry.personId === personId && entry.diedAt <= world.currentDate,
    )
  )
    return unavailable("There is no way home from here yet.");
  const origin = world.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.occurredAt <= world.currentDate &&
        event.participants.some((entry) => entry.personId === personId),
    )
    .at(-1);
  if (
    !origin?.context.location ||
    !origin.tags.includes("route:ordinary-life:to-meeting-room") ||
    !origin.tags.includes("place:ordinary-life:meeting-room")
  )
    return unavailable("There is no way home from here yet.");
  const meetings = world.history.scheduledActivities.filter(
    (activity) =>
      origin.involvedEntityIds.includes(activity.id) &&
      activity.location.locationKey === "ordinary-life:meeting-room" &&
      activity.responsiblePersonId === personId &&
      canPersonAccess(activity.access, personId) &&
      (allowScheduled
        ? ["scheduled", "completed", "cancelled"]
        : ["completed", "cancelled"]
      ).includes(scheduledActivityState(world, activity.id).status),
  );
  if (meetings.length !== 1)
    return unavailable("There is no way home from here yet.");
  const meeting = meetings[0]!;
  const lateArrival = origin.tags.includes("travel:late-meeting");
  const journeys = world.history.scheduledActivities.filter(
    (activity) =>
      origin.involvedEntityIds.includes(activity.id) &&
      activity.kind === "travel" &&
      activity.location.locationKey === "ordinary-life:to-meeting-room" &&
      activity.sourceEntityIds.includes(meeting.id) &&
      activity.responsiblePersonId === personId &&
      canPersonAccess(activity.access, personId) &&
      scheduledActivityState(world, activity.id).status ===
        (lateArrival ? "cancelled" : "completed"),
  );
  if (journeys.length !== 1)
    return unavailable("There is no way home from here yet.");
  const journey = journeys[0]!;
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (homes.length !== 1 || !homes[0]!.location)
    return unavailable("There is no way home from here yet.");
  const home = homes[0]!;
  const location = home.location!;
  if (
    location.jurisdictionId !== meeting.location.jurisdictionId ||
    location.sequence > journey.sequence ||
    home.state.sequence > journey.sequence
  )
    return unavailable(
      "You have moved since you arranged this trip, so the way home has to be planned again.",
    );
  const homeOrigin = world.history.events.find(
    (event) =>
      event.sequence < origin.sequence &&
      event.context.location?.setting === "home" &&
      event.context.location.jurisdictionId === location.jurisdictionId &&
      event.participants.some((entry) => entry.personId === personId),
  );
  if (!homeOrigin) return unavailable("There is no way home from here yet.");
  const state = scheduledActivityState(world, journey.id);
  const minutes = simulationMinutesBetween(state.start, state.end);
  if (!Number.isSafeInteger(minutes) || minutes <= 0)
    return unavailable("There is no way home from here yet.");
  if (lateArrival && !origin.tags.includes(`duration-minutes:${minutes}`))
    return unavailable("There is no way home from here yet.");
  return {
    kind: "available",
    route: {
      version: 1,
      id: `local-meeting-home-v1:${journey.id}:${home.household.id}:${origin.id}`,
      origin: {
        key: meeting.location.locationKey!,
        label: origin.context.location.label,
        jurisdictionId: origin.context.location.jurisdictionId,
        setting: origin.context.location.setting!,
      },
      destination: {
        key: "home",
        label: "Home",
        jurisdictionId: location.jurisdictionId,
        setting: "home",
      },
      duration: {
        minutes,
        basis: "authored-scenario",
        evidence:
          "Return leg of the same authored local meeting route, using its recorded outward duration and home endpoint. Travel cost is not represented; no fare is charged.",
      },
      originEventId: origin.id,
      participantPersonIds: [personId],
    },
  };
}
