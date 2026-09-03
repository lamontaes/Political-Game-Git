import {
  assertNpcAutonomousApplication,
  assessCommitment,
  commitmentsHeldBy,
  currentMeasureProvisions,
  currentProvisionByKey,
  currentHistoricalCutoff,
  evaluateDecision,
  personName,
  recordDurableDecisionTrace,
  recordLegislativeCommitment,
  recordLegislativeNegotiation,
} from "../simulation";
import type {
  ClaimAudience,
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  LegislativeCommitmentCondition,
  LegislativeCommitmentFirmness,
  LegislativeCommitmentStance,
  LegislativeExchangeCharacter,
  LegislativeNegotiationDisposition,
  World,
} from "../simulation";
import {
  legislativeMotifLine,
  type LegislativeMotifFacts,
  type LegislativeMotifFamily,
  type LegislativeVoice,
} from "./legislative-dialogue-motifs";
import type {
  LegislativeBargainingProgress,
  LegislativeBargainingProposition,
  LegislativeBargainingSubjectFacts,
} from "./run-b-conversation-progress";
import type {
  ConversationAddressee,
  ConversationAudibility,
  ConversationIntentOption,
  ConversationRoomContext,
} from "./run-b-conversation";

/**
 * Bargaining over a live measure, as one more subject on the accepted
 * conversation substrate.
 *
 * This module supplies three things and nothing else: which moves the player
 * has in front of them, what the other member says back, and what canonically
 * follows from the exchange. Audibility, listeners, claims, knowledge and
 * perception are all still resolved by the conversation engine — a private word
 * here is private for exactly the reasons a private word is private anywhere
 * else in the game.
 *
 * The rule that shapes everything below: talking never legislates. A member can
 * promise support, withdraw an objection or agree to carry an amendment, and
 * none of it puts a word into the bill. Only an amendment the chamber adopts
 * does that.
 */

export const LEGISLATIVE_BARGAINING_INTENTS = [
  "ask-what-they-want",
  "request-support",
  "offer-targeted-provision",
  "counter-with-cap",
  "refuse-request",
  "ask-for-analysis",
  "offer-private-inducement",
  "remind-of-commitment",
] as const;

export type LegislativeBargainingIntent =
  (typeof LEGISLATIVE_BARGAINING_INTENTS)[number];

export type BargainingOutcome =
  | "position-explained"
  | "commitment-offered"
  | "proposal-accepted"
  | "proposal-refused"
  | "proposal-countered"
  | "inducement-refused"
  | "commitment-recalled"
  | "bystander-interjected";

export interface BargainingCommitmentConsequence {
  readonly holderPersonId: EntityId;
  readonly stance: LegislativeCommitmentStance;
  readonly firmness: LegislativeCommitmentFirmness;
  readonly conditions: readonly LegislativeCommitmentCondition[];
  readonly questionLabel: string;
  readonly provisionKey: string | null;
}

export interface BargainingNegotiationConsequence {
  readonly initiatorPersonId: EntityId;
  readonly counterpartyPersonId: EntityId;
  readonly character: LegislativeExchangeCharacter;
  readonly request: string;
  readonly disposition: LegislativeNegotiationDisposition;
  readonly provisionKey: string | null;
}

export interface BargainingConsequence {
  readonly negotiation: BargainingNegotiationConsequence | null;
  readonly commitment: BargainingCommitmentConsequence | null;
  readonly decisionTraceId: EntityId | null;
}

export interface BargainingResponse {
  readonly world: World;
  readonly outcome: BargainingOutcome;
  readonly speakerPersonId: EntityId;
  readonly dialogue: string;
  readonly perception: string;
  readonly durableDecisionRecorded: boolean;
  readonly family: LegislativeMotifFamily;
  readonly proposition: LegislativeBargainingProposition | null;
  readonly consequence: BargainingConsequence;
  readonly relationshipConsequence: "strengthened" | "strained" | null;
}

export function createLegislativeBargainingProgress(
  subjectFacts: LegislativeBargainingSubjectFacts,
): LegislativeBargainingProgress {
  return {
    subject: "measure-bargaining",
    subjectFacts,
    phase: "opening",
    latestProposition: null,
    lastFamilyByPerson: {},
    analysisSeen: false,
    playerOffer: "none",
    inducementRefused: false,
    pendingContributions: [],
    silenceSettled: false,
  };
}

export function bargainingTopicLabel(): string {
  return "Bill on the floor";
}

export function describeBargainingBriefingContext(
  progress: LegislativeBargainingProgress,
): string {
  const facts = progress.subjectFacts;
  return `${facts.designation} — ${facts.shortTitle} is on the ${facts.chamberName} floor. ${facts.programSectionLabel} funds ${facts.programReach.replace(/^language /, "")}. One member wants ${facts.requestedSectionLabel} written in for ${facts.requestedBeneficiaryLabel}; another is counting what the bill already commits.`;
}

