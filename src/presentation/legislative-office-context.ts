import {
  activeWorkRelationshipsAt,
  chamberByKey,
  electionContestById,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import { committeesForPerson } from "../simulation/governing/committee-assignment";
import { US_CONGRESS_PACK_ID } from "../simulation/congress-rule-pack";
import { stateChamberName } from "../simulation/candidacy-packs";
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
  /** The committees the chamber's clock seats this member on, if any. */
  readonly committeeMembership:
    | UnavailableOfficeFact
    | {
        readonly kind: "committees";
        readonly committees: readonly {
          readonly committeeKey: string;
          readonly name: string;
        }[];
        readonly label: string;
      };
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
      const pack = legislativeRulePackForWorld(
        world,
        seat.legislativeRulePackId,
      );
      const chamber = chamberByKey(pack, seat.chamberKey);
      member = {
        kind: "member",
        seat,
        officeKey: contest.office.officeKey,
        officeTitle: contest.office.title,
        chamberLabel: stateChamberName(pack.jurisdictionKey, chamber.name),
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
        legislativeRulePackForWorld(world, record.rulePackId),
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
    committeeMembership:
      member.kind === "member"
        ? committeeMembershipFor(
            world,
            personId,
            member.seat.legislativeRulePackId,
            member.seat.chamberKey,
          )
        : {
            kind: "unavailable",
            reason:
              "You have not been appointed to a committee. Sponsoring a bill does not put you on the one that hears it.",
          },
  };
}

/**
 * The same roster the legislative clock votes a committee report with, so
 * the committees a member is told they sit on are the ones that count them.
 */
function committeeMembershipFor(
  world: World,
  personId: EntityId,
  rulePackId: string,
  chamberKey: string,
): LegislativeOfficeContext["committeeMembership"] {
  const pack = legislativeRulePackForWorld(world, rulePackId);
  const chamber = chamberByKey(pack, chamberKey);
  if (chamber.committees.length === 0)
    return {
      kind: "unavailable",
      reason: `The ${chamber.name} has no committees in the game yet, so nobody sits on one.`,
    };
  const seated = seatedChamberForPack(
    world,
    pack.packId,
    chamberKey,
    chamber.name,
  );
  if (!seated)
    return {
      kind: "unavailable",
      reason: `The ${chamber.name} does not have its full membership in the game yet, so its committees have no members.`,
    };
  // The roster the clock deals committee seats from. A member it does not
  // list is not counted on any committee, whatever their own record says.
  if (!seated.body.members.some((entry) => entry.personId === personId))
    return {
      kind: "unavailable",
      reason: `Committee seats in the ${chamber.name} went to the members who were already serving, and you have not been given one.`,
    };
  const keys = committeesForPerson(
    seated.body,
    chamber.committees,
    personId,
    `${pack.packId}:${chamberKey}`,
  );
  const committees = chamber.committees
    .filter((committee) => keys.includes(committee.committeeKey))
    .map(({ committeeKey, name }) => ({ committeeKey, name }));
  if (committees.length === 0)
    return {
      kind: "unavailable",
      reason: `You do not sit on any of the ${chamber.name}'s committees.`,
    };
  return {
    kind: "committees",
    committees,
    label: `You sit on ${listNames(committees.map((committee) => `the ${committee.name}`))}.`,
  };
}

function listNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

/**
 * The committees a sitting member of Congress is counted on. A seat in
 * Congress is read from the Congress seat roll rather than a member-seat
 * record, so it is asked for by chamber.
 */
export function congressCommitteeMembership(
  world: World,
  personId: EntityId,
  congressChamberKey: "us-house" | "us-senate",
): LegislativeOfficeContext["committeeMembership"] {
  return committeeMembershipFor(
    world,
    personId,
    US_CONGRESS_PACK_ID,
    congressChamberKey === "us-house" ? "house" : "senate",
  );
}
