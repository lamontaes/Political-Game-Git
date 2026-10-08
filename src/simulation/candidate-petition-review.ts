import { candidacyEligibility } from "./candidacy";
import { campaignById } from "./campaign-queries";
import { districtResidenceSince } from "./district-residence";
import { requireElectionContest } from "./election-contests";
import { isEligibleVoterIn } from "./issue-record";
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
