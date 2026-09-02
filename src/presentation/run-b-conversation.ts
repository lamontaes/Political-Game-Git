import {
  assertNpcAutonomousApplication,
  assertWorldIntegrity,
  currentHistoricalCutoff,
  evaluateDecision,
  personName,
  recordClaim,
  recordDurableDecisionTrace,
  recordEventKnowledge,
  recordPerception,
  recordRelationshipInteraction,
  recordWorldEvent,
} from "../simulation";
import type {
  ClaimAudience,
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  IsoDate,
  MindSourceReference,
  World,
} from "../simulation";
import {
  advanceHouseholdObligation,
  advanceNeighborhoodMeeting,
  advanceSchoolProject,
  conversationCommitContract,
  conversationSubjectPresentation,
} from "./conversation-subjects";
import {
  canListenToRunBConversation,
  createRunBConversationProgress,
  isHouseholdObligationConversationProgress,
  isNeighborhoodMeetingConversationProgress,
  isSchoolProjectConversationProgress,
  isRunBReferralConversationProgress,
  isRunCLegislativeConversationProgress,
  type ConversationProgress,
  type HouseholdObligationConversationProgress,
  type NeighborhoodMeetingConversationProgress,
  type RunBConversationProgress,
  type SchoolProjectConversationProgress,
  type RunBConversationProposition,
  type RunBPendingContribution,
  type RunCLegislativeConversationProgress,
} from "./run-b-conversation-progress";

export const RUN_B_AUDIBILITY_OPTIONS = ["normal", "quiet", "private"] as const;
export type ConversationAudibility = (typeof RUN_B_AUDIBILITY_OPTIONS)[number];

/**
 * Everything anyone can currently mean by speaking.
 *
 * This list grows when a subject family is added; it is not a closed account
 * of human intent derived from the office scenario that happened to be first.
 */
/**
 * What a player can say is the subject's vocabulary, not the engine's.
 *
 * This was a closed union naming every intent in the game, which meant adding
 * a conversation about anything required editing the engine — and made a
 * subject's own vocabulary something the centre had to approve. An intent is
 * now an ordinary key, and it is checked at the only point where checking
 * means anything: against the intents the subject in front of the player is
 * actually offering, every turn, before the turn is committed.
 *
 * `listen` is the one intent the engine itself knows about, because staying
 * quiet is a property of the room rather than of the subject.
 */
export type ConversationIntent = string;

export const LISTEN_INTENT = "listen";

/** Every intent the shipped subjects currently offer, for tests and tooling. */
export const RUN_B_CONVERSATION_INTENTS = [
  "request-commitment",
  "reassure",
  "press",
  "listen",
  "discuss-provision",
  "raise-obligation",
  "offer-to-cover",
  "ask-to-share",
  "ask-for-time",
  "raise-share",
  "offer-to-do-more",
  "ask-to-split",
  "mention-meeting",
  "say-you-will-go",
  "ask-them-to-go",
] as const;

export type ConversationAddressee = EntityId | "everyone";

/**
 * The person playing a named part in this room.
 *
 * Throws rather than guessing: a subject asking for a part the room does not
 * have is a mistake in the pairing of subject to room, and silently
 * substituting somebody is how a kitchen ended up with a briefing lead.
 */
export function conversationRole(
  room: ConversationRoomContext,
  role: string,
): EntityId {
  const personId = room.roles[role];
  if (!personId) {
    throw new Error(`Nobody in this room is the ${role}.`);
  }
  return personId;
}

/** The same, for a part a subject can do without. */
export function optionalConversationRole(
  room: ConversationRoomContext,
  role: string,
): EntityId | null {
  return room.roles[role] ?? null;
}

export function describeRunBBriefingContext(
  world: World,
  room: ConversationRoomContext,
  progress: RunBConversationProgress,
): string {
  return conversationSubjectPresentation(progress).describeBriefing(
    world,
    room,
    progress,
  );
}

export function describeConversationBriefingContext(
  world: World,
  room: ConversationRoomContext,
  progress: ConversationProgress,
): string {
  return conversationSubjectPresentation(progress).describeBriefing(
    world,
    room,
    progress,
  );
}

export function conversationTopicLabel(progress: ConversationProgress): string {
  return conversationSubjectPresentation(progress).topicLabel(progress);
}

export interface ConversationRoomContext {
  readonly sceneKey: string;
  /**
   * Who plays what part in this room, named by the subject that needs them.
   *
   * These used to be two fixed fields — a briefing lead and a referral
   * verifier — which every room had to supply whatever it was. A household
   * deciding who does the shopping filled both with the same person, and the
   * canonical record then described a kitchen in the vocabulary of a
   * caseworker's office. A subject asks for the parts it actually has, and a
   * room that does not have them is not that subject's room.
   *
   * Roles stay references even when somebody leaves earshot.
   */
  readonly roles: Readonly<Record<string, EntityId>>;
  readonly locationLabel: string;
  readonly jurisdictionId: EntityId;
  readonly playerPersonId: EntityId;
  readonly physicallyPresentPersonIds: readonly EntityId[];
  readonly activeParticipantPersonIds: readonly EntityId[];
  readonly eligibleAddresseePersonIds: readonly EntityId[];
  readonly normalHearingPersonIds: readonly EntityId[];
  readonly quietAmbientHearingPersonIds: readonly EntityId[];
  readonly privateAvailable: boolean;
  readonly privateUnavailableReason: string | null;
}

export interface ConversationSessionDescriptor {
  readonly sessionKey: string;
  readonly sceneKey: string;
  readonly startedAtDate: IsoDate;
  readonly startingHistorySequence: number;
  readonly participantPersonIds: readonly EntityId[];
}

export interface ConversationIntentOption {
  readonly key: ConversationIntent;
  readonly label: string;
  readonly description: string;
}

export interface ConversationDialogueBeat {
  readonly speakerPersonId: EntityId;
  readonly speakerName: string;
  readonly dialogue: string;
}

export interface CommitConversationTurnInput {
  readonly session: ConversationSessionDescriptor;
  readonly room: ConversationRoomContext;
  readonly progress?: ConversationProgress;
  readonly turnOrdinal: number;
  readonly addressee: ConversationAddressee;
  readonly audibility: ConversationAudibility;
  readonly intent: ConversationIntent;
}

export interface ConversationSemanticResult {
  readonly turnKey: string;
  readonly outcome:
    | "committed"
    | "deferred"
    | "boundary-held"
    | "reassured"
    | "bystander-interjected"
    | "continued"
    | "silence-held";
  readonly responseSpeakerPersonId: EntityId | null;
  readonly actualListenerPersonIds: readonly EntityId[];
  readonly claimRecipientPersonIds: readonly EntityId[];
  readonly claimAudience: ClaimAudience | null;
  readonly durableDecisionRecorded: boolean;
  readonly relationshipConsequence: "strengthened" | "strained" | null;
}

export interface ConversationPresentationResult {
  readonly beat: ConversationDialogueBeat | null;
  readonly playerIntentLabel: string;
  readonly playerActionDescription: string;
  readonly roomNarration: string | null;
  readonly hearingDescription: string;
}

export interface CommitConversationTurnResult {
  readonly world: World;
  readonly progress: ConversationProgress;
  readonly semantic: ConversationSemanticResult;
  readonly presentation: ConversationPresentationResult;
}