// ---------------------------------------------------------------------------
// Player moves
// ---------------------------------------------------------------------------

export function availableBargainingIntents(
  world: World,
  room: ConversationRoomContext,
  addressee: ConversationAddressee,
  progress: LegislativeBargainingProgress,
  audibility: ConversationAudibility,
): readonly ConversationIntentOption[] {
  if (addressee === "everyone") {
    // Bargaining is done with one person at a time. Announcing terms to a room
    // is a different act with different consequences, and the game does not
    // pretend the two are the same.
    return [];
  }
  const facts = progress.subjectFacts;
  const name = shortName(world, addressee);
  const isAdvocate = addressee === facts.advocatePersonId;
  const options: ConversationIntentOption[] = [];

  if (progress.lastFamilyByPerson[addressee] === undefined) {
    options.push({
      key: "ask-what-they-want",
      label: `Ask ${name} what they actually want`,
      description: isAdvocate
        ? `Let ${name} say, in their own words, what ${facts.designation} is missing for the people they represent.`
        : `Let ${name} say what about ${facts.designation} they cannot vote for as it reads.`,
    });
  }

  if (isAdvocate && progress.playerOffer !== "as-asked") {
    options.push({
      key: "offer-targeted-provision",
      label: `Offer to write ${facts.requestedSectionLabel} as asked`,
      description: `Say you will carry an amendment naming ${facts.requestedBeneficiaryLabel} at ${facts.requestedAmountLabel}. Nothing enters the bill until the ${facts.chamberName} adopts it.`,
    });
  }
  if (isAdvocate && progress.playerOffer !== "capped") {
    options.push({
      key: "counter-with-cap",
      label: `Counter at ${facts.cappedAmountLabel}`,
      description: `Offer the same named section written to a ceiling the fiscal side can carry, rather than the amount ${name} asked for.`,
    });
  }
  if (progress.playerOffer !== "refused") {
    options.push({
      key: "refuse-request",
      label: isAdvocate
        ? `Tell ${name} the bill stays as it is`
        : `Tell ${name} you are not cutting the programme`,
      description: isAdvocate
        ? `Decline to write a named section, and hear what that costs you.`
        : `Decline to narrow ${facts.programSectionLabel}, and hear what that costs you.`,
    });
  }

  options.push({
    key: "request-support",
    label: `Ask ${name} for their vote`,
    description: `Ask where ${name} will be when ${facts.designation} is called, and hear what they attach to it.`,
  });

  if (!progress.analysisSeen) {
    options.push({
      key: "ask-for-analysis",
      label: "Ask what the fiscal note says",
      description: `Ask ${name} to have the note on ${facts.designation} read before either of you says anything further.`,
    });
  }

  if (commitmentsHeldBy(world, addressee, facts.measureId).length > 0) {
    options.push({
      key: "remind-of-commitment",
      label: `Hold ${name} to what they said`,
      description: `Put ${name}'s own words back in front of them and hear how they answer for them now.`,
    });
  }

  // Deliberately available, deliberately private, and deliberately useless.
  // The game refuses to pretend an offer of personal benefit is the same act as
  // asking for an amendment, so it is a move you can make and never a move that
  // works.
  if (audibility === "private" && !progress.inducementRefused) {
    options.push({
      key: "offer-private-inducement",
      label: `Offer ${name} something for themselves`,
      description: `Step over the line from bargaining to inducement. It is recorded as what it is.`,
    });
  }

  options.push({
    key: "listen",
    label: "Listen",
    description: "Say nothing and let the room finish its thought.",
  });
  return options;
}

// ---------------------------------------------------------------------------
// Opening beat
// ---------------------------------------------------------------------------

export function bargainingOpeningBeat(
  world: World,
  progress: LegislativeBargainingProgress,
  speakerPersonId: EntityId,
): string {
  const facts = progress.subjectFacts;
  const family: LegislativeMotifFamily =
    speakerPersonId === facts.advocatePersonId
      ? progress.playerOffer === "as-asked" || progress.playerOffer === "capped"
        ? "qualified-commitment"
        : "offer-targeted-provision"
      : progress.playerOffer === "none"
        ? "object-on-cost"
        : "press-visibility-concern";
  return legislativeMotifLine({
    family,
    voice: voiceFor(progress, speakerPersonId),
    audience: "limited",
    priorFamily: progress.lastFamilyByPerson[speakerPersonId] ?? null,
    variantSeed: `${facts.measureStableKey}:opening:${speakerPersonId}:${progress.phase}:${progress.playerOffer}`,
    facts: motifFacts(world, progress, speakerPersonId),
  });
}

// ---------------------------------------------------------------------------
// The other member's answer
// ---------------------------------------------------------------------------

