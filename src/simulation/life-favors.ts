import { lifeOpportunitiesFor } from "./life-opportunities";
import {
  lifeRequestDetails,
  lifeRequestDetailsTag,
} from "./life-request-details";
import { compareSimulationMoments, addSimulationMinutes } from "./dates";
import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
  controlledCommitmentsBlockingMinuteAdvance,
} from "./time-work";
import { recordWorldEvent } from "./world";
import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import { scheduleAftermath } from "./life-callbacks";
import { personName } from "./people";
import type { EntityId, FutureTransitionHandlerRegistry, World } from "./types";

const REQUEST = "life.favour-request:";
export function favorEntries(world: World, personId: EntityId) {
  return world.history.events
    .filter(
      (event) =>
        event.type === "life.favour-requested" &&
        event.participants.some(
          (p) => p.personId === personId && p.role === "focus:asked-of",
        ),
    )
    .flatMap((request) => {
      const details = lifeRequestDetails(request);
      const counterpartId = request.participants.find(
        (p) => p.role === "agency:asked",
      )?.personId;
      if (!details?.minutes || !counterpartId || !world.people[counterpartId])
        return [];
      const response = world.history.events.find(
        (event) =>
          event.type === "life.favour-response" &&
          event.tags.includes(`${REQUEST}${request.id}`),
      );
      const outcome = world.history.events.find(
        (event) =>
          ["life.favour-performed", "life.favour-cancelled"].includes(
            event.type,
          ) && event.tags.includes(`${REQUEST}${request.id}`),
      );
      return [
        {
          request,
          details,
          counterpartId,
          name: personName(world.people[counterpartId]!),
          response,
          outcome,
          condition: response?.tags.includes("favour.conditions")
            ? details.condition
            : null,
          status:
            outcome?.type === "life.favour-performed"
              ? ("performed" as const)
              : outcome
                ? ("cancelled" as const)
                : response?.tags.includes("favour.declined")
                  ? ("declined" as const)
                  : response
                    ? ("agreed" as const)
                    : ("asked" as const),
        },
      ];
    });
}

/** The ordinary situation writer already recorded memory/knowledge/relation.
 * This append binds the agreement to its exact saved request, not a fresh pool. */