interface ResolvedResponse {
  readonly world: World;
  readonly outcome: ConversationSemanticResult["outcome"];
  readonly speakerPersonId: EntityId | null;
  readonly dialogue: string | null;
  readonly perception: string | null;
  readonly durableDecisionRecorded: boolean;
}

export function createConversationSessionDescriptor(
  world: World,
  room: ConversationRoomContext,
): ConversationSessionDescriptor {
  validateConversationRoom(world, room);
  const participantPersonIds = canonicalPeople(
    room,
    room.activeParticipantPersonIds,
  );
  const startingHistorySequence = world.history.nextSequence;

  return {
    sessionKey: conversationSessionKey(
      world,
      room,
      startingHistorySequence,
      participantPersonIds,
    ),
    sceneKey: room.sceneKey,
    startedAtDate: world.currentDate,
    startingHistorySequence,
    participantPersonIds,
  };
}

export function availableConversationIntents(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  progress: ConversationProgress,
  audibility: ConversationAudibility = "normal",
): readonly ConversationIntentOption[] {
  // The core answers whether anyone could be heard; the subject answers whether
  // there is anything worth hearing about.
  const silenceIsUseful = canListenInCurrentHearingContext(
    room,
    addressee,
    audibility,
    progress,
  );
  return conversationSubjectPresentation(progress).availableIntents(
    world,
    room,
    addressee,
    progress,
    silenceIsUseful,
  );
}

export function openingConversationBeat(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  progress: ConversationProgress = createRunBConversationProgress(),
): ConversationDialogueBeat {
  validateAddressee(room, addressee);
  if (
    isRunBReferralConversationProgress(progress) &&
    (progress.phase !== "opening" || progress.latestProposition !== null)
  ) {
    return continuingRunBReferralBeat(world, room, addressee, progress);
  }
  return conversationSubjectPresentation(progress).openingBeat(
    world,
    room,
    addressee,
    progress,
  );
}

/**
 * The referral family keeps its own continuation lines, which track how far
 * the office has actually got rather than restating the opening.
 */
function continuingRunBReferralBeat(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  progress: RunBConversationProgress,
): ConversationDialogueBeat {
  const primaryId = room.eligibleAddresseePersonIds[0]!;
  const secondaryId = room.eligibleAddresseePersonIds[1] ?? primaryId;
  const speakerPersonId = addressee === "everyone" ? primaryId : addressee;
  const speaker = world.people[speakerPersonId];
  if (!speaker) {
    throw new Error("Conversation continuation speaker is missing.");
  }

  if (addressee === "everyone") {
    return {
      speakerPersonId,
      speakerName: personName(speaker),
      dialogue:
        progress.reedVerification === "promised"
          ? `“We have the next step,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “${shortPersonName(world, conversationRole(room, "referral-verifier"))} will check whether the third county referral lacked the proof-of-income form, and I’ll decide on the staff checklist when that answer comes back.”`
          : `“The question is whether staff should check required documents before future county referrals,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “I need ${shortPersonName(world, conversationRole(room, "referral-verifier"))} to find out whether the third referral lacked the proof-of-income form too.”`,
    };
  }

  if (speakerPersonId === primaryId) {
    return {
      speakerPersonId,
      speakerName: personName(speaker),
      dialogue:
        progress.collinsSupport === "committed"
          ? `“I’m backing the pre-referral document checklist,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “${shortPersonName(world, conversationRole(room, "referral-verifier"))}’s check will tell us whether to keep it focused on the proof-of-income form.”`
          : progress.reedVerification === "promised"
            ? `“${shortPersonName(world, conversationRole(room, "referral-verifier"))} is checking the third county referral,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “Once he tells us whether the proof-of-income form was missing there too, I can answer on the staff checklist.”`
            : `“I need the third county referral checked,” ${shortPersonName(world, conversationRole(room, "briefing-lead"))} says. “If it also lacked the proof-of-income form, I can decide whether to back the staff checklist.”`,
    };
  }

  return {
    speakerPersonId: secondaryId,
    speakerName: personName(speaker),
    dialogue:
      progress.reedVerification === "promised"
        ? `“I’m taking the third referral,” ${shortPersonName(world, conversationRole(room, "referral-verifier"))} says. “I’ll find out whether the county received it without the proof-of-income form and report back before the briefing.”`
        : progress.collinsSupport === "conditional"
          ? `“${shortPersonName(world, conversationRole(room, "briefing-lead"))} needs the third referral checked,” ${shortPersonName(world, conversationRole(room, "referral-verifier"))} says. “I can call the neighborhood office and find out whether its proof-of-income form was missing too.”`
          : `“The first two county referrals arrived without the proof-of-income form,” ${shortPersonName(world, conversationRole(room, "referral-verifier"))} says. “I can check whether the third one failed for that same reason.”`,
  };
}

export function resolveConversationListeners(
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  audibility: ConversationAudibility,
): readonly EntityId[] {
  validateAddressee(room, addressee);
  if (!RUN_B_AUDIBILITY_OPTIONS.includes(audibility)) {
    throw new Error(
      `Unsupported conversation audibility: ${String(audibility)}`,
    );
  }
  if (audibility === "private" && !room.privateAvailable) {
    throw new Error(
      room.privateUnavailableReason ??
        "Private conversation is unavailable in this room.",
    );
  }

  const addresseeIds = resolveAddresseePersonIds(room, addressee);
  const possibleListeners =
    audibility === "normal"
      ? room.normalHearingPersonIds
      : audibility === "quiet"
        ? [...addresseeIds, ...room.quietAmbientHearingPersonIds]
        : addresseeIds;

  return canonicalPeople(room, possibleListeners).filter(
    (personId) => personId !== room.playerPersonId,
  );
}

export function describeConversationHearing(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  audibility: ConversationAudibility,
): string {
  if (audibility === "private" && !room.privateAvailable) {
    return (
      room.privateUnavailableReason ??
      "Private conversation is not possible with someone else nearby."
    );
  }
  const listeners = resolveConversationListeners(room, addressee, audibility);
  const addresseeIds = resolveAddresseePersonIds(room, addressee);
  const addressedNames = addresseeIds.map((personId) =>
    shortPersonName(world, personId),
  );
  const bystanderNames = listeners
    .filter((personId) => !addresseeIds.includes(personId))
    .map((personId) => shortPersonName(world, personId));

  if (addressee === "everyone") {
    return `${joinNames(addressedNames)} can hear you${
      audibility === "normal" ? " clearly" : ""
    }.`;
  }
  if (audibility === "normal" && bystanderNames.length > 0) {
    return `${joinNames(addressedNames)} can hear you clearly. ${joinNames(
      bystanderNames,
    )} ${bystanderNames.length === 1 ? "is" : "are"} nearby.`;
  }
  if (audibility === "quiet") {
    const otherNames = room.eligibleAddresseePersonIds
      .filter((personId) => !listeners.includes(personId))
      .map((personId) => shortPersonName(world, personId));
    return otherNames.length > 0
      ? `${joinNames(addressedNames)} can hear you. You do not expect ${joinNames(
          otherNames,
        )} to catch the details.`
      : `${joinNames(addressedNames)} can hear you at this volume.`;
  }
  return `You reasonably expect only ${joinNames(addressedNames)} to hear.`;
}