export function resolveBargainingResponse(
  world: World,
  input: {
    readonly turnKey: string;
    readonly room: ConversationRoomContext;
    readonly speakerPersonId: EntityId;
    readonly intent: LegislativeBargainingIntent | "listen";
    readonly audibility: ConversationAudibility;
    readonly progress: LegislativeBargainingProgress;
  },
): BargainingResponse {
  const { progress, speakerPersonId } = input;
  const facts = progress.subjectFacts;
  const playerPersonId = input.room.playerPersonId;
  if (speakerPersonId === playerPersonId) {
    throw new Error(
      "The controlled person cannot answer their own bargaining move.",
    );
  }
  const speaker = world.people[speakerPersonId];
  if (!speaker) throw new Error("Bargaining response speaker is missing.");
  const isAdvocate = speakerPersonId === facts.advocatePersonId;
  const audience: ClaimAudience =
    input.audibility === "private" ? "private" : "limited";

  if (
    input.intent === "request-support" ||
    input.intent === "offer-targeted-provision" ||
    input.intent === "counter-with-cap" ||
    input.intent === "refuse-request"
  ) {
    return decide(world, {
      ...input,
      intent: input.intent,
      speaker,
      isAdvocate,
      audience,
    });
  }

  switch (input.intent) {
    case "ask-what-they-want":
      return say(world, input, {
        family: isAdvocate ? "district-beneficiary-concern" : "object-on-cost",
        outcome: "position-explained",
        perception: isAdvocate
          ? `${personName(speaker)} wants something specific for the place they represent, and said so plainly.`
          : `${personName(speaker)} is counting what the bill already commits before anything is added to it.`,
        proposition: null,
        consequence: {
          negotiation: {
            initiatorPersonId: speakerPersonId,
            counterpartyPersonId: playerPersonId,
            character: isAdvocate
              ? "constituent-advocacy"
              : "public-interest-appeal",
            request: isAdvocate
              ? `Write ${facts.requestedSectionLabel} for ${facts.requestedBeneficiaryLabel} at ${facts.requestedAmountLabel}.`
              : `Hold ${facts.designation} to what the chamber can carry rather than adding to it.`,
            disposition: "proposed",
            provisionKey: isAdvocate ? null : facts.programProvisionKey,
          },
          commitment: null,
          decisionTraceId: null,
        },
        audience,
      });

    case "ask-for-analysis":
      return say(world, input, {
        family: "ask-staff-to-verify",
        outcome: "position-explained",
        perception: `${personName(speaker)} wants the note read before anybody commits to anything.`,
        proposition: "analysis-asked",
        consequence: emptyConsequence(),
        audience,
      });

    case "offer-private-inducement":
      return {
        ...say(world, input, {
          family: "refuse-quid-pro-quo",
          outcome: "inducement-refused",
          perception: `${personName(speaker)} drew a hard line between bargaining over the bill and being offered something personally.`,
          proposition: "inducement-refused",
          consequence: {
            negotiation: {
              initiatorPersonId: playerPersonId,
              counterpartyPersonId: speakerPersonId,
              character: "personal-inducement",
              request:
                "Offered the member a personal benefit in exchange for their vote.",
              disposition: "refused",
              provisionKey: null,
            },
            commitment: null,
            decisionTraceId: null,
          },
          audience,
        }),
        relationshipConsequence: "strained",
      };

    case "remind-of-commitment": {
      const held = commitmentsHeldBy(world, speakerPersonId, facts.measureId);
      const latest = held.at(-1);
      const assessment = latest ? assessCommitment(world, latest.id) : null;
      // Who failed decides which of these two families is honest. A condition
      // the player was supposed to satisfy going unmet is the player's
      // shortfall; voting against a bargain whose terms were all met is the
      // member's.
      const playerOwedIt =
        assessment !== null &&
        assessment.conditions.some(
          (condition) =>
            condition.state === "unmet" &&
            condition.kind === "provision-adopted",
        );
      const family: LegislativeMotifFamily =
        assessment === null
          ? "refuse-to-commit-yet"
          : assessment.standing === "departed-from"
            ? "defend-broken-commitment"
            : assessment.standing === "conditions-unmet"
              ? playerOwedIt
                ? "confront-broken-commitment"
                : "defend-broken-commitment"
              : assessment.standing === "honored"
                ? "remind-of-commitment"
                : "qualified-commitment";
      return say(world, input, {
        family,
        outcome: "commitment-recalled",
        perception:
          assessment === null
            ? `${personName(speaker)} has not said anything yet that binds them.`
            : `${personName(speaker)} answered for their own words: ${assessment.account}`,
        proposition: "commitment-recalled",
        consequence: emptyConsequence(),
        audience,
      });
    }

    case "listen":
      return say(world, input, {
        family: interjectionFamily(progress, speakerPersonId),
        outcome: "bystander-interjected",
        perception: `${personName(speaker)} added the thing they were waiting to say.`,
        proposition: null,
        consequence: emptyConsequence(),
        audience,
      });

    default:
      throw new Error(
        `That bargaining move has no response: ${String(input.intent)}`,
      );
  }
}

