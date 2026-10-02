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

/** Historical reason keys retained for reading older recorded ballots. */
export const COUNCIL_DEFERENCE_REASON = "member:council-deference";
export const COUNCIL_PRECEDENT_REASON = "member:council-precedent";

export const COUNCIL_VOTE_NOTE = `${COUNCIL_LAWMAKING_VERSION}: each member decided their own ballot from their principles, their record, the ordinance's sponsor, the town's voters and shared institutional considerations.`;

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
  return decideChamberVote(world, {
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
}