export function commitConversationTurn(
  inputWorld: World,
  input: CommitConversationTurnInput,
): CommitConversationTurnResult {
  const currentProgress = input.progress ?? createRunBConversationProgress();
  assertWorldIntegrity(inputWorld);
  validateConversationRoom(inputWorld, input.room);
  validateConversationSession(inputWorld, input.room, input.session);
  validateAddressee(input.room, input.addressee);
  if (!Number.isSafeInteger(input.turnOrdinal) || input.turnOrdinal < 1) {
    throw new Error(
      "Conversation turn ordinal must be a positive safe integer.",
    );
  }
  const availableIntents = availableConversationIntents(
    inputWorld,
    input.room,
    input.addressee,
    currentProgress,
    input.audibility,
  ).map((option) => option.key);
  if (!availableIntents.includes(input.intent)) {
    throw new Error(
      `Conversation intent ${String(input.intent)} is unavailable for this addressee.`,
    );
  }

  const turnKey = `${input.session.sessionKey}:turn:${input.turnOrdinal}`;
  rejectDuplicateTurn(inputWorld, turnKey);
  const actualListenerPersonIds = resolveConversationListeners(
    input.room,
    input.addressee,
    input.audibility,
  );
  const addresseePersonIds = resolveAddresseePersonIds(
    input.room,
    input.addressee,
  );
  const pendingContribution =
    input.intent === "listen" &&
    !isRunCLegislativeConversationProgress(currentProgress)
      ? (currentProgress.pendingContributions[0] ?? null)
      : null;
  const responseSpeakerPersonId =
    input.intent === "listen" && pendingContribution === null
      ? null
      : resolveResponseSpeaker(
          input.room,
          input.intent,
          addresseePersonIds,
          pendingContribution,
          actualListenerPersonIds,
        );
  if (
    input.intent === "listen" &&
    pendingContribution &&
    !responseSpeakerPersonId
  ) {
    throw new Error(
      "An inaudible pending contribution cannot be committed in the current hearing context.",
    );
  }

  const resolved =
    responseSpeakerPersonId === null
      ? resolveQuietRoom(inputWorld)
      : resolveNpcResponse(inputWorld, {
          turnKey,
          room: input.room,
          playerPersonId: input.room.playerPersonId,
          speakerPersonId: responseSpeakerPersonId,
          intent: input.intent,
          groupAddressed: input.addressee === "everyone",
          previousIntent: previousConversationIntent(inputWorld, input.session),
          progress: currentProgress,
          pendingContribution,
        });
  const progress = advanceConversationProgress(currentProgress, {
    room: input.room,
    addressee: input.addressee,
    intent: input.intent,
    outcome: resolved.outcome,
    responseSpeakerPersonId: resolved.speakerPersonId,
    pendingContribution,
  });
  let world = resolved.world;
  const participantPersonIds = canonicalPeople(input.room, [
    input.room.playerPersonId,
    ...actualListenerPersonIds,
    ...(resolved.speakerPersonId ? [resolved.speakerPersonId] : []),
  ]);
  const eventVisibility =
    input.audibility === "private" ? "private" : "limited";
  const eventSummary = conversationEventSummary(
    world,
    input.room.playerPersonId,
    resolved.speakerPersonId,
    input.intent,
    resolved.outcome,
    currentProgress,
  );

  // What this turn writes is the subject's business, not the engine's. A
  // household deciding who does the shopping used to leave casework history.
  const commit = conversationCommitContract(currentProgress);

  world = recordWorldEvent(world, {
    stableKey: `${turnKey}:event`,
    type: commit.eventType,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.room.jurisdictionId,
    involvedEntityIds: canonicalEntities([
      ...participantPersonIds,
      input.room.jurisdictionId,
      ...conversationSubjectEntityIds(currentProgress),
    ]),
    participants: participantPersonIds.map((personId) => ({
      personId,
      role:
        personId === input.room.playerPersonId
          ? input.intent === "listen"
            ? "presence:participant"
            : "agency:initiator"
          : personId === resolved.speakerPersonId
            ? "focus:respondent"
            : addresseePersonIds.includes(personId)
              ? "focus:addressee"
              : "observation:listener",
      detail:
        personId === input.room.playerPersonId
          ? input.intent === "listen"
            ? "Listened without speaking"
            : `Chose the ${input.intent} intent`
          : personId === resolved.speakerPersonId
            ? "Gave the recorded response"
            : addresseePersonIds.includes(personId)
              ? "Was directly addressed"
              : "Was nearby and reasonably heard the exchange",
    })),
    personFactConstraints: [],
    visibility: eventVisibility,
    tags: [
      commit.contextTag,
      `conversation.intent.${input.intent}`,
      `conversation.audibility.${input.audibility}`,
      commit.subjectTag,
    ],
    summary: eventSummary,
    context: {
      location: {
        jurisdictionId: input.room.jurisdictionId,
        label: input.room.locationLabel,
        setting: commit.setting,
      },
      socialContext: commit.socialContext,
      pressure: commit.pressure(input.intent),
      // Written by the subject in front of the player, in its own words.
      choice: commit.choice(input.intent, {
        // Addressing the room is addressing the person in it, which is the
        // same reading the subject dialogue already uses.
        addresseeName: shortPersonName(
          world,
          input.addressee === "everyone"
            ? input.room.eligibleAddresseePersonIds[0]!
            : input.addressee,
        ),
        named: (role) =>
          shortPersonName(world, conversationRole(input.room, role)),
      }),
      motivation: commit.motivation,
      immediateReaction:
        resolved.dialogue ??
        "The room settled briefly; no participant added another claim.",
    },
  });
  const event = world.history.events.at(-1);
  if (!event || event.stableKey !== `${turnKey}:event`) {
    throw new Error(
      "Conversation event was not recorded at the expected frontier.",
    );
  }

  const claimAudience: ClaimAudience | null = resolved.speakerPersonId
    ? input.audibility === "private"
      ? "private"
      : "limited"
    : null;
  if (
    resolved.speakerPersonId !== null &&
    resolved.dialogue !== null &&
    claimAudience !== null
  ) {
    world = recordClaim(world, {
      stableKey: `${turnKey}:claim`,
      speakerPersonId: resolved.speakerPersonId,
      eventId: event.id,
      madeAt: world.currentDate,
      audience: claimAudience,
      statement: resolved.dialogue,
      relationshipToTruth: "unknown",
      provenance: { kind: "direct-record" },
    });
  }
  const claim =
    resolved.speakerPersonId === null ? null : world.history.claims.at(-1);
  if (
    resolved.speakerPersonId !== null &&
    (!claim || claim.stableKey !== `${turnKey}:claim`)
  ) {
    throw new Error(
      "Conversation claim was not recorded at the expected frontier.",
    );
  }

  for (const personId of participantPersonIds) {
    world = recordEventKnowledge(world, {
      stableKey: `${turnKey}:knowledge:presence:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: eventSummary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }

  const claimSpeakerPersonId = resolved.speakerPersonId;
  const claimRecipientPersonIds =
    claimSpeakerPersonId === null || claim === null || claim === undefined
      ? []
      : canonicalPeople(input.room, [
          input.room.playerPersonId,
          ...actualListenerPersonIds.filter(
            (personId) => personId !== claimSpeakerPersonId,
          ),
        ]).filter((personId) => personId !== claimSpeakerPersonId);

  if (
    claimSpeakerPersonId !== null &&
    claim !== null &&
    claim !== undefined &&
    resolved.dialogue !== null &&
    resolved.perception !== null
  ) {
    for (const personId of claimRecipientPersonIds) {
      world = recordEventKnowledge(world, {
        stableKey: `${turnKey}:knowledge:claim:${personId}`,
        personId,
        eventId: event.id,
        learnedAt: world.currentDate,
        believedSummary: `${personName(world.people[claimSpeakerPersonId]!)} said: ${resolved.dialogue}`,
        accuracy: "unknown",
        confidence: "high",
        source: {
          kind: "told-by",
          sourcePersonId: claimSpeakerPersonId,
          claimId: claim.id,
        },
      });
      const knowledge = world.history.knowledge.at(-1);
      if (!knowledge) {
        throw new Error("Conversation claim knowledge was not recorded.");
      }
      world = recordPerception(world, {
        stableKey: `${turnKey}:perception:${personId}`,
        personId,
        perceivedAt: world.currentDate,
        subjectKind: "entity:conversation-position",
        subjectKey: `conversation-response:${claimSpeakerPersonId}`,
        subjectEntityId: claimSpeakerPersonId,
        assertion: resolved.perception,
        confidence: "medium",
        sourceCredibility: "medium",
        source: {
          kind: "heard-claim",
          claimId: claim.id,
          knowledgeId: knowledge.id,
        },
        supersedesPerceptionId: null,
      });
    }
  }

  const relationshipConsequence = relationshipConsequenceFor(input.intent);
  if (relationshipConsequence !== null) {
    if (resolved.speakerPersonId === null) {
      throw new Error(
        "A relationship-changing conversation turn requires an NPC response.",
      );
    }
    world = recordRelationshipInteraction(world, {
      stableKey: `${turnKey}:relationship`,
      personIds: canonicalPair(
        input.room.playerPersonId,
        resolved.speakerPersonId,
      ),
      eventId: event.id,
      occurredAt: world.currentDate,
      kind: commit.interactionKind(relationshipConsequence),
      change: relationshipConsequence,
      significance: "meaningful",
      summary:
        relationshipConsequence === "strengthened"
          ? `${shortPersonName(world, input.room.playerPersonId)} kept the request narrow, strengthening the working exchange with ${shortPersonName(world, resolved.speakerPersonId)}.`
          : `${shortPersonName(world, input.room.playerPersonId)} pressed for an immediate answer, straining the exchange with ${shortPersonName(world, resolved.speakerPersonId)}.`,
      tags: commit.interactionTags,
    });
  }

  assertWorldIntegrity(world);
  return {
    world,
    progress,
    semantic: {
      turnKey,
      outcome: resolved.outcome,
      responseSpeakerPersonId: resolved.speakerPersonId,
      actualListenerPersonIds,
      claimRecipientPersonIds,
      claimAudience,
      durableDecisionRecorded: resolved.durableDecisionRecorded,
      relationshipConsequence,
    },
    presentation: {
      beat:
        resolved.speakerPersonId !== null && resolved.dialogue !== null
          ? {
              speakerPersonId: resolved.speakerPersonId,
              speakerName: personName(world.people[resolved.speakerPersonId]!),
              dialogue: resolved.dialogue,
            }
          : null,
      playerIntentLabel:
        availableConversationIntents(
          world,
          input.room,
          input.addressee,
          currentProgress,
          input.audibility,
        ).find((option) => option.key === input.intent)?.label ?? input.intent,
      playerActionDescription:
        input.intent === "listen"
          ? "(You listen.)"
          : `You · ${
              availableConversationIntents(
                world,
                input.room,
                input.addressee,
                currentProgress,
                input.audibility,
              ).find((option) => option.key === input.intent)?.label ??
              input.intent
            }`,
      roomNarration:
        resolved.speakerPersonId === null
          ? "The room settles. No one adds anything yet."
          : null,
      hearingDescription: describeConversationHearing(
        world,
        input.room,
        input.addressee,
        input.audibility,
      ),
    },
  };
}

function resolveNpcResponse(
  world: World,
  input: {
    readonly turnKey: string;
    readonly room: ConversationRoomContext;
    readonly playerPersonId: EntityId;
    readonly speakerPersonId: EntityId;
    readonly intent: ConversationIntent;
    readonly groupAddressed: boolean;
    readonly previousIntent: ConversationIntent | null;
    readonly progress: ConversationProgress;
    readonly pendingContribution: RunBPendingContribution | null;
  },
): ResolvedResponse {
  if (input.speakerPersonId === input.playerPersonId) {
    throw new Error(
      "The controlled person cannot be an autonomous response actor.",
    );
  }
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("Conversation response speaker is missing.");
  const isPrimary =
    input.speakerPersonId === input.room.eligibleAddresseePersonIds[0];

  if (input.intent === "discuss-provision") {
    if (!isRunCLegislativeConversationProgress(input.progress)) {
      throw new Error(
        "A legislative discussion requires its provision subject.",
      );
    }
    return resolveLegislativeProvisionResponse(world, {
      speakerPersonId: input.speakerPersonId,
      progress: input.progress,
    });
  }
  if (isRunCLegislativeConversationProgress(input.progress)) {
    throw new Error(
      "The legislative provision subject cannot use casework intents.",
    );
  }
  if (isSchoolProjectConversationProgress(input.progress)) {
    return resolveSchoolProjectResponse(world, {
      speakerPersonId: input.speakerPersonId,
      intent: input.intent,
      progress: input.progress,
    });
  }
  if (isNeighborhoodMeetingConversationProgress(input.progress)) {
    return resolveNeighborhoodMeetingResponse(world, {
      speakerPersonId: input.speakerPersonId,
      intent: input.intent,
      progress: input.progress,
    });
  }
  if (isHouseholdObligationConversationProgress(input.progress)) {
    return resolveHouseholdObligationResponse(world, {
      speakerPersonId: input.speakerPersonId,
      intent: input.intent,
      progress: input.progress,
    });
  }
  if (
    input.intent === "raise-obligation" ||
    input.intent === "offer-to-cover" ||
    input.intent === "ask-to-share" ||
    input.intent === "ask-for-time" ||
    input.intent === "raise-share" ||
    input.intent === "offer-to-do-more" ||
    input.intent === "ask-to-split" ||
    input.intent === "mention-meeting" ||
    input.intent === "say-you-will-go" ||
    input.intent === "ask-them-to-go"
  ) {
    throw new Error(
      "Those are things to say at home, not about a constituent referral.",
    );
  }

  if (input.intent === "listen" && input.pendingContribution !== null) {
    return resolvePendingConversationContribution(world, {
      room: input.room,
      speakerPersonId: input.speakerPersonId,
      pendingContribution: input.pendingContribution,
    });
  }

  if (input.intent === "request-commitment" || input.intent === "press") {
    assertNpcAutonomousApplication(world, input.speakerPersonId);
    const evaluation = evaluateConversationDecision(world, {
      turnKey: input.turnKey,
      actorPersonId: input.speakerPersonId,
      playerPersonId: input.playerPersonId,
      intent: input.intent,
      isPrimary,
    });
    const tracedWorld = recordDurableDecisionTrace(world, evaluation);
    const selected = evaluation.selectedOptionKey;

    if (input.intent === "press") {
      const held = selected === "hold-boundary";
      return {
        world: tracedWorld,
        outcome: held ? "boundary-held" : "committed",
        speakerPersonId: input.speakerPersonId,
        dialogue: held
          ? input.previousIntent === "request-commitment"
            ? `“I heard the request, and my condition hasn’t changed: ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} needs to find out whether the third county referral lacked the proof-of-income form too. Then I can answer on the staff checklist.”`
            : `“Pressing me won’t replace the missing fact. Have ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} check whether the third county referral lacked the proof-of-income form, and then I can answer on the staff checklist.”`
          : input.groupAddressed
            ? `“All right. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))}, check the third county referral; if its proof-of-income form was missing too, I’ll back the staff checklist at the briefing.”`
            : "“All right. Put the three county referrals in front of me, and I’ll give you a clear answer on the document checklist.”",
        perception: held
          ? `${personName(speaker)} is holding a boundary until another case is verified.`
          : `${personName(speaker)} agreed to a narrow next step before the briefing.`,
        durableDecisionRecorded: true,
      };
    }

    const committed = selected === "commit";
    return {
      world: tracedWorld,
      outcome: committed ? "committed" : "deferred",
      speakerPersonId: input.speakerPersonId,
      dialogue: committed
        ? isPrimary
          ? input.groupAddressed
            ? `“All right. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} can check the third referral, and I’ll back a staff checklist focused on required documents at the briefing.”`
            : "“All right. Keep it tied to the missing proof-of-income forms, and I’ll back the pre-referral document checklist at the briefing.”"
          : isRunBReferralConversationProgress(input.progress) &&
              input.progress.reedVerification === "promised"
            ? "“I’ve got the third referral. I’ll check whether the county received it without the proof-of-income form and report back before the briefing.”"
            : "“Yes. I’ll call the neighborhood office and check whether the third county referral lacked the proof-of-income form before the briefing.”"
        : input.groupAddressed
          ? `“Not yet. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))}, find out whether the third county referral lacked the proof-of-income form too. Then I can answer on the staff checklist.”`
          : isRunBReferralConversationProgress(input.progress) &&
              input.progress.reedVerification === "promised"
            ? `“Not yet. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} is checking the third county referral; once he reports whether its proof-of-income form was missing, I can decide on the staff checklist.”`
            : `“Not yet. Have ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} check whether the third county referral lacked the proof-of-income form, and then I can answer on the staff checklist.”`,
      perception: committed
        ? `${personName(speaker)} agreed to a bounded commitment before the briefing.`
        : `${personName(speaker)} deferred a commitment pending one more verified case.`,
      durableDecisionRecorded: true,
    };
  }

  if (input.intent === "reassure") {
    return {
      world,
      outcome: "reassured",
      speakerPersonId: input.speakerPersonId,
      dialogue: isPrimary
        ? input.groupAddressed
          ? `“That helps. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))}, check the third referral; we’ll keep the staff checklist focused on the required document these cases establish.”`
          : "“That helps. Keep the staff checklist focused on the proof-of-income form these referrals establish.”"
        : "“Good. I’ll check whether the third county referral lacked the proof-of-income form and bring back that fact.”",
      perception: `${personName(speaker)} welcomed a narrow, evidence-led approach.`,
      durableDecisionRecorded: false,
    };
  }

  throw new Error("Listen requires a pending bounded contribution.");
}

function resolveQuietRoom(world: World): ResolvedResponse {
  return {
    world,
    outcome: "silence-held",
    speakerPersonId: null,
    dialogue: null,
    perception: null,
    durableDecisionRecorded: false,
  };
}

function resolveLegislativeProvisionResponse(
  world: World,
  input: {
    readonly speakerPersonId: EntityId;
    readonly progress: RunCLegislativeConversationProgress;
  },
): ResolvedResponse {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("Legislative response speaker is missing.");
  const knowledge = world.history.knowledge.find(
    (candidate) =>
      candidate.id === input.progress.subjectFacts.analysisKnowledgeId &&
      candidate.personId === input.speakerPersonId,
  );
  const knowledgeEvent = knowledge
    ? world.history.events.find(
        (candidate) => candidate.id === knowledge.eventId,
      )
    : undefined;
  if (
    !knowledge ||
    knowledgeEvent?.type !== "policy.analysis-reviewed" ||
    !knowledgeEvent.involvedEntityIds.includes(
      input.progress.subjectFacts.currentEstimateId,
    )
  ) {
    throw new Error(
      `${speaker.familyName} cannot discuss a policy projection he does not canonically know.`,
    );
  }
  return {
    world,
    outcome: "continued",
    speakerPersonId: input.speakerPersonId,
    dialogue: `“My read is that Section 3 sets an ${input.progress.subjectFacts.currentAmount} ceiling for this office draft,” ${speaker.familyName} says. “Under the staff projection, the prepared ${input.progress.subjectFacts.preparedAmount} version cuts the modeled maximum outlay in half for the same eligible-rider scope. That is a forecast comparison, not an appropriation or implementation.”`,
    perception: `${personName(speaker)} distinguished the current working language from a qualified staff projection and from actual implementation.`,
    durableDecisionRecorded: false,
  };
}

/**
 * The other person answers about the week.
 *
 * Nothing here reaches for the decision machinery the office subject uses: no
 * commitment is being extracted, and none is recorded. Two people are settling
 * who does the shopping.
 */
function resolveHouseholdObligationResponse(
  world: World,
  input: {
    readonly speakerPersonId: EntityId;
    readonly intent: ConversationIntent;
    readonly progress: HouseholdObligationConversationProgress;
  },
): ResolvedResponse {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("The other person in the room is missing.");
  const shortName = speaker.familyName;
  const errands = input.progress.subjectFacts.shortObligation;

  switch (input.intent) {
    case "raise-obligation":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“I know,” ${shortName} says. “I have been not-saying it too.”`,
        perception: `${personName(speaker)} had been avoiding the same conversation.`,
        durableDecisionRecorded: false,
      };
    case "offer-to-cover":
      return {
        world,
        outcome: "reassured",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Then I owe you one,” ${shortName} says. “I mean that.”`,
        perception: `${personName(speaker)} accepted the offer and said it counted.`,
        durableDecisionRecorded: false,
      };
    case "ask-to-share":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Half each works,” ${shortName} says. “Tell me which half.”`,
        perception: `${personName(speaker)} agreed to split ${errands}.`,
        durableDecisionRecorded: false,
      };
    case "ask-for-time":
      return {
        world,
        outcome: "deferred",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Fine. I will do it,” ${shortName} says. “Not every week, though.”`,
        perception: `${personName(speaker)} took ${errands} on, and said so with a limit attached.`,
        durableDecisionRecorded: false,
      };
    case "listen":
      return {
        world,
        outcome: "silence-held",
        speakerPersonId: null,
        dialogue: null,
        perception: null,
        durableDecisionRecorded: false,
      };
    default:
      throw new Error("That is not something to say about the week at home.");
  }
}

function resolveSchoolProjectResponse(
  world: World,
  input: {
    readonly speakerPersonId: EntityId;
    readonly intent: ConversationIntent;
    readonly progress: SchoolProjectConversationProgress;
  },
): ResolvedResponse {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("The other person in the room is missing.");
  const shortName = speaker.familyName;

  switch (input.intent) {
    case "raise-share":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“I thought you were doing that bit,” ${shortName} says, and then, “sorry. I did think that.”`,
        perception: `${personName(speaker)} had assumed the unstarted part was somebody else's.`,
        durableDecisionRecorded: false,
      };
    case "offer-to-do-more":
      return {
        world,
        outcome: "reassured",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“You do not have to do that,” ${shortName} says, already writing their name next to a different section.`,
        perception: `${personName(speaker)} took a section rather than accept the whole offer.`,
        durableDecisionRecorded: false,
      };
    case "ask-to-split":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Down the middle, then,” ${shortName} says. “You pick first, so you cannot complain.”`,
        perception: `${personName(speaker)} agreed to divide the unstarted work.`,
        durableDecisionRecorded: false,
      };
    case "listen":
      return {
        world,
        outcome: "silence-held",
        speakerPersonId: null,
        dialogue: null,
        perception: null,
        durableDecisionRecorded: false,
      };
    default:
      throw new Error("That is not something to say about the project.");
  }
}

