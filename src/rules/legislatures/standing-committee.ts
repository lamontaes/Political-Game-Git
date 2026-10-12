import type {
  CommitteeRule,
  RuleSourceRef,
  UnknownRuleValue,
} from "../../simulation/legislature-rules";
import { majorityOf } from "./municipal-thresholds";
function unknownRule(note: string): UnknownRuleValue {
  return { kind: "unknown", note };
}
export const STANDING_COMMITTEE_RULE_VERSION = "standing-committee/v1";

export const STANDING_COMMITTEE_CITATION = "Standing committee (stand-in)";

export function standingCommittee(
  chamberKey: string,
  seats: number | null,
  stateName: string,
): CommitteeRule {
  const source: RuleSourceRef = {
    authority: "game-profile",
    citation: STANDING_COMMITTEE_CITATION,
    sourceTitle: `Our Civic Duty standing rule (${STANDING_COMMITTEE_RULE_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note: `The game's standing rule until ${stateName}'s committee rules are read: one standing committee hears every bill and reports it on a majority of its members. This is not a reading of ${stateName}'s law.`,
  };
  return {
    committeeKey: `${chamberKey}-standing`,
    name: "Standing committee",
    appointedMembers:
      seats === null ? 5 : Math.max(5, Math.min(25, Math.round(seats / 6))),
    membershipBasis: "scenario-fixture",
    reportThreshold: majorityOf(
      "committee-members-appointed",
      "a majority of the committee's membership",
      source,
    ),
    chairMayDeclineToHear: unknownRule(
      `Whether a committee chair in ${stateName} may decline to take a bill up is set by the chamber's own rules, which have not been read.`,
    ),
    publicHearingNotice: unknownRule(
      `How much notice a committee hearing in ${stateName} takes is set by the chamber's own rules, which have not been read.`,
    ),
  };
}
