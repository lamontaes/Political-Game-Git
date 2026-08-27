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

export const RUN_B_AUDIBILITY_OPTIONS = ["normal", "quiet", "private"] as const;
export type ConversationAudibility = (typeof RUN_B_AUDIBILITY_OPTIONS)[number];

export const RUN_B_CONVERSATION_INTENTS = [
  "request-commitment",
  "reassure",
  "press",
  "listen",
] as const;
export type ConversationIntent = (typeof RUN_B_CONVERSATION_INTENTS)[number];

export type ConversationAddressee = EntityId | "everyone";

export const RUN_B_BRIEFING_CONTEXT =
  "Three emergency-rent cases share a referral gap. The briefing will decide on a shared intake checklist; Collins must back it, and Reed can verify the final case.";

export interface ConversationRoomContext {
  readonly sceneKey: string;
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
  addressee: ConversationAddressee,
  availability: { readonly listenAvailable?: boolean } = {},
): readonly ConversationIntentOption[] {
  const commitmentLabel =
    addressee === "everyone"
      ? "Ask for a joint commitment"
      : "Ask for a commitment";
  const options: ConversationIntentOption[] = [
    {
      key: "request-commitment",
      label: commitmentLabel,
      description: "Ask for a clear next step before the briefing.",
    },
    {
      key: "reassure",
      label: "Reassure",
      description: "Keep the request narrow and evidence-led.",
    },
  ];
  if (addressee !== "everyone") {
    options.push({
      key: "press",
      label: "Press the point",
      description: "Ask for an answer now.",
    });
  }
  if (availability.listenAvailable !== false) {
    options.push({
      key: "listen",
      label: "Listen",
      description: "Stay quiet and hear what the room does next.",
    });
  }
  return options;
}

