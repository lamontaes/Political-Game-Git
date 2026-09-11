import {
  assertNpcAutonomousApplication,
  evaluateDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { activeWorkRelationshipsAt } from "./life-queries";
import { personName } from "./people";
import {
  JOURNALISM_OCCUPATION_CLASSIFICATION,
  PRESS_INTERVIEW_CHANNELS,
  PRESS_RECORD_TERMS,
  arrangePressInterview,
  recordPressAdviserFeedback,
  recordPressPreparation,
  type ArrangedPressInterview,
  type PressInterviewChannel,
  type PressRecordTerms,
} from "./press-interviews";
import {
  recordClaim,
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "./records";
import { currentHistoricalCutoff } from "./queries";
import { resolvePublicationSource } from "./public-information-integrity";
import { workPendingEntriesFor } from "./time-work";
import type {
  EntityId,
  HistoricalEvent,
  SimulationMoment,
  World,
} from "./types";
import { personActionAvailabilityAt } from "./vitality-integrity";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

const REQUEST_TAG = "press.request";
const REQUEST_EVENT_PREFIX = "press.request-event:";
const RESPONSE_PREFIX = "press.request-response:";
const ADVISER_RESPONSE_PREFIX = "press.adviser-response:";
const CHANNEL_PREFIX = "press.request-channel:";
const TERMS_PREFIX = "press.request-terms:";
const BASIS_PREFIX = "press.request-basis:";

export interface EligiblePressReporter {
  readonly personId: EntityId;
  readonly personName: string;
  readonly workRoleId: EntityId;
  readonly workRoleTitle: string;
  readonly knownBasisEventIds: readonly EntityId[];
}

export interface ProjectEligiblePressReportersInput {
  readonly sourcePersonId: EntityId;
  readonly questionBasisEventIds: readonly EntityId[];
}

export interface EligiblePressAdviser {
  readonly personId: EntityId;
  readonly personName: string;
  readonly workRoleId: EntityId;
  readonly workRoleTitle: string;
  readonly organizationId: EntityId;
}

export interface RecordPressRequestInput {
  readonly stableKey: string;
  readonly reporterPersonId: EntityId;
  readonly reporterWorkRoleId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly channel: PressInterviewChannel;
  readonly terms: PressRecordTerms;
  readonly backgroundAttribution: string | null;
  readonly pitch: string;
  readonly primaryQuestion: string;
  readonly questionBasisEventIds: readonly EntityId[];
}

export interface RecordedPressRequest {
  readonly world: World;
  readonly requestEventId: EntityId;
  readonly pitchClaimId: EntityId;
  readonly relationshipInteractionId: EntityId;
}

export interface RecordPressRequestResponseInput {
  readonly stableKey: string;
  readonly requestEventId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly accepted: boolean;
  readonly deferred?: boolean;
  readonly statement: string;
}

export interface RecordedPressRequestResponse {
  readonly world: World;
  readonly responseEventId: EntityId;
}

export interface ProducePressRequestResponseInput {
  readonly stableKey: string;
  readonly requestEventId: EntityId;
}

export interface RecordPressAdviserResponseInput {
  readonly stableKey: string;
  readonly requestEventId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly accepted: boolean;
  readonly statement: string;
}

export interface RecordedPressAdviserResponse {
  readonly world: World;
  readonly responseEventId: EntityId;
}

export interface ProducePressAdviserResponseInput {
  readonly stableKey: string;
  readonly requestEventId: EntityId;
  readonly adviserPersonId: EntityId;
}

export interface ArrangeAcceptedPressInterviewInput {
  readonly stableKey: string;
  readonly requestEventId: EntityId;
  readonly reporterResponseEventId: EntityId;
  readonly adviserResponseEventId?: EntityId | null;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly location: {
    readonly locationKey: string;
    readonly label: string;
  };
  readonly preparationMinutes: number;
}

export interface ProducePressPreparationInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly sourceKnowledgeIds: readonly EntityId[];
}

export interface ProducePressAdviserFeedbackInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly adviserPersonId: EntityId;
}

