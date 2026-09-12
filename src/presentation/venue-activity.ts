import {
  canPersonAccess,
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
import { openingLifeLocation } from "./life-scene-flow";
import { sceneVenueForLocationKey } from "./scene-venues";

export { declineVenueActivity } from "./scheduled-activity-choice";

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

/** A player action over existing scheduled activity truth; no separate clock. */
export function venueActivities(world: World, personId: EntityId) {
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
          ).filter((id) => id !== journey?.activity.id);
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
          activity.participantPersonIds.includes(personId),
      };
    });
}

export function performVenueActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const entry = venueActivities(world, personId).find(
    ({ activity }) => activity.id === activityId,
  );
  if (
    !entry ||
    entry.refusal ||
    !canPersonAccess(entry.activity.access, personId)
  )
    return world;
  const journey = entry.journey;
  if (!journey)
    return performScheduledActivity(world, activityId, transitionHandlers);

  const travelled = performScheduledActivity(
    world,
    journey.activity.id,
    transitionHandlers,
  );
  if (travelled === world) return world;
  if (
    scheduledActivityState(travelled, journey.activity.id).status !==
    "completed"
  )
    return travelled;

  const arrived = recordWorldEvent(travelled, {
    stableKey: `attend-journey:${journey.activity.id}:arrival`,
    type: "life.scene.arrived",
    occurredAt: travelled.currentDate,
    recordedAt: travelled.currentDate,
    jurisdictionId: entry.activity.location.jurisdictionId,
    involvedEntityIds: [
      journey.activity.id,
      entry.activity.id,
      ...journey.activity.participantPersonIds,
    ],
    participants: journey.activity.participantPersonIds.map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: `Arrived at ${entry.activity.location.label}`,
    })),
    personFactConstraints: [],
    visibility: entry.activity.access.kind === "office" ? "limited" : "private",
    tags: [
      "attend-journey-v1",
      `route:${journey.activity.location.locationKey}`,
      `place:${entry.activity.location.locationKey}`,
      "cost:not-represented",
    ],
    summary: `Arrived at ${entry.activity.location.label}.`,
    context: {
      location: {
        jurisdictionId: entry.activity.location.jurisdictionId,
        label: entry.activity.location.label,
        setting: journey.destinationSetting,
      },
      socialContext: null,
      pressure: null,
      choice: `Attend ${entry.activity.title}`,
      motivation: null,
      immediateReaction: null,
    },
  });

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
  return performScheduledActivity(arrived, activityId, transitionHandlers);
}