/**
 * The beats where the other member actually chooses something.
 *
 * The choice runs through the same evaluator every other character decision in
 * the game runs through, over considerations drawn from what is in the bill,
 * what this member has already said, and who they have been working with. The
 * player never sees the ranking — only the sentence the member says, and the
 * conditions they attach to it.
 */
function decide(
  world: World,
  input: {
    readonly turnKey: string;
    readonly room: ConversationRoomContext;
    readonly speakerPersonId: EntityId;
    readonly intent:
      | "request-support"
      | "offer-targeted-provision"
      | "counter-with-cap"
      | "refuse-request";
    readonly audibility: ConversationAudibility;
    readonly progress: LegislativeBargainingProgress;
    readonly speaker: NonNullable<World["people"][EntityId]>;
    readonly isAdvocate: boolean;
    readonly audience: ClaimAudience;
  },
): BargainingResponse {
  const { progress, isAdvocate, audience } = input;
  const facts = progress.subjectFacts;
  const playerPersonId = input.room.playerPersonId;
  assertNpcAutonomousApplication(world, input.speakerPersonId);

  const evaluation = evaluateBargainingDecision(world, input);
  const tracedWorld = recordDurableDecisionTrace(world, evaluation);
  const trace = tracedWorld.history.decisionTraces.at(-1) ?? null;
  const selected = evaluation.selectedOptionKey ?? "hold-off";

  const adoptedAlready =
    currentProvisionByKey(world, facts.measureId, facts.requestedProvisionKey)
      ?.originAmendmentId != null;

  if (input.intent === "refuse-request") {
    const stance: LegislativeCommitmentStance = isAdvocate
      ? "oppose-unless"
      : "support";
    const conditions: readonly LegislativeCommitmentCondition[] = isAdvocate
      ? [
          {
            key: `${facts.requestedProvisionKey}:adopted`,
            kind: "provision-adopted",
            provisionKey: facts.requestedProvisionKey,
            description: `${facts.requestedSectionLabel} is written in for ${facts.requestedBeneficiaryLabel} and adopted by the ${facts.chamberName}.`,
          },
        ]
      : [];
    return {
      ...say(tracedWorld, input, {
        family: isAdvocate
          ? "district-beneficiary-concern"
          : "accept-principle-reject-mechanism",
        outcome: "proposal-refused",
        perception: isAdvocate
          ? `${personName(input.speaker)} took the refusal as an answer about their district, not about the policy.`
          : `${personName(input.speaker)} accepted the programme in principle while keeping their objection to how it is built.`,
        proposition: "leave-the-bill-alone",
        consequence: {
          negotiation: {
            initiatorPersonId: playerPersonId,
            counterpartyPersonId: input.speakerPersonId,
            character: isAdvocate
              ? "targeted-benefit-request"
              : "policy-bargaining",
            request: isAdvocate
              ? `Declined to write ${facts.requestedSectionLabel} for ${facts.requestedBeneficiaryLabel}.`
              : `Declined to narrow ${facts.programSectionLabel}.`,
            disposition: "refused",
            provisionKey: isAdvocate ? null : facts.programProvisionKey,
          },
          commitment: {
            holderPersonId: input.speakerPersonId,
            stance,
            firmness: "qualified",
            conditions,
            questionLabel: `Final passage of ${facts.designation}`,
            provisionKey: isAdvocate ? facts.requestedProvisionKey : null,
          },
          decisionTraceId: trace?.id ?? null,
        },
        audience,
      }),
      durableDecisionRecorded: true,
      relationshipConsequence: isAdvocate ? "strained" : null,
    };
  }

  if (
    input.intent === "offer-targeted-provision" ||
    input.intent === "counter-with-cap"
  ) {
    const capped = input.intent === "counter-with-cap";
    if (!isAdvocate) {
      // The member watching the money hears the same offer very differently.
      return {
        ...say(tracedWorld, input, {
          family: capped ? "demand-narrower-scope" : "press-visibility-concern",
          outcome: "proposal-countered",
          perception: `${personName(input.speaker)} sees the named section as a cost and a headline before it is a favour.`,
          proposition: capped
            ? "cap-the-local-section"
            : "write-in-the-local-section",
          consequence: {
            negotiation: {
              initiatorPersonId: playerPersonId,
              counterpartyPersonId: input.speakerPersonId,
              character: "policy-bargaining",
              request: capped
                ? `Proposed ${facts.requestedSectionLabel} written to a ${facts.cappedAmountLabel} ceiling.`
                : `Proposed ${facts.requestedSectionLabel} at ${facts.requestedAmountLabel}.`,
              disposition: "countered",
              provisionKey: facts.programProvisionKey,
            },
            commitment: null,
            decisionTraceId: trace?.id ?? null,
          },
          audience,
        }),
        durableDecisionRecorded: true,
      };
    }

    const accepted = selected !== "hold-off";
    const conditions: readonly LegislativeCommitmentCondition[] = capped
      ? [
          {
            key: `${facts.requestedProvisionKey}:adopted`,
            kind: "provision-adopted",
            provisionKey: facts.requestedProvisionKey,
            description: `${facts.requestedSectionLabel} is adopted by the ${facts.chamberName}.`,
          },
          {
            key: `${facts.requestedProvisionKey}:ceiling`,
            kind: "fiscal-ceiling",
            provisionKey: facts.requestedProvisionKey,
            ceilingMinorUnits: facts.cappedAmountMinorUnits,
            description: `${facts.requestedSectionLabel} commits no more than ${facts.cappedAmountLabel}.`,
          },
        ]
      : [
          {
            key: `${facts.requestedProvisionKey}:adopted`,
            kind: "provision-adopted",
            provisionKey: facts.requestedProvisionKey,
            description: `${facts.requestedSectionLabel} is written in for ${facts.requestedBeneficiaryLabel} and adopted by the ${facts.chamberName}.`,
          },
        ];
    return {
      ...say(tracedWorld, input, {
        family: accepted
          ? "qualified-commitment"
          : "accept-principle-reject-mechanism",
        outcome: accepted ? "proposal-accepted" : "proposal-countered",
        perception: accepted
          ? `${personName(input.speaker)} tied their support to language actually reaching the bill, not to the conversation.`
          : `${personName(input.speaker)} would rather have nothing than a version they cannot take home.`,
        proposition: capped
          ? "cap-the-local-section"
          : "write-in-the-local-section",
        consequence: {
          negotiation: {
            initiatorPersonId: playerPersonId,
            counterpartyPersonId: input.speakerPersonId,
            character: "targeted-benefit-request",
            request: capped
              ? `Offered ${facts.requestedSectionLabel} for ${facts.requestedBeneficiaryLabel}, capped at ${facts.cappedAmountLabel}.`
              : `Offered ${facts.requestedSectionLabel} for ${facts.requestedBeneficiaryLabel} at ${facts.requestedAmountLabel}.`,
            disposition: accepted ? "accepted" : "countered",
            provisionKey: null,
          },
          commitment: accepted
            ? {
                holderPersonId: input.speakerPersonId,
                stance: "support-if",
                firmness: "qualified",
                conditions,
                questionLabel: `Final passage of ${facts.designation}`,
                provisionKey: facts.requestedProvisionKey,
              }
            : null,
          decisionTraceId: trace?.id ?? null,
        },
        audience,
      }),
      durableDecisionRecorded: true,
      relationshipConsequence: accepted ? "strengthened" : null,
    };
  }

  // request-support
  const willing = selected === "commit";
  const family: LegislativeMotifFamily = willing
    ? adoptedAlready && isAdvocate
      ? "reciprocal-support"
      : "qualified-commitment"
    : "refuse-to-commit-yet";
  const conditions: readonly LegislativeCommitmentCondition[] = willing
    ? isAdvocate
      ? [
          {
            key: `${facts.requestedProvisionKey}:adopted`,
            kind: "provision-adopted",
            provisionKey: facts.requestedProvisionKey,
            description: `${facts.requestedSectionLabel} is adopted by the ${facts.chamberName}.`,
          },
        ]
      : [
          {
            key: `${facts.programProvisionKey}:ceiling`,
            kind: "fiscal-ceiling",
            provisionKey: facts.programProvisionKey,
            ceilingMinorUnits: facts.cappedAmountMinorUnits * 8,
            description: `${facts.programSectionLabel} stays inside what the member said they could carry.`,
          },
        ]
    : [];
  return {
    ...say(tracedWorld, input, {
      family,
      outcome: willing ? "commitment-offered" : "position-explained",
      perception: willing
        ? `${personName(input.speaker)} put a condition on their support and named it out loud.`
        : `${personName(input.speaker)} would not be pinned down yet, and said why.`,
      proposition: "support-asked",
      consequence: {
        negotiation: {
          initiatorPersonId: playerPersonId,
          counterpartyPersonId: input.speakerPersonId,
          character:
            willing && isAdvocate ? "reciprocal-support" : "policy-bargaining",
          request: `Asked for support on final passage of ${facts.designation}.`,
          disposition: willing ? "accepted" : "deferred",
          provisionKey: null,
        },
        commitment: {
          holderPersonId: input.speakerPersonId,
          stance: willing ? "support-if" : "keep-options-open",
          firmness: willing ? "qualified" : "noncommittal",
          conditions,
          questionLabel: `Final passage of ${facts.designation}`,
          provisionKey:
            willing && isAdvocate ? facts.requestedProvisionKey : null,
        },
        decisionTraceId: trace?.id ?? null,
      },
      audience,
    }),
    durableDecisionRecorded: true,
  };
}