export function openingConversationBeat(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
): ConversationDialogueBeat {
  validateAddressee(room, addressee);
  const addresseeIds = resolveAddresseePersonIds(room, addressee);
  const speakerPersonId = addresseeIds[0]!;
  const speaker = world.people[speakerPersonId];
  if (!speaker) {
    throw new Error("Conversation opening speaker is missing from the World.");
  }

  if (addressee === "everyone") {
    return {
      speakerPersonId,
      speakerName: personName(speaker),
      dialogue:
        "“We have three cases and an afternoon briefing,” Collins says. “What do you want to settle?”",
    };
  }
  if (speakerPersonId === room.eligibleAddresseePersonIds[0]) {
    return {
      speakerPersonId,
      speakerName: personName(speaker),
      dialogue: "“What do you need from me before the afternoon briefing?”",
    };
  }
  return {
    speakerPersonId,
    speakerName: personName(speaker),
    dialogue:
      "“I can check with the neighborhood office,” Reed says. “What should I ask them to confirm?”",
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
  assertWorldIntegrity(inputWorld);
  validateConversationRoom(inputWorld, input.room);
  validateConversationSession(inputWorld, input.room, input.session);
  validateAddressee(input.room, input.addressee);
  if (!Number.isSafeInteger(input.turnOrdinal) || input.turnOrdinal < 1) {
    throw new Error(
      "Conversation turn ordinal must be a positive safe integer.",
    );
  }
  const listenAvailable =
    conversationIntentCount(inputWorld, input.session, "listen") < 2;
  const availableIntents = availableConversationIntents(input.addressee, {
    listenAvailable,
  }).map((option) => option.key);
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
  const npcContinuationWarranted =
    input.intent !== "listen" ||
    shouldContinueAfterListening(inputWorld, input.session);
  const responseSpeakerPersonId = npcContinuationWarranted
    ? resolveResponseSpeaker(
        input.room,
        input.intent,
        addresseePersonIds,
        actualListenerPersonIds,
      )
    : null;

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
  );

  world = recordWorldEvent(world, {
    stableKey: `${turnKey}:event`,
    type: "conversation.office-turn",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.room.jurisdictionId,
    involvedEntityIds: canonicalEntities([
      ...participantPersonIds,
      input.room.jurisdictionId,
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
      "conversation.office",
      `conversation.intent.${input.intent}`,
      `conversation.audibility.${input.audibility}`,
    ],
    summary: eventSummary,
    context: {
      location: {
        jurisdictionId: input.room.jurisdictionId,
        label: input.room.locationLabel,
        setting: "Synthetic Stage 6.5 office conversation fixture",
      },
      socialContext: "A bounded in-room conversation during briefing work.",
      pressure: conversationPressure(input.intent),
      choice: conversationChoice(input.intent),
      motivation:
        "Clarify the next step without turning the exchange into a score check.",
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
      kind:
        relationshipConsequence === "strengthened"
          ? "work:reassurance"
          : "conflict:pressed-for-answer",
      change: relationshipConsequence,
      significance: "meaningful",
      summary:
        relationshipConsequence === "strengthened"
          ? `${shortPersonName(world, input.room.playerPersonId)} kept the request narrow, strengthening the working exchange with ${shortPersonName(world, resolved.speakerPersonId)}.`
          : `${shortPersonName(world, input.room.playerPersonId)} pressed for an immediate answer, straining the exchange with ${shortPersonName(world, resolved.speakerPersonId)}.`,
      tags: ["conversation.office", "relationship.shared-work"],
    });
  }

  assertWorldIntegrity(world);
  return {
    world,
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
        availableConversationIntents(input.addressee).find(
          (option) => option.key === input.intent,
        )?.label ?? input.intent,
      playerActionDescription:
        input.intent === "listen"
          ? "(You listen.)"
          : `You · ${
              availableConversationIntents(input.addressee).find(
                (option) => option.key === input.intent,
              )?.label ?? input.intent
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
            ? "“I heard the request, and my condition hasn’t changed: verify one more constituent-service case, then I’ll answer before the briefing.”"
            : "“Pressing me won’t replace the missing evidence. Bring me one more verified constituent-service case, and I’ll answer before the briefing.”"
          : input.groupAddressed
            ? "“All right. Reed, verify the remaining case; I’ll give the group a narrow answer before the briefing.”"
            : "“All right. Keep the request narrow, put the verified constituent-service cases in front of me, and I’ll answer before the briefing.”",
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
            ? "“All right. Reed can verify the remaining case, and you have my support for a narrow recommendation at the briefing.”"
            : "“All right. Keep it tied to the verified constituent-service cases, and you have my support for the briefing.”"
          : "“Yes. I’ll call the neighborhood office and bring back what they can verify before the briefing.”"
        : input.groupAddressed
          ? "“Not yet. Reed, bring us one more verified constituent-service case, and I’ll give the group an answer before the briefing.”"
          : "“Not yet. Bring me one more verified case, and I’ll give you an answer before the briefing.”",
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
          ? "“That helps. Reed, check the remaining case; we’ll keep the briefing recommendation narrow and tied to what we can verify.”"
          : "“That helps. Keep the briefing recommendation narrow and tied to what we can verify.”"
        : "“Good. I’ll ask for the facts, not a talking point.”",
      perception: `${personName(speaker)} welcomed a narrow, evidence-led approach.`,
      durableDecisionRecorded: false,
    };
  }

  return {
    world,
    outcome: isPrimary ? "continued" : "bystander-interjected",
    speakerPersonId: input.speakerPersonId,
    dialogue: isPrimary
      ? input.previousIntent === "request-commitment"
        ? "“That condition is the point: one more verified constituent-service case would make the briefing recommendation easier to defend.”"
        : "“Let me finish the thought: the briefing recommendation turns on whether one more constituent-service case confirms the same barrier.”"
      : input.previousIntent === "request-commitment"
        ? "“I’ll take that condition. I can call the neighborhood office now and verify the remaining constituent-service case,” Reed says."
        : "“The open question is whether the three constituent-service cases share the same barrier. I can call the neighborhood office now,” Reed says.",
    perception: `${personName(speaker)} offered a concrete way to verify another case.`,
    durableDecisionRecorded: false,
  };
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
  actualListenerPersonIds: readonly EntityId[],
): EntityId {
  if (intent === "listen" && addresseePersonIds.length > 1) {
    const secondary = room.eligibleAddresseePersonIds[1];
    if (secondary && actualListenerPersonIds.includes(secondary))
      return secondary;
  }
  const speaker = addresseePersonIds[0];
  if (!speaker) throw new Error("Conversation turn has no response speaker.");
  return speaker;
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

function conversationIntentCount(
  world: World,
  session: ConversationSessionDescriptor,
  intent: ConversationIntent,
): number {
  return world.history.events.filter(
    (event) =>
      event.stableKey.startsWith(`${session.sessionKey}:turn:`) &&
      event.tags.includes(`conversation.intent.${intent}`),
  ).length;
}

function shouldContinueAfterListening(
  world: World,
  session: ConversationSessionDescriptor,
): boolean {
  return !world.history.events.some(
    (event) =>
      event.stableKey.startsWith(`${session.sessionKey}:turn:`) &&
      event.tags.includes("conversation.intent.listen"),
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
): string {
  const player = personName(world.people[playerPersonId]!);
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

function conversationPressure(intent: ConversationIntent): string | null {
  if (intent === "press") return "The player asked for an immediate answer.";
  if (intent === "request-commitment") {
    return "The afternoon briefing creates pressure for a clear next step.";
  }
  return null;
}

function conversationChoice(intent: ConversationIntent): string {
  return (
    availableConversationIntents("everyone").find(
      (option) => option.key === intent,
    )?.description ?? `The player chose to ${intent.replaceAll("-", " ")}.`
  );
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
