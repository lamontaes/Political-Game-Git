import type {
  ClaimAudience,
  EntityId,
  EventParticipantRole,
  EventVisibility,
  IsoDate,
  KnowledgeAccuracy,
  KnowledgeConfidence,
  KnowledgeSource,
  MindConfidence,
  World,
} from "../simulation";

/**
 * Who actually heard it, read off the records rather than off the room.
 *
 * A conversation turn leaves a specific set of canonical records behind: one
 * event, at most one claim, a knowledge record for every participant, a
 * knowledge record for every person the claim reached, a perception for each
 * of those, sometimes a relationship interaction, sometimes a durable decision
 * trace. This projection collects exactly those and says which is which.
 *
 * The hard part is not who heard — that is written down. The hard part is who
 * did *not*, because absence is not a record. There are two honest answers and
 * this projection keeps them apart:
 *
 *   - a person the event record lists as present who has no knowledge record
 *     citing the claim; and
 *   - a person some caller says was in the room whom the event record does not
 *     list at all.
 *
 * The second is only as good as the presence set the caller supplies, so the
 * caller has to say where that set came from, and the trace repeats it. What
 * this projection never does is treat "no record" as proof of anything by
 * itself.
 */

export const OBSERVER_TRACE_VERSION = "conversation-observer-trace-v1";

/**
 * A presence set that did not come from the event record.
 *
 * The scene context knows who was physically in the room before audibility
 * narrowed the exchange; the canonical event only records who took part. Both
 * are true, and a trace that wants to say "this person was there and did not
 * hear" needs the first — labelled as the first.
 */
export interface DeclaredPresence {
  readonly basis: string;
  readonly personIds: readonly EntityId[];
  readonly note: string;
}

export interface ObserverHistorySpan {
  readonly fromSequence: number;
  readonly toSequence: number;
}

export interface ObserverTraceRequest {
  readonly eventId: EntityId;
  readonly declaredPresence?: DeclaredPresence | null;
  /**
   * The append range this turn wrote, when the caller knows it. Used only to
   * report decision traces recorded inside the turn; it is an ordering fact,
   * never presented as a causal edge.
   */
  readonly historySpan?: ObserverHistorySpan | null;
}

export interface ObserverParticipant {
  readonly personId: EntityId;
  readonly role: EventParticipantRole;
  readonly detail: string | null;
}

export interface ObserverClaim {
  readonly claimId: EntityId;
  readonly speakerPersonId: EntityId;
  readonly audience: ClaimAudience;
  readonly statement: string;
  readonly madeAt: IsoDate;
}

export interface ObserverAcquisition {
  readonly personId: EntityId;
  readonly knowledgeId: EntityId;
  readonly sourceKind: KnowledgeSource["kind"];
  readonly sourcePersonId: EntityId | null;
  readonly sourceClaimId: EntityId | null;
  readonly accuracy: KnowledgeAccuracy;
  readonly confidence: KnowledgeConfidence;
  readonly believedSummary: string;
}

export interface ObserverPerception {
  readonly personId: EntityId;
  readonly perceptionId: EntityId;
  readonly viaClaimId: EntityId;
  readonly viaKnowledgeId: EntityId;
  readonly assertion: string;
  readonly confidence: MindConfidence;
}

export interface ObserverAbsence {
  readonly personId: EntityId;
  /** Exactly what the tool checked, so the reasoning boundary is visible. */
  readonly basis:
    | "recorded-participant-without-claim-knowledge"
    | "declared-present-but-not-an-event-participant";
  readonly note: string;
}

export interface ObserverDecisionTrace {
  readonly decisionTraceId: EntityId;
  readonly actorPersonId: EntityId;
  readonly decisionId: EntityId;
  readonly decisionType: string;
  readonly outcomeKind: string;
  readonly selectedOptionKey: string | null;
  readonly appendedSequence: number;
  readonly cutoffFrontier: number;
  /**
   * True when the decision was evaluated at exactly the frontier it was then
   * appended to, and the event followed at the next sequence. Recorded
   * ordering, not a recorded causal edge.
   */
  readonly immediatelyPrecedesEvent: boolean;
}

