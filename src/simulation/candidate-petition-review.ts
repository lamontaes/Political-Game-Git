import { candidacyEligibility } from "./candidacy";
import { campaignById } from "./campaign-queries";
import { districtResidenceSince } from "./district-residence";
import { requireElectionContest } from "./election-contests";
import { isEligibleVoterIn } from "./issue-record";
import { recordWorldEvent } from "./world";
import { personName } from "./people";
import type { EntityId, IsoDate, World } from "./types";

export type CandidatePetitionInvalidReason =
  "not-eligible-voter" | "outside-district" | "duplicate-signature" | "outside-circulation-window";

export interface CandidatePetitionSignatureReview {
  readonly eventId: EntityId;
  readonly signerPersonId: EntityId;
  readonly valid: boolean;
  readonly reason: CandidatePetitionInvalidReason | null;
}

export interface CandidatePetitionReview {
  readonly campaignId: EntityId;
  readonly filingDate: IsoDate;
  readonly circulationOpensOn: IsoDate;
  readonly filingDeadline: IsoDate;
  readonly accepted: boolean;
  readonly canCure: boolean;
  readonly reasonKeys: readonly ("petition-deadline-passed" | "petition-insufficient-signatures")[];
  readonly requiredSignatures: number;
  readonly validSignatures: number;
  readonly invalidSignatures: number;
  readonly shortfall: number;
  readonly signatures: readonly CandidatePetitionSignatureReview[];
}

/**
 * Read the petition records as a clerk would on the stated filing date.
 * Results contain stable reason keys for the English layer; this module does
 * not author player-facing wording.
 */
