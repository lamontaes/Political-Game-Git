import type { EntityId, World } from "../types";
import type { ChamberQuestion } from "./member-ballots";
import { chamberQuestionKey, memberBallotOn } from "./member-ballots";
import { hasStableKey } from "../history-index";

/**
 * Vote-calendar integration seam for b08 step 7.
 *
 * This deliberately does not schedule a vote or invent a conversation. The
 * clock that owns a vote must call this adapter when that question is on the
 * calendar, supplying its rule-derived required yea count and the canonical
 * NPC bargaining room. The room adapter resolves through
 * `resolveBargainingResponse` and persists through
 * `recordBargainingConsequences` (the same writers as a player exchange).
 * Until the legislative and council clocks adopt this seam, this function is
 * not part of runtime execution.
 */
export interface VoteBargainingMember {
  readonly personId: EntityId;
  readonly memberKey: string;
}

export interface VoteBargainingInput {
  readonly onCalendar: boolean;
  readonly question: ChamberQuestion;
  readonly requiredYeas: number;
  readonly sponsorPersonId: EntityId;
  readonly members: readonly VoteBargainingMember[];
  /** Existing vote on this exact question, when the clock has one. */
  readonly existingVoteStableKey?: string;
  /** Stable key prefix for this vote's NPC exchanges. */
  readonly exchangeKey: string;
  /** The canonical conversation adapter performs resolution and persistence. */
  readonly approach: (
    world: World,
    input: {
      readonly member: VoteBargainingMember;
      readonly intent: "request-support";
      readonly turnKey: string;
    },
  ) => World;
}

export interface VoteBargainingResult {
  readonly world: World;
  readonly approachedPersonIds: readonly EntityId[];
  readonly reason:
    | "not-on-calendar"
    | "vote-already-recorded"
    | "sponsor-is-controlled-player"
    | "majority-already-reached"
    | "approached-undecided-members";
}

/**
 * Let a non-player sponsor approach undecided colleagues only for a vote
 * actually scheduled now. Pending ballots are read from the canonical ballot
 * event records; no inferred or random vote is counted here.
 */
export function bargainBeforeScheduledVote(
  world: World,
  input: VoteBargainingInput,
): VoteBargainingResult {
  if (!input.onCalendar)
    return { world, approachedPersonIds: [], reason: "not-on-calendar" };
  if (
    input.existingVoteStableKey &&
    (world.history.legislativeVotes ?? []).some(
      (vote) => vote.stableKey === input.existingVoteStableKey,
    )
  )
    return { world, approachedPersonIds: [], reason: "vote-already-recorded" };
  if (
    world.control.kind === "person" &&
    world.control.personId === input.sponsorPersonId
  )
    return {
      world,
      approachedPersonIds: [],
      reason: "sponsor-is-controlled-player",
    };

  const yeaCount = input.members.filter(
    (member) =>
      memberBallotOn(world, member.personId, input.question) === "yea",
  ).length;
  if (yeaCount >= input.requiredYeas)
    return {
      world,
      approachedPersonIds: [],
      reason: "majority-already-reached",
    };

  const questionKey = chamberQuestionKey(input.question);
  let next = world;
  const approachedPersonIds: EntityId[] = [];
  for (const member of input.members) {
    if (member.personId === input.sponsorPersonId) continue;
    if (memberBallotOn(next, member.personId, input.question) !== null)
      continue;
    const turnKey = `${input.exchangeKey}:${questionKey}:${member.memberKey}`;
    if (
      hasStableKey(
        next.history.legislativeNegotiations ?? [],
        `${turnKey}:negotiation`,
      )
    )
      continue;
    next = input.approach(next, {
      member,
      intent: "request-support",
      turnKey,
    });
    approachedPersonIds.push(member.personId);
  }
  return {
    world: next,
    approachedPersonIds,
    reason: "approached-undecided-members",
  };
}
