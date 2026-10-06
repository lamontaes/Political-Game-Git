import { makeIsoDate } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { viewOfOfficial } from "./official-view-reads";
import { majorPartyOf } from "./statewide-electorate";
import { readRelationshipStanding } from "./relationship-standing";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { campaignById } from "./campaign-queries";
import { latestPrivateBelief } from "./queries";
import { personName } from "./people";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, IsoDate, World } from "./types";

export const CANDIDATE_PETITION_ASKED_TAG = "campaign:candidate-petition-ask";

export interface AskToSignInput {
  /** Candidate filing petitions use campaignId. Other petition kinds supply subject. */
  readonly campaignId?: EntityId;
  readonly petition?: {
    readonly petitionId: string;
    readonly jurisdictionId: EntityId;
    readonly subject:
      | { readonly kind: "official"; readonly personId: EntityId }
      | {
          readonly kind: "proposition";
          readonly propositionId: EntityId;
          /** Whether the petition asks the signer to support or oppose the proposition. */
          readonly requestedStance: "support" | "oppose";
        };
  };
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
  const campaign = input.campaignId
    ? campaignById(inputWorld, input.campaignId)
    : null;
  if (!campaign && !input.petition)
    throw new Error("A campaign or citizen petition is required.");
  if (input.campaignId && !campaign)
    throw new Error(`Campaign not found: ${input.campaignId}`);
  if (
    input.petition &&
    !inputWorld.jurisdictions[input.petition.jurisdictionId]
  )
    throw new Error("Petition jurisdiction is not in this world.");
  if (!inputWorld.people[input.signerPersonId])
    throw new Error("Petition signer is not in this world.");
  if (!inputWorld.people[input.circulatorPersonId])
    throw new Error("Petition circulator is not in this world.");
  if (campaign && input.signerPersonId === campaign.candidatePersonId)
    throw new Error("A candidate cannot sign their own petition.");
  const subjectPersonId =
    input.petition?.subject.kind === "official"
      ? input.petition.subject.personId
      : null;
  if (subjectPersonId && !inputWorld.people[subjectPersonId])
    throw new Error("Petition subject is not in this world.");
  const propositionId =
    input.petition?.subject.kind === "proposition"
      ? input.petition.subject.propositionId
      : null;
  if (propositionId && !inputWorld.policyCatalog.propositions[propositionId])
    throw new Error("Petition proposition is not in this world.");
  const at = makeIsoDate(input.at);
  if (at > inputWorld.currentDate)
    throw new Error("A petition ask cannot be dated after the current day.");

  const petitionId = input.petition?.petitionId;
  const stableKey = campaign
    ? `candidate-petition:${campaign.id}:${input.signerPersonId}`
    : `citizen-petition:${petitionId}:${input.signerPersonId}`;
  const prior = inputWorld.history.events.find(
    (event) => event.stableKey === `${stableKey}:event`,
  );
  if (prior) throw new Error("This person has already been asked to sign.");

  let world = ensurePeopleTraits(inputWorld, [input.signerPersonId], at);
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const view =
    campaign || subjectPersonId
      ? viewOfOfficial(
          world,
          input.signerPersonId,
          campaign?.candidatePersonId ?? subjectPersonId!,
          {
            asOfDate: at,
            historySequenceExclusive: cutoff.historySequenceExclusive,
          },
        )
      : null;
  const relationship = readRelationshipStanding(
    world,
    input.signerPersonId,
    input.circulatorPersonId,
  ).readings.warmth;
  const signerParty = campaign
    ? majorPartyOf(world, input.signerPersonId, at)
    : null;
  const candidateParty = campaign
    ? majorPartyOf(world, campaign.candidatePersonId, at)
    : null;
  const considerations: DecisionConsideration[] = [];
  if (view && view.points !== 0) {
    const isCandidatePetition = Boolean(campaign);
    considerations.push({
      stableKey: `${stableKey}:candidate-view`,
      optionKey: view.points > 0 === isCandidatePetition ? "sign" : "decline",
      sourceType: "belief:official-view",
      direction: "supports",
      importance: Math.abs(view.points) >= 3 ? "strong" : "moderate",
      confidence: view.belief ? "high" : "medium",
      explanation: isCandidatePetition
        ? view.points > 0
          ? "The signer holds a favorable view of the candidate."
          : "The signer holds an unfavorable view of the candidate."
        : view.points < 0
          ? "The signer holds an unfavorable view of the official named in the petition."
          : "The signer holds a favorable view of the official named in the petition.",
      sourceRefs: view.belief
        ? [{ kind: "private-belief", beliefId: view.belief.id }]
        : [],
    });
  }
  if (propositionId && input.petition?.subject.kind === "proposition") {
    const belief = latestPrivateBelief(
      world,
      input.signerPersonId,
      propositionId,
      at,
    );
    if (
      belief &&
      (belief.position === "support" || belief.position === "oppose")
    ) {
      const aligns = belief.position === input.petition.subject.requestedStance;
      considerations.push({
        stableKey: `${stableKey}:proposition-view`,
        optionKey: aligns ? "sign" : "decline",
        sourceType: "belief:policy-position",
        direction: "supports",
        importance: belief.salience === "high" ? "strong" : "moderate",
        confidence: "high",
        explanation: aligns
          ? "The signer supports the position this petition advances."
          : "The signer opposes the position this petition advances.",
        sourceRefs: [],
      });
    }
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
      key: `petition-signature:${campaign?.id ?? petitionId}`,
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
    type: campaign
      ? decision === "sign"
        ? "campaign.petition-signed"
        : "campaign.petition-declined"
      : decision === "sign"
        ? "civic.petition-signed"
        : "civic.petition-declined",
    occurredAt: at,
    recordedAt: world.currentDate,
    jurisdictionId: campaign?.jurisdictionId ?? input.petition!.jurisdictionId,
    involvedEntityIds: [
      input.signerPersonId,
      input.circulatorPersonId,
      ...(subjectPersonId ? [subjectPersonId] : []),
    ],
    participants: [
      { personId: input.signerPersonId, role: "agency:signer", detail: null },
      {
        personId: input.circulatorPersonId,
        role: "agency:circulator",
        detail: null,
      },
      ...(subjectPersonId
        ? [
            {
              personId: subjectPersonId,
              role: "focus:subject" as const,
              detail: "petition-target",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ...(campaign
        ? [CANDIDATE_PETITION_ASKED_TAG, `campaign:${campaign.id}`]
        : ["civic:petition-ask", `petition:${petitionId}`]),
      `decision:${decision}`,
    ],
    summary:
      decision === "sign"
        ? `${personName(world.people[input.signerPersonId]!)} signed ${campaign ? "the candidate's petition" : "the petition"} when asked by ${personName(world.people[input.circulatorPersonId]!)}.`
        : `${personName(world.people[input.signerPersonId]!)} declined to sign ${campaign ? "the candidate's petition" : "the petition"} when asked by ${personName(world.people[input.circulatorPersonId]!)}.`,
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
