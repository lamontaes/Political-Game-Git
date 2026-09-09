import { activeWorkRelationshipsAt } from "./life-queries";
import { personName } from "./people";
import { publishPublicEvent } from "./public-information";
import { recordClaim } from "./records";
import {
  createScheduledActivity,
  createWorkItem,
  performScheduledActivity,
  scheduledActivityState,
  workItemState,
} from "./time-work";
import type {
  ClaimAudience,
  EntityId,
  HistoricalEvent,
  SimulationMoment,
  WorkItemRecord,
  World,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export const PRESS_INTERVIEW_CHANNELS = ["written", "spoken"] as const;
export type PressInterviewChannel = (typeof PRESS_INTERVIEW_CHANNELS)[number];

export const PRESS_RECORD_TERMS = [
  "on-record",
  "on-background",
  "off-record",
] as const;
export type PressRecordTerms = (typeof PRESS_RECORD_TERMS)[number];

export const PRESS_PLAY_MODES = ["interactive", "condensed"] as const;
export type PressPlayMode = (typeof PRESS_PLAY_MODES)[number];

export const PRESS_RESPONSE_INTENTS = [
  "answer-directly",
  "add-context",
  "challenge-premise",
] as const;
export type PressResponseIntent = (typeof PRESS_RESPONSE_INTENTS)[number];

export const JOURNALISM_OCCUPATION_CLASSIFICATION =
  "profession:journalism" as const;

const PRESS_TAG = "press.interview";
const CHANNEL_PREFIX = "press.channel:";
const TERMS_PREFIX = "press.terms:";
const MODE_PREFIX = "press.mode:";
const INTENT_PREFIX = "press.intent:";
const LIST_PREFIX = "press-list-v1:";

export interface ArrangePressInterviewInput {
  readonly stableKey: string;
  /** Existing conversational claim in which the controlled person made this pitch. */
  readonly pitchClaimId: EntityId;
  readonly reporterPersonId: EntityId;
  /** Current active work-role record carrying profession:journalism. */
  readonly reporterWorkRoleId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly channel: PressInterviewChannel;
  readonly terms: PressRecordTerms;
  /** Required and public-facing only for an on-background agreement. */
  readonly backgroundAttribution: string | null;
  readonly pitch: string;
  readonly primaryQuestion: string;
  /** Facts the reporter actually knows, directly or through publication. */
  readonly questionBasisEventIds: readonly EntityId[];
  /** Optional prior contacts between this source and this reporter. */
  readonly relationshipInteractionIds: readonly EntityId[];
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly location: {
    readonly locationKey: string;
    readonly label: string;
  };
  readonly preparationMinutes: number;
}

export interface ArrangedPressInterview {
  readonly world: World;
  readonly activityId: EntityId;
  readonly preparationWorkItemId: EntityId;
}

export interface RecordPressPreparationInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly adviserPersonId: EntityId;
  /** Existing knowledge records held by the assigned adviser. */
  readonly sourceKnowledgeIds: readonly EntityId[];
  readonly likelyFollowUps: readonly string[];
  readonly responseOptions: readonly string[];
}

export interface DraftPressResponseInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly mode: PressPlayMode;
  readonly intent: PressResponseIntent;
  readonly followUpQuestion: string;
  readonly proposedWording: string;
}

export interface ConfirmPressResponseInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  /** Must match the displayed draft byte-for-byte after outer trim. */
  readonly confirmedWording: string;
}

export interface PublishPressInterviewInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
}

export interface RecordPressAdviserFeedbackInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly adviserPersonId: EntityId;
  /** Media knowledge proving this adviser has actually reviewed the story. */
  readonly publicationKnowledgeId: EntityId;
  /** An adviser's interpretation, not an objective reception or poll result. */
  readonly interpretation: string;
}

export interface PressInterviewProjection {
  readonly activityId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly reporterName: string;
  readonly subjectPersonId: EntityId;
  readonly subjectName: string;
  readonly adviserPersonId: EntityId;
  readonly adviserName: string;
  readonly channel: PressInterviewChannel;
  readonly terms: PressRecordTerms;
  readonly backgroundAttribution: string | null;
  readonly pitch: string;
  readonly primaryQuestion: string;
  readonly preparationWorkItemId: EntityId;
  readonly preparationStatus: ReturnType<typeof workItemState>["status"];
  readonly knownFacts: readonly string[];
  readonly likelyFollowUps: readonly string[];
  readonly responseOptions: readonly string[];
  readonly mode: PressPlayMode | null;
  readonly intent: PressResponseIntent | null;
  readonly followUpQuestion: string | null;
  readonly proposedWording: string | null;
  readonly confirmedWording: string | null;
  readonly completed: boolean;
  readonly publicationId: EntityId | null;
  readonly adviserFeedback: string | null;
  /** Always false: condensed play changes presentation, not outcome rules. */
  readonly condensedPenaltyApplied: false;
}

