import {
  activeWorkRelationshipsAt,
  chamberByKey,
  electionContestById,
  rulePackById,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  resolveActiveMemberSeat,
  type ActiveMemberSeat,
  type MemberSeatScope,
} from "./legislative-member-seat";

export interface UnavailableOfficeFact {
  readonly kind: "unavailable";
  readonly reason: string;
}

export interface LegislativeOfficeContext {
  readonly personId: EntityId;
  readonly member:
    | UnavailableOfficeFact
    | {
        readonly kind: "member";
        readonly seat: ActiveMemberSeat;
        readonly officeKey: string;
        readonly officeTitle: string;
        readonly chamberLabel: string;
        readonly jurisdictionLabel: string;
        readonly recordedWorkStartedAt: IsoDate;
        readonly label: string;
      };
  /** The recorded employment start is not a sourced legal term boundary. */
  readonly termCommencement: UnavailableOfficeFact;
  readonly termExpiry: UnavailableOfficeFact;
  readonly committeeMembership: UnavailableOfficeFact;
  readonly measure:
    | UnavailableOfficeFact
    | {
        readonly kind: "measure";
        readonly measureId: EntityId;
        readonly designation: string;
        readonly sponsorPersonId: EntityId | null;
        readonly isSponsorOfRecord: boolean;
        readonly sponsorLabel: string;
        /** A bill's referral is not an appointment of its sponsor to the committee. */
        readonly lastRecordedReferral: null | {
          readonly referralId: EntityId;
          readonly committeeKey: string;
          readonly chamberKey: string;
          readonly referredAt: IsoDate;
          readonly committeeLabel: string;
          readonly label: string;
        };
      };
}

/** Read-only orientation over existing identity and history; grants no powers. */
export function projectLegislativeOfficeContext(
  world: World,
  personId: EntityId,
  measureId?: EntityId,
  scope?: MemberSeatScope,
): LegislativeOfficeContext {
  const selectedMeasure = world.history.legislativeMeasures?.find(
    (entry) => entry.id === measureId,
  );
  const resolution = resolveActiveMemberSeat(
    world,
    personId,
    selectedMeasure && !scope
      ? {
          governingJurisdictionId: selectedMeasure.jurisdictionId,
          legislativeRulePackId: selectedMeasure.rulePackId,
        }
      : scope,
  );
  let member: LegislativeOfficeContext["member"] = {
    kind: "unavailable",
    reason:
      resolution.kind !== "seated"
        ? resolution.reason
        : "The selected member seat does not match this bill's institution.",
  };
  if (
    resolution.kind === "seated" &&
    (!selectedMeasure ||
      (selectedMeasure.jurisdictionId ===
        resolution.seat.governingJurisdictionId &&
        selectedMeasure.rulePackId === resolution.seat.legislativeRulePackId))
  ) {
    const seat = resolution.seat;
    const contest = electionContestById(world, seat.contestId);
    const work = activeWorkRelationshipsAt(world, personId).find(
      (entry) => entry.relationship.id === seat.relationshipId,
    );
    const jurisdiction = world.jurisdictions[seat.governingJurisdictionId];
    if (contest && work && jurisdiction) {
      const chamber = chamberByKey(
        rulePackById(seat.legislativeRulePackId),
        seat.chamberKey,
      );
      member = {
        kind: "member",
        seat,
        officeKey: contest.office.officeKey,
        officeTitle: contest.office.title,
        chamberLabel: chamber.name,
        jurisdictionLabel: jurisdiction.name,
        recordedWorkStartedAt: work.relationship.startedAt,
        label: `${contest.office.title} · ${jurisdiction.name}`,
      };
    }
  }
  const record = selectedMeasure;
  let measure: LegislativeOfficeContext["measure"] = {
    kind: "unavailable",
    reason: measureId
      ? "The requested bill is not recorded in this World."
      : "No bill is selected.",
  };
  if (record) {
    const referral = (world.history.committeeReferrals ?? [])
      .filter((entry) => entry.measureId === record.id)
      .sort((a, b) => b.sequence - a.sequence)[0];
    let lastRecordedReferral: Extract<
      LegislativeOfficeContext["measure"],
      { kind: "measure" }
    >["lastRecordedReferral"] = null;
    if (referral) {
      const chamber = chamberByKey(
        rulePackById(record.rulePackId),
        referral.chamberKey,
      );
      const committee = chamber.committees.find(
        (entry) => entry.committeeKey === referral.committeeKey,
      );
      if (committee)
        lastRecordedReferral = {
          referralId: referral.id,
          committeeKey: referral.committeeKey,
          chamberKey: referral.chamberKey,
          referredAt: referral.referredAt,
          committeeLabel: committee.name,
          label: `Last recorded referral: ${committee.name}`,
        };
    }
    const sponsor = record.sponsorPersonId
      ? world.people[record.sponsorPersonId]
      : null;
    const isSponsorOfRecord = record.sponsorPersonId === personId;
    measure = {
      kind: "measure",
      measureId: record.id,
      designation: record.designation,
      sponsorPersonId: record.sponsorPersonId,
      isSponsorOfRecord,
      sponsorLabel: isSponsorOfRecord
        ? "You are the sponsor of record."
        : sponsor
          ? `Sponsor of record: ${sponsor.givenName} ${sponsor.familyName}`
          : "No sponsor of record is identified.",
      lastRecordedReferral,
    };
  }
  return {
    personId,
    member,
    measure,
    termCommencement: {
      kind: "unavailable",
      reason: "Nobody has put a date on when this term formally began.",
    },
    termExpiry: {
      kind: "unavailable",
      reason: "Nobody has put a date on when this term ends.",
    },
    committeeMembership: {
      kind: "unavailable",
      reason:
        "You have not been appointed to a committee. Sponsoring a bill does not put you on the one that hears it.",
    },
  };
}