export function reviewCandidatePetition(
  world: World,
  campaignId: EntityId,
  filingDate: IsoDate = world.currentDate,
): CandidatePetitionReview {
  const campaign = campaignById(world, campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  const contest = requireElectionContest(world, campaign.contestId);
  const eligibility = candidacyEligibility(world, {
    personId: campaign.candidatePersonId,
    jurisdictionId: campaign.jurisdictionId,
    officeKey: campaign.officeKey,
    alreadyACandidate: false,
    districtBinding: contest.office.districtBinding ?? null,
    municipalSeatKey: contest.office.seatKey ?? null,
  });
  const terms = eligibility.filingTerms;
  if (!terms) throw new Error("Candidate filing terms are unavailable.");
  const requiredSignatures =
    typeof terms.signatures === "number" ? terms.signatures : 0;
  const recurringDate = (monthAndDay: string): IsoDate => {
    const electionYear = Number(contest.electionDate.slice(0, 4));
    let date = `${electionYear}-${monthAndDay}` as IsoDate;
    if (date > contest.electionDate)
      date = `${electionYear - 1}-${monthAndDay}` as IsoDate;
    return date;
  };
  const circulationOpensOn = recurringDate(terms.circulationOpens);
  const filingDeadline = recurringDate(terms.deadline);
  const events = world.history.events
    .filter(
      (event) =>
        event.tags.includes("campaign:candidate-petition-ask") &&
        event.tags.includes(`campaign:${campaign.id}`) &&
        event.type === "campaign.petition-signed" &&
        event.occurredAt <= filingDate,
    )
    .sort((left, right) => left.sequence - right.sequence);
  const seenSigners = new Set<EntityId>();
  const signatures: CandidatePetitionSignatureReview[] = events.map((event) => {
    const signerPersonId = event.participants.find(
      (participant) => participant.role === "agency:signer",
    )?.personId;
    if (!signerPersonId) {
      throw new Error(`Petition signature event has no signer: ${event.id}`);
    }
    let reason: CandidatePetitionInvalidReason | null = null;
    if (
      event.occurredAt < circulationOpensOn ||
      event.occurredAt > filingDeadline
    ) {
      reason = "outside-circulation-window";
    } else if (seenSigners.has(signerPersonId) && terms.onePerSigner) {
      reason = "duplicate-signature";
    } else if (
      !isEligibleVoterIn(
        world,
        signerPersonId,
        campaign.jurisdictionId,
        filingDate,
      )
    ) {
      reason = "not-eligible-voter";
    } else if (
      terms.sameDistrictOnly &&
      contest.office.districtBinding &&
      districtResidenceSince(
        world,
        signerPersonId,
        contest.office.districtBinding,
        filingDate,
      ) === null
    ) {
      reason = "outside-district";
    }
    seenSigners.add(signerPersonId);
    return {
      eventId: event.id,
      signerPersonId,
      valid: reason === null,
      reason,
    };
  });
  const validSignatures = signatures.filter(
    (signature) => signature.valid,
  ).length;
  const deadlinePassed = filingDate > filingDeadline;
  const reasonKeys = [
    ...(deadlinePassed ? (["petition-deadline-passed"] as const) : []),
    ...(validSignatures < requiredSignatures
      ? (["petition-insufficient-signatures"] as const)
      : []),
  ];
  return {
    campaignId,
    filingDate,
    circulationOpensOn,
    filingDeadline,
    accepted: reasonKeys.length === 0,
    canCure: !deadlinePassed,
    reasonKeys,
    requiredSignatures,
    validSignatures,
    invalidSignatures: signatures.length - validSignatures,
    shortfall: Math.max(0, requiredSignatures - validSignatures),
    signatures,
  };
}


export interface FiledCandidatePetition {
  readonly world: World;
  readonly review: CandidatePetitionReview;
  readonly eventId: EntityId;
}

/**
 * Record the clerk's decision as a public filing event. A rejected packet may
 * be resubmitted after signatures are cured while its recorded deadline remains
 * open. The clerk must already be a person in this world.
 */
export function fileCandidatePetition(
  world: World,
  campaignId: EntityId,
  clerkPersonId: EntityId,
  filingDate: IsoDate = world.currentDate,
): FiledCandidatePetition {
  const campaign = campaignById(world, campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
  const clerk = world.people[clerkPersonId];
  const candidate = world.people[campaign.candidatePersonId];
  if (!clerk) throw new Error("The filing clerk is not recorded in this world.");
  if (!candidate) throw new Error("The petition candidate is not recorded.");
  if (clerkPersonId === candidate.id)
    throw new Error("A candidate cannot serve as their own filing clerk.");

  const review = reviewCandidatePetition(world, campaignId, filingDate);
  const priorFilings = world.history.events.filter(
    (event) =>
      event.tags.includes("campaign:candidate-petition-filing") &&
      event.tags.includes(`campaign:${campaignId}`),
  );
  if (priorFilings.some((event) => event.type === "campaign.petition-accepted"))
    throw new Error("This candidate petition has already been accepted.");

  const signatureIds = review.signatures.map((signature) => signature.eventId);
  const stableKey = `candidate-petition-filing:${campaignId}:${filingDate}:${signatureIds.join(",")}`;
  const prior = priorFilings.find((event) => event.stableKey === stableKey);
  if (prior) return { world, review, eventId: prior.id };

  const next = recordWorldEvent(world, {
    stableKey,
    type: review.accepted
      ? "campaign.petition-accepted"
      : "campaign.petition-rejected",
    occurredAt: filingDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.candidatePersonId,
      clerkPersonId,
      campaign.jurisdictionId,
    ],
    participants: [
      { personId: clerkPersonId, role: "agency:clerk" },
      { personId: campaign.candidatePersonId, role: "agency:candidate" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "campaign:candidate-petition-filing",
      `campaign:${campaignId}`,
      `petition:${review.accepted ? "accepted" : "rejected"}`,
      ...review.reasonKeys.map((reason) => `reason:${reason}`),
    ],
    summary: `${personName(candidate)}'s candidate petition was ${review.accepted ? "accepted" : "rejected"}.`,
    context: {
      location: {
        jurisdictionId: campaign.jurisdictionId,
        label: world.jurisdictions[campaign.jurisdictionId]?.name ?? null,
        setting: "Candidate petition filing",
      },
      socialContext: null,
      pressure: null,
      choice: review.accepted ? "Petition accepted." : "Petition rejected.",
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, review, eventId: next.history.events.at(-1)!.id };
}
