import {
  castMemberBallot,
  memberVotesAhead,
} from "../simulation/governing/legislative-clock";
import {
  chamberQuestionKey,
  type ChamberQuestion,
  type MemberBallot,
} from "../simulation/governing/member-ballots";
import type { EntityId, World } from "../simulation";
import { readableDate } from "./relationship-web";

/** One question a seated member will vote on, as the member reads it. */
export interface MemberVoteRow {
  readonly key: string;
  readonly question: ChamberQuestion;
  readonly bill: string;
  readonly asks: string;
  readonly when: string;
  readonly ballot: MemberBallot | null;
}

const BALLOT_LABEL: Record<MemberBallot, string> = {
  yea: "Yes",
  nay: "No",
  "present-not-voting": "Present, not voting",
};

export function memberBallotLabel(ballot: MemberBallot): string {
  return BALLOT_LABEL[ballot];
}

/**
 * The questions still to be put that the controlled member sits on. Reading
 * it spends no time and records nothing.
 */
export function memberVoteRows(
  world: World,
  personId: EntityId,
): readonly MemberVoteRow[] {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return [];
  return memberVotesAhead(world, personId).map((entry) => {
    const { measure, question, forumName } = entry;
    const asks =
      question.purpose === "committee-report"
        ? `${forumName}: report it to the floor?`
        : question.purpose === "concurrence"
          ? `${forumName}: accept the other chamber's changes?`
          : question.purpose === "veto-override"
            ? `${forumName === "the joint session" ? "The joint session" : forumName}: override the governor's veto?`
            : `${forumName}: pass it?`;
    return {
      key: chamberQuestionKey(question),
      question,
      bill: `${measure.designation}, ${measure.shortTitle}`,
      asks,
      when: entry.voteOn
        ? `The vote is on ${readableDate(entry.voteOn)}.`
        : "The vote has not been scheduled yet.",
      ballot: entry.ballot,
    };
  });
}

/** The member decides; refused (World unchanged) when it is not theirs. */
export function decideMemberBallot(
  world: World,
  personId: EntityId,
  question: ChamberQuestion,
  ballot: MemberBallot,
): World {
  return castMemberBallot(world, { personId, question, ballot });
}
