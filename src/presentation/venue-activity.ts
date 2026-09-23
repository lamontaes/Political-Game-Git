import { recordOrdinaryMeetingPresence } from "../simulation/ordinary-meeting-presence";
import {
  CAMPAIGN_LIFE_CATALOG,
  campaignActionForActivity,
  campaignWeeklyPlanForAction,
  canPersonAccess,
  advanceWorldMinutes,
  compareSimulationMoments,
  controlledCommitmentsBlockingActivityPerformance,
  performCampaignAction,
  performCampaignWeekSession,
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
import { CONTACT_LOCATION_KEY } from "../simulation/people-contact";
import { recordDomainAttendance } from "./activity-attendance";
import {
  openingLifeLocation,
  openingNeighborhoodWalkOffer,
} from "./life-scene-flow";
import { releaseMissedHolds } from "./scheduled-activity-choice";
import { completedActivityHere } from "./scene-venues";
import {
  recordSocialOccasionAttendance,
  SOCIAL_OCCASION_JOURNEY_KEY,
  SOCIAL_OCCASION_LOCATION_KEY,
} from "./social-invitation";

export {
  declineVenueActivity,
  lapseVenueActivity,
} from "./scheduled-activity-choice";

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
  {
    // An invitation the player accepted: the asker's home, a short trip away.
    journeyLocationKey: SOCIAL_OCCASION_JOURNEY_KEY,
    destinationLocationKey: SOCIAL_OCCASION_LOCATION_KEY,
    destinationSetting: "home",
    costDisclosure:
      "Travel cost is not represented for this short local trip; no fare will be charged.",
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

/**
 * Presence, recorded the same way whichever control the player pressed.
 *
 * The destination's own button performs the journey and the destination
 * together. The journey's own row is a separate control that performs only the
 * travel — and without this, that press left a completed journey behind with
 * no recorded arrival, so `openingLifeLocation` could not place the player and
 * the destination refused forever. Measured in Springfield, Illinois: a party
 * organizing meeting asked for, traveled to, and then permanently unkeepable.
 */
/**
 * `choice` is a parameter, from the client line, and must stay one. A journey
 * played on its own from the Calendar is the player choosing to make the
 * journey; writing "Attend <destination>" against their name there records a
 * decision they have not taken yet. Same mistake as a lapsed hold wearing a
 * refusal's clothes.
 */
function recordJourneyArrival(
  world: World,
  travel: ScheduledActivityRecord,
  destination: ScheduledActivityRecord,
  destinationSetting: string,
  choice: string,
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
      choice,
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
    .filter((activity) => {
      const state = scheduledActivityState(world, activity.id);
      if (state.status !== "scheduled") return false;
      if (!activity.participantPersonIds.includes(personId)) return false;
      /*
       * An optional hold whose time has gone stays "scheduled" in the record
       * when nothing lapsed it: it is still true that it was offered. It is
       * no longer something anyone can go to, though. A Nevada life eight
       * years in listed 104 past party meetings under Places, none of which
       * could be answered, and the page slowed with them. A confirmed
       * commitment is kept however late, because time will not step over it
       * and the player has to be able to resolve it.
       */
      if (
        activity.kind === "tentative" &&
        compareSimulationMoments(state.end, world.currentMoment) <= 0
      )
        return false;
      // Likewise a journey whose time to leave has gone: nobody can make it,
      // and a save may still hold ones time stepped past before they were
      // released (see `releaseMissedHolds`).
      if (
        activity.kind === "travel" &&
        compareSimulationMoments(state.start, world.currentMoment) < 0
      )
        return false;
      return (
        activity.responsiblePersonId === personId ||
        (activity.responsiblePersonId === null && activity.kind === "tentative")
      );
    })
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
          /*
           * A meeting two people arranged between themselves is held wherever
           * they meet; it names no venue to travel to, so it asks for no
           * journey. Before this, Attend on such a meeting compared the
           * player's home with the label "Arranged in person", found no route
           * between them, and did nothing (owner's playtest, 2026-09-22).
           */
          const metWhereverTheyMeet =
            activity.location.locationKey === CONTACT_LOCATION_KEY;
          /*
           * A phone shift is worked from home. Its label names no place to
           * travel to, so comparing labels refused it everywhere, at home
           * included. It needs the player to be home, and nothing else.
           */
          const workedFromHome =
            activity.location.locationKey ===
            CAMPAIGN_LIFE_CATALOG["phone-shift"].locationKey;
          /*
           * A campaign session — a field shift, a call session, an advertising
           * sign-off — is done where the campaign does it, by the campaign's
           * own writer, as the Campaigns tab has always done it. Its label
           * ("The campaign's call desk") names no place the game has a
           * journey to, so comparing labels refused every one of them and
           * left a confirmed hold nobody could keep: a mayoral run in
           * Eufaula, Alabama had no route to the call desk or to a field
           * shift. No travel is invented for it; it is performed in place.
           */
          const campaignAction = campaignActionForActivity(world, activity.id);
          if (!refusal && campaignAction) {
            const plan = campaignWeeklyPlanForAction(world, campaignAction.id);
            if (
              plan &&
              compareSimulationMoments(
                scheduledActivityState(world, activity.id).start,
                world.currentMoment,
              ) < 0
            )
              refusal =
                "The time for that session has already passed, so it can no longer be done as planned. Let it go from the campaign's week.";
          } else if (!refusal && workedFromHome) {
            const origin = openingLifeLocation(world, personId);
            if (origin?.setting !== "home") {
              refusal = `This is worked from home, and you are at ${origin?.label ?? "a place the game has not recorded"}.`;
              // Going home first keeps it. Only when there is no getting home
              // in time is it the dead end that giving it up exists for.
              unperformable =
                openingNeighborhoodWalkOffer(world, personId, "home")
                  .unavailable !== null;
            }
          } else if (
            !refusal &&
            activity.kind !== "travel" &&
            !journey &&
            !metWhereverTheyMeet
          ) {
            const origin = openingLifeLocation(world, personId);
            if (!origin) {
              refusal = `You have no way to get to ${activity.location.label} from where you are yet.`;
              unperformable = true;
            } else if (origin.label !== activity.location.label) {
              refusal = `You have no way to get from ${origin.label} to ${activity.location.label} yet.`;
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
          activity.participantPersonIds.includes(personId) &&
          // Kept from the client line: the offer to decline is shown only to
          // whoever owes the answer. See `declineVenueActivity`.
          (activity.responsiblePersonId === personId ||
            (activity.responsiblePersonId === null &&
              activity.participantPersonIds.length === 1)),
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
  const performed = performVenueActivityOnce(
    world,
    personId,
    activityId,
    transitionHandlers,
    options,
  );
  // The wait before it can cross days in which an organizer booked something
  // for a time already gone; see `releaseMissedHolds`.
  return performed === world ? world : releaseMissedHolds(performed, personId);
}

function performVenueActivityOnce(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry,
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
    // explicit route adapter and linked destination may establish arrival —
    // read from the travel side by `arrivedDestinationFor`, below, which is
    // main's form of the lookup this line was doing from the destination side.
    const start = scheduledActivityState(world, activityId).start;
    const waitMinutes = simulationMinutesBetween(world.currentMoment, start);
    const waited =
      waitMinutes > 0
        ? advanceWorldMinutes(world, waitMinutes, transitionHandlers)
        : world;
    if (compareSimulationMoments(waited.currentMoment, start) < 0)
      return waited;
    // Campaign work is done in place by the campaign's own writer, so its
    // money and outreach are recorded; the bare calendar completion below
    // would mark it done with neither. No arrival is recorded: nobody went
    // anywhere the game has a route for.
    const campaignAction = campaignActionForActivity(waited, activityId);
    if (campaignAction) {
      return campaignWeeklyPlanForAction(waited, campaignAction.id)
        ? performCampaignWeekSession(waited, personId, campaignAction.id)
        : performCampaignAction(waited, campaignAction.id);
    }
    // Existing campaign outcomes and bounded ordinary-meeting presence are
    // written only after successful completion; bare journeys add neither.
    const performed = recordOrdinaryMeetingPresence(
      waited,
      recordSocialOccasionAttendance(
        recordDomainAttendance(
          performScheduledActivity(waited, activityId, transitionHandlers),
          personId,
          activityId,
          attendance,
        ),
        personId,
        activityId,
      ),
      personId,
      activityId,
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
      "Make the journey",
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
    journey.activity,
    entry.activity,
    journey.destinationSetting,
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
  // Preserve domain outcomes, then record the actual ordinary-meeting
  // aftermath. Neither hook adds another interval or creates a read-time fact.
  return recordOrdinaryMeetingPresence(
    arrived,
    recordSocialOccasionAttendance(
      recordDomainAttendance(
        performScheduledActivity(arrived, activityId, transitionHandlers),
        personId,
        activityId,
        attendance,
      ),
      personId,
      activityId,
    ),
    personId,
    activityId,
  );
}
