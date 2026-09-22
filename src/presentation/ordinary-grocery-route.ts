import {
  ageOnDate,
  householdMembershipsAt,
  scheduledActivityState,
  simulationMinutesBetween,
  workPendingEntriesFor,
  type EntityId,
  type World,
} from "../simulation";
import { HOUSEHOLD_ERRANDS_KEY } from "../simulation/life-opportunities";
import type { PlaceTravelOffer, PlaceTravelProvider } from "./place-travel";

export const ORDINARY_GROCERY_DESTINATION = "grocery";
export const ORDINARY_GROCERY_LABEL = "Local grocery store";
const ROUTE_VERSION = "ordinary-grocery-v1";
const WALK_MINUTES = 15;

/** A scoped fictional optional stop, not a source-derived business, employer,
 * distance or purchase. Existing errands are still unfinished on arrival.
 * Only the explicit travel writer can establish this venue's physical arrival.
 */
export const ordinaryGroceryRoute: PlaceTravelProvider = (
  world,
  personId,
  destination,
) => {
  const refuse = (reason: string): PlaceTravelOffer => ({
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
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return refuse("This stop is not available to this person.");
  const homes = householdMembershipsAt(world, personId).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (homes.length !== 1 || !homes[0]!.location)
    return refuse("The home endpoint is not established.");
  const home = homes[0]!,
    location = home.location!;
  const origin = world.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.occurredAt <= world.currentDate &&
        event.participants.some((actor) => actor.personId === personId),
    )
    .at(-1);
  if (
    !origin?.context.location?.setting ||
    origin.context.location.jurisdictionId !== location.jurisdictionId ||
    person.homeJurisdictionId !== location.jurisdictionId
  )
    return refuse("No compatible current place is established.");
  const routeIdentity = `${ROUTE_VERSION}:${personId}:${home.household.id}:${location.id}:${home.state.id}`;
  const returning = destination === "home";
  if (destination !== ORDINARY_GROCERY_DESTINATION && !returning)
    return refuse("This route serves the grocery stop and home.");
  const thisJourneyKey = `journey:${returning ? `${routeIdentity}:home:${origin.id}` : routeIdentity}`;
  const otherTravelSince = world.history.scheduledActivities.some(
    (activity) =>
      activity.kind === "travel" &&
      activity.participantPersonIds.includes(personId) &&
      activity.location.locationKey !== thisJourneyKey &&
      scheduledActivityState(world, activity.id).status === "completed" &&
      scheduledActivityState(world, activity.id).sequence > origin.sequence,
  );
  if (otherTravelSince)
    return refuse("A later journey has not established a new place.");
  let minutes = WALK_MINUTES;
  if (returning) {
    if (
      origin.context.location.setting !== "grocery" ||
      !origin.tags.includes(`route:${routeIdentity}`) ||
      !origin.tags.includes("place:grocery")
    )
      return refuse("No return from this grocery stop is recorded.");
    const journeys = world.history.scheduledActivities.filter(
      (activity) =>
        origin.involvedEntityIds.includes(activity.id) &&
        activity.kind === "travel" &&
        activity.responsiblePersonId === personId &&
        activity.location.locationKey === `journey:${routeIdentity}` &&
        scheduledActivityState(world, activity.id).status === "completed",
    );
    if (journeys.length !== 1)
      return refuse("The outward journey is not established.");
    const journey = journeys[0]!,
      state = scheduledActivityState(world, journey.id);
    if (
      location.sequence > journey.sequence ||
      home.state.sequence > journey.sequence
    )
      return refuse("Your home changed after this route was arranged.");
    minutes = simulationMinutesBetween(state.start, state.end);
    if (!Number.isSafeInteger(minutes) || minutes <= 0)
      return refuse("The return duration is not established.");
  } else {
    if (origin.context.location.setting !== "home")
      return refuse("This local stop starts from home.");
    const errand = workPendingEntriesFor(world, personId).find(
      (entry) =>
        entry.item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY) &&
        entry.state.assignedPersonIds.includes(personId) &&
        entry.state.status !== "completed",
    );
    if (!errand)
      return refuse("No current household grocery errand is recorded.");
  }
  return {
    kind: "available",
    route: {
      version: 1,
      id: returning ? `${routeIdentity}:home:${origin.id}` : routeIdentity,
      origin: {
        key: returning ? "grocery" : "home",
        label: origin.context.location.label,
        jurisdictionId: location.jurisdictionId,
        setting: origin.context.location.setting,
      },
      destination: {
        key: destination,
        label: returning ? "Home" : ORDINARY_GROCERY_LABEL,
        jurisdictionId: location.jurisdictionId,
        setting: returning ? "home" : "grocery",
      },
      duration: {
        minutes,
        basis: "authored-scenario",
        evidence: `A ${minutes}-minute walk on the authored local grocery route. Visiting does not buy groceries or complete the household errand.`,
      },
      originEventId: origin.id,
      participantPersonIds: [personId],
    },
  };
};

/** Current canonical arrival for signage/detail consumers, never a visit writer. */
export function currentGroceryArrival(world: World, personId: EntityId) {
  const latest = world.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.occurredAt <= world.currentDate &&
        event.participants.some((actor) => actor.personId === personId),
    )
    .at(-1);
  if (
    latest &&
    world.history.scheduledActivities.some(
      (activity) =>
        activity.kind === "travel" &&
        activity.participantPersonIds.includes(personId) &&
        scheduledActivityState(world, activity.id).status === "completed" &&
        scheduledActivityState(world, activity.id).sequence > latest.sequence,
    )
  )
    return null;
  return latest?.context.location?.setting === "grocery" &&
    latest.tags.includes("place:grocery") &&
    latest.tags.some((tag) =>
      tag.startsWith(`route:${ROUTE_VERSION}:${personId}:`),
    )
    ? latest
    : null;
}