/**
 * Records an accepted pitch as an ordinary event, activity and staff work item.
 * It does not decide whether a reporter accepts a pitch; the caller supplies an
 * already-negotiated arrangement made through an existing conversation route.
 */
export function arrangePressInterview(
  world: World,
  input: ArrangePressInterviewInput,
): ArrangedPressInterview {
  assertWorldIntegrity(world);
  const subjectPersonId = controlledPersonId(world);
  requirePerson(world, input.reporterPersonId, "reporter");
  requirePerson(world, input.adviserPersonId, "adviser");
  if (input.reporterPersonId === subjectPersonId) {
    throw new Error("A press source cannot also be the reporter.");
  }
  if (
    input.adviserPersonId === subjectPersonId ||
    input.adviserPersonId === input.reporterPersonId
  ) {
    throw new Error(
      "A press adviser must be a separate person from the source and reporter.",
    );
  }
  requireText(input.stableKey, "Press arrangement stable key");
  requireText(input.pitch, "Press pitch");
  requireText(input.primaryQuestion, "Press question");
  assertMember(PRESS_INTERVIEW_CHANNELS, input.channel, "press channel");
  assertMember(PRESS_RECORD_TERMS, input.terms, "press terms");
  if (input.terms === "on-background") {
    requireText(input.backgroundAttribution, "Background attribution");
  } else if (input.backgroundAttribution !== null) {
    throw new Error(
      "Background attribution is only valid for an on-background interview.",
    );
  }
  if (
    !Number.isSafeInteger(input.preparationMinutes) ||
    input.preparationMinutes <= 0
  ) {
    throw new Error("Press preparation requires positive whole minutes.");
  }
  assertReporterRole(world, input.reporterPersonId, input.reporterWorkRoleId);
  assertActualAdviser(world, subjectPersonId, input.adviserPersonId);
  assertCanonicalPitch(
    world,
    input.pitchClaimId,
    subjectPersonId,
    input.reporterPersonId,
    input.pitch,
  );
  const basisEventIds = canonicalIds(input.questionBasisEventIds);
  if (basisEventIds.length === 0) {
    throw new Error(
      "A press question requires at least one known event basis.",
    );
  }
  for (const eventId of basisEventIds) {
    assertReporterKnowsEvent(world, input.reporterPersonId, eventId);
  }
  const relationshipIds = canonicalIds(input.relationshipInteractionIds);
  for (const relationshipId of relationshipIds) {
    const relationship = world.history.relationshipInteractions.find(
      (candidate) => candidate.id === relationshipId,
    );
    if (
      !relationship ||
      !relationship.personIds.includes(subjectPersonId) ||
      !relationship.personIds.includes(input.reporterPersonId)
    ) {
      throw new Error(
        "Press contact history must belong to the source and reporter.",
      );
    }
  }

  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:arranged`,
    type: "press.interview-arranged",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: canonicalIds([
      subjectPersonId,
      input.reporterPersonId,
      input.adviserPersonId,
      ...(input.jurisdictionId ? [input.jurisdictionId] : []),
    ]),
    participants: [
      {
        personId: subjectPersonId,
        role: "agency:press-source",
        detail: "Accepted an interview arrangement",
      },
      {
        personId: input.reporterPersonId,
        role: "observation:reporter",
        detail: "Agreed the channel and ground rules",
      },
      {
        personId: input.adviserPersonId,
        role: "coordination:press-adviser",
        detail: "Assigned to prepare the source",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PRESS_TAG,
      `${CHANNEL_PREFIX}${input.channel}`,
      `${TERMS_PREFIX}${input.terms}`,
      `press.pitch-claim:${input.pitchClaimId}`,
      ...basisEventIds.map((eventId) => `press.basis:${eventId}`),
      ...relationshipIds.map(
        (relationshipId) => `press.contact:${relationshipId}`,
      ),
    ],
    summary: `${input.channel === "written" ? "A written exchange" : "An interview"} was arranged with agreed ground rules.`,
    context: {
      location: input.jurisdictionId
        ? {
            jurisdictionId: input.jurisdictionId,
            label: input.location.label,
            setting: "Press arrangement",
          }
        : null,
      socialContext: input.primaryQuestion.trim(),
      pressure: termsExplanation(input.terms),
      choice: `Channel: ${input.channel}`,
      motivation: input.pitch.trim(),
      immediateReaction: input.backgroundAttribution?.trim() ?? null,
    },
  });
  const arrangementEvent = lastEvent(next, "press.interview-arranged");

  next = createScheduledActivity(next, {
    stableKey: `${input.stableKey}:activity`,
    title:
      input.channel === "written"
        ? `Written questions from ${personName(next.people[input.reporterPersonId]!)}`
        : `Interview with ${personName(next.people[input.reporterPersonId]!)}`,
    summary: `An arranged ${input.channel} press exchange under ${input.terms} terms.`,
    kind: "confirmed",
    start: input.start,
    end: input.end,
    participantPersonIds: canonicalIds([
      subjectPersonId,
      input.reporterPersonId,
    ]),
    responsiblePersonId: subjectPersonId,
    location: {
      ...input.location,
      jurisdictionId: input.jurisdictionId,
    },
    sourceEntityIds: canonicalIds([arrangementEvent.id, ...basisEventIds]),
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const activity = next.history.scheduledActivities.at(-1)!;

  next = createWorkItem(next, {
    stableKey: `${input.stableKey}:preparation`,
    title: "Prepare for press questions",
    summary:
      "Review known facts, likely follow-ups and response options without promising reception or coverage.",
    jurisdictionId: input.jurisdictionId,
    sourceEntityIds: canonicalIds([arrangementEvent.id, activity.id]),
    focus: { kind: "calendar-item", scheduledActivityId: activity.id },
    effort: {
      kind: "authored-duration",
      requiredMinutes: input.preparationMinutes,
    },
    access: { kind: "office" },
    assignedPersonIds: [input.adviserPersonId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: activity.id,
  });
  const preparationWorkItem = next.history.workItems.at(-1)!;
  return {
    world: next,
    activityId: activity.id,
    preparationWorkItemId: preparationWorkItem.id,
  };
}

/** Records the prepared material only after the assigned staff work exists. */
export function recordPressPreparation(
  world: World,
  input: RecordPressPreparationInput,
): World {
  const press = requirePressInterview(world, input.activityId);
  requireNoEvent(world, input.activityId, "press.interview-prepared");
  if (input.adviserPersonId !== press.adviserPersonId) {
    throw new Error("Press preparation must come from the assigned adviser.");
  }
  const state = workItemState(world, press.preparationWorkItem.id);
  if (state.status !== "ready-for-review" && state.status !== "completed") {
    throw new Error("Press preparation is not ready for review.");
  }
  if (!state.assignedPersonIds.includes(input.adviserPersonId)) {
    throw new Error("Press preparation has no actual assigned adviser.");
  }
  const knowledgeIds = canonicalIds(input.sourceKnowledgeIds);
  if (knowledgeIds.length === 0) {
    throw new Error("Press preparation requires actual adviser knowledge.");
  }
  const knownFacts = knowledgeIds.map((knowledgeId) => {
    const knowledge = world.history.knowledge.find(
      (candidate) => candidate.id === knowledgeId,
    );
    if (
      !knowledge ||
      knowledge.personId !== input.adviserPersonId ||
      knowledge.learnedAt > world.currentDate
    ) {
      throw new Error(
        "Press preparation may use only the assigned adviser's current knowledge.",
      );
    }
    const event = world.history.events.find(
      (candidate) => candidate.id === knowledge.eventId,
    );
    if (!event || event.occurredAt > world.currentDate) {
      throw new Error("Press preparation cannot use a future or missing fact.");
    }
    return knowledge.believedSummary.trim();
  });
  const likelyFollowUps = requireTextList(
    input.likelyFollowUps,
    "Likely press follow-ups",
  );
  const responseOptions = requireTextList(
    input.responseOptions,
    "Press response options",
  );
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "press.interview-prepared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: canonicalIds([
      press.activity.id,
      press.preparationWorkItem.id,
      press.subjectPersonId,
      press.adviserPersonId,
    ]),
    participants: [
      {
        personId: press.adviserPersonId,
        role: "coordination:press-adviser",
        detail: "Prepared fallible briefing guidance",
      },
      {
        personId: press.subjectPersonId,
        role: "agency:press-source",
        detail: "Reviewed preparation",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PRESS_TAG,
      "press.preparation",
      ...knowledgeIds.map((id) => `press.knowledge:${id}`),
    ],
    summary: "The assigned adviser prepared the arranged interview.",
    context: {
      location: press.arrangement.context.location,
      socialContext: encodeList(knownFacts),
      pressure: encodeList(likelyFollowUps),
      choice: encodeList(responseOptions),
      motivation:
        "Prepare choices and relevant facts without guaranteeing how an answer will be received.",
      immediateReaction:
        "The guidance is an adviser's fallible reading, not a promised outcome.",
    },
  });
}

/** Saves a private draft; it is not yet something the source said. */
export function draftPressResponse(
  world: World,
  input: DraftPressResponseInput,
): World {
  const press = requirePressInterview(world, input.activityId);
  requireEvent(world, input.activityId, "press.interview-prepared");
  requireNoEvent(world, input.activityId, "press.response-drafted");
  assertMember(PRESS_PLAY_MODES, input.mode, "press play mode");
  assertMember(PRESS_RESPONSE_INTENTS, input.intent, "press response intent");
  requireText(input.followUpQuestion, "Press follow-up question");
  requireText(input.proposedWording, "Proposed press wording");
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "press.response-drafted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: [press.activity.id, press.subjectPersonId],
    participants: [
      {
        personId: press.subjectPersonId,
        role: "agency:wording-review",
        detail: "Selected an intent and drafted consequential wording",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PRESS_TAG,
      `${MODE_PREFIX}${input.mode}`,
      `${INTENT_PREFIX}${input.intent}`,
    ],
    summary: "A press response was drafted for exact-wording confirmation.",
    context: {
      location: press.arrangement.context.location,
      socialContext: press.primaryQuestion,
      pressure: input.followUpQuestion.trim(),
      choice: input.intent,
      motivation:
        input.mode === "condensed"
          ? "Use the condensed presentation route without refusing the interview or changing outcome rules."
          : "Answer through the interactive presentation route.",
      immediateReaction: input.proposedWording.trim(),
    },
  });
}

/**
 * Commits only the wording the player just reviewed. No story approval follows;
 * this confirmation governs the source's consequential answer, not editing.
 */
export function confirmPressResponse(
  world: World,
  input: ConfirmPressResponseInput,
): World {
  const press = requirePressInterview(world, input.activityId);
  const draft = requireEvent(world, input.activityId, "press.response-drafted");
  requireNoEvent(world, input.activityId, "press.response-confirmed");
  const proposedWording = requiredContext(
    draft.context.immediateReaction,
    "drafted press wording",
  );
  if (input.confirmedWording.trim() !== proposedWording) {
    throw new Error(
      "Confirmed press wording must match the displayed draft exactly.",
    );
  }
  const mode = tagValue(draft, MODE_PREFIX, PRESS_PLAY_MODES, "press mode");
  const intent = tagValue(
    draft,
    INTENT_PREFIX,
    PRESS_RESPONSE_INTENTS,
    "press intent",
  );
  let next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "press.response-confirmed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: canonicalIds([
      press.activity.id,
      press.subjectPersonId,
      press.reporterPersonId,
    ]),
    participants: [
      {
        personId: press.subjectPersonId,
        role: "agency:confirmed-speaker",
        detail: "Confirmed the exact consequential wording",
      },
      {
        personId: press.reporterPersonId,
        role: "observation:reporter",
        detail: "Received the confirmed answer",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PRESS_TAG,
      `${TERMS_PREFIX}${press.terms}`,
      `${MODE_PREFIX}${mode}`,
      `${INTENT_PREFIX}${intent}`,
    ],
    summary: "The source confirmed the exact wording of the press answer.",
    context: {
      location: press.arrangement.context.location,
      socialContext: press.primaryQuestion,
      pressure: draft.context.pressure,
      choice: intent,
      motivation: draft.context.motivation,
      immediateReaction: proposedWording,
    },
  });
  const confirmation = lastEvent(next, "press.response-confirmed");
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: press.subjectPersonId,
    eventId: confirmation.id,
    madeAt: next.currentDate,
    audience: claimAudience(press.terms),
    statement: proposedWording,
    relationshipToTruth: "unknown",
    provenance: { kind: "direct-record" },
  });
  return next;
}

/** Performs the already-arranged activity through the canonical clock. */
export function completePressInterview(
  world: World,
  activityId: EntityId,
): World {
  const press = requirePressInterview(world, activityId);
  requireEvent(world, activityId, "press.response-confirmed");
  requireNoEvent(world, activityId, "press.interview-completed");
  let next = performScheduledActivity(world, activityId);
  if (next === world) {
    throw new Error("Another controlled commitment blocks this interview.");
  }
  const completedState = scheduledActivityState(next, activityId);
  if (completedState.status !== "completed") {
    throw new Error("The arranged interview did not complete.");
  }
  next = recordWorldEvent(next, {
    stableKey: `${press.arrangement.stableKey}:completed`,
    type: "press.interview-completed",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: canonicalIds([
      press.activity.id,
      press.subjectPersonId,
      press.reporterPersonId,
    ]),
    participants: [
      {
        personId: press.subjectPersonId,
        role: "agency:press-source",
        detail: "Completed the arranged exchange",
      },
      {
        personId: press.reporterPersonId,
        role: "observation:reporter",
        detail: "Completed the arranged exchange",
      },
    ],
    personFactConstraints: [],
    visibility: press.terms === "on-record" ? "public" : "limited",
    tags: [
      PRESS_TAG,
      `${CHANNEL_PREFIX}${press.channel}`,
      `${TERMS_PREFIX}${press.terms}`,
    ],
    summary: `The arranged ${press.channel} press exchange concluded.`,
    context: {
      location: press.arrangement.context.location,
      socialContext: press.primaryQuestion,
      pressure: termsExplanation(press.terms),
      choice: null,
      motivation: "Complete the agreed press exchange.",
      immediateReaction: null,
    },
  });
  return next;
}

/**
 * Records an actual story occurrence, then uses the existing publication
 * writer. Off-record material has no direct publication path.
 */
export function publishPressInterview(
  world: World,
  input: PublishPressInterviewInput,
): World {
  const press = requirePressInterview(world, input.activityId);
  requireEvent(world, input.activityId, "press.interview-completed");
  requireNoEvent(world, input.activityId, "press.story-published");
  if (press.terms === "off-record") {
    throw new Error(
      "Off-record material cannot be published from this interview.",
    );
  }
  const confirmation = requireEvent(
    world,
    input.activityId,
    "press.response-confirmed",
  );
  const wording = requiredContext(
    confirmation.context.immediateReaction,
    "confirmed press wording",
  );
  const attribution =
    press.terms === "on-record"
      ? personName(world.people[press.subjectPersonId]!)
      : press.backgroundAttribution!;
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "press.story-published",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: canonicalIds([
      press.activity.id,
      press.reporterPersonId,
      ...(press.terms === "on-record" ? [press.subjectPersonId] : []),
      ...(press.arrangement.jurisdictionId
        ? [press.arrangement.jurisdictionId]
        : []),
    ]),
    participants: [
      {
        personId: press.reporterPersonId,
        role: "observation:reporter",
        detail: "Published the report",
      },
      ...(press.terms === "on-record"
        ? [
            {
              personId: press.subjectPersonId,
              role: "observation:named-source" as const,
              detail: "Quoted under on-record terms",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [PRESS_TAG, "press.publication", `${TERMS_PREFIX}${press.terms}`],
    summary: `${attribution} said: “${wording}”`,
    context: {
      location: press.arrangement.context.location,
      socialContext: `Reported from an arranged ${press.channel} exchange.`,
      pressure: termsExplanation(press.terms),
      choice: null,
      motivation: "Publish a report under the negotiated attribution terms.",
      immediateReaction: null,
    },
  });
  const storyEvent = lastEvent(next, "press.story-published");
  next = publishPublicEvent(next, {
    stableKey: `${input.stableKey}:publication`,
    sourceEventId: storyEvent.id,
  });
  return next;
}

/** Records one assigned adviser's explicitly fallible reading of a real story. */
export function recordPressAdviserFeedback(
  world: World,
  input: RecordPressAdviserFeedbackInput,
): World {
  const press = requirePressInterview(world, input.activityId);
  requireNoEvent(world, input.activityId, "press.adviser-feedback-given");
  if (input.adviserPersonId !== press.adviserPersonId) {
    throw new Error("Press feedback must come from the assigned adviser.");
  }
  const prepState = workItemState(world, press.preparationWorkItem.id);
  if (!prepState.assignedPersonIds.includes(input.adviserPersonId)) {
    throw new Error("Press feedback requires an actual assigned adviser.");
  }
  const story = requireEvent(world, input.activityId, "press.story-published");
  const publication = (world.history.publications ?? []).find(
    (candidate) =>
      candidate.sourceEventId === story.id &&
      candidate.correctsPublicationId === null,
  );
  if (!publication) {
    throw new Error("Press feedback requires an actual saved publication.");
  }
  const publicationKnowledge = world.history.knowledge.find(
    (candidate) => candidate.id === input.publicationKnowledgeId,
  );
  if (
    !publicationKnowledge ||
    publicationKnowledge.personId !== input.adviserPersonId ||
    publicationKnowledge.eventId !== story.id ||
    publicationKnowledge.learnedAt > world.currentDate ||
    publicationKnowledge.source.kind !== "media" ||
    publicationKnowledge.source.reference !== publication.id
  ) {
    throw new Error(
      "Press feedback requires the assigned adviser's knowledge of this publication.",
    );
  }
  requireText(input.interpretation, "Adviser interpretation");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "press.adviser-feedback-given",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: press.arrangement.jurisdictionId,
    involvedEntityIds: canonicalIds([
      press.activity.id,
      publication.id,
      press.subjectPersonId,
      press.adviserPersonId,
    ]),
    participants: [
      {
        personId: press.adviserPersonId,
        role: "coordination:press-adviser",
        detail: "Offered a fallible interpretation of the published story",
      },
      {
        personId: press.subjectPersonId,
        role: "agency:press-source",
        detail: "Received the adviser's interpretation",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [PRESS_TAG, "press.feedback", "press.feedback:interpretation"],
    summary: "The assigned adviser discussed the published story.",
    context: {
      location: press.arrangement.context.location,
      socialContext: input.interpretation.trim(),
      pressure:
        "This is an adviser's fallible interpretation, not measured public opinion or proof of causation.",
      choice: null,
      motivation: "Review an actual published story.",
      immediateReaction: null,
    },
  });
  const feedbackEvent = lastEvent(next, "press.adviser-feedback-given");
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: press.adviserPersonId,
    eventId: feedbackEvent.id,
    madeAt: next.currentDate,
    audience: "limited",
    statement: input.interpretation.trim(),
    relationshipToTruth: "unknown",
    provenance: {
      kind: "media-record",
      outlet: publication.outletName,
      reference: publication.id,
    },
  });
  return next;
}

/** Pure read model used by written, interactive and condensed UI routes. */
export function projectPressInterview(
  world: World,
  activityId: EntityId,
): PressInterviewProjection {
  assertWorldIntegrity(world);
  const press = requirePressInterview(world, activityId);
  const preparation = findEvent(world, activityId, "press.interview-prepared");
  const draft = findEvent(world, activityId, "press.response-drafted");
  const confirmation = findEvent(world, activityId, "press.response-confirmed");
  const completion = findEvent(world, activityId, "press.interview-completed");
  const story = findEvent(world, activityId, "press.story-published");
  const publication = story
    ? (world.history.publications ?? []).find(
        (candidate) =>
          candidate.sourceEventId === story.id &&
          candidate.correctsPublicationId === null,
      )
    : null;
  const feedback = findEvent(world, activityId, "press.adviser-feedback-given");
  return {
    activityId,
    reporterPersonId: press.reporterPersonId,
    reporterName: personName(world.people[press.reporterPersonId]!),
    subjectPersonId: press.subjectPersonId,
    subjectName: personName(world.people[press.subjectPersonId]!),
    adviserPersonId: press.adviserPersonId,
    adviserName: personName(world.people[press.adviserPersonId]!),
    channel: press.channel,
    terms: press.terms,
    backgroundAttribution: press.backgroundAttribution,
    pitch: press.pitch,
    primaryQuestion: press.primaryQuestion,
    preparationWorkItemId: press.preparationWorkItem.id,
    preparationStatus: workItemState(world, press.preparationWorkItem.id)
      .status,
    knownFacts: preparation
      ? decodeList(preparation.context.socialContext)
      : [],
    likelyFollowUps: preparation
      ? decodeList(preparation.context.pressure)
      : [],
    responseOptions: preparation ? decodeList(preparation.context.choice) : [],
    mode: draft
      ? tagValue(draft, MODE_PREFIX, PRESS_PLAY_MODES, "press mode")
      : null,
    intent: draft
      ? tagValue(draft, INTENT_PREFIX, PRESS_RESPONSE_INTENTS, "press intent")
      : null,
    followUpQuestion: draft?.context.pressure ?? null,
    proposedWording: draft?.context.immediateReaction ?? null,
    confirmedWording: confirmation?.context.immediateReaction ?? null,
    completed: completion !== null,
    publicationId: publication?.id ?? null,
    adviserFeedback: feedback?.context.socialContext ?? null,
    condensedPenaltyApplied: false,
  };
}

interface RequiredPressInterview {
  readonly activity: World["history"]["scheduledActivities"][number];
  readonly arrangement: HistoricalEvent;
  readonly preparationWorkItem: WorkItemRecord;
  readonly subjectPersonId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly channel: PressInterviewChannel;
  readonly terms: PressRecordTerms;
  readonly backgroundAttribution: string | null;
  readonly pitch: string;
  readonly primaryQuestion: string;
}

function requirePressInterview(
  world: World,
  activityId: EntityId,
): RequiredPressInterview {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (!activity) throw new Error(`Missing press activity: ${activityId}`);
  const arrangement = activity.sourceEntityIds
    .map((id) => world.history.events.find((event) => event.id === id))
    .find((event) => event?.type === "press.interview-arranged");
  if (!arrangement || !arrangement.tags.includes(PRESS_TAG)) {
    throw new Error("Scheduled activity is not an arranged press interview.");
  }
  const subject = arrangement.participants.find(
    (participant) => participant.role === "agency:press-source",
  );
  const reporter = arrangement.participants.find(
    (participant) => participant.role === "observation:reporter",
  );
  const adviser = arrangement.participants.find(
    (participant) => participant.role === "coordination:press-adviser",
  );
  if (!subject || !reporter || !adviser) {
    throw new Error("Press arrangement is missing its actual people.");
  }
  const preparationWorkItem = world.history.workItems.find(
    (item) =>
      item.sourceEntityIds.includes(activity.id) &&
      item.sourceEntityIds.includes(arrangement.id),
  );
  if (!preparationWorkItem) {
    throw new Error("Press arrangement is missing its preparation work item.");
  }
  const terms = tagValue(
    arrangement,
    TERMS_PREFIX,
    PRESS_RECORD_TERMS,
    "press terms",
  );
  const channel = tagValue(
    arrangement,
    CHANNEL_PREFIX,
    PRESS_INTERVIEW_CHANNELS,
    "press channel",
  );
  return {
    activity,
    arrangement,
    preparationWorkItem,
    subjectPersonId: subject.personId,
    reporterPersonId: reporter.personId,
    adviserPersonId: adviser.personId,
    terms,
    channel,
    backgroundAttribution:
      terms === "on-background"
        ? requiredContext(
            arrangement.context.immediateReaction,
            "background attribution",
          )
        : null,
    pitch: requiredContext(arrangement.context.motivation, "press pitch"),
    primaryQuestion: requiredContext(
      arrangement.context.socialContext,
      "press question",
    ),
  };
}

function assertReporterRole(
  world: World,
  reporterPersonId: EntityId,
  reporterWorkRoleId: EntityId,
): void {
  const active = activeWorkRelationshipsAt(world, reporterPersonId).find(
    (candidate) => candidate.role.id === reporterWorkRoleId,
  );
  if (
    !active ||
    active.role.occupationClassification !==
      JOURNALISM_OCCUPATION_CLASSIFICATION
  ) {
    throw new Error(
      "An arranged interview requires the reporter's current journalism role.",
    );
  }
}

function assertActualAdviser(
  world: World,
  subjectPersonId: EntityId,
  adviserPersonId: EntityId,
): void {
  const subjectOrganizations = new Set(
    activeWorkRelationshipsAt(world, subjectPersonId)
      .map((entry) => entry.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  const colleague = activeWorkRelationshipsAt(world, adviserPersonId).some(
    (entry) =>
      entry.relationship.organizationId !== null &&
      subjectOrganizations.has(entry.relationship.organizationId),
  );
  if (!colleague) {
    throw new Error(
      "Press preparation requires an adviser currently working with the source.",
    );
  }
}

function assertReporterKnowsEvent(
  world: World,
  reporterPersonId: EntityId,
  eventId: EntityId,
): void {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event || event.occurredAt > world.currentDate) {
    throw new Error(
      "A press question cannot rely on a future or missing event.",
    );
  }
  const directlyKnown = world.history.knowledge.some(
    (knowledge) =>
      knowledge.personId === reporterPersonId &&
      knowledge.eventId === eventId &&
      knowledge.learnedAt <= world.currentDate,
  );
  const published = (world.history.publications ?? []).some(
    (publication) =>
      publication.sourceEventId === eventId &&
      publication.correctsPublicationId === null &&
      publication.publishedAt <= world.currentDate,
  );
  if (!directlyKnown && !published) {
    throw new Error(
      "A press question must be grounded in the reporter's knowledge or an actual publication.",
    );
  }
}

function assertCanonicalPitch(
  world: World,
  pitchClaimId: EntityId,
  subjectPersonId: EntityId,
  reporterPersonId: EntityId,
  pitch: string,
): void {
  const claim = world.history.claims.find(
    (candidate) => candidate.id === pitchClaimId,
  );
  const event = claim
    ? world.history.events.find((candidate) => candidate.id === claim.eventId)
    : null;
  if (
    !claim ||
    !event ||
    claim.speakerPersonId !== subjectPersonId ||
    claim.statement !== pitch.trim() ||
    !event.participants.some(
      (participant) => participant.personId === subjectPersonId,
    ) ||
    !event.participants.some(
      (participant) => participant.personId === reporterPersonId,
    )
  ) {
    throw new Error(
      "A press arrangement requires the source's actual recorded pitch to this reporter.",
    );
  }
}

function claimAudience(terms: PressRecordTerms): ClaimAudience {
  if (terms === "on-record" || terms === "on-background") return "limited";
  return "private";
}

function termsExplanation(terms: PressRecordTerms): string {
  if (terms === "on-record") {
    return "The answer may be published and attributed by name.";
  }
  if (terms === "on-background") {
    return "The answer may be published only under the negotiated attribution.";
  }
  return "The answer may not be published from this exchange.";
}

function findEvent(
  world: World,
  activityId: EntityId,
  type: string,
): HistoricalEvent | null {
  return (
    world.history.events.find(
      (event) =>
        event.type === type && event.involvedEntityIds.includes(activityId),
    ) ?? null
  );
}

function requireEvent(
  world: World,
  activityId: EntityId,
  type: string,
): HistoricalEvent {
  const event = findEvent(world, activityId, type);
  if (!event) throw new Error(`Press interview has not reached ${type}.`);
  return event;
}

function requireNoEvent(
  world: World,
  activityId: EntityId,
  type: string,
): void {
  if (findEvent(world, activityId, type)) {
    throw new Error(`Press interview already recorded ${type}.`);
  }
}

function lastEvent(world: World, type: string): HistoricalEvent {
  const event = world.history.events.at(-1);
  if (!event || event.type !== type) {
    throw new Error(`Expected ${type} at the history frontier.`);
  }
  return event;
}

function tagValue<T extends string>(
  event: HistoricalEvent,
  prefix: string,
  values: readonly T[],
  label: string,
): T {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  const value = tag?.slice(prefix.length) as T | undefined;
  if (!value || !values.includes(value)) {
    throw new Error(`Missing or invalid ${label}.`);
  }
  return value;
}

function controlledPersonId(world: World): EntityId {
  if (world.control.kind !== "person") {
    throw new Error("Press interviews require control of an existing person.");
  }
  return world.control.personId;
}

function requirePerson(world: World, personId: EntityId, label: string): void {
  if (!world.people[personId]) {
    throw new Error(`Press ${label} does not exist: ${personId}`);
  }
}

function requiredContext(value: string | null, label: string): string {
  requireText(value, label);
  return value.trim();
}

function requireText(
  value: string | null | undefined,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function requireTextList(values: readonly string[], label: string): string[] {
  const normalized = values.map((value) => value.trim());
  if (normalized.length === 0 || normalized.some((value) => !value)) {
    throw new Error(`${label} must contain at least one non-empty item.`);
  }
  return normalized;
}

function encodeList(values: readonly string[]): string {
  return `${LIST_PREFIX}${JSON.stringify(values)}`;
}

function decodeList(value: string | null): readonly string[] {
  if (!value?.startsWith(LIST_PREFIX)) return [];
  const parsed: unknown = JSON.parse(value.slice(LIST_PREFIX.length));
  return Array.isArray(parsed) &&
    parsed.every((item) => typeof item === "string")
    ? parsed
    : [];
}

function canonicalIds(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value)) throw new Error(`Invalid ${label}: ${value}`);
}
