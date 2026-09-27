import {
  canPersonAccess,
  compareSimulationMoments,
  createCampaignElectionTransitionRegistry,
  personName,
  projectCampaignLifeActivities,
  scheduledActivityState,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { recordEventKnowledge } from "../simulation/records";
import { recordWorldEvent } from "../simulation/world";
import { meetingDepartureRoute, meetingHomeRoute } from "./meeting-home-route";
import { travelToPlace } from "./place-travel";
import { performVenueActivity, venueActivities } from "./venue-activity";
import { cancelScheduledActivity } from "../simulation/time-work";

export type CandidateGuidanceQuestion = "requirements" | "filing";

// COPY-PENDING(wave2): Claude English will review these spoken lines against
// the saved scene packet. No filing rule or host knowledge is asserted.
export const CANDIDATE_GUIDANCE_OPENING =
  "We can talk about running for office. What would you like to ask?";
export const CANDIDATE_GUIDANCE_QUESTIONS: readonly {
  readonly key: CandidateGuidanceQuestion;
  readonly words: string;
}[] = [
  { key: "requirements", words: "What are the requirements to run here?" },
  { key: "filing", words: "Who takes the paperwork, and when is it due?" },
];

const baseKey = (activityId: EntityId) =>
  `candidate-guidance-scene-v1:${activityId}`;

/** A saved journey and the actual host are prerequisites for the conversation. */
function guidanceHere(world: World, personId: EntityId, activityId: EntityId) {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const view = projectCampaignLifeActivities(world, personId).find(
    (candidate) =>
      candidate.form === "candidate-guidance" &&
      candidate.scheduledActivityId === activityId &&
      candidate.state === "accepted",
  );
  const activity = world.history.scheduledActivities.find(
    (item) => item.id === activityId,
  );
  if (
    !view ||
    !activity ||
    !canPersonAccess(activity.access, personId) ||
    scheduledActivityState(world, activityId).status !== "scheduled" ||
    compareSimulationMoments(world.currentMoment, view.start) !== 0 ||
    !world.people[view.hostPersonId] ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === view.hostPersonId &&
        death.diedAt <= world.currentDate,
    )
  )
    return null;
  const arrival = world.history.events
    .filter(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.participants.some(
          (actor) =>
            actor.personId === personId &&
            actor.role === "presence:participant",
        ),
    )
    .at(-1);
  if (
    !arrival ||
    !arrival.involvedEntityIds.includes(activityId) ||
    !arrival.tags.includes("route:ordinary-life:to-meeting-room") ||
    arrival.context.location?.jurisdictionId !==
      activity.location.jurisdictionId ||
    arrival.context.location.label !== activity.location.label
  )
    return null;
  return { view, activity, arrival };
}