/** Pure eligibility over existing people, current work and reporter knowledge. */
export function projectEligiblePressReporters(
  world: World,
  input: ProjectEligiblePressReportersInput,
): readonly EligiblePressReporter[] {
  assertWorldIntegrity(world);
  requirePerson(world, input.sourcePersonId, "source");
  const basisIds = canonicalIds(input.questionBasisEventIds);
  if (basisIds.length === 0) return [];
  return world.personOrder.flatMap((personId) => {
    if (personId === input.sourcePersonId) return [];
    const canAsk = basisIds.every((eventId) =>
      reporterCanBeAskedAbout(world, personId, eventId),
    );
    if (!canAsk) return [];
    const knownBasisEventIds = basisIds.filter((eventId) =>
      reporterKnowsEvent(world, personId, eventId),
    );
    return activeWorkRelationshipsAt(world, personId)
      .filter(
        ({ role }) =>
          role.occupationClassification ===
          JOURNALISM_OCCUPATION_CLASSIFICATION,
      )
      .map(({ role }) => ({
        personId,
        personName: personName(world.people[personId]!),
        workRoleId: role.id,
        workRoleTitle: role.title,
        knownBasisEventIds,
      }));
  });
}

/** Pure staffing projection; household or family membership grants nothing. */
export function projectEligiblePressAdvisers(
  world: World,
  sourcePersonId: EntityId,
): readonly EligiblePressAdviser[] {
  assertWorldIntegrity(world);
  requirePerson(world, sourcePersonId, "source");
  const sourceOrganizations = new Set(
    activeWorkRelationshipsAt(world, sourcePersonId)
      .map(({ relationship }) => relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  return world.personOrder.flatMap((personId) => {
    if (personId === sourcePersonId) return [];
    return activeWorkRelationshipsAt(world, personId).flatMap(
      ({ relationship, role }) => {
        const organizationId = relationship.organizationId;
        return organizationId !== null &&
          sourceOrganizations.has(organizationId)
          ? [
              {
                personId,
                personName: personName(world.people[personId]!),
                workRoleId: role.id,
                workRoleTitle: role.title,
                organizationId,
              },
            ]
          : [];
      },
    );
  });
}

/** Records a normal source-to-reporter request; projecting a screen never calls it. */
export function recordPressRequest(
  world: World,
  input: RecordPressRequestInput,
): RecordedPressRequest {
  assertWorldIntegrity(world);
  const sourcePersonId = controlledPersonId(world);
  requireText(input.stableKey, "Press request stable key");
  requireText(input.pitch, "Press pitch");
  requireText(input.primaryQuestion, "Press question");
  assertMember(PRESS_INTERVIEW_CHANNELS, input.channel, "press channel");
  assertMember(PRESS_RECORD_TERMS, input.terms, "press terms");
  if (input.terms === "on-background") {
    requireText(input.backgroundAttribution, "Background attribution");
  } else if (input.backgroundAttribution !== null) {
    throw new Error(
      "Background attribution is only valid for an on-background request.",
    );
  }
  const basisIds = canonicalIds(input.questionBasisEventIds);
  const eligible = projectEligiblePressReporters(world, {
    sourcePersonId,
    questionBasisEventIds: basisIds,
  }).some(
    (candidate) =>
      candidate.personId === input.reporterPersonId &&
      candidate.workRoleId === input.reporterWorkRoleId,
  );
  if (!eligible) {
    throw new Error(
      "A press request requires an existing eligible reporter who knows its basis.",
    );
  }

  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "press.interview-requested",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: canonicalIds([
      sourcePersonId,
      input.reporterPersonId,
      ...(input.jurisdictionId ? [input.jurisdictionId] : []),
    ]),
    participants: [
      {
        personId: sourcePersonId,
        role: "agency:press-source",
        detail: "Made a press request",
      },
      {
        personId: input.reporterPersonId,
        role: "observation:reporter",
        detail: "Received the request without yet accepting it",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      REQUEST_TAG,
      `${CHANNEL_PREFIX}${input.channel}`,
      `${TERMS_PREFIX}${input.terms}`,
      `press.reporter-role:${input.reporterWorkRoleId}`,
      ...basisIds.map((id) => `${BASIS_PREFIX}${id}`),
    ],
    summary: "A source asked an eligible reporter to arrange a press exchange.",
    context: {
      location: null,
      socialContext: input.primaryQuestion.trim(),
      pressure: termsExplanation(input.terms),
      choice: input.channel,
      motivation: input.pitch.trim(),
      immediateReaction: input.backgroundAttribution?.trim() ?? null,
    },
  });
  const request = lastEvent(next, "press.interview-requested");
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: sourcePersonId,
    eventId: request.id,
    madeAt: next.currentDate,
    audience: "limited",
    statement: input.pitch.trim(),
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  const pitchClaimId = next.history.claims.at(-1)!.id;
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:source-knows-request`,
    sourcePersonId,
    request,
    "I made this press request.",
  );
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:reporter-knows-request`,
    input.reporterPersonId,
    request,
    "I received this press request and its proposed terms.",
  );
  next = recordRelationshipInteraction(next, {
    stableKey: `${input.stableKey}:contact`,
    personIds: orderedPair(sourcePersonId, input.reporterPersonId),
    eventId: request.id,
    occurredAt: next.currentDate,
    kind: "exchange:press-request",
    change: "maintained",
    significance: "meaningful",
    summary: "A source made a normal press request to a reporter.",
    tags: [REQUEST_TAG],
  });
  for (const basisId of basisIds) {
    if (reporterKnowsEvent(next, input.reporterPersonId, basisId)) continue;
    const basis = next.history.events.find((event) => event.id === basisId);
    if (!basis || resolvePublicationSource(next, basis) === null) {
      throw new Error(
        "A press request cannot convey a private, future or missing basis.",
      );
    }
    next = recordEventKnowledge(next, {
      stableKey: `${input.stableKey}:reporter-learns-basis:${basisId}`,
      personId: input.reporterPersonId,
      eventId: basisId,
      learnedAt: next.currentDate,
      believedSummary: `The source described this public development: ${basis.summary}`,
      accuracy: "partial",
      confidence: "medium",
      source: {
        kind: "told-by",
        sourcePersonId,
        claimId: null,
      },
    });
  }
  return {
    world: next,
    requestEventId: request.id,
    pitchClaimId,
    relationshipInteractionId: next.history.relationshipInteractions.at(-1)!.id,
  };
}

