import { makeIsoDate } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { viewOfOfficial } from "./official-view-reads";
import { majorPartyOf } from "./statewide-electorate";
import { readRelationshipStanding } from "./relationship-standing";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { campaignById } from "./campaign-queries";
import { recordedDistrictMembership } from "./district-residence";
import { isEligibleVoterIn } from "./issue-record";
import { personName } from "./people";
import { requireElectionContest } from "./election-contests";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "../presentation/english-composition";
import { recordWorldEvent } from "./world";
import type { DecisionConsideration, EntityId, IsoDate, World } from "./types";

export const CANDIDATE_PETITION_ASKED_TAG = "campaign:candidate-petition-ask";

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

export type ClerkPetitionInvalidReason =
  "ineligible-voter" | "wrong-district" | "duplicate-signature";

export interface ClerkPetitionSignatureReview {
  readonly eventId: EntityId;
  readonly signerPersonId: EntityId;
  readonly valid: boolean;
  readonly reasons: readonly ClerkPetitionInvalidReason[];
  readonly lines: readonly string[];
}

export interface ClerkPetitionVerification {
  readonly validCount: number;
  readonly invalidCount: number;
  readonly signatures: readonly ClerkPetitionSignatureReview[];
  readonly lines: readonly string[];
}

const CLERK_REASON_TEXT: Readonly<Record<ClerkPetitionInvalidReason, string>> =
  {
    "ineligible-voter":
      "The signer was not eligible to vote on the filing date.",
    "wrong-district": "The signer did not live in the contested district.",
    "duplicate-signature": "Only the signer's first signature can be counted.",
  };

function clerkReasonLine(
  world: World,
  campaignId: EntityId,
  eventId: EntityId,
  reason: ClerkPetitionInvalidReason,
): string {
  const bank: ComposedLineBank = {
    key: `candidate-petition.clerk.${reason}`,
    version: "1",
    surface: "journal",
    act: "tell",
    parts: {
      core: {
        variants: [
          { key: "recorded-reason", kind: "verbatim", factKey: "reason" },
        ],
      },
    },
  };
  const composed = composeGroundedLine(
    {
      surface: "journal",
      momentKey: `candidate-petition:${campaignId}:${eventId}:${reason}`,
      worldSeed: world.seed,
      bankVersion: bank.version,
      stage: "adult",
      sourceRecordIds: [eventId],
      facts: {
        reason: { text: CLERK_REASON_TEXT[reason], sourceRecordIds: [eventId] },
      },
      knowledge: [],
    },
    bank,
  );
  if (composed.kind !== "rendered") {
    throw new Error("The clerk could not compose a recorded petition reason.");
  }
  return composed.text;
}

/**
 * The clerk's filing-day read of the signatures the campaign collected.
 * The campaign's running count remains every signed event; only this read
 * applies voter, district, and first-signature rules.
 */
export function clerkVerifyPetition(
  world: World,
  campaignId: EntityId,
  filingDate: IsoDate,
): ClerkPetitionVerification {
  const campaign = campaignById(world, campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  const date = makeIsoDate(filingDate);
  const contest = requireElectionContest(world, campaign.contestId);
  const binding = contest.office.districtBinding ?? null;
  const seen = new Set<EntityId>();

  const signatures = petitionSignaturesForCampaign(world, campaignId)
    .filter((event) => event.occurredAt <= date)
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((event): ClerkPetitionSignatureReview[] => {
      const signer = event.participants.find(
        (participant) => participant.role === "agency:signer",
      )?.personId;
      if (!signer) return [];
      const reasons: ClerkPetitionInvalidReason[] = [];
      if (!isEligibleVoterIn(world, signer, campaign.jurisdictionId, date)) {
        reasons.push("ineligible-voter");
      }
      if (binding) {
        const membership = recordedDistrictMembership(
          world,
          signer,
          binding.chamber,
          date,
        );
        if (
          !membership ||
          membership.binding.vintage !== binding.vintage ||
          membership.binding.chamber !== binding.chamber ||
          membership.binding.geoid !== binding.geoid
        ) {
          reasons.push("wrong-district");
        }
      }
      if (seen.has(signer)) reasons.push("duplicate-signature");
      else seen.add(signer);
      const lines = reasons.map((reason) =>
        clerkReasonLine(world, campaignId, event.id, reason),
      );
      return [
        {
          eventId: event.id,
          signerPersonId: signer,
          valid: reasons.length === 0,
          reasons,
          lines,
        },
      ];
    });
  const validCount = signatures.filter((signature) => signature.valid).length;
  const invalidCount = signatures.length - validCount;
  return {
    validCount,
    invalidCount,
    signatures,
    lines: signatures.flatMap((signature) => signature.lines),
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