/** The first Attend records presence while the scheduled talk remains open. */
export function enterCandidateGuidance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const here = guidanceHere(world, personId, activityId);
  const key = `${baseKey(activityId)}:entry`;
  if (!here || world.history.events.some((event) => event.stableKey === key))
    return world;
  const hostName = personName(world.people[here.view.hostPersonId]!);
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: "campaign.candidate-guidance-entered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: here.activity.location.jurisdictionId,
    involvedEntityIds: [
      activityId,
      personId,
      here.view.hostPersonId,
      here.view.hostOrganizationId,
    ],
    participants: [
      { personId, role: "presence:participant", detail: "Came to talk" },
      {
        personId: here.view.hostPersonId,
        role: "coordination:host",
        detail: CANDIDATE_GUIDANCE_OPENING,
      },
      {
        personId: here.view.hostPersonId,
        role: "presence:participant",
        detail: "Present for the conversation",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `activity:${activityId}`,
      `arrival:${here.arrival.id}`,
      `minute:${world.currentMoment.minuteOfDay}`,
    ],
    summary: `You met ${hostName} in the community room to talk about running for office.`,
    context: {
      location: here.arrival.context.location,
      socialContext: CANDIDATE_GUIDANCE_OPENING,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const entry = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId: entry.id,
    learnedAt: next.currentDate,
    believedSummary: entry.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/** The normal party action and Calendar share this same arrival. */
export function arriveAtCandidateGuidance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const entered = enterCandidateGuidance(world, personId, activityId);
  if (entered !== world) return entered;
  const view = projectCampaignLifeActivities(world, personId).find(
    (candidate) =>
      candidate.form === "candidate-guidance" &&
      candidate.scheduledActivityId === activityId &&
      candidate.state === "accepted",
  );
  if (!view) return world;
  const offer = venueActivities(world, personId, handlers).find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (!offer || offer.refusal || !offer.journey) return world;
  const arrived = offer.journey.alreadyCompleted
    ? world
    : performVenueActivity(
        world,
        personId,
        offer.journey.activity.id,
        handlers,
      );
  return enterCandidateGuidance(arrived, personId, activityId);
}

/** Reading the room has no write or clock effect. */
export function projectCandidateGuidanceScene(
  world: World,
  personId: EntityId,
) {
  const view = projectCampaignLifeActivities(world, personId).find(
    (candidate) =>
      candidate.form === "candidate-guidance" &&
      candidate.state === "accepted" &&
      compareSimulationMoments(world.currentMoment, candidate.start) === 0,
  );
  if (!view) return null;
  const here = guidanceHere(world, personId, view.scheduledActivityId);
  if (!here) return null;
  const entry = world.history.events.find(
    (event) =>
      event.stableKey === `${baseKey(view.scheduledActivityId)}:entry` &&
      event.tags.includes(`arrival:${here.arrival.id}`) &&
      event.participants.some(
        (actor) =>
          actor.personId === personId && actor.role === "presence:participant",
      ),
  );
  if (
    !entry ||
    !world.history.knowledge.some(
      (item) =>
        item.eventId === entry.id &&
        item.personId === personId &&
        item.accuracy === "accurate" &&
        item.source.kind === "direct",
    )
  )
    return null;
  const turns = world.history.events.filter(
    (event) =>
      event.type === "campaign.candidate-guidance-question" &&
      event.tags.includes(`entry:${entry.id}`),
  );
  const questions = CANDIDATE_GUIDANCE_QUESTIONS.filter(
    (question) =>
      !turns.some((event) => event.tags.includes(`question:${question.key}`)),
  );
  return {
    phase: "active" as const,
    activityId: view.scheduledActivityId,
    eventId: entry.id,
    location: here.activity.location,
    actors: [
      {
        personId: view.hostPersonId,
        name: personName(world.people[view.hostPersonId]!),
        role: "Conversation host",
        recordIds: [entry.id],
        spokenLine: entry.context.socialContext,
      },
    ],
    questions,
    turns: turns.map((event) => ({
      words: event.context.choice,
      response: event.context.immediateReaction,
      eventId: event.id,
    })),
    availableActions: [
      ...questions.map((question) => question.key),
      "stay",
      "leave",
    ] as readonly (CandidateGuidanceQuestion | "stay" | "leave")[],
    caption: `${personName(world.people[view.hostPersonId]!)} is here to talk about running for office.`,
  };
}

/** A question and the answer heard are saved together, once per choice. */
export function askCandidateGuidance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  question: CandidateGuidanceQuestion,
): World {
  const scene = projectCandidateGuidanceScene(world, personId);
  const words = scene?.questions.find(
    (choice) => choice.key === question,
  )?.words;
  if (!scene || scene.activityId !== activityId || !words) return world;
  // COPY-PENDING(wave2): Claude English will replace these short lines from
  // the recorded scene packet. No filing rule or host knowledge is asserted.
  const response =
    question === "requirements"
      ? "Let's check the requirements before you decide to run."
      : "Let's check the filing steps before you act.";
  const host = scene.actors[0]!;
  const key = `${baseKey(activityId)}:question:${question}`;
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: "campaign.candidate-guidance-question",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, host.personId],
    participants: [
      { personId, role: "agency:actor", detail: words },
      {
        personId: host.personId,
        role: "presence:participant",
        detail: response,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`entry:${scene.eventId}`, `question:${question}`],
    summary: `You asked ${host.name}: “${words}”`,
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "community room",
      },
      socialContext: CANDIDATE_GUIDANCE_OPENING,
      pressure: null,
      choice: words,
      motivation: null,
      immediateReaction: response,
    },
  });
  const turn = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId: turn.id,
    learnedAt: next.currentDate,
    believedSummary: `${turn.summary} ${response}`,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/** Leave before completion, with the same measured local return route. */
export function leaveCandidateGuidance(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const scene = projectCandidateGuidanceScene(world, personId);
  if (scene?.activityId !== activityId) return world;
  if (meetingDepartureRoute(world, personId).kind !== "available") return world;
  const cancelled = cancelScheduledActivity(world, activityId);
  if (meetingHomeRoute(cancelled, personId).kind !== "available") return world;
  const noted = recordWorldEvent(cancelled, {
    stableKey: `${baseKey(activityId)}:left`,
    type: "campaign.candidate-guidance-left",
    occurredAt: cancelled.currentDate,
    recordedAt: cancelled.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, scene.actors[0]!.personId],
    participants: [
      { personId, role: "agency:actor", detail: "Left before the talk ended" },
      {
        personId: scene.actors[0]!.personId,
        role: "presence:participant",
        detail: "Present when the player left",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`entry:${scene.eventId}`, "attendance:not-completed"],
    summary: "You left the conversation before it ended.",
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "community room",
      },
      socialContext: CANDIDATE_GUIDANCE_OPENING,
      pressure: null,
      choice: "Leave and return home",
      motivation: null,
      immediateReaction: null,
    },
  });
  const home = travelToPlace(
    noted,
    personId,
    "home",
    (current, actor, destination) =>
      destination === "home"
        ? meetingHomeRoute(current, actor)
        : { kind: "unavailable", reason: "This action returns home." },
    handlers,
  );
  return home === noted ? world : home;
}

export type CandidateGuidanceScene = NonNullable<
  ReturnType<typeof projectCandidateGuidanceScene>
>;