// ---------------------------------------------------------------------------
// Consequences, recorded once the conversation event and claim exist
// ---------------------------------------------------------------------------

export function recordBargainingConsequences(
  world: World,
  input: {
    readonly turnKey: string;
    readonly progress: LegislativeBargainingProgress;
    readonly consequence: BargainingConsequence;
    readonly eventId: EntityId;
    readonly claimId: EntityId | null;
    readonly audience: ClaimAudience;
    readonly listenerPersonIds: readonly EntityId[];
    readonly statement: string;
  },
): World {
  let next = world;
  const facts = input.progress.subjectFacts;
  if (input.consequence.negotiation) {
    const negotiation = input.consequence.negotiation;
    next = recordLegislativeNegotiation(next, {
      stableKey: `${input.turnKey}:negotiation`,
      measureId: facts.measureId,
      provisionKey: negotiation.provisionKey,
      initiatorPersonId: negotiation.initiatorPersonId,
      counterpartyPersonId: negotiation.counterpartyPersonId,
      character: negotiation.character,
      request: negotiation.request,
      disposition: negotiation.disposition,
      audience: input.audience,
      eventId: input.eventId,
      decisionTraceId: input.consequence.decisionTraceId,
    });
  }
  if (input.consequence.commitment) {
    const commitment = input.consequence.commitment;
    next = recordLegislativeCommitment(next, {
      stableKey: `${input.turnKey}:commitment`,
      holderPersonId: commitment.holderPersonId,
      subject: {
        measureId: facts.measureId,
        provisionKey: commitment.provisionKey,
        questionLabel: commitment.questionLabel,
      },
      stance: commitment.stance,
      firmness: commitment.firmness,
      conditions: commitment.conditions,
      audience: input.audience,
      eventId: input.eventId,
      claimId:
        input.claimId !== null &&
        commitment.holderPersonId !== undefined &&
        isSpeakersOwnClaim(next, input.claimId, commitment.holderPersonId)
          ? input.claimId
          : null,
      heardByPersonIds: input.listenerPersonIds,
      statement: input.statement,
    });
  }
  return next;
}

