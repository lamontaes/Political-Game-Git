import { recordWorldEvent } from "../world";
import type { EntityId, LegislativeQuestionIdentity, World } from "../types";

/**
 * A seated member's own ballot on a question the chamber has not yet taken.
 *
 * The clock never votes for the player: at the roll call, a player who holds a
 * seat and has not decided is recorded absent. This is where the player's
 * decision is kept until then. It is an ordinary history event, so the latest
 * one stands and every earlier one stays in the record; the roll call reads
 * whichever was last decided on or before the day the question is put.
 */

/**
 * Deciding a ballot names no place to travel to: a member decides wherever
 * they are. The calendar treats this location the way it treats a meeting two
 * people arranged between themselves, and asks for no journey.
 */
export const MEMBER_BALLOT_LOCATION_KEY = "legislature:deciding-a-ballot";

export const MEMBER_BALLOT_EVENT = "legislation.member-ballot" as const;

export type MemberBallot = "yea" | "nay" | "present-not-voting";

export type ChamberQuestion = Omit<
  LegislativeQuestionIdentity,
  "amendmentStableKey" | "provisionKey"
>;

/** One key per question: the stage, the forum and, on the floor, the stage. */
export function chamberQuestionKey(question: ChamberQuestion): string {
  return [
    question.measureId,
    question.purpose,
    question.forumKey ?? "-",
    question.floorStageKey ?? "-",
  ].join(":");
}

export function memberBallotOn(
  world: World,
  personId: EntityId,
  question: ChamberQuestion,
): MemberBallot | null {
  const tag = `question:${chamberQuestionKey(question)}`;
  const latest = world.history.events
    .filter(
      (event) =>
        event.type === MEMBER_BALLOT_EVENT &&
        event.occurredAt <= world.currentDate &&
        event.involvedEntityIds.includes(personId) &&
        event.tags.includes(tag),
    )
    .sort((l, r) => l.sequence - r.sequence)
    .at(-1);
  const ballot = latest?.context.immediateReaction;
  return ballot === "yea" || ballot === "nay" || ballot === "present-not-voting"
    ? ballot
    : null;
}

/** Writes the ballot. Callers check the member faces this question first. */
export function recordMemberBallot(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly question: ChamberQuestion;
    readonly ballot: MemberBallot;
    readonly summary: string;
  },
): World {
  const key = chamberQuestionKey(input.question);
  return recordWorldEvent(world, {
    stableKey: `${MEMBER_BALLOT_EVENT}:${key}:${input.personId}:${world.history.nextSequence}`,
    type: MEMBER_BALLOT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.question.measureId, input.personId],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`question:${key}`, `ballot:${input.ballot}`],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.ballot,
    },
  });
}
