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
import { completedActivityHere } from "./scene-venues";

export { declineVenueActivity } from "./scheduled-activity-choice";

export interface DisclosedJourney {
  readonly activity: ScheduledActivityRecord;
  readonly alreadyCompleted: boolean;
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
        (state.status === "scheduled" ||
          (state.status === "completed" &&
            completedActivityHere(world, personId, candidate.id) !== null)) &&
        compareSimulationMoments(state.end, destinationState.start) === 0
      );
    },
  );
  if (!activity) return null;
  const state = scheduledActivityState(world, activity.id);
  const alreadyCompleted = state.status === "completed";
  return {
    activity,
    alreadyCompleted,
    journeyMinutes: alreadyCompleted
      ? 0
      : simulationMinutesBetween(state.start, state.end),
    waitMinutes: alreadyCompleted
      ? 0
      : simulationMinutesBetween(world.currentMoment, state.start),
    costDisclosure: adapter.costDisclosure,
    destinationSetting: adapter.destinationSetting,
  };
}

/** A player action over existing scheduled activity truth; no separate clock. */
export function venueActivities(
  world: World,
  personId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
) {
  return scheduledActivitiesVisibleTo(world, personId)
    .filter(
      (activity) =>
        scheduledActivityState(world, activity.id).status === "scheduled" &&
        activity.participantPersonIds.includes(personId) &&
        (activity.responsiblePersonId === personId ||
          (activity.responsiblePersonId === null &&
            activity.kind === "tentative")),
    )
    .map((activity) => {
      let refusal: string | null = null;
      let elapsedMinutes: number | null = null;
      const journey =
        activity.kind === "travel"
          ? null
          : disclosedJourneyFor(world, personId, activity);
      if (
        world.control.kind !== "person" ||
        world.control.personId !== personId ||
        activity.responsiblePersonId !== personId
      ) {
        refusal =
          activity.responsiblePersonId === null
            ? "This invitation has not been confirmed as your activity."
            : "This activity is not yours to carry out.";
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
            } else if (origin.label !== activity.location.label) {
              refusal = `No authored journey connects ${origin.label} to ${activity.location.label}. The supported office-to-East-End route does not establish this distance, time, or cost.`;
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
          activity.participantPersonIds.includes(personId) &&
          (activity.responsiblePersonId === personId ||
            (activity.responsiblePersonId === null &&
              activity.participantPersonIds.length === 1)),
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
    // Calendar can play the travel leg separately from Attend. Only the same
    // explicit route adapter and linked destination may establish arrival.
    const destination =
      entry.activity.kind === "travel"
        ? scheduledActivitiesVisibleTo(world, personId).find(
            (candidate) =>
              candidate.responsiblePersonId === personId &&
              canPersonAccess(candidate.access, personId) &&
              disclosedJourneyFor(world, personId, candidate)?.activity.id ===
                activityId,
          )
        : undefined;
    const disclosed = destination
      ? disclosedJourneyFor(world, personId, destination)
      : null;
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
    const completed = recordDomainAttendance(
      performScheduledActivity(waited, activityId, transitionHandlers),
      personId,
      activityId,
      attendance,
    );
    return destination &&
      disclosed &&
      scheduledActivityState(completed, activityId).status === "completed" &&
      scheduledActivityState(completed, destination.id).status === "scheduled"
      ? recordJourneyArrival(
          completed,
          disclosed,
          destination,
          "Make the journey",
        )
      : completed;
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
  const travelled = journey.alreadyCompleted
    ? waited
    : performScheduledActivity(waited, journey.activity.id, transitionHandlers);
  if (
    scheduledActivityState(travelled, journey.activity.id).status !==
    "completed"
  )
    return travelled;

  const arrived = recordJourneyArrival(
    travelled,
    journey,
    entry.activity,
    `Attend ${entry.activity.title}`,
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

function recordJourneyArrival(
  travelled: World,
  journey: DisclosedJourney,
  destination: ScheduledActivityRecord,
  choice: string,
): World {
  return recordWorldEvent(travelled, {
    stableKey: `attend-journey:${journey.activity.id}:arrival`,
    type: "life.scene.arrived",
    occurredAt: travelled.currentDate,
    recordedAt: travelled.currentDate,
    jurisdictionId: destination.location.jurisdictionId,
    involvedEntityIds: [
      journey.activity.id,
      destination.id,
      ...journey.activity.participantPersonIds,
    ],
    participants: journey.activity.participantPersonIds.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: `Arrived at ${destination.location.label}`,
    })),
    personFactConstraints: [],
    visibility: destination.access.kind === "office" ? "limited" : "private",
    tags: [
      "attend-journey-v1",
      `route:${journey.activity.location.locationKey}`,
      `place:${destination.location.locationKey}`,
      "cost:not-represented",
    ],
    summary: `Arrived at ${destination.location.label}.`,
    context: {
      location: {
        jurisdictionId: destination.location.jurisdictionId,
        label: destination.location.label,
        setting: journey.destinationSetting,
      },
      socialContext: null,
      pressure: null,
      choice,
      motivation: null,
      immediateReaction: null,
    },
  });
}
