import { makeIsoDate } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { viewOfOfficial } from "./official-view-reads";
import { majorPartyOf } from "./statewide-electorate";
import { readRelationshipStanding } from "./relationship-standing";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { activeCampaignForCandidate, campaignById } from "./campaign-queries";
import { personName } from "./people";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, IsoDate, World } from "./types";

export const CANDIDATE_PETITION_ASKED_TAG = "campaign:candidate-petition-ask";
export const CANDIDATE_PETITION_SIGNATURE_PATH_TAG =
  "campaign:candidate-petition-signature-path";
export const CANDIDATE_PETITION_CIRCULATING_TAG =
  "campaign:candidate-petition-circulating";
export const CANDIDATE_PETITION_FEE_ONLY_TAG =
  "campaign:candidate-petition-fee-only";

export interface AskToSignInput {
  readonly campaignId: EntityId;
  readonly circulatorPersonId: EntityId;
  readonly signerPersonId: EntityId;
  readonly at: IsoDate;
}

export interface AskToSignResult {
  readonly world: World;
  readonly eventId: EntityId;
  readonly decision: "sign" | "decline";
  readonly alreadyAsked: false;
}

export interface PetitionAskOffer {
  readonly key: string;
  readonly label: string;
  readonly campaignId: EntityId;
  readonly circulatorPersonId: EntityId;
  readonly signerPersonId: EntityId;
}

/**
 * The petition choice available while the candidate is physically with one
 * person. Filing law opts a campaign into this route through its recorded
 * filing event; an active campaign alone is not evidence that signatures are
 * required. Consequently a fee-only place never acquires this choice by
 * fallback.
 */
export function petitionAskOffer(
  world: World,
  circulatorPersonId: EntityId,
  signerPersonId: EntityId,
): PetitionAskOffer | null {
  if (
    circulatorPersonId === signerPersonId ||
    !world.people[circulatorPersonId] ||
    !world.people[signerPersonId]
  ) {
    return null;
  }
  const campaign = activeCampaignForCandidate(world, circulatorPersonId);
  if (!campaign) return null;
  const filing = world.history.events.find(
    (event) => event.id === campaign.filingEventId,
  );
  if (
    !filing?.tags.includes(CANDIDATE_PETITION_SIGNATURE_PATH_TAG) ||
    !filing.tags.includes(CANDIDATE_PETITION_CIRCULATING_TAG) ||
    filing.tags.includes(CANDIDATE_PETITION_FEE_ONLY_TAG) ||
    petitionAskedPersonIds(world, campaign.id).has(signerPersonId)
  ) {
    return null;
  }
  return {
    key: `candidate-petition:${campaign.id}:${signerPersonId}`,
    label: `Ask ${personName(world.people[signerPersonId])} to sign the petition`,
    campaignId: campaign.id,
    circulatorPersonId,
    signerPersonId,
  };
}

/** The event log's first ask for each signer, in recorded order. */
export function petitionEventsForCampaign(world: World, campaignId: EntityId) {
  const campaignTag = `campaign:${campaignId}`;
  return world.history.events.filter(
    (event) =>
      event.tags.includes(CANDIDATE_PETITION_ASKED_TAG) &&
      event.tags.includes(campaignTag),
  );
}

/** Running count shown to a campaign: every signature event, before review. */
export function petitionSignaturesForCampaign(
  world: World,
  campaignId: EntityId,
) {
  return petitionEventsForCampaign(world, campaignId).filter(
    (event) => event.type === "campaign.petition-signed",
  );
}

/** Signers already asked, including people who declined. */
export function petitionAskedPersonIds(
  world: World,
  campaignId: EntityId,
): ReadonlySet<EntityId> {
  return new Set(
    petitionEventsForCampaign(world, campaignId).flatMap((event) =>
      event.participants
        .filter((participant) => participant.role === "agency:signer")
        .map((participant) => participant.personId),
    ),
  );
}

/**
 * Resolve one real ask and retain it as an event. A signer has one first ask
 * per campaign; background circulation and played scenes share this writer.
 * Clerk validity is deliberately a later read of these events, so an
 * unregistered or out-of-district signer can still appear in the candidate's
 * running count and be rejected at filing.
 */