function resolveNeighborhoodMeetingResponse(
  world: World,
  input: {
    readonly speakerPersonId: EntityId;
    readonly intent: ConversationIntent;
    readonly progress: NeighborhoodMeetingConversationProgress;
  },
): ResolvedResponse {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("The other person in the room is missing.");
  const shortName = speaker.familyName;

  switch (input.intent) {
    case "mention-meeting":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“I saw the notice,” ${shortName} says. “I have not decided whether it is worth an evening.”`,
        perception: `${personName(speaker)} had seen the notice and not decided about it.`,
        durableDecisionRecorded: false,
      };
    case "say-you-will-go":
      return {
        world,
        outcome: "reassured",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Then tell me what they say,” ${shortName} says. “I will take your word for it.”`,
        perception: `${personName(speaker)} was content to hear about it secondhand.`,
        durableDecisionRecorded: false,
      };
    case "ask-them-to-go":
      return {
        world,
        outcome: "deferred",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Maybe,” ${shortName} says. “If it is still the route they are changing, maybe.”`,
        perception: `${personName(speaker)} would go only if it is about the route past their house.`,
        durableDecisionRecorded: false,
      };
    case "listen":
      return {
        world,
        outcome: "silence-held",
        speakerPersonId: null,
        dialogue: null,
        perception: null,
        durableDecisionRecorded: false,
      };
    default:
      throw new Error("That is not something to say about the meeting.");
  }
}

function resolvePendingConversationContribution(
  world: World,
  input: {
    readonly room: ConversationRoomContext;
    readonly speakerPersonId: EntityId;
    readonly pendingContribution: RunBPendingContribution;
  },
): ResolvedResponse {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) {
    throw new Error("Pending conversation speaker is missing.");
  }
  switch (input.pendingContribution) {
    case "collins-explain-condition":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Here’s what I need,” ${shortPersonName(world, conversationRole(input.room, "briefing-lead"))} says. “If the third county referral also lacked the proof-of-income form, I can back one document checklist for staff to use before future referrals. ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} is checking that missing fact.”`,
        perception: `${personName(speaker)} made support for the checklist conditional on the last case.`,
        durableDecisionRecorded: false,
      };
    case "reed-offer-verification":
      return {
        world,
        outcome: "bystander-interjected",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“I can make that call,” ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} says. “I’ll check whether the county received the third referral without the proof-of-income form and report back before the briefing.”`,
        perception: `${personName(speaker)} promised to verify the remaining case before the briefing.`,
        durableDecisionRecorded: false,
      };
    case "collins-respond-to-reed":
      return {
        world,
        outcome: "continued",
        speakerPersonId: input.speakerPersonId,
        dialogue: `“Good,” ${shortPersonName(world, conversationRole(input.room, "briefing-lead"))} says. “Once ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} reports on the third referral, put all three together and I’ll give you a final answer on the staff document checklist.”`,
        perception: `${personName(speaker)} kept a clear evidence condition while ${shortPersonName(world, conversationRole(input.room, "referral-verifier"))} followed up.`,
        durableDecisionRecorded: false,
      };
  }
}

function advanceConversationProgress(
  progress: ConversationProgress,
  input: {
    readonly room: ConversationRoomContext;
    readonly addressee: ConversationAddressee;
    readonly intent: ConversationIntent;
    readonly outcome: ConversationSemanticResult["outcome"];
    readonly responseSpeakerPersonId: EntityId | null;
    readonly pendingContribution: RunBPendingContribution | null;
  },
): ConversationProgress {
  if (isRunCLegislativeConversationProgress(progress)) {
    if (input.intent !== "discuss-provision") {
      throw new Error(
        "The legislative subject accepts only its bounded discussion intent.",
      );
    }
    return {
      ...progress,
      phase: "discussed",
      latestProposition: "compare-prepared-cap",
    };
  }
  if (isHouseholdObligationConversationProgress(progress)) {
    return advanceHouseholdObligation(progress, input.intent);
  }
  if (isSchoolProjectConversationProgress(progress)) {
    return advanceSchoolProject(progress, input.intent);
  }
  if (isNeighborhoodMeetingConversationProgress(progress)) {
    return advanceNeighborhoodMeeting(progress, input.intent);
  }
  // Everything else is the referral subject; the guard above is exhaustive.
  if (input.intent === "listen") {
    if (input.pendingContribution === null) {
      return {
        ...progress,
        phase: "settled",
        silenceSettled: true,
      };
    }
    const remaining = progress.pendingContributions.slice(1);
    switch (input.pendingContribution) {
      case "collins-explain-condition":
        return {
          ...progress,
          phase: "clarifying-condition",
          collinsSupport: "conditional",
          pendingContributions: remaining,
          silenceSettled: false,
        };
      case "reed-offer-verification":
        return {
          ...progress,
          phase: "awaiting-verification",
          reedVerification: "promised",
          pendingContributions: remaining,
          silenceSettled: false,
        };
      case "collins-respond-to-reed":
        return {
          ...progress,
          phase: "coordinating-briefing",
          collinsSupport: "conditional",
          pendingContributions: remaining,
          silenceSettled: false,
        };
    }
  }

  const proposition = propositionFor(input.room, input.addressee, input.intent);
  const primaryId = input.room.eligibleAddresseePersonIds[0];
  const secondaryId = input.room.eligibleAddresseePersonIds[1];
  const primaryResponded = input.responseSpeakerPersonId === primaryId;
  const secondaryResponded = input.responseSpeakerPersonId === secondaryId;
  const collinsSupport = primaryResponded
    ? input.outcome === "committed"
      ? "committed"
      : input.intent === "request-commitment" || input.intent === "press"
        ? "conditional"
        : progress.collinsSupport
    : progress.collinsSupport;
  const reedVerification = secondaryResponded
    ? "promised"
    : progress.reedVerification;
  const pendingContributions = pendingContributionsAfterPlayerIntent({
    progress: { ...progress, collinsSupport, reedVerification },
    primaryResponded,
    secondaryResponded,
  });

  return {
    ...progress,
    phase:
      reedVerification === "promised"
        ? "awaiting-verification"
        : collinsSupport === "conditional"
          ? "clarifying-condition"
          : "coordinating-briefing",
    collinsSupport,
    reedVerification,
    latestProposition: proposition,
    pendingContributions,
    silenceSettled: false,
  };
}

function pendingContributionsAfterPlayerIntent(input: {
  readonly progress: Pick<
    RunBConversationProgress,
    "collinsSupport" | "reedVerification"
  >;
  readonly primaryResponded: boolean;
  readonly secondaryResponded: boolean;
}): readonly RunBPendingContribution[] {
  if (
    input.primaryResponded &&
    input.progress.reedVerification === "unoffered"
  ) {
    return ["reed-offer-verification"];
  }
  if (
    input.secondaryResponded &&
    input.progress.collinsSupport !== "committed"
  ) {
    return ["collins-respond-to-reed"];
  }
  return [];
}

function propositionFor(
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  intent: Exclude<ConversationIntent, "listen">,
): RunBConversationProposition {
  if (intent === "reassure") return "keep-recommendation-narrow";
  if (intent === "press") return "press-for-answer";
  if (addressee === "everyone") return "joint-commitment";
  return addressee === room.eligibleAddresseePersonIds[0]
    ? "collins-back-checklist"
    : "reed-verify-last-case";
}

function evaluateConversationDecision(
  world: World,
  input: {
    readonly turnKey: string;
    readonly actorPersonId: EntityId;
    readonly playerPersonId: EntityId;
    readonly intent: "request-commitment" | "press";
    readonly isPrimary: boolean;
  },
): DecisionEvaluation {
  const options =
    input.intent === "press"
      ? [
          {
            key: "answer-now",
            label: "Answer now",
            description:
              "Give the requested answer before further verification.",
          },
          {
            key: "hold-boundary",
            label: "Hold the boundary",
            description: "Require another verified case before answering.",
          },
        ]
      : [
          {
            key: "commit",
            label: "Make a bounded commitment",
            description: "Agree to one concrete next step before the briefing.",
          },
          {
            key: "defer",
            label: "Defer for evidence",
            description: "Ask for another verified case before committing.",
          },
        ];

  return evaluateDecision(world, {
    stableKey: `${input.turnKey}:npc-decision`,
    decisionType: "conversation.commitment-response",
    actorPersonId: input.actorPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:office-conversation",
      key: `${input.intent}:briefing-next-step`,
      entityId: input.playerPersonId,
    },
    options,
    constraints: [],
    considerations: conversationDecisionConsiderations(world, input),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

function conversationDecisionConsiderations(
  world: World,
  input: {
    readonly actorPersonId: EntityId;
    readonly playerPersonId: EntityId;
    readonly intent: "request-commitment" | "press";
    readonly isPrimary: boolean;
  },
): readonly DecisionConsideration[] {
  const commitOption = input.intent === "press" ? "answer-now" : "commit";
  const deferOption = input.intent === "press" ? "hold-boundary" : "defer";
  if (!input.isPrimary) {
    return [
      {
        stableKey: "conversation:available-office-capacity",
        optionKey: commitOption,
        sourceType: "context:available-office-capacity",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation:
          "The requested neighborhood follow-up is concrete and can begin now.",
        sourceRefs: [],
      },
      {
        stableKey: "conversation:verification-needed",
        optionKey: deferOption,
        sourceType: "context:verification-needed",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "The underlying case still needs verification.",
        sourceRefs: [],
      },
    ];
  }

  const considerations: DecisionConsideration[] = [];
  const activeGoal = [...world.history.goalStates]
    .reverse()
    .find(
      (record) =>
        record.personId === input.actorPersonId && record.status === "active",
    );
  if (activeGoal) {
    considerations.push({
      stableKey: "conversation:goal-more-evidence",
      optionKey: deferOption,
      sourceType: "mind:active-goal",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        "The actor's active goal favors understanding one more concrete local need.",
      sourceRefs: [{ kind: "goal-state", goalStateId: activeGoal.id }],
    });
  }
  const personalValue = [...world.history.personalValues]
    .reverse()
    .find((record) => record.personId === input.actorPersonId);
  if (personalValue) {
    considerations.push({
      stableKey: "conversation:value-visible-hardship",
      optionKey: commitOption,
      sourceType: "mind:personal-value",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "Visible concrete hardship supports taking a bounded step.",
      sourceRefs: [{ kind: "personal-value", valueRecordId: personalValue.id }],
    });
  }
  const perception = [...world.history.perceptions]
    .reverse()
    .find((record) => record.personId === input.actorPersonId);
  if (perception) {
    considerations.push({
      stableKey: "conversation:perceived-possible-help",
      optionKey: commitOption,
      sourceType: "information:existing-perception",
      direction: "supports",
      importance: "slight",
      confidence: "low",
      explanation: "The actor sees a possible benefit but remains uncertain.",
      sourceRefs: [{ kind: "perception", perceptionId: perception.id }],
    });
  }
  const interaction = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (record) =>
        record.personIds.includes(input.actorPersonId) &&
        record.personIds.includes(input.playerPersonId),
    );
  if (interaction) {
    considerations.push({
      stableKey: "conversation:working-rapport",
      optionKey: commitOption,
      sourceType: "social:working-rapport",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation:
        "The recent working exchange supports taking the request seriously.",
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    });
  }
  return considerations;
}

function validateConversationRoom(world: World, room: ConversationRoomContext) {
  if (!room.sceneKey.trim() || !room.locationLabel.trim()) {
    throw new Error(
      "Conversation room requires stable scene and location labels.",
    );
  }
  if (!world.jurisdictions[room.jurisdictionId]) {
    throw new Error("Conversation room references a missing jurisdiction.");
  }
  if (
    world.control.kind !== "person" ||
    world.control.personId !== room.playerPersonId
  ) {
    throw new Error(
      "Conversation room must use the controlled person as player.",
    );
  }
  // Whatever parts this room declares must be played by people the world
  // actually has. Which parts those are is the room's business: the validator
  // used to insist on a briefing lead and a referral verifier, which is why a
  // kitchen had to invent both.
  for (const [role, personId] of Object.entries(room.roles)) {
    if (!world.people[personId]) {
      throw new Error(
        `The ${role} in this room is not somebody the world has: ${personId}`,
      );
    }
  }
  const groups = [
    room.physicallyPresentPersonIds,
    room.activeParticipantPersonIds,
    room.eligibleAddresseePersonIds,
    room.normalHearingPersonIds,
    room.quietAmbientHearingPersonIds,
  ];
  for (const group of groups) {
    if (new Set(group).size !== group.length) {
      throw new Error(
        "Conversation room person lists cannot contain duplicates.",
      );
    }
    for (const personId of group) {
      if (!world.people[personId]) {
        throw new Error(
          `Conversation room references a missing person: ${personId}`,
        );
      }
      if (!room.physicallyPresentPersonIds.includes(personId)) {
        throw new Error(
          "Conversation participants and listeners must be physically present.",
        );
      }
    }
  }
  if (!room.physicallyPresentPersonIds.includes(room.playerPersonId)) {
    throw new Error("The controlled person must be physically present.");
  }
  if (!room.activeParticipantPersonIds.includes(room.playerPersonId)) {
    throw new Error("The controlled person must be an active participant.");
  }
  if (room.eligibleAddresseePersonIds.length === 0) {
    throw new Error("Conversation room requires at least one NPC addressee.");
  }
  if (room.eligibleAddresseePersonIds.includes(room.playerPersonId)) {
    throw new Error(
      "The controlled person cannot be a conversation addressee.",
    );
  }
  for (const personId of room.eligibleAddresseePersonIds) {
    if (!room.activeParticipantPersonIds.includes(personId)) {
      throw new Error("Every addressee must be an active participant.");
    }
  }
  if (!room.privateAvailable && !room.privateUnavailableReason?.trim()) {
    throw new Error(
      "An unavailable Private mode requires a natural explanation.",
    );
  }
  if (room.privateAvailable && room.privateUnavailableReason !== null) {
    throw new Error(
      "A private-capable room cannot carry an unavailable reason.",
    );
  }
}

function validateConversationSession(
  world: World,
  room: ConversationRoomContext,
  session: ConversationSessionDescriptor,
) {
  if (
    !Number.isSafeInteger(session.startingHistorySequence) ||
    session.startingHistorySequence < 0 ||
    session.startingHistorySequence > world.history.nextSequence
  ) {
    throw new Error(
      "Conversation session has an invalid starting history frontier.",
    );
  }
  if (
    session.sceneKey !== room.sceneKey ||
    session.startedAtDate !== world.currentDate
  ) {
    throw new Error(
      "Conversation session no longer matches its scene or date.",
    );
  }
  const expectedParticipants = canonicalPeople(
    room,
    room.activeParticipantPersonIds,
  );
  if (
    JSON.stringify(session.participantPersonIds) !==
    JSON.stringify(expectedParticipants)
  ) {
    throw new Error("Conversation session participants do not match the room.");
  }
  const expectedKey = conversationSessionKey(
    world,
    room,
    session.startingHistorySequence,
    expectedParticipants,
  );
  if (session.sessionKey !== expectedKey) {
    throw new Error("Conversation session key is malformed.");
  }
}

function conversationSessionKey(
  world: World,
  room: ConversationRoomContext,
  startingHistorySequence: number,
  participantPersonIds: readonly EntityId[],
): string {
  return `run-b:conversation:${world.id}:${room.sceneKey}:frontier-${startingHistorySequence}:${participantPersonIds.join("+")}`;
}

function validateAddressee(
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
) {
  if (
    addressee !== "everyone" &&
    !room.eligibleAddresseePersonIds.includes(addressee)
  ) {
    throw new Error(
      "Conversation addressee is not an active NPC in this room.",
    );
  }
}

function resolveAddresseePersonIds(
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
): readonly EntityId[] {
  return addressee === "everyone"
    ? room.eligibleAddresseePersonIds
    : [addressee];
}

function resolveResponseSpeaker(
  room: ConversationRoomContext,
  intent: ConversationIntent,
  addresseePersonIds: readonly EntityId[],
  pendingContribution: RunBPendingContribution | null,
  actualListenerPersonIds: readonly EntityId[],
): EntityId | null {
  if (intent === "listen" && pendingContribution !== null) {
    const pendingSpeakerPersonId = pendingContributionSpeakerPersonId(
      room,
      pendingContribution,
    );
    return actualListenerPersonIds.includes(pendingSpeakerPersonId)
      ? pendingSpeakerPersonId
      : null;
  }
  const speaker = addresseePersonIds[0];
  if (!speaker) throw new Error("Conversation turn has no response speaker.");
  if (!actualListenerPersonIds.includes(speaker)) {
    throw new Error("Conversation response speaker did not hear the exchange.");
  }
  return speaker;
}

function canListenInCurrentHearingContext(
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  audibility: ConversationAudibility,
  progress: ConversationProgress,
): boolean {
  if (!isRunBReferralConversationProgress(progress)) {
    return !progress.silenceSettled;
  }
  const pendingContribution = progress.pendingContributions[0] ?? null;
  if (pendingContribution === null) {
    return canListenToRunBConversation(progress);
  }
  const listeners = resolveConversationListeners(room, addressee, audibility);
  return listeners.includes(
    pendingContributionSpeakerPersonId(room, pendingContribution),
  );
}

function pendingContributionSpeakerPersonId(
  room: ConversationRoomContext,
  pendingContribution: RunBPendingContribution,
): EntityId {
  const speakerPersonId =
    pendingContribution === "reed-offer-verification"
      ? room.eligibleAddresseePersonIds[1]
      : room.eligibleAddresseePersonIds[0];
  if (!speakerPersonId) {
    throw new Error("Pending conversation contribution has no room speaker.");
  }
  return speakerPersonId;
}

function previousConversationIntent(
  world: World,
  session: ConversationSessionDescriptor,
): ConversationIntent | null {
  const previousTurn = [...world.history.events]
    .reverse()
    .find((event) => event.stableKey.startsWith(`${session.sessionKey}:turn:`));
  if (!previousTurn) return null;
  return (
    RUN_B_CONVERSATION_INTENTS.find((intent) =>
      previousTurn.tags.includes(`conversation.intent.${intent}`),
    ) ?? null
  );
}

function rejectDuplicateTurn(world: World, turnKey: string) {
  const duplicate = world.history.events.some(
    (event) => event.stableKey === `${turnKey}:event`,
  );
  if (duplicate) {
    throw new Error(`Conversation turn was already committed: ${turnKey}`);
  }
}

function relationshipConsequenceFor(
  intent: ConversationIntent,
): "strengthened" | "strained" | null {
  if (intent === "reassure") return "strengthened";
  if (intent === "press") return "strained";
  return null;
}

function conversationEventSummary(
  world: World,
  playerPersonId: EntityId,
  responseSpeakerPersonId: EntityId | null,
  intent: ConversationIntent,
  outcome: ConversationSemanticResult["outcome"],
  progress: ConversationProgress,
): string {
  const player = personName(world.people[playerPersonId]!);
  if (isRunCLegislativeConversationProgress(progress)) {
    if (intent !== "discuss-provision" || responseSpeakerPersonId === null) {
      throw new Error(
        "A legislative provision turn requires the briefing lead's response.",
      );
    }
    const speaker = personName(world.people[responseSpeakerPersonId]!);
    return `${player} asked ${speaker} about the selected ${progress.subjectFacts.currentAmount} Transit Access Pilot working provision and its prepared ${progress.subjectFacts.preparedAmount} version.`;
  }
  if (intent === "listen") {
    if (responseSpeakerPersonId === null) {
      return `${player} listened without speaking; the room settled without another claim.`;
    }
    const speaker = personName(world.people[responseSpeakerPersonId]!);
    return `${player} listened while ${speaker} continued the office discussion with a concrete next step.`;
  }
  if (responseSpeakerPersonId === null) {
    throw new Error("A spoken conversation intent requires an NPC response.");
  }
  const speaker = personName(world.people[responseSpeakerPersonId]!);
  return `${player} used a ${intent.replaceAll("-", " ")} approach; ${speaker} ${outcome.replaceAll("-", " ")}.`;
}

function conversationSubjectEntityIds(
  progress: ConversationProgress,
): readonly EntityId[] {
  if (!isRunCLegislativeConversationProgress(progress)) return [];
  return [
    progress.subjectFacts.currentAlternativeId,
    progress.subjectFacts.currentOperationId,
    progress.subjectFacts.currentEstimateId,
    progress.subjectFacts.preparedAlternativeId,
    progress.subjectFacts.preparedOperationId,
    progress.subjectFacts.preparedEstimateId,
  ];
}

function canonicalPeople(
  room: ConversationRoomContext,
  personIds: readonly EntityId[],
): readonly EntityId[] {
  const requested = new Set(personIds);
  return room.physicallyPresentPersonIds.filter((personId) =>
    requested.has(personId),
  );
}

function canonicalEntities(
  entityIds: readonly EntityId[],
): readonly EntityId[] {
  return [...new Set(entityIds)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function canonicalPair(
  first: EntityId,
  second: EntityId,
): readonly [EntityId, EntityId] {
  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

function shortPersonName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing conversation person: ${personId}`);
  return person.familyName;
}

function joinNames(names: readonly string[]): string {
  if (names.length === 0) return "No one else";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function conversationDecisionSourceReferences(
  evaluation: DecisionEvaluation,
): readonly MindSourceReference[] {
  return evaluation.context.considerations.flatMap(
    (consideration) => consideration.sourceRefs,
  );
}
