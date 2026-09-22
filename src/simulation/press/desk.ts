import { addDays } from "../dates";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { scheduleFutureDueItem } from "../future-transitions";
import { personName } from "../people";
import { correctPublication, publishPublicEvent } from "../public-information";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_LEAD_TAG,
  PRESS_STORY_OUTLET_TAG,
  resolvePublicationSource,
} from "../public-information-integrity";
import { currentHistoricalCutoff } from "../queries";
import { recordClaim, recordEventKnowledge } from "../records";
import type {
  DecisionConsideration,
  DecisionConstraint,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  PublicationRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { ACTIVE_STORY_DECISIONS } from "./integrity";
import {
  colleaguesOf,
  partyContactsForSubject,
  produceMatterResponses,
} from "./responses";
import { PRESS_MATTER_TAG, sortedUnique } from "./shared";
import { headlineFor } from "./story-voice";

export { PRESS_MATTER_TAG, sortedUnique } from "./shared";
import {
  mediaOutlets,
  reporterIsCurrent,
  reporterRoles,
  stateOfJurisdiction,
} from "./outlets";
import {
  MEDIA_ACTIVE_ASSIGNMENT_CAPACITY,
  PRESS_CONTRACT_VERSION,
  type LeadRoute,
  type MediaBeat,
  type MediaOutletRecord,
  type ReporterRoleRecord,
  type SourceContributionRecord,
  type StoryDecision,
  type StoryDispositionRecord,
  type StoryFamily,
  type StoryLeadRecord,
} from "./records";
import {
  appendPressRecord,
  pressDispositionsForLead,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";

/**
 * M2 — the reporting lifecycle.
 *
 * public event / record / tip → lead → assignment → subject response request
 * → publish / hold / narrow / decline → follow-up / correction.
 *
 * The desk runs on the canonical clock: a weekly sweep (authored cadence) and
 * exact due items for response windows and editorial checks. Nothing here
 * runs on render, and opening News never writes a story.
 */

export const PRESS_DESK_SWEEP_TRANSITION_KEY = "press:desk-sweep";
export const PRESS_STORY_STEP_TRANSITION_KEY = "press:story-step";

/** Authored intervals (crunch46-provisional-v1), not measured newsroom times. */
export const PRESS_DESK_INTERVALS = {
  sweepDays: 7,
  responseWindowDays: 2,
  routinePublishDays: 1,
  holdRecheckDays: 7,
  routineItemsPerSweep: 1,
} as const;

const RESPONSE_REQUESTED_EVENT = "press.response-requested";
export const SUBJECT_RESPONDED_EVENT = "press.subject-responded";
const EXCLUDED_PREFIXES = [
  "press.",
  "setup.",
  "simulation.",
  "evidence.",
  "information.",
  "time.",
  "claim.",
  "life.",
  "party.chapter",
  // Opening world-state records and publication plumbing are not occurrences.
  "world.",
  "publication.",
];

export function storyLeads(world: World): readonly StoryLeadRecord[] {
  return pressRecordsOfKind(world, "story-lead");
}

export function dispositionsForLead(
  world: World,
  leadId: EntityId,
): readonly StoryDispositionRecord[] {
  return pressDispositionsForLead(world, leadId);
}

export function latestDisposition(
  world: World,
  leadId: EntityId,
): StoryDispositionRecord | null {
  return dispositionsForLead(world, leadId).at(-1) ?? null;
}

export function activeAssignments(
  world: World,
  outletId: EntityId,
): readonly StoryLeadRecord[] {
  return storyLeads(world).filter((lead) => {
    if (lead.outletId !== outletId) return false;
    const latest = latestDisposition(world, lead.id);
    return latest !== null && ACTIVE_STORY_DECISIONS.includes(latest.decision);
  });
}

export function assignedReporter(
  world: World,
  leadId: EntityId,
): EntityId | null {
  return (
    [...dispositionsForLead(world, leadId)]
      .reverse()
      .find((record) => record.reporterPersonId !== null)?.reporterPersonId ??
    null
  );
}

/** Schedules the first weekly desk sweep for a new life. Idempotent. */
export function ensurePressDeskSchedule(world: World): World {
  const stableKey = "press46:desk-sweep:0";
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, PRESS_DESK_INTERVALS.sweepDays),
    transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: PRESS_CONTRACT_VERSION },
  });
}

export interface RecordStoryLeadInput {
  readonly stableKey: string;
  readonly outletId: EntityId;
  readonly family: StoryFamily;
  readonly route: LeadRoute;
  readonly basisEventIds: readonly EntityId[];
  readonly subjectPersonIds: readonly EntityId[];
  readonly jurisdictionId: EntityId | null;
  readonly matterId: EntityId | null;
  readonly followsPublicationId: EntityId | null;
}

export function recordStoryLead(
  world: World,
  input: RecordStoryLeadInput,
): { readonly world: World; readonly lead: StoryLeadRecord } {
  const appended = appendPressRecord(world, "story-lead", {
    ...input,
    basisEventIds: sortedUnique(input.basisEventIds),
    subjectPersonIds: sortedUnique(input.subjectPersonIds),
    receivedAt: world.currentDate,
  });
  return { world: appended.world, lead: appended.record };
}

function writeDisposition(
  world: World,
  lead: StoryLeadRecord,
  decision: StoryDecision,
  fields: Partial<
    Pick<
      StoryDispositionRecord,
      | "reporterPersonId"
      | "decisionTraceId"
      | "eventId"
      | "publicationId"
      | "responseDueAt"
      | "contributionIds"
    >
  > & { readonly reasonKey: string },
): World {
  const count = dispositionsForLead(world, lead.id).length;
  return appendPressRecord(world, "story-disposition", {
    stableKey: `${lead.stableKey}:step:${count}`,
    leadId: lead.id,
    decision,
    reporterPersonId: fields.reporterPersonId ?? null,
    reasonKey: fields.reasonKey,
    decidedAt: world.currentDate,
    decisionTraceId: fields.decisionTraceId ?? null,
    eventId: fields.eventId ?? null,
    publicationId: fields.publicationId ?? null,
    responseDueAt: fields.responseDueAt ?? null,
    contributionIds: fields.contributionIds ?? [],
  }).world;
}

/**
 * The outlet decides whether a lead becomes an assignment. A lead can be
 * declined (no story), queued (capacity is full), or taken by one current
 * reporter whose beat and geography fit. Capacity is a workload limit.
 */
