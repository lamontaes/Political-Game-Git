import {
  activeWorkRelationshipsAt,
  campaignState,
  candidacyPackById,
  chamberByKey,
  electionContestById,
  electionContestResult,
  rulePackById,
  stateJurisdictionForKey,
} from "../simulation";
import type { ActiveWorkRelationship, EntityId, World } from "../simulation";

/**
 * Who actually holds a seat, established from the records that seated them.
 *
 * A work relationship labelled `employment:legislative-member` is a claim, not
 * an authority: any canonical writer can record that label without an election
 * behind it. Voting membership at the bargaining boundary is derived instead
 * from the accepted winner chain that `seatTheWinner` actually writes —
 * controlled person → active member work record → the campaign named by its
 * stable key → that campaign's recorded win → the contest result that names
 * this person the winner and carries the same outcome event the relationship's
 * provenance points at → the candidacy pack's governing state → the office's
 * own chamber. Every link is reconciled against the record as it exists; no
 * link is inferred from a prefix, a display status, a residence, or an array
 * position.
 *
 * This is a read-only projection over existing records — not a second seat
 * store and not a new authorization framework. It fails closed: a missing,
 * ended, mismatched, or ambiguous chain withholds with a stated reason and
 * grants nothing.
 */

export interface ActiveMemberSeat {
  readonly relationshipId: EntityId;
  readonly relationshipStableKey: string;
  readonly organizationId: EntityId;
  /** The state the seat governs. Never the member's residence. */
  readonly governingJurisdictionId: EntityId;
  readonly candidacyPackId: string;
  readonly legislativeRulePackId: string;
  /** The pack's own key for the state, e.g. "kentucky". */
  readonly jurisdictionKey: string;
  /** The chamber the office record names. Never a first-array-entry guess. */
  readonly chamberKey: string;
  readonly campaignId: EntityId;
  readonly contestId: EntityId;
  readonly electionResultId: EntityId;
  readonly outcomeEventId: EntityId;
}

export type MemberSeatResolution =
  | { readonly kind: "seated"; readonly seat: ActiveMemberSeat }
  | { readonly kind: "unseated"; readonly reason: string };

const MEMBER_KIND = "employment:legislative-member";

export function resolveActiveMemberSeat(
  world: World,
  personId: EntityId,
): MemberSeatResolution {
  const candidates = activeWorkRelationshipsAt(world, personId).filter(
    (work) => work.relationship.kind === MEMBER_KIND,
  );
  if (candidates.length === 0) {
    return {
      kind: "unseated",
      reason: "This character holds no active legislative member seat.",
    };
  }

  const seats: ActiveMemberSeat[] = [];
  const reasons: string[] = [];
  for (const candidate of candidates) {
    const outcome = reconcileSeat(world, personId, candidate);
    if (outcome.kind === "seated") seats.push(outcome.seat);
    else reasons.push(outcome.reason);
  }

  if (seats.length === 1) return { kind: "seated", seat: seats[0]! };
  if (seats.length > 1) {
    return {
      kind: "unseated",
      reason:
        "More than one active member seat matches this character, and the records do not say which one this sitting belongs to.",
    };
  }
  return { kind: "unseated", reason: reasons[0]! };
}

function reconcileSeat(
  world: World,
  personId: EntityId,
  candidate: ActiveWorkRelationship,
): MemberSeatResolution {
  const relationship = candidate.relationship;

  const provenance = relationship.provenance;
  if (provenance.kind !== "simulated-event" || !provenance.eventId) {
    return unseated("The member record carries no election outcome behind it.");
  }

  if (relationship.organizationId === null) {
    return unseated("The member record names no legislature to sit in.");
  }
  if (!relationship.stableKey.endsWith(":seat")) {
    return unseated(
      "The member record is not the seat record an election win writes.",
    );
  }
  const campaignStableKey = relationship.stableKey.slice(0, -":seat".length);
  const campaign = (world.history.campaigns ?? []).find(
    (record) => record.stableKey === campaignStableKey,
  );
  if (!campaign) {
    return unseated("No campaign record stands behind this seat.");
  }
  if (campaign.candidatePersonId !== personId) {
    return unseated("The campaign behind this seat was another person's.");
  }

  let status;
  try {
    status = campaignState(world, campaign.id);
  } catch {
    return unseated("The campaign behind this seat recorded no state.");
  }
  if (status.status !== "won" || !status.electionResultId) {
    return unseated("The campaign behind this seat did not record a win.");
  }

  const result = electionContestResult(world, campaign.contestId);
  if (
    !result ||
    result.id !== status.electionResultId ||
    result.winnerPersonId !== personId ||
    result.outcomeEventId !== provenance.eventId
  ) {
    return unseated("The recorded election result does not support this seat.");
  }

  const contest = electionContestById(world, campaign.contestId);
  if (!contest) {
    return unseated("The contest behind this seat is missing.");
  }

  const pack = candidacyPackById(campaign.candidacyPackId);
  if (!pack) {
    return unseated(
      "No sourced candidacy pack stands behind this seat's office.",
    );
  }
  const governing = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!governing) {
    return unseated("The seat's governing state is not established.");
  }
  // The role must say where the work happens. A seat with no recorded
  // governing location does not borrow the member's residence.
  if (candidate.role.locationJurisdictionId !== governing.id) {
    return unseated(
      "The seat's recorded workplace does not match its governing state.",
    );
  }

  // The chamber comes from the office record the contest was run for —
  // `candidacyPackFromRulePack` keys an office as `<packId>:<chamberKey>` —
  // and must exist in the accepted rule pack. No default chamber.
  const officeKey = contest.office.officeKey;
  const prefix = `${pack.legislativeRulePackId}:`;
  if (!officeKey.startsWith(prefix)) {
    return unseated("The office behind this seat names no supported chamber.");
  }
  const chamberKey = officeKey.slice(prefix.length);
  try {
    chamberByKey(rulePackById(pack.legislativeRulePackId), chamberKey);
  } catch {
    return unseated("The office behind this seat names no supported chamber.");
  }

  return {
    kind: "seated",
    seat: {
      relationshipId: relationship.id,
      relationshipStableKey: relationship.stableKey,
      organizationId: relationship.organizationId,
      governingJurisdictionId: governing.id,
      candidacyPackId: pack.packId,
      legislativeRulePackId: pack.legislativeRulePackId,
      jurisdictionKey: pack.jurisdictionKey,
      chamberKey,
      campaignId: campaign.id,
      contestId: campaign.contestId,
      electionResultId: result.id,
      outcomeEventId: result.outcomeEventId,
    },
  };
}

function unseated(reason: string): MemberSeatResolution {
  return { kind: "unseated", reason };
}