/** Records the reporter's own accept/decline decision; no response means no arrangement. */
export function recordPressRequestResponse(
  world: World,
  input: RecordPressRequestResponseInput,
): RecordedPressRequestResponse {
  const request = requireRequest(world, input.requestEventId);
  assertNoResponse(
    world,
    request.id,
    "press.interview-request-answered",
    "Reporter already answered this press request.",
  );
  const reporterPersonId = requestReporterId(request);
  if (input.reporterPersonId !== reporterPersonId) {
    throw new Error("Only the requested reporter may answer a press request.");
  }
  requireText(input.statement, "Reporter response");
  if (input.deferred && input.accepted) {
    throw new Error("A deferred press response cannot also be an acceptance.");
  }
  const disposition = input.accepted
    ? "accepted"
    : input.deferred
      ? "deferred"
      : "declined";
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "press.interview-request-answered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: request.jurisdictionId,
    involvedEntityIds: canonicalIds([
      requestSourceId(request),
      reporterPersonId,
    ]),
    participants: [
      {
        personId: reporterPersonId,
        role: "agency:reporter-response",
        detail:
          disposition === "accepted"
            ? "Accepted the proposed terms"
            : disposition === "deferred"
              ? "Deferred the request"
              : "Declined the request",
      },
      {
        personId: requestSourceId(request),
        role: "observation:press-source",
        detail: "Received the reporter's response",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      `${REQUEST_EVENT_PREFIX}${request.id}`,
      `${RESPONSE_PREFIX}${disposition}`,
    ],
    summary:
      disposition === "accepted"
        ? "The reporter accepted the proposed press request and terms."
        : disposition === "deferred"
          ? "The reporter deferred the press request."
          : "The reporter declined the press request.",
    context: {
      location: null,
      socialContext: input.statement.trim(),
      pressure: request.context.pressure,
      choice: disposition,
      motivation: null,
      immediateReaction: null,
    },
  });
  const response = lastEvent(next, "press.interview-request-answered");
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: reporterPersonId,
    eventId: response.id,
    madeAt: next.currentDate,
    audience: "limited",
    statement: input.statement.trim(),
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:reporter-knows`,
    reporterPersonId,
    response,
    input.statement,
  );
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:source-knows`,
    requestSourceId(request),
    response,
    input.statement,
  );
  return { world: next, responseEventId: response.id };
}