export function advanceBargainingProgress(
  progress: LegislativeBargainingProgress,
  input: {
    readonly speakerPersonId: EntityId;
    readonly intent: LegislativeBargainingIntent | "listen";
    readonly family: LegislativeMotifFamily;
    readonly outcome: BargainingOutcome;
    readonly proposition: LegislativeBargainingProposition | null;
  },
): LegislativeBargainingProgress {
  const playerOffer =
    input.intent === "offer-targeted-provision"
      ? "as-asked"
      : input.intent === "counter-with-cap"
        ? "capped"
        : input.intent === "refuse-request"
          ? "refused"
          : progress.playerOffer;
  const phase: LegislativeBargainingProgress["phase"] =
    input.outcome === "proposal-accepted" ||
    input.outcome === "commitment-offered"
      ? "answered"
      : input.outcome === "proposal-countered"
        ? "counter-offered"
        : input.outcome === "proposal-refused"
          ? "answered"
          : progress.phase === "opening"
            ? "position-heard"
            : progress.phase;
  return {
    ...progress,
    phase:
      playerOffer !== "none" && phase === "position-heard"
        ? "proposal-on-table"
        : phase,
    latestProposition: input.proposition ?? progress.latestProposition,
    lastFamilyByPerson: {
      ...progress.lastFamilyByPerson,
      [input.speakerPersonId]: input.family,
    },
    analysisSeen:
      progress.analysisSeen || input.intent === "ask-for-analysis"
        ? progress.analysisSeen
        : progress.analysisSeen,
    playerOffer,
    inducementRefused:
      progress.inducementRefused || input.outcome === "inducement-refused",
    silenceSettled: input.intent === "listen",
  };
}

