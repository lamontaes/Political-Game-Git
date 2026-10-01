import { lawInForce } from "./law-in-force";
import { personName } from "../people";
import type { EntityId, LegislativeVoteDisposition, World } from "../types";
import { decideChamberVote, publicPartyOf } from "./chamber-votes";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";

/**
 * COUNCIL LAWMAKING (Build 25, CTO ruling of September 29, 12:24 a.m.).
 *
 * A town council and the Council of the District of Columbia make local law
 * the way a legislature makes state law. Before this, a randomly drawn member
 * filed an ordinance on a random question, a coin flip picked its answer, and
 * each member's ballot was a hash (two in three yes in a town, one in two in
 * the District). Now:
 *
 * 1. Who files, and what. A member files an ordinance on the question their
 *    own principles press hardest (`officeholder-principles.ts`), where the
 *    town's law in force does not already say what they want and no
 *    ordinance on it is moving: to enact what they support, or to repeal a
 *    law in force they oppose. This is the state member agenda's rule
 *    (`member-agenda.ts`), read against the town's own law.
 * 2. How members vote. Every member answers through the legislatures' vote
 *    engine (`decideChamberVote`): their principles, what they said on the
 *    record, a cue from whoever carries the ordinance, and, for a council,
 *    the voters of the town (`constituentsConsideration`).
 *
 * The player is never decided for: a player who sits on the council files
 * nothing through this and is recorded absent on a vote they did not cast.
 */

export const COUNCIL_LAWMAKING_VERSION = "council-lawmaking/v1";

/**
 * The reason a member with no view and no cue on an ordinance votes for it.
 * Councils vote together far more than legislatures: 87 percent of recorded
 * votes in California city councils were unanimous, against 10 percent of
 * votes in Congress (Participation and Representation in Local Government
 * Speech, arXiv 2604.21202, 2026); Austin's council agreed more than 95
 * percent of the time in 2025 (Austin American-Statesman), Boulder's more
 * than 70 percent (Boulder Reporting Lab, 2026). The most common real rule
 * for a member who has nothing at stake is to go along with the item before
 * the body. Only a member with no view, no record and no cue defers; one who
 * has any of those decides from them.
 */
export const COUNCIL_DEFERENCE_REASON = "member:council-deference";

/**
 * The reason a member with no view votes against undoing a law their own
 * body enacted: going along with the body means keeping what it decided.
 * Councils rarely reverse their own recent ordinances, and a member with no
 * stake of their own has no reason to.
 */
export const COUNCIL_PRECEDENT_REASON = "member:council-precedent";

export const COUNCIL_VOTE_NOTE = `${COUNCIL_LAWMAKING_VERSION}: each member decided their own ballot from their principles, their record, the ordinance's sponsor and the town's voters.`;

export interface CouncilMember {
  readonly personId: EntityId;
}

/** Ensures every member holds principles before anything is filed or voted. */
export function ensureCouncilPrinciples(
  world: World,
  members: readonly CouncilMember[],
): World {
  return ensureOfficeholderPrinciples(
    world,
    members.map((member) => member.personId),
  );
}

/**
 * Every seated member's ballot on one council question, through the
 * legislatures' vote engine with the town's voters as the members'
 * constituents.
 */
export function decideCouncilVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly measureId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly members: readonly CouncilMember[];
    readonly playerPersonId: EntityId | null;
    readonly questionLabel: string;
    /** The mayor, whose known position every member hears. */
    readonly executivePersonId: EntityId | null;
    /** Members are elected without party labels (`body-partisanship.ts`). */
    readonly nonpartisan: boolean;
  },
): readonly LegislativeVoteDisposition[] {
  const decided = decideChamberVote(world, {
    stableKey: input.stableKey,
    question: {
      question: {
        measureId: input.measureId,
        purpose: "floor-stage",
        forumKey: "council",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: input.questionLabel,
    },
    members: input.members.map((member, index) => ({
      memberKey: `council:${index + 1}`,
      name: personName(world.people[member.personId]!),
      personId: member.personId,
      caucusLabel: publicPartyOf(world, member.personId) ?? "No party",
    })),
    playerPersonId: input.playerPersonId,
    playerBallot: null,
    constituencyId: input.jurisdictionId,
    executivePersonId: input.executivePersonId,
    nonpartisan: input.nonpartisan,
  });
  // A member with nothing of their own to weigh on the question goes along
  // with the ordinance that reached the floor, the way councils do.
  // A member with nothing of their own to weigh goes along with the body:
  // for the ordinance before it, unless the ordinance would undo a law this
  // same body enacted, in which case they keep the body's standing law.
  const undoes = undoesOwnLaw(world, input.measureId);
  return decided.map((row) =>
    row.disposition === "present-not-voting" &&
    row.reason === "member:no-reason" &&
    row.personId !== input.playerPersonId
      ? undoes
        ? { ...row, disposition: "nay", reason: COUNCIL_PRECEDENT_REASON }
        : { ...row, disposition: "yea", reason: COUNCIL_DEFERENCE_REASON }
      : row,
  );
}

/**
 * Whether the ordinance answers a question otherwise than a law the same
 * body enacted and that is in force today.
 */
function undoesOwnLaw(world: World, measureId: EntityId): boolean {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (!measure) return false;
  return (measure.propositionAnswers ?? []).some((row) => {
    const law = lawInForce(world, measure.jurisdictionId, row.propositionId);
    if (!law || law.origin !== "enacted" || law.answer === row.answer)
      return false;
    const enacted = world.history.legislativeMeasures?.find(
      (other) => other.id === law.measureId,
    );
    return (
      enacted?.jurisdictionId === measure.jurisdictionId &&
      enacted.rulePackId === measure.rulePackId
    );
  });
}