/**
 * Makes and records the requested reporter's decision from their current role,
 * knowledge and functional availability. The controlled source supplies no NPC
 * acceptance flag or response wording.
 */
export function producePressRequestResponse(
  world: World,
  input: ProducePressRequestResponseInput,
): RecordedPressRequestResponse {
  const request = requireRequest(world, input.requestEventId);
  const sourcePersonId = requestSourceId(request);
  const reporterPersonId = requestReporterId(request);
  assertNpcAutonomousApplication(world, reporterPersonId);
  const roleId = tagRequired(request, "press.reporter-role:") as EntityId;
  const basisIds = tagValues(request, BASIS_PREFIX);
  const stillEligible = projectEligiblePressReporters(world, {
    sourcePersonId,
    questionBasisEventIds: basisIds,
  }).some(
    (candidate) =>
      candidate.personId === reporterPersonId &&
      candidate.workRoleId === roleId,
  );
  const availability = personActionAvailabilityAt(
    world,
    reporterPersonId,
    currentHistoricalCutoff(world),
  );
  const pendingAssignment = workPendingEntriesFor(world, reporterPersonId).some(
    (entry) =>
      entry.state.assignedPersonIds.includes(reporterPersonId) &&
      entry.state.status !== "completed" &&
      entry.state.status !== "cancelled",
  );
  const evaluation = evaluateDecision(world, {
    stableKey: `${input.stableKey}:decision`,
    decisionType: "press.reporter-request-response",
    actorPersonId: reporterPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:press-request",
      key: request.stableKey,
      entityId: request.id,
    },
    options: [
      {
        key: "accept",
        label: "Accept the request",
        description: "Accept the saved channel, terms, question and basis.",
      },
      {
        key: "defer",
        label: "Defer the request",
        description: "Record that current assigned work must finish first.",
      },
      {
        key: "decline",
        label: "Decline the request",
        description: "Do not create an interview arrangement.",
      },
    ],
    constraints: [
      ...(!stillEligible || availability.status === "blocked"
        ? [
            {
              stableKey: "press:reporter-unavailable",
              optionKey: "accept",
              kind: "availability:reporter",
              explanation: stillEligible
                ? "The reporter cannot take this action at the current frontier."
                : "The reporter no longer has the saved eligible role and knowledge basis.",
              sourceRefs: [],
            },
            {
              stableKey: "press:reporter-cannot-defer-ineligible",
              optionKey: "defer",
              kind: "availability:reporter",
              explanation: stillEligible
                ? "The reporter cannot take this action at the current frontier."
                : "The reporter no longer has the saved eligible role and knowledge basis.",
              sourceRefs: [],
            },
          ]
        : pendingAssignment
          ? [
              {
                stableKey: "press:reporter-assigned-work",
                optionKey: "accept",
                kind: "availability:reporter",
                explanation:
                  "The reporter already has unfinished assigned work.",
                sourceRefs: [],
              },
            ]
          : []),
    ],
    considerations: [
      {
        stableKey: "press:eligible-request",
        optionKey:
          !stillEligible || availability.status === "blocked"
            ? "decline"
            : pendingAssignment
              ? "defer"
              : "accept",
        sourceType: "context:professional-request",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: pendingAssignment
          ? "Current assigned work has to be finished before a new exchange."
          : "The request matches the reporter's current role and existing knowledge.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  const accepted = evaluation.selectedOptionKey === "accept";
  const deferred = evaluation.selectedOptionKey === "defer";
  const channel = tagEnum(
    request,
    CHANNEL_PREFIX,
    PRESS_INTERVIEW_CHANNELS,
    "press channel",
  );
  const terms = tagEnum(
    request,
    TERMS_PREFIX,
    PRESS_RECORD_TERMS,
    "press terms",
  );
  const statement = accepted
    ? `I accept the ${channel} exchange under the proposed ${terms} terms.`
    : deferred
      ? "I need to finish current assigned work before I can take this exchange."
      : stillEligible
        ? "I cannot take this request at the current time."
        : "I cannot accept a request that no longer matches my role or knowledge.";
  return recordPressRequestResponse(next, {
    stableKey: `${input.stableKey}:response`,
    requestEventId: request.id,
    reporterPersonId,
    accepted,
    deferred,
    statement,
  });
}

/** Records willingness from a real current colleague; kinship alone is irrelevant. */
export function recordPressAdviserResponse(
  world: World,
  input: RecordPressAdviserResponseInput,
): RecordedPressAdviserResponse {
  const request = requireRequest(world, input.requestEventId);
  assertNoResponse(
    world,
    request.id,
    "press.adviser-assignment-answered",
    "An adviser already answered this preparation request.",
  );
  const sourcePersonId = requestSourceId(request);
  requirePerson(world, input.adviserPersonId, "adviser");
  assertCurrentColleague(world, sourcePersonId, input.adviserPersonId);
  requireText(input.statement, "Adviser response");
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "press.adviser-assignment-answered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: request.jurisdictionId,
    involvedEntityIds: canonicalIds([sourcePersonId, input.adviserPersonId]),
    participants: [
      {
        personId: input.adviserPersonId,
        role: "agency:adviser-response",
        detail: input.accepted
          ? "Accepted the preparation assignment"
          : "Declined the assignment",
      },
      {
        personId: sourcePersonId,
        role: "observation:press-source",
        detail: "Received the adviser's response",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      `${REQUEST_EVENT_PREFIX}${request.id}`,
      `${ADVISER_RESPONSE_PREFIX}${input.accepted ? "accepted" : "declined"}`,
    ],
    summary: input.accepted
      ? "A current colleague accepted the press preparation assignment."
      : "A current colleague declined the press preparation assignment.",
    context: {
      location: null,
      socialContext: input.statement.trim(),
      pressure: null,
      choice: input.accepted ? "accepted" : "declined",
      motivation: null,
      immediateReaction: null,
    },
  });
  const response = lastEvent(next, "press.adviser-assignment-answered");
  next = recordClaim(next, {
    stableKey: `${input.stableKey}:claim`,
    speakerPersonId: input.adviserPersonId,
    eventId: response.id,
    madeAt: next.currentDate,
    audience: "limited",
    statement: input.statement.trim(),
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:adviser-knows`,
    input.adviserPersonId,
    response,
    input.statement,
  );
  next = recordDirectKnowledge(
    next,
    `${input.stableKey}:source-knows`,
    sourcePersonId,
    response,
    input.statement,
  );
  return { world: next, responseEventId: response.id };
}

/**
 * Makes and records a real current colleague's assignment decision. The
 * controlled source cannot author either the acceptance or the adviser's words.
 */
export function producePressAdviserResponse(
  world: World,
  input: ProducePressAdviserResponseInput,
): RecordedPressAdviserResponse {
  const request = requireRequest(world, input.requestEventId);
  const sourcePersonId = requestSourceId(request);
  requirePerson(world, input.adviserPersonId, "adviser");
  assertNpcAutonomousApplication(world, input.adviserPersonId);
  const isCurrentColleague = projectEligiblePressAdvisers(
    world,
    sourcePersonId,
  ).some((candidate) => candidate.personId === input.adviserPersonId);
  const availability = personActionAvailabilityAt(
    world,
    input.adviserPersonId,
    currentHistoricalCutoff(world),
  );
  const cannotAccept = !isCurrentColleague || availability.status === "blocked";
  const evaluation = evaluateDecision(world, {
    stableKey: `${input.stableKey}:decision`,
    decisionType: "press.adviser-assignment-response",
    actorPersonId: input.adviserPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:press-preparation",
      key: request.stableKey,
      entityId: request.id,
    },
    options: [
      {
        key: "accept",
        label: "Take the assignment",
        description: "Accept the saved press preparation assignment.",
      },
      {
        key: "decline",
        label: "Decline the assignment",
        description: "Do not become the assigned press adviser.",
      },
    ],
    constraints: cannotAccept
      ? [
          {
            stableKey: "press:adviser-unavailable",
            optionKey: "accept",
            kind: "availability:adviser",
            explanation: isCurrentColleague
              ? "The adviser cannot take this action at the current frontier."
              : "The person is not a current colleague of the source.",
            sourceRefs: [],
          },
        ]
      : [],
    considerations: [
      {
        stableKey: "press:current-colleague-assignment",
        optionKey: "accept",
        sourceType: "context:assigned-work",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "The assignment belongs to the person's current shared workplace.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  const accepted = evaluation.selectedOptionKey === "accept";
  const statement = accepted
    ? "I accept the preparation assignment."
    : isCurrentColleague
      ? "I cannot take this preparation assignment at the current time."
      : "I cannot accept an assignment from an office where I do not work.";
  return recordPressAdviserResponse(next, {
    stableKey: `${input.stableKey}:response`,
    requestEventId: request.id,
    adviserPersonId: input.adviserPersonId,
    accepted,
    statement,
  });
}

/** Consumes accepted request records and delegates to the existing arrangement writer. */
export function arrangeAcceptedPressInterview(
  world: World,
  input: ArrangeAcceptedPressInterviewInput,
): ArrangedPressInterview {
  const request = requireRequest(world, input.requestEventId);
  const reporterResponse = requireResponse(
    world,
    input.reporterResponseEventId,
    request.id,
    "press.interview-request-answered",
    `${RESPONSE_PREFIX}accepted`,
    "Reporter consent is required before arranging an interview.",
  );
  const adviserResponse = input.adviserResponseEventId
    ? requireResponse(
        world,
        input.adviserResponseEventId,
        request.id,
        "press.adviser-assignment-answered",
        `${ADVISER_RESPONSE_PREFIX}accepted`,
        "An actual adviser's accepted assignment is required before arranging a prepared interview.",
      )
    : null;
  const sourcePersonId = requestSourceId(request);
  if (sourcePersonId !== controlledPersonId(world)) {
    throw new Error(
      "The recorded press source is no longer the controlled person.",
    );
  }
  const reporterPersonId = requestReporterId(request);
  if (
    !reporterResponse.participants.some(
      ({ personId, role }) =>
        personId === reporterPersonId && role === "agency:reporter-response",
    )
  ) {
    throw new Error(
      "Reporter consent does not belong to the requested reporter.",
    );
  }
  const adviser = adviserResponse?.participants.find(
    ({ role }) => role === "agency:adviser-response",
  );
  if (adviserResponse && !adviser)
    throw new Error("Adviser consent is missing its actual adviser.");
  if (!adviser && input.preparationMinutes !== 0) {
    throw new Error(
      "Preparation minutes require an accepted adviser assignment.",
    );
  }
  const pitchClaim = world.history.claims.find(
    (claim) =>
      claim.eventId === request.id && claim.speakerPersonId === sourcePersonId,
  );
  if (!pitchClaim)
    throw new Error("Press request is missing its canonical pitch claim.");
  const roleId = tagRequired(request, "press.reporter-role:") as EntityId;
  const channel = tagEnum(
    request,
    CHANNEL_PREFIX,
    PRESS_INTERVIEW_CHANNELS,
    "press channel",
  );
  const terms = tagEnum(
    request,
    TERMS_PREFIX,
    PRESS_RECORD_TERMS,
    "press terms",
  );
  const basisIds = tagValues(request, BASIS_PREFIX);
  const contactIds = world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.eventId === request.id &&
        interaction.kind === "exchange:press-request",
    )
    .map((interaction) => interaction.id);
  return arrangePressInterview(world, {
    stableKey: input.stableKey,
    pitchClaimId: pitchClaim.id,
    reporterPersonId,
    reporterWorkRoleId: roleId,
    adviserPersonId: adviser?.personId ?? null,
    jurisdictionId: request.jurisdictionId,
    channel,
    terms,
    backgroundAttribution:
      terms === "on-background"
        ? requiredContext(
            request.context.immediateReaction,
            "background attribution",
          )
        : null,
    pitch: pitchClaim.statement,
    primaryQuestion: requiredContext(
      request.context.socialContext,
      "press question",
    ),
    questionBasisEventIds: basisIds,
    relationshipInteractionIds: contactIds,
    start: input.start,
    end: input.end,
    location: input.location,
    preparationMinutes: input.preparationMinutes,
  });
}

/** Produces a briefing from the assigned adviser's own saved knowledge. */
export function producePressPreparation(
  world: World,
  input: ProducePressPreparationInput,
): World {
  const knowledge = canonicalIds(input.sourceKnowledgeIds).map(
    (knowledgeId) => {
      const record = world.history.knowledge.find(
        (candidate) => candidate.id === knowledgeId,
      );
      if (!record) {
        throw new Error("Press preparation requires saved adviser knowledge.");
      }
      return record;
    },
  );
  const believedSummaries = knowledge.map((record) =>
    record.believedSummary.trim(),
  );
  const likelyFollowUps = believedSummaries.map(
    (summary) => `What in “${summary}” is established, and what remains open?`,
  );
  const responseOptions = [
    `Answer from the adviser's current understanding: ${believedSummaries[0] ?? "No saved understanding is available."}`,
    "Separate the recorded development from any outcome that has not happened.",
  ];
  return recordPressPreparation(world, {
    ...input,
    likelyFollowUps,
    responseOptions,
  });
}

/** Explicitly learns the actual publication, then records fallible adviser feedback. */
export function producePressAdviserFeedback(
  world: World,
  input: ProducePressAdviserFeedbackInput,
): World {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === input.activityId,
  );
  const arrangement = activity?.sourceEntityIds
    .map((id) => world.history.events.find((event) => event.id === id))
    .find((event) => event?.type === "press.interview-arranged");
  const story = world.history.events.find(
    (event) =>
      event.type === "press.story-published" &&
      event.involvedEntityIds.includes(input.activityId),
  );
  if (!arrangement || !story) {
    throw new Error(
      "Adviser feedback requires an arranged, published interview.",
    );
  }
  const adviser = arrangement.participants.find(
    ({ role }) => role === "coordination:press-adviser",
  );
  if (!adviser || adviser.personId !== input.adviserPersonId) {
    throw new Error("Only the assigned adviser may produce press feedback.");
  }
  const publication = (world.history.publications ?? []).find(
    (candidate) =>
      candidate.sourceEventId === story.id &&
      candidate.correctsPublicationId === null,
  );
  if (!publication)
    throw new Error("Adviser feedback requires an actual saved publication.");
  const confirmation = world.history.events.find(
    (event) =>
      event.type === "press.response-confirmed" &&
      event.involvedEntityIds.includes(input.activityId),
  );
  const confirmedWording = requiredContext(
    confirmation?.context.immediateReaction ?? null,
    "confirmed press wording",
  );
  const interpretation =
    `I reviewed “${publication.headline}”. My reading is that the report used the confirmed answer “${confirmedWording}”; ` +
    "that is my interpretation, not measured public opinion.";
  let next = recordEventKnowledge(world, {
    stableKey: `${input.stableKey}:publication-knowledge`,
    personId: input.adviserPersonId,
    eventId: story.id,
    learnedAt: world.currentDate,
    believedSummary: `The adviser reviewed “${publication.headline}”.`,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "media",
      outlet: publication.outletName,
      reference: publication.id,
    },
  });
  const publicationKnowledgeId = next.history.knowledge.at(-1)!.id;
  next = recordPressAdviserFeedback(next, {
    ...input,
    publicationKnowledgeId,
    interpretation,
  });
  return next;
}

function requireRequest(world: World, eventId: EntityId): HistoricalEvent {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    !event ||
    event.type !== "press.interview-requested" ||
    !event.tags.includes(REQUEST_TAG)
  ) {
    throw new Error("Press request does not exist.");
  }
  return event;
}

