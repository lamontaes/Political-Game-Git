import {
  canPersonAccess,
  advanceWorldMinutes,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  performScheduledActivity,
  recordWorldEvent,
  scheduledActivitiesVisibleTo,
  scheduledActivityPerformanceTiming,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { recordDomainAttendance } from "./activity-attendance";
import { openingLifeLocation } from "./life-scene-flow";
import { sceneVenueForLocationKey } from "./scene-venues";

export {
  declineVenueActivity,
  lapseVenueActivity,
} from "./scheduled-activity-choice";

interface DisclosedJourney {
  readonly activity: ScheduledActivityRecord;
  readonly journeyMinutes: number;
  readonly waitMinutes: number;
  readonly costDisclosure: string;
  readonly destinationSetting: string;
}

/**
 * Authored route adapters, never guesses from similar-looking names.
 *
 * The current World has no fare model for this route. Saying so is important:
 * a displayed zero would be a fabricated price, while silently omitting cost
 * would make the commitment look cheaper than the rules can establish.
 */
const ATTEND_JOURNEYS = [
  {
    journeyLocationKey: "ordinary-life:to-meeting-room",
    destinationLocationKey: "ordinary-life:meeting-room",
    destinationSetting: "community room",
    costDisclosure:
      "Travel cost is not represented for this game-authored local route; no fare will be charged.",
  },
  {
    journeyLocationKey: "office-to-east-end",
    destinationLocationKey: "east-end-community-room",
    destinationSetting: "community room",
    costDisclosure:
      "Travel cost is not represented for this authored route; no fare will be charged.",
  },
] as const;

function disclosedJourneyFor(
  world: World,
  personId: EntityId,
  destination: ScheduledActivityRecord,
): DisclosedJourney | null {
  const adapter = ATTEND_JOURNEYS.find(
    (candidate) =>
      candidate.destinationLocationKey === destination.location.locationKey,
  );
  if (!adapter) return null;
  const destinationState = scheduledActivityState(world, destination.id);
  if (destinationState.status !== "scheduled") return null;
  const activity = scheduledActivitiesVisibleTo(world, personId).find(
    (candidate) => {
      if (
        candidate.kind !== "travel" ||
        candidate.location.locationKey !== adapter.journeyLocationKey ||
        candidate.responsiblePersonId !== personId ||
        !candidate.sourceEntityIds.includes(destination.id)
      )
        return false;
      const state = scheduledActivityState(world, candidate.id);
      return (
        state.status === "scheduled" &&
        compareSimulationMoments(state.end, destinationState.start) === 0
      );
    },
  );
  if (!activity) return null;
  const state = scheduledActivityState(world, activity.id);
  return {
    activity,
    journeyMinutes: simulationMinutesBetween(state.start, state.end),
    waitMinutes: simulationMinutesBetween(world.currentMoment, state.start),
    costDisclosure: adapter.costDisclosure,
    destinationSetting: adapter.destinationSetting,
  };
}

/**
 * Presence, recorded the same way whichever control the player pressed.
 *
 * The destination's own button performs the journey and the destination
 * together. The journey's own row is a separate control that performs only the
 * travel — and without this, that press left a completed journey behind with
 * no recorded arrival, so `openingLifeLocation` could not place the player and
 * the destination refused forever. Measured in Springfield, Illinois: a party
 * organizing meeting asked for, travelled to, and then permanently unkeepable.
 */
function recordJourneyArrival(
  world: World,
  travel: ScheduledActivityRecord,
  destination: ScheduledActivityRecord,
  destinationSetting: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `attend-journey:${travel.id}:arrival`,
    type: "life.scene.arrived",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: destination.location.jurisdictionId,
    involvedEntityIds: [
      travel.id,
      destination.id,
      ...travel.participantPersonIds,
    ],
    participants: travel.participantPersonIds.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: `Arrived at ${destination.location.label}`,
    })),
    personFactConstraints: [],
    visibility: destination.access.kind === "office" ? "limited" : "private",
    tags: [
      "attend-journey-v1",
      `route:${travel.location.locationKey}`,
      `place:${destination.location.locationKey}`,
      "cost:not-represented",
    ],
    summary: `Arrived at ${destination.location.label}.`,
    context: {
      location: {
        jurisdictionId: destination.location.jurisdictionId,
        label: destination.location.label,
        setting: destinationSetting,
      },
      socialContext: null,
      pressure: null,
      choice: `Attend ${destination.title}`,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * The destination a journey was booked for, when that journey has been made on
 * its own. Same adapter table, read from the travel side.
 */
function arrivedDestinationFor(
  world: World,
  personId: EntityId,
  travel: ScheduledActivityRecord,
) {
  const adapter = ATTEND_JOURNEYS.find(
    (candidate) => candidate.journeyLocationKey === travel.location.locationKey,
  );
  if (!adapter) return null;
  const destination = scheduledActivitiesVisibleTo(world, personId).find(
    (candidate) =>
      travel.sourceEntityIds.includes(candidate.id) &&
      candidate.location.locationKey === adapter.destinationLocationKey &&
      scheduledActivityState(world, candidate.id).status === "scheduled",
  );
  if (!destination) return null;
  return { destination, destinationSetting: adapter.destinationSetting };
}

/** A player action over existing scheduled activity truth; no separate clock. */
export function venueActivities(
  world: World,
  personId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
) {
  return scheduledActivitiesVisibleTo(world, personId)
    .filter((activity) =>
      sceneVenueForLocationKey(activity.location.locationKey),
    )
    .filter(
      (activity) =>
        scheduledActivityState(world, activity.id).status === "scheduled",
    )
    .map((activity) => {
      let refusal: string | null = null;
      let elapsedMinutes: number | null = null;
      // Set only where the game itself has no way to let this be carried out,
      // which is what makes it safe to offer giving it up. A commitment the
      // player could keep and simply does not want to is not this.
      let unperformable = false;
      const journey =
        activity.kind === "travel"
          ? null
          : disclosedJourneyFor(world, personId, activity);
      if (
        world.control.kind !== "person" ||
        world.control.personId !== personId ||
        activity.responsiblePersonId !== personId
      ) {
        refusal = "This activity is not yours to carry out.";
      } else {
        try {
          elapsedMinutes = scheduledActivityPerformanceTiming(
            world,
            activity.id,
          ).totalElapsedMinutes;
          const blockers = controlledCommitmentsBlockingActivityPerformance(
            world,
            activity.id,
          ).filter(
            (id) =>
              id !== journey?.activity.id &&
              !transitionHandlers.routine?.isAutoResolvableActivity(world, id),
          );
          if (blockers.length)
            refusal = "An earlier commitment must be resolved first.";
          if (!refusal && activity.kind !== "travel" && !journey) {
            const origin = openingLifeLocation(world, personId);
            if (!origin) {
              refusal = `The current location is not recorded, so the game cannot establish a journey to ${activity.location.label}.`;
              unperformable = true;
            } else if (origin.label !== activity.location.label) {
              refusal = `No authored journey connects ${origin.label} to ${activity.location.label}. The supported office-to-East-End route does not establish this distance, time, or cost.`;
              unperformable = true;
            }
          }
        } catch (error) {
          refusal =
            error instanceof Error
              ? error.message
              : "This activity cannot be performed now.";
        }
      }
      return {
        activity,
        elapsedMinutes,
        refusal,
        journey,
        declinable:
          activity.kind === "tentative" &&
          world.control.kind === "person" &&
          world.control.personId === personId &&
          activity.participantPersonIds.includes(personId),
        /**
         * A commitment the game cannot let this player carry out, which they
         * may therefore give up. Time will not step over a confirmed
         * commitment, so without this a life that books one has no legal move
         * left. See `abandonUnperformableCommitment`.
         */
        abandonable:
          unperformable &&
          activity.kind !== "tentative" &&
          activity.kind !== "travel" &&
          world.control.kind === "person" &&
          world.control.personId === personId &&
          activity.responsiblePersonId === personId,
      };
    });
}

export interface PerformVenueActivityOptions {
  /**
   * How a domain that booked the activity records it once it completes.
   * "condensed" produces the same outcome with less of the evening shown.
   */
  readonly attendance?: "attended" | "condensed";
}

export function performVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
  options?: PerformVenueActivityOptions,
): World {
  const attendance = options?.attendance ?? "attended";
  const entry = venueActivities(world, personId, transitionHandlers).find(
    ({ activity }) => activity.id === activityId,
  );
  if (
    !entry ||
    entry.refusal ||
    !canPersonAccess(entry.activity.access, personId)
  )
    return world;
  const journey = entry.journey;
  if (!journey) {
    const start = scheduledActivityState(world, activityId).start;
    const waitMinutes = simulationMinutesBetween(world.currentMoment, start);
    const waited =
      waitMinutes > 0
        ? advanceWorldMinutes(world, waitMinutes, transitionHandlers)
        : world;
    if (compareSimulationMoments(waited.currentMoment, start) < 0)
      return waited;
    // Domain hook: a completed party/campaign activity records its outcome;
    // every other activity (including a bare journey) comes back unchanged.
    const performed = recordDomainAttendance(
      performScheduledActivity(waited, activityId, transitionHandlers),
      personId,
      activityId,
      attendance,
    );
    if (entry.activity.kind !== "travel") return performed;
    if (scheduledActivityState(performed, activityId).status !== "completed")
      return performed;
    const arrived = arrivedDestinationFor(performed, personId, entry.activity);
    if (!arrived) return performed;
    return recordJourneyArrival(
      performed,
      entry.activity,
      arrived.destination,
      arrived.destinationSetting,
    );
  }

  // Resolve the legitimate ordinary windows crossed while waiting to depart.
  // A protected interruption returns the partial World, never false arrival.
  const waited =
    journey.waitMinutes > 0
      ? advanceWorldMinutes(world, journey.waitMinutes, transitionHandlers)
      : world;
  if (
    compareSimulationMoments(
      waited.currentMoment,
      scheduledActivityState(world, journey.activity.id).start,
    ) < 0
  )
    return waited;
  const travelled = performScheduledActivity(
    waited,
    journey.activity.id,
    transitionHandlers,
  );
  if (travelled === world) return world;
  if (
    scheduledActivityState(travelled, journey.activity.id).status !==
    "completed"
  )
    return travelled;

  const arrived = recordJourneyArrival(
    travelled,
    journey.activity,
    entry.activity,
    journey.destinationSetting,
  );

  const refreshed = venueActivities(arrived, personId).find(
    ({ activity }) => activity.id === activityId,
  );
  if (
    !refreshed ||
    refreshed.refusal !== null ||
    scheduledActivityState(arrived, activityId).status !== "scheduled" ||
    !canPersonAccess(refreshed.activity.access, personId)
  )
    return arrived;
  // Domain hook: once the destination itself has completed, the domain that
  // booked it (a party/campaign activity) records what happened there. A
  // no-op, returning the same World, for every other activity.
  return recordDomainAttendance(
    performScheduledActivity(arrived, activityId, transitionHandlers),
    personId,
    activityId,
    attendance,
  );
}