/** Marks the fiscal note as read once the player has canonically reviewed it. */
export function withAnalysisSeen(
  progress: LegislativeBargainingProgress,
): LegislativeBargainingProgress {
  return { ...progress, analysisSeen: true };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function emptyConsequence(): BargainingConsequence {
  return { negotiation: null, commitment: null, decisionTraceId: null };
}

function say(
  world: World,
  input: {
    readonly turnKey: string;
    readonly speakerPersonId: EntityId;
    readonly progress: LegislativeBargainingProgress;
    readonly audibility: ConversationAudibility;
  },
  detail: {
    readonly family: LegislativeMotifFamily;
    readonly outcome: BargainingOutcome;
    readonly perception: string;
    readonly proposition: LegislativeBargainingProposition | null;
    readonly consequence: BargainingConsequence;
    readonly audience: ClaimAudience;
  },
): BargainingResponse {
  return {
    world,
    outcome: detail.outcome,
    speakerPersonId: input.speakerPersonId,
    dialogue: legislativeMotifLine({
      family: detail.family,
      voice: voiceFor(input.progress, input.speakerPersonId),
      audience: detail.audience,
      priorFamily:
        input.progress.lastFamilyByPerson[input.speakerPersonId] ?? null,
      variantSeed: input.turnKey,
      facts: motifFacts(world, input.progress, input.speakerPersonId),
    }),
    perception: detail.perception,
    durableDecisionRecorded: false,
    family: detail.family,
    proposition: detail.proposition,
    consequence: detail.consequence,
    relationshipConsequence: null,
  };
}

function voiceFor(
  progress: LegislativeBargainingProgress,
  personId: EntityId,
): LegislativeVoice {
  const facts = progress.subjectFacts;
  if (personId === facts.advocatePersonId) return facts.advocateVoice;
  if (personId === facts.guardianPersonId) return facts.guardianVoice;
  return "procedural-institutionalist";
}

function motifFacts(
  world: World,
  progress: LegislativeBargainingProgress,
  speakerPersonId: EntityId,
): LegislativeMotifFacts {
  const facts = progress.subjectFacts;
  const isAdvocate = speakerPersonId === facts.advocatePersonId;
  const sectionExists = currentProvisionByKey(
    world,
    facts.measureId,
    facts.requestedProvisionKey,
  );
  const held = commitmentsHeldBy(world, speakerPersonId, facts.measureId);
  return {
    speaker: shortName(world, speakerPersonId),
    listener: shortName(
      world,
      isAdvocate ? facts.guardianPersonId : facts.advocatePersonId,
    ),
    designation: facts.designation,
    shortTitle: facts.shortTitle,
    sectionLabel: isAdvocate
      ? facts.requestedSectionLabel
      : facts.programSectionLabel,
    sectionHeading: isAdvocate ? facts.requestedHeading : facts.programHeading,
    reach: sectionExists
      ? `language written for ${facts.requestedBeneficiaryLabel}`
      : facts.programReach,
    beneficiary: facts.requestedBeneficiaryLabel,
    place: facts.requestedPlaceLabel,
    amount:
      progress.playerOffer === "capped"
        ? facts.cappedAmountLabel
        : facts.requestedAmountLabel,
    billAmount: currentBillAmountLabel(world, progress),
    analyst: shortName(world, facts.analystPersonId),
    chamber: facts.chamberName,
    nextStep: facts.nextStepLabel,
    priorStatement: held.at(-1)?.statement ?? null,
  };
}

function currentBillAmountLabel(
  world: World,
  progress: LegislativeBargainingProgress,
): string {
  const total = currentMeasureProvisions(
    world,
    progress.subjectFacts.measureId,
  ).reduce(
    (sum, provision) => sum + (provision.fiscalExposureMinorUnits ?? 0),
    0,
  );
  return total === 0
    ? progress.subjectFacts.billAmountLabel
    : `$${(total / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * What the member who is not being addressed says when the player stays quiet.
 * Deterministic, and always something true about where the bill actually is.
 */
function interjectionFamily(
  progress: LegislativeBargainingProgress,
  speakerPersonId: EntityId,
): LegislativeMotifFamily {
  const isAdvocate = speakerPersonId === progress.subjectFacts.advocatePersonId;
  if (progress.playerOffer === "as-asked") {
    return isAdvocate ? "timing-warning" : "press-visibility-concern";
  }
  if (progress.playerOffer === "capped") {
    return isAdvocate ? "leadership-pressure" : "object-on-implementation";
  }
  if (progress.playerOffer === "refused") {
    return isAdvocate ? "district-beneficiary-concern" : "timing-warning";
  }
  return isAdvocate ? "suggest-amendment" : "ask-for-evidence";
}

function isSpeakersOwnClaim(
  world: World,
  claimId: EntityId,
  personId: EntityId,
): boolean {
  return world.history.claims.some(
    (claim) => claim.id === claimId && claim.speakerPersonId === personId,
  );
}

function shortName(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person)
    throw new Error(`Bargaining references a missing person: ${personId}`);
  return person.familyName;
}

// ---------------------------------------------------------------------------
// The decision itself
// ---------------------------------------------------------------------------

function evaluateBargainingDecision(
  world: World,
  input: {
    readonly turnKey: string;
    readonly room: ConversationRoomContext;
    readonly speakerPersonId: EntityId;
    readonly intent:
      | "request-support"
      | "offer-targeted-provision"
      | "counter-with-cap"
      | "refuse-request";
    readonly progress: LegislativeBargainingProgress;
    readonly isAdvocate: boolean;
  },
): DecisionEvaluation {
  const facts = input.progress.subjectFacts;
  const options =
    input.intent === "request-support"
      ? [
          {
            key: "commit",
            label: "Say where they will be",
            description:
              "Give a conditional answer on final passage and name the condition.",
          },
          {
            key: "hold-off",
            label: "Stay uncommitted",
            description: "Decline to say until the bill's text settles.",
          },
        ]
      : [
          {
            key: "take-the-offer",
            label: "Take the offer",
            description:
              "Treat the offered language as enough to work with, conditionally.",
          },
          {
            key: "hold-off",
            label: "Hold out",
            description:
              "Refuse the version on the table and keep asking for the original.",
          },
        ];

  return evaluateDecision(world, {
    stableKey: `${input.turnKey}:bargaining-decision`,
    decisionType: "legislation.bargaining-response",
    actorPersonId: input.speakerPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:measure-bargaining",
      key: `${facts.measureStableKey}:${input.intent}`,
      entityId: facts.measureId,
    },
    options,
    constraints: [],
    considerations: bargainingConsiderations(world, input),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

function bargainingConsiderations(
  world: World,
  input: {
    readonly room: ConversationRoomContext;
    readonly speakerPersonId: EntityId;
    readonly intent:
      | "request-support"
      | "offer-targeted-provision"
      | "counter-with-cap"
      | "refuse-request";
    readonly progress: LegislativeBargainingProgress;
    readonly isAdvocate: boolean;
  },
): readonly DecisionConsideration[] {
  const facts = input.progress.subjectFacts;
  const yes = input.intent === "request-support" ? "commit" : "take-the-offer";
  const no = "hold-off";
  const considerations: DecisionConsideration[] = [];

  const adopted = currentProvisionByKey(
    world,
    facts.measureId,
    facts.requestedProvisionKey,
  );
  if (adopted) {
    considerations.push({
      stableKey: "bargaining:section-already-in-the-bill",
      optionKey: yes,
      sourceType: "context:section-in-the-bill",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `${facts.requestedSectionLabel} is already in the bill, so there is something concrete to answer about.`,
      sourceRefs: [],
    });
  } else if (input.isAdvocate) {
    considerations.push({
      stableKey: "bargaining:section-not-yet-in-the-bill",
      optionKey: input.intent === "request-support" ? no : yes,
      sourceType: "context:section-not-in-the-bill",
      direction: "supports",
      importance: input.intent === "request-support" ? "strong" : "moderate",
      confidence: "high",
      explanation:
        input.intent === "request-support"
          ? "Nothing has reached the bill yet, and a promise made now would be about a page that does not exist."
          : "An offer to carry the language is worth something even before it is adopted.",
      sourceRefs: [],
    });
  }

  if (input.intent === "counter-with-cap" && input.isAdvocate) {
    considerations.push({
      stableKey: "bargaining:cap-is-less-than-asked",
      optionKey: no,
      sourceType: "context:offer-below-request",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: `${facts.cappedAmountLabel} is less than what was asked for, and a smaller number is harder to take home.`,
      sourceRefs: [],
    });
    considerations.push({
      stableKey: "bargaining:cap-is-still-named",
      optionKey: yes,
      sourceType: "context:offer-still-named",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `The capped version still names ${facts.requestedBeneficiaryLabel} in the bill, which nothing else on offer does.`,
      sourceRefs: [],
    });
  }

  if (input.progress.analysisSeen) {
    considerations.push({
      stableKey: "bargaining:analysis-in-hand",
      optionKey: yes,
      sourceType: "context:analysis-in-hand",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        "The fiscal note has been read, so the argument is about a number both sides have seen.",
      sourceRefs: [],
    });
  } else {
    considerations.push({
      stableKey: "bargaining:analysis-outstanding",
      optionKey: no,
      sourceType: "context:analysis-outstanding",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "Nobody in the room has read the note yet.",
      sourceRefs: [],
    });
  }

  const priorNegotiationRefused = (
    world.history.legislativeNegotiations ?? []
  ).some(
    (record) =>
      record.measureId === facts.measureId &&
      record.counterpartyPersonId === input.speakerPersonId &&
      record.disposition === "refused" &&
      record.character !== "personal-inducement",
  );
  if (priorNegotiationRefused) {
    considerations.push({
      stableKey: "bargaining:already-refused-once",
      optionKey: no,
      sourceType: "context:earlier-refusal",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        "This member has already been told no once on this bill, and remembers it.",
      sourceRefs: [],
    });
  }

  const inducementRefused = (world.history.legislativeNegotiations ?? []).some(
    (record) =>
      record.measureId === facts.measureId &&
      record.counterpartyPersonId === input.speakerPersonId &&
      record.character === "personal-inducement",
  );
  if (inducementRefused) {
    considerations.push({
      stableKey: "bargaining:was-offered-something-personal",
      optionKey: no,
      sourceType: "context:inducement-offered",
      direction: "supports",
      importance: "decisive",
      confidence: "high",
      explanation:
        "This member was offered something for themselves and has not forgotten who offered it.",
      sourceRefs: [],
    });
  }

  const interaction = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (record) =>
        record.personIds.includes(input.speakerPersonId) &&
        record.personIds.includes(input.room.playerPersonId),
    );
  if (interaction) {
    considerations.push({
      stableKey: "bargaining:working-history",
      optionKey: interaction.change === "strained" ? no : yes,
      sourceType: "social:working-history",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        interaction.change === "strained"
          ? "The last exchange between these two did not go well."
          : "These two have worked together before and it went somewhere.",
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    });
  }

  return considerations;
}