export interface ConversationObserverTrace {
  readonly version: typeof OBSERVER_TRACE_VERSION;
  readonly eventId: EntityId;
  readonly eventStableKey: string;
  readonly eventSequence: number;
  readonly occurredAt: IsoDate;
  readonly visibility: EventVisibility;
  readonly tags: readonly string[];
  readonly eventSummary: string;
  readonly participants: readonly ObserverParticipant[];
  readonly recordedPresentPersonIds: readonly EntityId[];
  readonly addresseePersonIds: readonly EntityId[];
  readonly respondentPersonIds: readonly EntityId[];
  readonly initiatorPersonIds: readonly EntityId[];
  readonly declaredPresence: DeclaredPresence | null;
  readonly claims: readonly ObserverClaim[];
  readonly directKnowledge: readonly ObserverAcquisition[];
  readonly claimKnowledge: readonly ObserverAcquisition[];
  readonly claimRecipientPersonIds: readonly EntityId[];
  readonly perceptions: readonly ObserverPerception[];
  readonly absences: readonly ObserverAbsence[];
  readonly relationshipInteractionIds: readonly EntityId[];
  readonly memoryIds: readonly EntityId[];
  readonly decisionTraces: readonly ObserverDecisionTrace[];
  readonly boundaryNotes: readonly string[];
}

function orderedUnique(ids: readonly EntityId[]): readonly EntityId[] {
  const seen = new Set<EntityId>();
  const kept: EntityId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }
  return kept;
}

function roleNamespace(role: EventParticipantRole): string {
  const separator = role.indexOf(":");
  return separator === -1 ? role : role.slice(0, separator);
}

/**
 * Reads one conversation turn's records.
 *
 * Everything selected here is selected by an explicit recorded reference:
 * claims by `eventId`, knowledge by `eventId`, perceptions by the claim id
 * their `heard-claim` source names. No selection is made by matching dates,
 * names, or text.
 */