function requireResponse(
  world: World,
  eventId: EntityId,
  requestEventId: EntityId,
  type: string,
  acceptedTag: string,
  message: string,
): HistoricalEvent {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    !event ||
    event.type !== type ||
    !event.tags.includes(`${REQUEST_EVENT_PREFIX}${requestEventId}`) ||
    !event.tags.includes(acceptedTag)
  ) {
    throw new Error(message);
  }
  return event;
}

function assertNoResponse(
  world: World,
  requestEventId: EntityId,
  type: string,
  message: string,
): void {
  if (
    world.history.events.some(
      (event) =>
        event.type === type &&
        event.tags.includes(`${REQUEST_EVENT_PREFIX}${requestEventId}`),
    )
  ) {
    throw new Error(message);
  }
}

function requestSourceId(request: HistoricalEvent): EntityId {
  const source = request.participants.find(
    ({ role }) => role === "agency:press-source",
  );
  if (!source) throw new Error("Press request is missing its source.");
  return source.personId;
}

function requestReporterId(request: HistoricalEvent): EntityId {
  const reporter = request.participants.find(
    ({ role }) => role === "observation:reporter",
  );
  if (!reporter) throw new Error("Press request is missing its reporter.");
  return reporter.personId;
}

function reporterKnowsEvent(
  world: World,
  reporterPersonId: EntityId,
  eventId: EntityId,
): boolean {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event || event.occurredAt > world.currentDate) return false;
  return (
    world.history.knowledge.some(
      (knowledge) =>
        knowledge.personId === reporterPersonId &&
        knowledge.eventId === eventId &&
        knowledge.learnedAt <= world.currentDate,
    ) ||
    (world.history.publications ?? []).some(
      (publication) =>
        publication.sourceEventId === eventId &&
        publication.correctsPublicationId === null &&
        publication.publishedAt <= world.currentDate,
    )
  );
}