export function recordFavorAgreement(
  world: World,
  before: World,
  personId: EntityId,
  option: string,
  choiceEventId: EntityId,
): World {
  const request = lifeOpportunitiesFor(before, personId).find(
    (entry) => entry.kind === "favour-request",
  );
  const entry = favorEntries(before, personId).find(
    (entry) => entry.request.id === request?.eventId,
  );
  if (!entry) return world; // Legacy terms remain unknown; never synthesize a task.
  if (entry.response) return world;
  const condition = option === "conditions" ? entry.details.condition : null;
  const next = recordWorldEvent(world, {
    stableKey: `life-favor:${entry.request.id}:response`,
    type: "life.favour-response",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: entry.request.jurisdictionId,
    involvedEntityIds: [personId, entry.counterpartId],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail:
          option === "decline"
            ? "Declined the request"
            : "Made the proofreading commitment",
      },
      {
        personId: entry.counterpartId,
        role: "presence:participant",
        detail: "Heard the answer",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${REQUEST}${entry.request.id}`,
      `origin-choice:${choiceEventId}`,
      lifeRequestDetailsTag(entry.details),
      `favour.${option === "decline" ? "declined" : option === "conditions" ? "conditions" : "agreed"}`,
    ],
    summary:
      option === "decline"
        ? `You declined to ${entry.details.task} for ${entry.name}.`
        : `You agreed to ${entry.details.task} for ${entry.name}${condition ? `. Condition: ${condition}` : ""}. The proofreading has not been done.`,
    context: {
      ...entry.request.context,
      socialContext: "adult.friend-favour",
      pressure: entry.details.task,
      choice:
        option === "decline"
          ? "Decline"
          : condition
            ? `Agree: ${condition}`
            : "Agree to proofread",
      immediateReaction:
        option === "decline"
          ? "Okay. I will ask someone else."
          : condition
            ? "Okay. Just the wording; I will contact the guests myself."
            : "Thanks. Let me know when you have looked it over.",
    },
  });
  return scheduleAftermath({
    world: next,
    personId,
    situationKey: "adult.friend-favour",
    optionKey: option,
    aftermath: option === "decline" ? "grievance" : "obligation",
    counterpartPersonId: entry.counterpartId,
    occurredAt: world.currentDate,
    eventId: next.history.events.at(-1)!.id,
    stableKey: `life-favor:${entry.request.id}:response`,
  });
}

/** Schedule only the explicit performance, wherever the player is; proofreading
 * establishes no journey, address, attendee consent, pay, or skill reward. */
export function performFavor(
  world: World,
  personId: EntityId,
  requestId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("This favor is not yours to carry out.");
  const entry = favorEntries(world, personId).find(
    (entry) => entry.request.id === requestId,
  );
  if (!entry) throw new Error("The saved proofreading terms are unavailable.");
  if (entry.outcome) return world;
  if (entry.status !== "agreed")
    throw new Error("Agree to the proofreading before carrying it out.");
  // An explicit performance cannot skip an already scheduled activity/travel.
  // Check the whole interval, including a commitment starting during it.
  if (
    controlledCommitmentsBlockingMinuteAdvance(world, entry.details.minutes!)
      .length
  )
    return world;
  const end = addSimulationMinutes(world.currentMoment, entry.details.minutes!);
  if (
    handlers.routine
      ?.projectWindows(world, end)
      .some(
        (slot) =>
          slot.kind === "work" &&
          compareSimulationMoments(slot.start, end) < 0 &&
          compareSimulationMoments(world.currentMoment, slot.end) < 0,
      )
  )
    return world;
  const key = `life-favor:${requestId}:performance`;
  let candidate = createScheduledActivity(world, {
    stableKey: key,
    title: `Proofread ${entry.name}'s picnic invitation`,
    summary: `${entry.details.task}${entry.condition ? `. Condition: ${entry.condition}` : ""}. No journey is needed.`,
    kind: "flexible",
    start: world.currentMoment,
    end,
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "life-favor:proofreading",
      label: "Proofreading; no journey",
      jurisdictionId: null,
    },
    sourceEntityIds: [requestId, entry.response!.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  const activity = candidate.history.scheduledActivities.at(-1)!;
  candidate = performScheduledActivity(candidate, activity.id, handlers);
  if (scheduledActivityState(candidate, activity.id).status !== "completed")
    return world;
  const stableKey = `${key}:outcome`;
  let next = recordWorldEvent(candidate, {
    stableKey,
    type: "life.favour-performed",
    occurredAt: candidate.currentDate,
    recordedAt: candidate.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, entry.counterpartId, activity.id],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Finished proofreading and sent wording feedback",
      },
      {
        personId: entry.counterpartId,
        role: "coordination:counterpart",
        detail: "Received the feedback; not physical presence",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${REQUEST}${requestId}`,
      `activity:${activity.id}`,
      lifeRequestDetailsTag(entry.details),
    ],
    summary: `You proofread ${entry.name}'s two-paragraph picnic invitation and sent the wording feedback${entry.condition ? `. You kept the agreed limit: ${entry.condition}` : ""}.`,
    context: {
      location: null,
      socialContext: "adult.friend-favour",
      pressure: entry.details.task,
      choice: "Carry out the proofreading",
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordMemory(next, {
    stableKey: `${stableKey}:memory`,
    personId,
    eventId: event.id,
    formedAt: next.currentDate,
    rememberedSummary: event.summary,
    interpretation: event.summary,
    strength: "moderate",
    relevanceTags: ["life.favour-performed"],
    supersedesMemoryId: null,
  });
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:requester-knowledge`,
    personId: entry.counterpartId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: personId, claimId: null },
  });
  return recordRelationshipInteraction(next, {
    stableKey: `${stableKey}:interaction`,
    personIds: [personId, entry.counterpartId],
    eventId: event.id,
    occurredAt: next.currentDate,
    kind: "support:friendship",
    change: "strengthened",
    significance: "meaningful",
    summary: `${entry.name} received the proofreading feedback that was promised${entry.condition ? `, under the limit: ${entry.condition}` : ""}.`,
    tags: ["life.favour-performed"],
  });
}

export function cancelFavor(
  world: World,
  personId: EntityId,
  requestId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("This favor is not yours to cancel.");
  const entry = favorEntries(world, personId).find(
    (entry) => entry.request.id === requestId,
  );
  if (!entry || entry.status !== "agreed") return world;
  return recordWorldEvent(world, {
    stableKey: `life-favor:${requestId}:cancelled`,
    type: "life.favour-cancelled",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "agency:actor",
        detail: "Withdrew the proofreading commitment",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`${REQUEST}${requestId}`],
    summary: `You withdrew your commitment to ${entry.details.task} for ${entry.name}.`,
    context: {
      location: null,
      socialContext: "adult.friend-favour",
      pressure: entry.details.task,
      choice: "Withdraw the commitment",
      motivation: null,
      immediateReaction: null,
    },
  });
}