export function askToSign(
  inputWorld: World,
  input: AskToSignInput,
): AskToSignResult {
  const campaign = campaignById(inputWorld, input.campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${input.campaignId}`);
  if (!inputWorld.people[input.signerPersonId])
    throw new Error("Petition signer is not in this world.");
  if (!inputWorld.people[input.circulatorPersonId])
    throw new Error("Petition circulator is not in this world.");
  if (input.signerPersonId === campaign.candidatePersonId)
    throw new Error("A candidate cannot sign their own petition.");
  const at = makeIsoDate(input.at);
  if (at > inputWorld.currentDate)
    throw new Error("A petition ask cannot be dated after the current day.");

  const stableKey = `candidate-petition:${campaign.id}:${input.signerPersonId}`;
  const prior = inputWorld.history.events.find(
    (event) => event.stableKey === `${stableKey}:event`,
  );
  if (prior) throw new Error("This person has already been asked to sign.");

  let world = ensurePeopleTraits(inputWorld, [input.signerPersonId], at);
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const view = viewOfOfficial(
    world,
    input.signerPersonId,
    campaign.candidatePersonId,
    {
      asOfDate: at,
      historySequenceExclusive: cutoff.historySequenceExclusive,
    },
  );
  const relationship = readRelationshipStanding(
    world,
    input.signerPersonId,
    input.circulatorPersonId,
  ).readings.warmth;
  const signerParty = majorPartyOf(world, input.signerPersonId, at);
  const candidateParty = majorPartyOf(world, campaign.candidatePersonId, at);
  const considerations: DecisionConsideration[] = [];
  if (view.points !== 0) {
    considerations.push({
      stableKey: `${stableKey}:candidate-view`,
      optionKey: view.points > 0 ? "sign" : "decline",
      sourceType: "belief:official-view",
      direction: "supports",
      importance: Math.abs(view.points) >= 3 ? "strong" : "moderate",
      confidence: view.belief ? "high" : "medium",
      explanation:
        view.points > 0
          ? "The signer holds a favorable view of the candidate."
          : "The signer holds an unfavorable view of the candidate.",
      sourceRefs: view.belief
        ? [{ kind: "private-belief", beliefId: view.belief.id }]
        : [],
    });
  }
  if (relationship.band !== "none") {
    considerations.push({
      stableKey: `${stableKey}:circulator-warmth`,
      optionKey: relationship.adverse ? "decline" : "sign",
      sourceType: "social:warmth",
      direction: "supports",
      importance:
        relationship.band === "strong" || relationship.band === "marked"
          ? "moderate"
          : "slight",
      confidence: "medium",
      explanation: relationship.adverse
        ? "The signer has reason to distrust the person asking."
        : "The signer has a warm relationship with the person asking.",
      sourceRefs: relationship.basis.slice(-2).map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  }
  if (signerParty && candidateParty) {
    considerations.push({
      stableKey: `${stableKey}:party-lean`,
      optionKey: signerParty === candidateParty ? "sign" : "decline",
      sourceType: "domain:party-affiliation",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation:
        signerParty === candidateParty
          ? "The signer publicly affiliates with the candidate's party."
          : "The signer publicly affiliates with a different major party.",
      sourceRefs: [],
    });
  }
  considerations.push(
    ...traitConsiderations(world, input.signerPersonId, stableKey, [
      {
        optionKey: "sign",
        trait: "sociability",
        pole: "high",
        explanation: "The signer tends to engage with people who approach.",
      },
      {
        optionKey: "decline",
        trait: "conflict",
        pole: "high",
        explanation:
          "The signer tends to press disagreements with the candidate.",
      },
    ]),
  );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "campaign.petition-signature",
    actorPersonId: input.signerPersonId,
    cutoff,
    subject: {
      kind: "context:campaign",
      key: `petition-signature:${campaign.id}`,
      entityId: null,
    },
    options: [
      {
        key: "sign",
        label: "Sign",
        description: "Add a signature to the petition.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Do not sign the petition.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  world = recordDurableDecisionTrace(world, evaluation);
  const selected = evaluation.selectedOptionKey;
  const decision = selected === "sign" ? "sign" : "decline";
  world = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type:
      decision === "sign"
        ? "campaign.petition-signed"
        : "campaign.petition-declined",
    occurredAt: at,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      input.signerPersonId,
      input.circulatorPersonId,
      campaign.id,
    ],
    participants: [
      { personId: input.signerPersonId, role: "agency:signer", detail: null },
      {
        personId: input.circulatorPersonId,
        role: "agency:circulator",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CANDIDATE_PETITION_ASKED_TAG,
      `campaign:${campaign.id}`,
      `decision:${decision}`,
    ],
    summary:
      decision === "sign"
        ? `${personName(world.people[input.signerPersonId]!)} signed the candidate's petition when asked by ${personName(world.people[input.circulatorPersonId]!)}.`
        : `${personName(world.people[input.signerPersonId]!)} declined to sign the candidate's petition when asked by ${personName(world.people[input.circulatorPersonId]!)}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: decision,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    eventId: world.history.events.at(-1)!.id,
    decision,
    alreadyAsked: false,
  };
}