function reporterCanBeAskedAbout(
  world: World,
  reporterPersonId: EntityId,
  eventId: EntityId,
): boolean {
  if (reporterKnowsEvent(world, reporterPersonId, eventId)) return true;
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (!event || event.occurredAt > world.currentDate) return false;
  return resolvePublicationSource(world, event) !== null;
}

function assertCurrentColleague(
  world: World,
  sourcePersonId: EntityId,
  adviserPersonId: EntityId,
): void {
  const organizations = new Set(
    activeWorkRelationshipsAt(world, sourcePersonId)
      .map(({ relationship }) => relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  if (
    !activeWorkRelationshipsAt(world, adviserPersonId).some(
      ({ relationship }) =>
        relationship.organizationId !== null &&
        organizations.has(relationship.organizationId),
    )
  ) {
    throw new Error(
      "A press adviser must be a real current colleague; family relationship alone is insufficient.",
    );
  }
}

function recordDirectKnowledge(
  world: World,
  stableKey: string,
  personId: EntityId,
  event: HistoricalEvent,
  believedSummary: string,
): World {
  return recordEventKnowledge(world, {
    stableKey,
    personId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: believedSummary.trim(),
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

function controlledPersonId(world: World): EntityId {
  if (world.control.kind !== "person")
    throw new Error("Press requests require control of an existing person.");
  return world.control.personId;
}

function requirePerson(world: World, personId: EntityId, label: string): void {
  if (!world.people[personId])
    throw new Error(`Press ${label} does not exist: ${personId}`);
}

function requireText(
  value: string | null | undefined,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${label} must not be empty.`);
}

function requiredContext(value: string | null, label: string): string {
  requireText(value, label);
  return value.trim();
}

function tagRequired(event: HistoricalEvent, prefix: string): string {
  const value = event.tags
    .find((tag) => tag.startsWith(prefix))
    ?.slice(prefix.length);
  if (!value) throw new Error(`Press record is missing ${prefix}`);
  return value;
}

function tagValues(event: HistoricalEvent, prefix: string): EntityId[] {
  return canonicalIds(
    event.tags
      .filter((tag) => tag.startsWith(prefix))
      .map((tag) => tag.slice(prefix.length) as EntityId),
  );
}

function tagEnum<T extends string>(
  event: HistoricalEvent,
  prefix: string,
  values: readonly T[],
  label: string,
): T {
  const value = tagRequired(event, prefix) as T;
  assertMember(values, value, label);
  return value;
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value)) throw new Error(`Invalid ${label}: ${value}`);
}

function termsExplanation(terms: PressRecordTerms): string {
  if (terms === "on-record")
    return "The answer may be published and attributed by name.";
  if (terms === "on-background")
    return "The answer may be published only under the negotiated attribution.";
  return "The answer may not be published from this exchange.";
}

function lastEvent(world: World, type: string): HistoricalEvent {
  const event = world.history.events.at(-1);
  if (!event || event.type !== type)
    throw new Error(`Expected ${type} at the history frontier.`);
  return event;
}

function orderedPair(
  first: EntityId,
  second: EntityId,
): readonly [EntityId, EntityId] {
  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

function canonicalIds(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}