export function assignStory(world: World, leadId: EntityId): World {
  const lead = requirePressRecord(world, "story-lead", leadId);
  const latest = latestDisposition(world, lead.id);
  if (latest && latest.decision !== "queued") return world;
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  const beat = beatForLead(world, lead);
  const reporter = chooseReporter(world, outlet, lead, beat);
  if (!reporter) {
    return writeDisposition(world, lead, "declined", {
      reasonKey: "press:no-current-reporter-for-beat",
    });
  }
  const capacity = MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier];
  if (activeAssignments(world, outlet.id).length >= capacity) {
    return latest
      ? world
      : writeDisposition(world, lead, "queued", {
          reasonKey: "press:capacity-full",
        });
  }
  const considerations: DecisionConsideration[] = [
    {
      stableKey: "press:beat-fit",
      optionKey: reporter.beats.includes(beat) ? "take" : "pass",
      sourceType: "context:professional-role",
      direction: "supports",
      importance: reporter.beats.includes(beat) ? "strong" : "moderate",
      confidence: "high",
      explanation: reporter.beats.includes(beat)
        ? "The lead is on this reporter's beat."
        : "The lead is outside this reporter's usual beat.",
      sourceRefs: [],
    },
  ];
  if (lead.subjectPersonIds.length > 0 || lead.matterId !== null) {
    considerations.push({
      stableKey: "press:public-accountability",
      optionKey: "take",
      sourceType: "context:public-interest",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation:
        "The lead concerns identifiable public actors and a documented record.",
      sourceRefs: [],
    });
  }
  if (lead.family === "scheduled-beat" && lead.subjectPersonIds.length === 0) {
    considerations.push({
      stableKey: "press:routine-item",
      optionKey: "pass",
      sourceType: "context:editorial-judgment",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation:
        "A routine public record may not need a separate story; the public record already exists.",
      sourceRefs: [],
    });
  }
  const evaluation = evaluateDecision(world, {
    stableKey: `${lead.stableKey}:take`,
    decisionType: "press.story-assignment",
    actorPersonId: reporter.personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:story-lead",
      key: lead.stableKey,
      entityId: lead.basisEventIds[0]!,
    },
    options: [
      {
        key: "take",
        label: "Take the story",
        description: "Report this lead.",
      },
      {
        key: "pass",
        label: "No story",
        description: "Not every public event needs a story.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const traceId = next.history.decisionTraces.at(-1)!.id;
  if (evaluation.selectedOptionKey !== "take") {
    return writeDisposition(next, lead, "declined", {
      reporterPersonId: reporter.personId,
      decisionTraceId: traceId,
      reasonKey: "press:reporter-chose-no-story",
    });
  }
  next = writeDisposition(next, lead, "assigned", {
    reporterPersonId: reporter.personId,
    decisionTraceId: traceId,
    reasonKey: `press:beat:${beat}`,
  });
  if (needsSubjectResponse(lead)) {
    return requestSubjectResponse(next, lead.id);
  }
  return scheduleStoryStep(
    next,
    lead,
    addDays(next.currentDate, PRESS_DESK_INTERVALS.routinePublishDays),
  );
}

function needsSubjectResponse(lead: StoryLeadRecord): boolean {
  return (
    lead.subjectPersonIds.length > 0 &&
    (lead.family === "allegation" ||
      lead.family === "records" ||
      lead.family === "follow-up" ||
      lead.family === "press-request" ||
      lead.family === "campaign-activity" ||
      lead.family === "scheduled-beat")
  );
}

/**
 * Before a story about a person publishes, the outlet normally asks for a
 * response (AP/Reuters fairness via ALIVE44 chunk 5). Silence is recorded as
 * silence, never as evidence.
 */
export function requestSubjectResponse(world: World, leadId: EntityId): World {
  const lead = requirePressRecord(world, "story-lead", leadId);
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  const reporterId = assignedReporter(world, lead.id);
  if (!reporterId) throw new Error("A response request needs a reporter.");
  const reporter = world.people[reporterId]!;
  const dueAt = addDays(
    world.currentDate,
    PRESS_DESK_INTERVALS.responseWindowDays,
  );
  const question = storyQuestion(world, lead);
  const subjects = lead.subjectPersonIds.filter((id) => world.people[id]);
  let next = recordWorldEvent(world, {
    stableKey: `${lead.stableKey}:response-request`,
    type: RESPONSE_REQUESTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: lead.jurisdictionId,
    involvedEntityIds: sortedUnique([reporterId, ...subjects, lead.id]),
    participants: [
      {
        personId: reporterId,
        role: "agency:reporter",
        detail: `Asked for a response for ${outlet.name}`,
      },
      ...subjects.map((personId) => ({
        personId,
        role: "focus:story-subject" as const,
        detail: "Asked to respond before publication",
      })),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_STORY_OUTLET_TAG}${outlet.id}`,
      `${PRESS_STORY_LEAD_TAG}${lead.id}`,
      ...(lead.matterId ? [`${PRESS_MATTER_TAG}${lead.matterId}`] : []),
    ],
    summary: `${personName(reporter)} of ${outlet.name} asked for a response before ${dueAt}.`,
    context: {
      location: null,
      socialContext: question,
      pressure: `Responses received by ${dueAt} can be included. No response is reported as no response, not as an admission.`,
      choice: null,
      motivation: "Seek the subject's response before publishing.",
      immediateReaction: null,
    },
  });
  const request = next.history.events.at(-1)!;
  for (const personId of subjects) {
    next = recordEventKnowledge(next, {
      stableKey: `${lead.stableKey}:response-request:known:${personId}`,
      personId,
      eventId: request.id,
      learnedAt: next.currentDate,
      believedSummary: request.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  next = writeDisposition(next, lead, "response-requested", {
    reporterPersonId: reporterId,
    eventId: request.id,
    responseDueAt: dueAt,
    reasonKey: "press:fair-comment-request",
  });
  return scheduleStoryStep(next, lead, dueAt);
}

export interface SubjectResponseInput {
  readonly leadId: EntityId;
  readonly personId: EntityId;
  /** "decline" records a refusal to comment; nothing is claimed. */
  readonly kind: "answer" | "decline";
  /** Exact words, shown to the player before commitment. */
  readonly statement: string;
  /** Extra event tags (a PEOPLE claim-stance tag) carried on the response. */
  readonly tags?: readonly string[];
}

/**
 * Records a subject's response inside the window. The caller (the PEOPLE
 * claim adapter in `interviews.ts`) writes the claim; this records the
 * occurrence the claim is attached to.
 */
export function recordSubjectResponse(
  world: World,
  input: SubjectResponseInput,
): { readonly world: World; readonly eventId: EntityId } {
  const lead = requirePressRecord(world, "story-lead", input.leadId);
  // The request itself, not whatever was written last: on a story with two
  // subjects, the first answer must not make the second one late.
  const request = openResponseRequest(world, lead.id);
  if (!request) {
    throw new Error("This story is not waiting for a response.");
  }
  const latest = request;
  if (!lead.subjectPersonIds.includes(input.personId)) {
    throw new Error("Only a story subject can respond to this request.");
  }
  if (
    dispositionsForLead(world, lead.id).some(
      (record) =>
        record.decision === "subject-responded" &&
        responderOf(world, record) === input.personId,
    )
  ) {
    throw new Error("This subject already responded.");
  }
  const reporterId = latest.reporterPersonId!;
  const statement = input.statement.trim();
  if (!statement) throw new Error("A response needs its exact words.");
  let next = recordWorldEvent(world, {
    stableKey: `${lead.stableKey}:response:${input.personId}`,
    type: SUBJECT_RESPONDED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: lead.jurisdictionId,
    involvedEntityIds: sortedUnique([input.personId, reporterId, lead.id]),
    participants: [
      {
        personId: input.personId,
        role: "agency:press-source",
        detail:
          input.kind === "decline"
            ? "Declined to comment"
            : "Answered on the record",
      },
      {
        personId: reporterId,
        role: "observation:reporter",
        detail: "Received the response",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      PRESS_CONTRACT_VERSION,
      `${PRESS_STORY_LEAD_TAG}${lead.id}`,
      `press.response-kind:${input.kind}`,
      "press.terms:on-record",
      ...(input.tags ?? []),
    ],
    summary:
      input.kind === "decline"
        ? `${personName(world.people[input.personId]!)} declined to comment.`
        : `${personName(world.people[input.personId]!)} responded on the record.`,
    context: {
      location: null,
      socialContext: latest.eventId
        ? (world.history.events.find((event) => event.id === latest.eventId)
            ?.context.socialContext ?? null)
        : null,
      pressure: null,
      choice: input.kind,
      motivation: null,
      immediateReaction: statement,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = writeDisposition(next, lead, "subject-responded", {
    reporterPersonId: reporterId,
    eventId,
    reasonKey: `press:subject-${input.kind}`,
  });
  return { world: next, eventId };
}

function responderOf(
  world: World,
  record: StoryDispositionRecord,
): EntityId | null {
  const event = world.history.events.find((item) => item.id === record.eventId);
  return (
    event?.participants.find((entry) => entry.role === "agency:press-source")
      ?.personId ?? null
  );
}

function scheduleStoryStep(
  world: World,
  lead: StoryLeadRecord,
  dueAt: IsoDate,
): World {
  const count = world.history.futureDueItems.filter((item) =>
    item.stableKey.startsWith(`press46:story-step:${lead.id}:`),
  ).length;
  const reporterId = assignedReporter(world, lead.id);
  return scheduleFutureDueItem(world, {
    stableKey: `press46:story-step:${lead.id}:${count}`,
    dueAt,
    transitionKey: PRESS_STORY_STEP_TRANSITION_KEY,
    entityIds: sortedUnique([
      lead.basisEventIds[0]!,
      ...(reporterId ? [reporterId] : []),
    ]),
    jurisdictionId: lead.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [lead.basisEventIds[0]!],
    },
  });
}

function leadIdFromStepKey(stableKey: string): EntityId {
  const rest = stableKey.slice("press46:story-step:".length);
  return rest.slice(0, rest.lastIndexOf(":")) as EntityId;
}

/**
 * An editorial checkpoint. Non-player subjects answer (or not) from what they
 * know; then the reporter decides to publish, hold, narrow or drop the story.
 */
export function pressStoryStepHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PRESS_STORY_STEP_TRANSITION_KEY) {
    throw new Error("The story step handler received another transition.");
  }
  const leadId = leadIdFromStepKey(dueItem.stableKey);
  const lead = storyLeads(world).find((record) => record.id === leadId);
  const latest = lead ? latestDisposition(world, lead.id) : null;
  if (!lead || !latest || !ACTIVE_STORY_DECISIONS.includes(latest.decision)) {
    return cancelled(world, "press:story-no-longer-active");
  }
  const reporterId = assignedReporter(world, lead.id)!;
  const role = reporterRoles(world, lead.outletId).find(
    (candidate) => candidate.personId === reporterId,
  );
  if (!role || !reporterIsCurrent(world, role)) {
    return {
      world: writeDisposition(world, lead, "declined", {
        reporterPersonId: reporterId,
        reasonKey: "press:reporter-unavailable",
      }),
      status: "resolved",
      reasonKey: "press:story-dropped",
      context: null,
      outcomeEventId: null,
    };
  }
  let next = world;
  if (
    dispositionsForLead(next, lead.id).some(
      (r) => r.decision === "response-requested",
    )
  ) {
    next = produceNonPlayerResponses(next, lead);
  }
  return editorialDecision(next, lead, reporterId);
}

/**
 * The response request a subject can still answer: asked, not yet withdrawn by
 * a later decision, and still inside its own window.
 */
function openResponseRequest(world: World, leadId: EntityId) {
  const dispositions = dispositionsForLead(world, leadId);
  const request = [...dispositions]
    .reverse()
    .find((record) => record.decision === "response-requested");
  if (!request || request.responseDueAt === null) return null;
  if (world.currentDate > request.responseDueAt) return null;
  // A story that has since been published, held, narrowed or dropped is no
  // longer waiting for anybody.
  const settled = dispositions.some(
    (record) =>
      record.sequence > request.sequence &&
      record.decision !== "subject-responded",
  );
  return settled ? null : request;
}

function produceNonPlayerResponses(world: World, lead: StoryLeadRecord): World {
  let next = world;
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  // Only while the window is actually open. A step that fires on or after the
  // deadline finds it closed, and silence is then the answer — which is what
  // the story already reports as no response, never as an admission.
  if (!openResponseRequest(next, lead.id)) return next;
  for (const personId of lead.subjectPersonIds) {
    if (personId === controlled || !next.people[personId]) continue;
    const answered = dispositionsForLead(next, lead.id).some(
      (record) =>
        record.decision === "subject-responded" &&
        responderOf(next, record) === personId,
    );
    if (answered) continue;
    const matter = lead.matterId
      ? requirePressRecord(next, "matter", lead.matterId)
      : null;
    const occurrence = matter?.occurrenceId
      ? requirePressRecord(next, "financial-occurrence", matter.occurrenceId)
      : null;
    const involved = occurrence?.actorPersonIds.includes(personId) ?? false;
    const evaluation = evaluateDecision(next, {
      stableKey: `${lead.stableKey}:npc-response:${personId}`,
      decisionType: "press.subject-response",
      actorPersonId: personId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:press-request",
        key: lead.stableKey,
        entityId: lead.basisEventIds[0]!,
      },
      options: [
        {
          key: "dispute",
          label: "Dispute it",
          description: "Say the account is wrong.",
        },
        {
          key: "decline",
          label: "Decline to comment",
          description: "Say nothing on the record.",
        },
        {
          key: "no-response",
          label: "Do not respond",
          description: "Let the deadline pass.",
        },
      ],
      constraints: matter
        ? []
        : [
            {
              stableKey: "press:nothing-to-dispute",
              optionKey: "dispute",
              kind: "knowledge:no-allegation",
              explanation: "There is no allegation to dispute.",
              sourceRefs: [],
            },
          ],
      considerations: [
        {
          stableKey: "press:own-knowledge",
          optionKey: matter && !involved ? "dispute" : "decline",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation:
            matter && !involved
              ? "This person has no record of doing what is alleged."
              : "Saying nothing on the record avoids committing to an account.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    if (evaluation.selectedOptionKey === "no-response") continue;
    const dispute = evaluation.selectedOptionKey === "dispute";
    const statement = dispute
      ? "That account is not accurate."
      : "I have no comment.";
    const recorded = recordSubjectResponse(next, {
      leadId: lead.id,
      personId,
      kind: dispute ? "answer" : "decline",
      statement,
    });
    next = recorded.world;
    if (dispute) {
      next = recordClaim(next, {
        stableKey: `${lead.stableKey}:npc-response:${personId}:claim`,
        speakerPersonId: personId,
        eventId: recorded.eventId,
        madeAt: next.currentDate,
        audience: "limited",
        statement,
        relationshipToTruth: involved ? "contradicts" : "unknown",
        provenance: { kind: "direct-record" },
      });
    }
  }
  return next;
}

interface StoryMaterial {
  readonly usable: readonly SourceContributionRecord[];
  readonly offRecordOnly: readonly SourceContributionRecord[];
  readonly publicBasis: readonly HistoricalEvent[];
  readonly corroborated: boolean;
  readonly needsCorroboration: boolean;
}

/**
 * Editorial constraints from AP/Reuters as recorded in ALIVE44 chunk 5:
 * prefer named sources, corroborate anonymous information, and never publish
 * off-record material. These are rules, not probabilities.
 */
export function storyMaterial(
  world: World,
  lead: StoryLeadRecord,
): StoryMaterial {
  const agreements = pressRecordsOfKind(world, "source-agreement").filter(
    (agreement) =>
      agreement.outletId === lead.outletId &&
      (agreement.leadId === lead.id || agreement.leadId === null),
  );
  const contributions = pressRecordsOfKind(world, "source-contribution").filter(
    (contribution) => {
      const agreement = agreements.find(
        (a) => a.id === contribution.agreementId,
      );
      if (!agreement) return false;
      if (agreement.leadId === lead.id) return true;
      return contribution.subjectPersonIds.some((id) =>
        lead.subjectPersonIds.includes(id),
      );
    },
  );
  const usable = contributions.filter(
    (contribution) =>
      agreements.find((a) => a.id === contribution.agreementId)!.publiclyUsable,
  );
  const offRecordOnly = contributions.filter(
    (contribution) =>
      !agreements.find((a) => a.id === contribution.agreementId)!
        .publiclyUsable,
  );
  const publicBasis = lead.basisEventIds
    .map((id) => world.history.events.find((event) => event.id === id)!)
    .filter((event) => event.visibility === "public");
  const named = usable.some(
    (contribution) =>
      agreements.find((a) => a.id === contribution.agreementId)!.terms ===
      "on-record",
  );
  const distinctSources = new Set(
    usable.map(
      (contribution) =>
        agreements.find((a) => a.id === contribution.agreementId)!
          .sourcePersonId,
    ),
  ).size;
  const documentary = usable.some(
    (contribution) => contribution.leakedEvidenceArtifactIds.length > 0,
  );
  const needsCorroboration =
    (lead.family === "allegation" || lead.family === "records") &&
    publicBasis.length === 0;
  const corroborated =
    !needsCorroboration ||
    named ||
    distinctSources >= 2 ||
    (distinctSources >= 1 && documentary);
  return {
    usable,
    offRecordOnly,
    publicBasis,
    corroborated,
    needsCorroboration,
  };
}

function editorialDecision(
  world: World,
  lead: StoryLeadRecord,
  reporterId: EntityId,
): FutureTransitionHandlerResult {
  const material = storyMaterial(world, lead);
  const history = dispositionsForLead(world, lead.id);
  const alreadyHeld = history.some((record) => record.decision === "held");
  const canPublishFull = material.corroborated;
  const canNarrow = !material.corroborated && material.publicBasis.length > 0;
  const constraints: DecisionConstraint[] = [];
  if (!canPublishFull) {
    constraints.push({
      stableKey: "press:uncorroborated",
      optionKey: "publish",
      kind: "editorial:corroboration",
      explanation:
        "Anonymous information needs a named source, a second source or a document before it runs.",
      sourceRefs: [],
    });
  }
  if (!canNarrow) {
    constraints.push({
      stableKey: "press:nothing-public-to-narrow-to",
      optionKey: "narrow",
      kind: "editorial:corroboration",
      explanation: "There is no public record to report on its own.",
      sourceRefs: [],
    });
  }
  if (alreadyHeld) {
    constraints.push({
      stableKey: "press:already-held",
      optionKey: "hold",
      kind: "editorial:timeliness",
      explanation: "The story was already held once for verification.",
      sourceRefs: [],
    });
  }
  const preferred = canPublishFull
    ? "publish"
    : canNarrow
      ? "narrow"
      : alreadyHeld
        ? "decline"
        : "hold";
  const evaluation = evaluateDecision(world, {
    stableKey: `${lead.stableKey}:editorial:${history.length}`,
    decisionType: "press.editorial-disposition",
    actorPersonId: reporterId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:story-lead",
      key: lead.stableKey,
      entityId: lead.basisEventIds[0]!,
    },
    options: [
      { key: "publish", label: "Publish", description: "Run the story now." },
      { key: "hold", label: "Hold", description: "Wait for verification." },
      {
        key: "narrow",
        label: "Narrow",
        description: "Run only what the public record supports.",
      },
      { key: "decline", label: "Drop", description: "Run no story." },
    ],
    constraints,
    considerations: [
      {
        stableKey: "press:editorial-standard",
        optionKey: preferred,
        sourceType: "context:editorial-judgment",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          preferred === "publish"
            ? "The account is sourced to the outlet's standard."
            : preferred === "narrow"
              ? "Only the public record meets the outlet's standard."
              : preferred === "hold"
                ? "The account needs verification before it can run."
                : "The account could not be verified.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  let next = recordDurableDecisionTrace(world, evaluation);
  const traceId = next.history.decisionTraces.at(-1)!.id;
  const choice = evaluation.selectedOptionKey ?? "decline";
  if (choice === "hold") {
    next = writeDisposition(next, lead, "held", {
      reporterPersonId: reporterId,
      decisionTraceId: traceId,
      reasonKey: "press:held-for-verification",
    });
    next = scheduleStoryStep(
      next,
      lead,
      addDays(next.currentDate, PRESS_DESK_INTERVALS.holdRecheckDays),
    );
    return resolved(next, "press:story-held", null);
  }
  if (choice === "decline") {
    next = writeDisposition(next, lead, "declined", {
      reporterPersonId: reporterId,
      decisionTraceId: traceId,
      reasonKey: "press:could-not-verify",
    });
    return resolved(next, "press:story-dropped", null);
  }
  const narrowed = choice === "narrow";
  const published = publishStory(next, lead, reporterId, {
    contributions: narrowed ? [] : material.usable,
    narrowed,
    decisionTraceId: traceId,
  });
  return resolved(published.world, "press:story-published", published.eventId);
}

function publishStory(
  world: World,
  lead: StoryLeadRecord,
  reporterId: EntityId,
  input: {
    readonly contributions: readonly SourceContributionRecord[];
    readonly narrowed: boolean;
    readonly decisionTraceId: EntityId;
  },
): { readonly world: World; readonly eventId: EntityId } {
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  const copy = composeStory(world, lead, reporterId, input.contributions);
  const subjects = lead.subjectPersonIds.filter((id) => world.people[id]);
  let next = recordWorldEvent(world, {
    stableKey: `${lead.stableKey}:story`,
    type: PRESS_STORY_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: lead.jurisdictionId,
    involvedEntityIds: sortedUnique([
      reporterId,
      outlet.organizationId,
      lead.id,
      ...subjects,
    ]),
    participants: [
      {
        personId: reporterId,
        role: "agency:reporter",
        detail: `Reported for ${outlet.name}`,
      },
      ...subjects.map((personId) => ({
        personId,
        role: "focus:story-subject" as const,
        detail: "Named in the story",
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      PRESS_CONTRACT_VERSION,
      "press.publication",
      `${PRESS_STORY_OUTLET_TAG}${outlet.id}`,
      `${PRESS_STORY_LEAD_TAG}${lead.id}`,
      `press.family:${lead.family}`,
      ...(lead.matterId ? [`${PRESS_MATTER_TAG}${lead.matterId}`] : []),
      ...(input.narrowed ? ["press.narrowed"] : []),
      ...(copy.unattributedAssertion ? ["press.unattributed-assertion"] : []),
    ],
    summary: copy.headline,
    context: {
      location: null,
      socialContext: copy.body,
      pressure: null,
      choice: null,
      motivation: `Reported by ${personName(world.people[reporterId]!)} for ${outlet.name}.`,
      immediateReaction: null,
    },
  });
  const story = next.history.events.at(-1)!;
  next = publishPublicEvent(next, {
    stableKey: `${lead.stableKey}:publication`,
    sourceEventId: story.id,
    outletId: outlet.id,
  });
  const publication = next.history.publications!.at(-1)!;
  next = writeDisposition(
    next,
    lead,
    input.narrowed ? "narrowed" : "published",
    {
      reporterPersonId: reporterId,
      decisionTraceId: input.decisionTraceId,
      reasonKey: input.narrowed
        ? "press:narrowed-to-public-record"
        : "press:published",
      eventId: story.id,
      publicationId: input.narrowed ? null : publication.id,
      contributionIds: input.contributions.map(
        (contribution) => contribution.id,
      ),
    },
  );
  if (input.narrowed) {
    next = writeDisposition(next, lead, "published", {
      reporterPersonId: reporterId,
      reasonKey: "press:published-narrowed",
      eventId: story.id,
      publicationId: publication.id,
    });
  }
  next = recordProfessionalReaders(next, lead, story, publication);
  return { world: next, eventId: story.id };
}

/**
 * Publication is not knowledge. The people who read a story here are only
 * those with a recorded professional reason to follow it: its subjects and
 * their current colleagues. Nobody else learns anything from this write.
 */
function recordProfessionalReaders(
  world: World,
  lead: StoryLeadRecord,
  story: HistoricalEvent,
  publication: PublicationRecord,
): World {
  const readers = new Set<EntityId>();
  for (const subjectId of lead.subjectPersonIds) {
    if (!world.people[subjectId]) continue;
    readers.add(subjectId);
    for (const colleague of colleaguesOf(world, subjectId))
      readers.add(colleague);
    for (const organizer of partyContactsForSubject(world, subjectId)) {
      readers.add(organizer);
    }
  }
  let next = world;
  for (const personId of [...readers].sort()) {
    next = recordEventKnowledge(next, {
      stableKey: `${publication.stableKey}:read:${personId}`,
      personId,
      eventId: story.id,
      learnedAt: next.currentDate,
      believedSummary: `${publication.outletName} reported: ${story.summary}`,
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "media",
        outlet: publication.outletName,
        reference: publication.id,
      },
    });
  }
  if (lead.matterId) {
    next = produceMatterResponses(next, lead.matterId, story);
  }
  return next;
}

interface StoryCopy {
  readonly headline: string;
  readonly body: string;
  readonly unattributedAssertion: boolean;
}

/**
 * Story copy is assembled only from recorded words: basis event summaries,
 * source statements under their negotiated attribution, recorded responses
 * and procedure status. Nothing is paraphrased into a new quote.
 */
export function composeStory(
  world: World,
  lead: StoryLeadRecord,
  reporterId: EntityId,
  contributions: readonly SourceContributionRecord[],
): StoryCopy {
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  const basis = lead.basisEventIds.map((id) =>
    world.history.events.find((event) => event.id === id)!,
  );
  const publicBasis = basis.filter((event) => event.visibility === "public");
  const paragraphs: string[] = [];
  let unattributedAssertion = false;
  for (const event of publicBasis) {
    // The body keeps the record's sentence. Only the headline is written for a
    // reader, because a paragraph the record wrote is still the record's words
    // and rewriting every one of them is where invention starts.
    paragraphs.push(event.summary);
  }
  for (const contribution of contributions) {
    const agreement = requirePressRecord(
      world,
      "source-agreement",
      contribution.agreementId,
    );
    const claim = contribution.claimId
      ? world.history.claims.find((c) => c.id === contribution.claimId)
      : null;
    const source = world.people[agreement.sourcePersonId]!;
    if (claim) {
      if (agreement.terms === "on-record") {
        paragraphs.push(`${personName(source)} said: “${claim.statement}”`);
      } else if (agreement.terms === "background") {
        paragraphs.push(
          `${capitalize(agreement.attributionLabel!)} said: “${claim.statement}”`,
        );
      } else {
        unattributedAssertion = true;
        paragraphs.push(`${outlet.name} has learned: ${claim.statement}`);
      }
    }
    if (contribution.leakedEvidenceArtifactIds.length > 0) {
      paragraphs.push(
        agreement.terms === "on-record"
          ? `${personName(source)} provided records to ${outlet.name}.`
          : `${outlet.name} reviewed records provided by a source.`,
      );
    }
  }
  for (const subjectId of lead.subjectPersonIds) {
    const subject = world.people[subjectId];
    if (!subject) continue;
    const response = dispositionsForLead(world, lead.id)
      .filter((record) => record.decision === "subject-responded")
      .map((record) =>
        world.history.events.find((event) => event.id === record.eventId)!,
      )
      .find((event) =>
        event.participants.some(
          (entry) =>
            entry.personId === subjectId &&
            entry.role === "agency:press-source",
        ),
      );
    const requested = dispositionsForLead(world, lead.id).some(
      (record) => record.decision === "response-requested",
    );
    if (response) {
      paragraphs.push(
        response.tags.includes("press.response-kind:decline")
          ? `${personName(subject)} declined to comment.`
          : `${personName(subject)} said: “${response.context.immediateReaction}”`,
      );
    } else if (requested) {
      paragraphs.push(
        `${personName(subject)} did not respond by publication time.`,
      );
    }
  }
  const status = lead.matterId
    ? procedureStatusSentence(world, lead.matterId)
    : null;
  if (status) paragraphs.push(status);
  const leadEvent = publicBasis[0] ?? basis[0]!;
  const lead0 = headlineFor(world, leadEvent, outlet);
  const headline =
    lead.family === "follow-up"
      ? `Update: ${lead0}`
      : lead.family === "allegation" && publicBasis.length === 0
        ? `${outlet.name} reports an account concerning ${subjectNames(world, lead)}`
        : lead0;
  // The headline already carries the first public fact; do not print it twice.
  const body = paragraphs.filter(
    (paragraph, index) =>
      !(index === 0 && paragraph.trim() === headline.trim()),
  );
  body.push(
    `Reported by ${personName(world.people[reporterId]!)} for ${outlet.name}.`,
  );
  return {
    headline: headline.trim(),
    body: body.join("\n\n"),
    unattributedAssertion,
  };
}

function subjectNames(world: World, lead: StoryLeadRecord): string {
  const names = lead.subjectPersonIds
    .map((id) => world.people[id])
    .filter((person) => person !== undefined)
    .map((person) => personName(person));
  return names.length > 0 ? names.join(" and ") : "a public official";
}

/**
 * The public procedural status of a matter, in its institution's own words.
 * Confidential steps are never described.
 */
export function procedureStatusSentence(
  world: World,
  matterId: EntityId,
): string | null {
  const proceedings = pressRecordsOfKind(world, "matter-proceeding").filter(
    (record) => record.matterId === matterId,
  );
  const sentences: string[] = [];
  for (const proceeding of proceedings) {
    const publicSteps = pressRecordsOfKind(world, "proceeding-step").filter(
      (step) => step.proceedingId === proceeding.id && step.publicStep,
    );
    const last = publicSteps.at(-1);
    if (!last) continue;
    const event = world.history.events.find((item) => item.id === last.eventId);
    if (event) sentences.push(event.summary);
  }
  if (sentences.length === 0) {
    return "No official body has announced any finding.";
  }
  return sentences.join(" ");
}

/**
 * Weekly desk sweep: new public events reach the outlets whose beat and
 * geography cover them; each outlet considers at most its free capacity.
 * Follow-ups and corrections are found here too. The sweep only considers
 * events recorded since the previous sweep was scheduled.
 */
export function pressDeskSweepHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PRESS_DESK_SWEEP_TRANSITION_KEY) {
    throw new Error("The desk sweep handler received another transition.");
  }
  const frontier = dueItem.sequence;
  const candidates = world.history.events.filter(
    (event) => event.sequence > frontier && eventIsNewsCandidate(world, event),
  );
  let next = world;
  for (const outlet of mediaOutlets(world)) {
    next = sweepOutlet(next, outlet, candidates);
  }
  next = issueDueCorrections(next);
  const index = Number(dueItem.stableKey.slice("press46:desk-sweep:".length));
  next = scheduleFutureDueItem(next, {
    stableKey: `press46:desk-sweep:${index + 1}`,
    dueAt: addDays(next.currentDate, PRESS_DESK_INTERVALS.sweepDays),
    transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return resolved(next, "press:desk-swept", null);
}

export function eventIsNewsCandidate(
  world: World,
  event: HistoricalEvent,
): boolean {
  if (event.visibility !== "public") return false;
  if (event.occurredAt > world.currentDate) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => event.type.startsWith(prefix))) {
    return false;
  }
  if (
    event.tags.includes("world.created") ||
    event.tags.includes("life.started")
  ) {
    return false;
  }
  if (
    event.tags.includes("time-neutral") &&
    !event.tags.some((tag) => tag.startsWith(PRESS_MATTER_TAG))
  )
    return false;
  return resolvePublicationSource(world, event) !== null;
}

function sweepOutlet(
  world: World,
  outlet: MediaOutletRecord,
  candidates: readonly HistoricalEvent[],
): World {
  let next = world;
  // Queued leads wait first.
  for (const lead of storyLeads(next)) {
    if (lead.outletId !== outlet.id) continue;
    if (latestDisposition(next, lead.id)?.decision === "queued") {
      next = assignStory(next, lead.id);
    }
  }
  const covered = new Set(
    storyLeads(next)
      .filter((lead) => lead.outletId === outlet.id)
      .flatMap((lead) => lead.basisEventIds),
  );
  const routed = candidates
    .filter((event) => !covered.has(event.id))
    .filter((event) => outletCovers(next, outlet, event))
    .map((event) => {
      const judged = newsworthiness(next, outlet, event);
      return {
        event,
        priority: judged.score,
        routine: !judged.reasons.some(
          (reason) =>
            SUBSTANTIVE_REASONS.has(reason.key) &&
            (reason.key !== "scale" || reason.weight >= SUBSTANTIVE_SCALE),
        ),
      };
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.event.sequence - right.event.sequence,
    );
  const capacity = MEDIA_ACTIVE_ASSIGNMENT_CAPACITY[outlet.resourceTier];
  const free = Math.max(
    0,
    capacity - activeAssignments(next, outlet.id).length,
  );
  // Authored editorial attention: one routine item per weekly review; items
  // with a substantive reason (a matter, named people, a recorded scale above
  // minor, a public office) may use the rest of the free capacity. Being on
  // the beat or in the outlet's own town does not by itself make an item more
  // than routine.
  let routineTaken = 0;
  const chosen = routed.slice(0, free).filter(({ routine }) => {
    if (!routine) return true;
    routineTaken += 1;
    return routineTaken <= PRESS_DESK_INTERVALS.routineItemsPerSweep;
  });
  for (const { event } of chosen) {
    const matterId = matterIdOf(event);
    const followed = matterId
      ? publishedStoryOnMatter(next, outlet.id, matterId)
      : null;
    const created = recordStoryLead(next, {
      stableKey: `press46:lead:${outlet.id}:${event.id}`,
      outletId: outlet.id,
      family: followed ? "follow-up" : familyForEvent(event),
      route: "public-record",
      basisEventIds: [event.id],
      subjectPersonIds: subjectsOf(next, event),
      jurisdictionId: event.jurisdictionId,
      matterId,
      followsPublicationId: followed,
    });
    next = assignStory(created.world, created.lead.id);
  }
  return next;
}

export function outletCovers(
  world: World,
  outlet: MediaOutletRecord,
  event: HistoricalEvent,
): boolean {
  if (outlet.scope === "national") {
    // A place-bound event reaches a national outlet only through what it
    // records: a federal office it concerns, or a scale that reaches past the
    // place. Its geography is never rewritten to null to get it there.
    return (
      event.jurisdictionId === null ||
      isNationalOffice(event) ||
      concernsFederalOffice(event) ||
      recordedScale(event) >= NATIONAL_REACH_SCALE
    );
  }
  if (event.jurisdictionId === null) return false;
  if (outlet.primaryJurisdictionIds.includes(event.jurisdictionId)) return true;
  if (outlet.scope === "state") {
    return outlet.primaryJurisdictionIds.includes(
      stateOfJurisdiction(world, event.jurisdictionId) ?? ("" as EntityId),
    );
  }
  return false;
}

function isNationalOffice(event: HistoricalEvent): boolean {
  return (
    event.type.startsWith("congress.") ||
    event.type.startsWith("national-election.") ||
    event.tags.some((tag) => tag === "scope:national" || tag === "federal")
  );
}

const FEDERAL_OFFICE_TAG_PREFIXES = [
  "office:us-house:",
  "office:us-senate:",
  "office:us-president",
  "office:us-vice-president",
] as const;

function concernsFederalOffice(event: HistoricalEvent): boolean {
  return event.tags.some((tag) =>
    FEDERAL_OFFICE_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix)),
  );
}

/**
 * The scale an event itself records, on one ladder: 0 when it records none.
 * Read from the writer's own tags (a hazard's `magnitude:`, a development's
 * `importance:`), never inferred from its type or summary.
 */
const RECORDED_SCALE: Readonly<Record<string, number>> = {
  "magnitude:minor": 1,
  "magnitude:moderate": 2,
  "magnitude:major": 3,
  "magnitude:catastrophic": 4,
  "importance:minor": 1,
  "importance:notable": 2,
  "importance:major": 3,
};

/** At or above this, a place-bound event is national news. */
export const NATIONAL_REACH_SCALE = 3;

export function recordedScale(event: HistoricalEvent): number {
  return Math.max(0, ...event.tags.map((tag) => RECORDED_SCALE[tag] ?? 0));
}

export interface Newsworthiness {
  readonly score: number;
  /** Each consideration that counted, with its weight, in a fixed order. */
  readonly reasons: readonly {
    readonly key: string;
    readonly weight: number;
  }[];
}

/**
 * DEPTH2 A07: a lead is judged on public consequence, not on whether it is
 * bad news. Every term reads something the event recorded or where the outlet
 * stands; none reads whether the news is good or bad, so a gain and a loss of
 * the same recorded scale weigh the same.
 *
 * - `matter` +4: an open public matter, with its accountability and record.
 * - `named-people` +2: it names who acted or was affected.
 * - `scale` +1 to +4: the scale the event records (see `recordedScale`).
 * - `public-office` +2: it concerns a public office by name.
 * - `audience` +1: it happened in the outlet's own primary jurisdiction.
 * - `beat` +1: it falls on one of the outlet's beats.
 */
export function newsworthiness(
  world: World,
  outlet: MediaOutletRecord,
  event: HistoricalEvent,
): Newsworthiness {
  const reasons: { key: string; weight: number }[] = [];
  if (matterIdOf(event)) reasons.push({ key: "matter", weight: 4 });
  if (subjectsOf(world, event).length > 0)
    reasons.push({ key: "named-people", weight: 2 });
  const scale = recordedScale(event);
  if (scale > 0) reasons.push({ key: "scale", weight: scale });
  if (event.tags.some((tag) => tag.startsWith("office:")))
    reasons.push({ key: "public-office", weight: 2 });
  if (
    event.jurisdictionId !== null &&
    outlet.primaryJurisdictionIds.includes(event.jurisdictionId)
  )
    reasons.push({ key: "audience", weight: 1 });
  if (outlet.beats.includes(beatForEventType(event.type)))
    reasons.push({ key: "beat", weight: 1 });
  return {
    score: reasons.reduce((total, reason) => total + reason.weight, 0),
    reasons,
  };
}

/** A recorded scale this large is more than routine; `minor` is not. */
const SUBSTANTIVE_SCALE = 2;

const SUBSTANTIVE_REASONS: ReadonlySet<string> = new Set([
  "matter",
  "named-people",
  "scale",
  "public-office",
]);

export function matterIdOf(event: HistoricalEvent): EntityId | null {
  const tag = event.tags.find((candidate) =>
    candidate.startsWith(PRESS_MATTER_TAG),
  );
  return tag ? (tag.slice(PRESS_MATTER_TAG.length) as EntityId) : null;
}

function publishedStoryOnMatter(
  world: World,
  outletId: EntityId,
  matterId: EntityId,
): EntityId | null {
  for (const lead of storyLeads(world)) {
    if (lead.outletId !== outletId || lead.matterId !== matterId) continue;
    const published = dispositionsForLead(world, lead.id).find(
      (record) => record.decision === "published",
    );
    if (published?.publicationId) return published.publicationId;
  }
  return null;
}

/**
 * People who bring or carry an account rather than being its subject. A story
 * about an allegation is about the accused: the accuser is its source, and
 * asking the accuser to respond had them dispute their own claim (Eastport,
 * Maine playthrough, 2026-09-22).
 */
const ACCOUNT_BEARER_ROLES: ReadonlySet<string> = new Set([
  "agency:alleger",
  "agency:complainant",
  "agency:concerned-staff",
  "agency:press-source",
  "agency:reporter",
  "agency:witness",
]);

function subjectsOf(world: World, event: HistoricalEvent): EntityId[] {
  return sortedUnique(
    event.participants
      .filter(
        (entry) =>
          (entry.role.startsWith("agency:") ||
            entry.role.startsWith("focus:")) &&
          !ACCOUNT_BEARER_ROLES.has(entry.role),
      )
      .map((entry) => entry.personId)
      .filter((personId) => world.people[personId])
      .filter(
        (personId) =>
          !reporterRoles(world).some((role) => role.personId === personId),
      ),
  ).slice(0, 3);
}

function familyForEvent(event: HistoricalEvent): StoryFamily {
  if (matterIdOf(event)) return "allegation";
  if (event.type.startsWith("economy.")) return "economy-release";
  if (event.type.startsWith("campaign.") || event.type.startsWith("election."))
    return "campaign-activity";
  if (
    event.type.startsWith("crisis.") ||
    event.type.startsWith("health.episode-disclosed") ||
    event.type.startsWith("disaster.") ||
    event.type.startsWith("vitality.")
  )
    return "breaking-crisis";
  return "scheduled-beat";
}

function beatForEventType(type: string): MediaBeat {
  if (type.startsWith("matter.")) return "investigations";
  if (type.startsWith("economy.") || type.startsWith("tax."))
    return "business-economy";
  if (type.startsWith("campaign.") || type.startsWith("election."))
    return "campaigns";
  if (
    type.startsWith("international.") ||
    type.startsWith("crisis.international") ||
    type.startsWith("crisis.war-powers")
  )
    return "international";
  if (type.startsWith("civic.local-matter")) return "local-government";
  if (type.startsWith("congress.")) return "congress";
  if (type.startsWith("legislation.") || type.startsWith("legislative."))
    return "statehouse";
  if (
    type.startsWith("crisis.") ||
    type.startsWith("disaster.") ||
    type.startsWith("health.episode-disclosed")
  )
    return "public-safety";
  return "general-assignment";
}

function beatForLead(world: World, lead: StoryLeadRecord): MediaBeat {
  if (lead.matterId) return "investigations";
  const event = world.history.events.find(
    (item) => item.id === lead.basisEventIds[0],
  );
  const beat = event ? beatForEventType(event.type) : "general-assignment";
  const outlet = requirePressRecord(world, "media-outlet", lead.outletId);
  if (beat === "statehouse" && outlet.scope === "national") return "congress";
  return beat;
}

function chooseReporter(
  world: World,
  outlet: MediaOutletRecord,
  lead: StoryLeadRecord,
  beat: MediaBeat,
): ReporterRoleRecord | null {
  const current = reporterRoles(world, outlet.id).filter((role) =>
    reporterIsCurrent(world, role),
  );
  if (current.length === 0) return null;
  // A tip stays with the reporter the source actually talked to.
  const tipped = pressRecordsOfKind(world, "source-contribution")
    .filter((contribution) =>
      lead.basisEventIds.includes(contribution.contributionEventId),
    )
    .map(
      (contribution) =>
        requirePressRecord(world, "source-agreement", contribution.agreementId)
          .reporterPersonId,
    );
  const tippedRole = current.find((role) => tipped.includes(role.personId));
  if (tippedRole) return tippedRole;
  const load = (role: ReporterRoleRecord) =>
    activeAssignments(world, outlet.id).filter(
      (item) => assignedReporter(world, item.id) === role.personId,
    ).length;
  // A reporter who already covered these subjects keeps the relationship.
  const familiar = (role: ReporterRoleRecord) =>
    storyLeads(world).some(
      (other) =>
        other.id !== lead.id &&
        other.outletId === outlet.id &&
        assignedReporter(world, other.id) === role.personId &&
        other.subjectPersonIds.some((id) => lead.subjectPersonIds.includes(id)),
    );
  return [...current].sort(
    (left, right) =>
      Number(right.beats.includes(beat)) - Number(left.beats.includes(beat)) ||
      Number(familiar(right)) - Number(familiar(left)) ||
      load(left) - load(right) ||
      left.personId.localeCompare(right.personId),
  )[0]!;
}

function storyQuestion(world: World, lead: StoryLeadRecord): string {
  const basis = world.history.events.find(
    (event) => event.id === lead.basisEventIds[0],
  )!;
  if (lead.matterId) {
    const allegation = pressRecordsOfKind(world, "matter-allegation")
      .filter((record) => record.matterId === lead.matterId)
      .at(-1);
    if (allegation) {
      return `There is an account that ${allegation.statement.replace(/\.$/, "")}. What is your response?`;
    }
  }
  if (lead.family === "records") {
    return `Records describe the following: ${basis.summary} What is your response?`;
  }
  return `We are reporting on this: ${basis.summary} Do you want to comment?`;
}

/**
 * A published story whose unattributed assertion was later disproved by an
 * official dismissal gets a correction appended, never a deletion.
 */
function issueDueCorrections(world: World): World {
  let next = world;
  for (const lead of storyLeads(world)) {
    if (!lead.matterId) continue;
    const history = dispositionsForLead(next, lead.id);
    if (history.at(-1)?.decision !== "published") continue;
    const story = history
      .map((record) =>
        next.history.events.find((event) => event.id === record.eventId),
      )
      .find((event) => event?.type === PRESS_STORY_EVENT_TYPE);
    if (!story?.tags.includes("press.unattributed-assertion")) continue;
    const matter = requirePressRecord(next, "matter", lead.matterId);
    if (matter.occurrenceId !== null) continue;
    const dismissed = pressRecordsOfKind(next, "proceeding-step").some(
      (step) =>
        step.publicStep &&
        (step.outcome === "dismissed" ||
          step.outcome === "no-reason-to-believe") &&
        pressRecordsOfKind(next, "matter-proceeding").some(
          (proceeding) =>
            proceeding.id === step.proceedingId &&
            proceeding.matterId === matter.id,
        ),
    );
    if (!dismissed) continue;
    const original = (next.history.publications ?? []).find(
      (publication) =>
        publication.sourceEventId === story.id &&
        publication.correctsPublicationId === null,
    );
    if (!original) continue;
    const correctedBody = story.context
      .socialContext!.split("\n\n")
      .filter((paragraph) => !paragraph.includes(" has learned: "))
      .join("\n\n");
    const note = `An earlier version of this story stated an unattributed account as fact. ${procedureStatusSentence(next, matter.id)}`;
    next = correctPublication(next, {
      stableKey: `${lead.stableKey}:correction`,
      correctsPublicationId: original.id,
      headline: `Correction: ${original.headline}`,
      body: `${correctedBody}\n\nCorrection: ${note}`,
      correctionNote: note,
    });
    const correction = next.history.publications!.at(-1)!;
    next = writeDisposition(next, lead, "corrected", {
      reporterPersonId: assignedReporter(next, lead.id),
      reasonKey: "press:correction-after-dismissal",
      eventId: story.id,
      publicationId: correction.id,
    });
  }
  return next;
}

function resolved(
  world: World,
  reasonKey: `${string}:${string}`,
  outcomeEventId: EntityId | null,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey,
    context: null,
    outcomeEventId,
  };
}

function cancelled(
  world: World,
  reasonKey: `${string}:${string}`,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "cancelled",
    reasonKey,
    context: null,
    outcomeEventId: null,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