export function projectConversationObserverTrace(
  world: World,
  request: ObserverTraceRequest,
): ConversationObserverTrace {
  const event = world.history.events.find(
    (candidate) => candidate.id === request.eventId,
  );
  if (!event) {
    throw new Error(`No historical event with id ${request.eventId}.`);
  }

  const participants: readonly ObserverParticipant[] = event.participants.map(
    (participant) => ({
      personId: participant.personId,
      role: participant.role,
      detail: participant.detail,
    }),
  );
  const recordedPresentPersonIds = orderedUnique(
    participants.map((participant) => participant.personId),
  );

  const claims: readonly ObserverClaim[] = world.history.claims
    .filter((claim) => claim.eventId === event.id)
    .map((claim) => ({
      claimId: claim.id,
      speakerPersonId: claim.speakerPersonId,
      audience: claim.audience,
      statement: claim.statement,
      madeAt: claim.madeAt,
    }));
  const claimIds = new Set(claims.map((claim) => claim.claimId));

  const knowledgeForEvent = world.history.knowledge.filter(
    (record) => record.eventId === event.id,
  );
  const acquisition = (
    record: (typeof knowledgeForEvent)[number],
  ): ObserverAcquisition => ({
    personId: record.personId,
    knowledgeId: record.id,
    sourceKind: record.source.kind,
    sourcePersonId:
      record.source.kind === "told-by"
        ? record.source.sourcePersonId
        : record.source.kind === "rumor"
          ? record.source.sourcePersonId
          : null,
    sourceClaimId:
      record.source.kind === "told-by" ? record.source.claimId : null,
    accuracy: record.accuracy,
    confidence: record.confidence,
    believedSummary: record.believedSummary,
  });

  const directKnowledge = knowledgeForEvent
    .filter((record) => record.source.kind === "direct")
    .map(acquisition);
  const claimKnowledge = knowledgeForEvent
    .filter(
      (record) =>
        record.source.kind === "told-by" &&
        record.source.claimId !== null &&
        claimIds.has(record.source.claimId),
    )
    .map(acquisition);
  const claimRecipientPersonIds = orderedUnique(
    claimKnowledge.map((entry) => entry.personId),
  );

  const perceptions: readonly ObserverPerception[] = world.history.perceptions
    .filter(
      (record) =>
        record.source.kind === "heard-claim" &&
        claimIds.has(record.source.claimId),
    )
    .map((record) => {
      if (record.source.kind !== "heard-claim") {
        throw new Error("Filtered perception lost its heard-claim source.");
      }
      return {
        personId: record.personId,
        perceptionId: record.id,
        viaClaimId: record.source.claimId,
        viaKnowledgeId: record.source.knowledgeId,
        assertion: record.assertion,
        confidence: record.confidence,
      };
    });

  const absences: ObserverAbsence[] = [];
  if (claims.length > 0) {
    const speakerIds = new Set(claims.map((claim) => claim.speakerPersonId));
    for (const personId of recordedPresentPersonIds) {
      if (speakerIds.has(personId)) continue;
      if (claimRecipientPersonIds.includes(personId)) continue;
      absences.push({
        personId,
        basis: "recorded-participant-without-claim-knowledge",
        note: "The event record lists this person as a participant, and no knowledge record for this event cites a claim made in it.",
      });
    }
  }
  const declaredPresence = request.declaredPresence ?? null;
  if (declaredPresence) {
    for (const personId of declaredPresence.personIds) {
      if (recordedPresentPersonIds.includes(personId)) continue;
      absences.push({
        personId,
        basis: "declared-present-but-not-an-event-participant",
        note: `Named present by ${declaredPresence.basis}; the canonical event record does not list this person as a participant, so the simulation recorded no acquisition for them.`,
      });
    }
  }

  const span = request.historySpan ?? null;
  const decisionTraces: readonly ObserverDecisionTrace[] =
    span === null
      ? []
      : world.history.decisionTraces
          .filter(
            (record) =>
              record.sequence >= span.fromSequence &&
              record.sequence < span.toSequence,
          )
          .map((record) => ({
            decisionTraceId: record.id,
            actorPersonId: record.context.actorPersonId,
            decisionId: record.decisionId,
            decisionType: record.context.decisionType,
            outcomeKind: record.outcomeKind,
            selectedOptionKey: record.selectedOptionKey,
            appendedSequence: record.sequence,
            cutoffFrontier: record.context.cutoff.historySequenceExclusive,
            immediatelyPrecedesEvent:
              record.context.cutoff.historySequenceExclusive ===
                record.sequence && record.sequence + 1 === event.sequence,
          }));

  const boundaryNotes: string[] = [];
  if (claims.length === 0) {
    boundaryNotes.push(
      "No claim was recorded for this event, so no listener could acquire one.",
    );
  }
  if (declaredPresence === null) {
    boundaryNotes.push(
      "No presence set beyond the event record was supplied, so this trace can only speak about recorded participants.",
    );
  }
  if (span === null) {
    boundaryNotes.push(
      "No history span was supplied, so decision traces recorded during this turn are not listed.",
    );
  }
  for (const claim of claims) {
    const withoutPerception = claimRecipientPersonIds.filter(
      (personId) =>
        !perceptions.some(
          (perception) =>
            perception.personId === personId &&
            perception.viaClaimId === claim.claimId,
        ),
    );
    for (const personId of withoutPerception) {
      boundaryNotes.push(
        `Person ${personId} received claim ${claim.claimId} but formed no recorded perception from it.`,
      );
    }
  }

  return {
    version: OBSERVER_TRACE_VERSION,
    eventId: event.id,
    eventStableKey: event.stableKey,
    eventSequence: event.sequence,
    occurredAt: event.occurredAt,
    visibility: event.visibility,
    tags: event.tags,
    eventSummary: event.summary,
    participants,
    recordedPresentPersonIds,
    addresseePersonIds: orderedUnique(
      participants
        .filter((participant) => participant.role === "focus:addressee")
        .map((participant) => participant.personId),
    ),
    respondentPersonIds: orderedUnique(
      participants
        .filter((participant) => participant.role === "focus:respondent")
        .map((participant) => participant.personId),
    ),
    initiatorPersonIds: orderedUnique(
      participants
        .filter((participant) => roleNamespace(participant.role) === "agency")
        .map((participant) => participant.personId),
    ),
    declaredPresence,
    claims,
    directKnowledge,
    claimKnowledge,
    claimRecipientPersonIds,
    perceptions,
    absences,
    relationshipInteractionIds: world.history.relationshipInteractions
      .filter((record) => record.eventId === event.id)
      .map((record) => record.id),
    memoryIds: world.history.memories
      .filter((record) => record.eventId === event.id)
      .map((record) => record.id),
    decisionTraces,
    boundaryNotes,
  };
}
