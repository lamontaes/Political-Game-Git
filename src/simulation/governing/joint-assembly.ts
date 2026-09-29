import { stateCandidacyPack } from "../candidacy-packs";
import { evaluateDecision } from "../decisions";
import { hasStableKey } from "../history-index";
import { stateJurisdictionForKey } from "../life-places";
import { personName } from "../people";
import {
  stateLegislatureEstablished,
  stateLegislators,
  type StateLegislatorView,
} from "../nationwide-world/state-legislature-opening";
import { currentHistoricalCutoff } from "../queries";
import {
  readRelationshipStanding,
  type StandingBand,
} from "../relationship-standing";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { principleAgreement } from "./officeholder-principles";

/**
 * A STATE LEGISLATURE ELECTS A U.S. SENATOR, member by member.
 *
 * Used only where an amendment in force has the legislatures choose senators
 * (`senate-selection.ts`). The Act of July 25, 1866 (ch. 245, 14 Stat. 243)
 * has the members of both houses vote in joint assembly, and "the person
 * having a majority of all the votes of the said joint assembly, a majority
 * of all the members elected to both houses being present and voting" is
 * elected. Each party caucus put up its nominee, as it did in practice.
 *
 * Each member chooses through the shared decision evaluator from their own
 * party caucus, their recorded relationship with each candidate and how far
 * the candidate's principles agree with their own. A sitting senator seeking
 * another term is the known candidate. No member follows a fixed rule, and
 * the player is not treated apart: a player senator is one candidate among
 * the others and wins only the votes the members give.
 *
 * WEIGHTS (hand-set on the game's shared decision scale, so every reason is
 * visible in the ballot's trace): own caucus "strong"; a relationship at its
 * reading's band (strong, marked, slight); agreement in principles at the
 * vote-importance cut points of `officeholder-principles.ts`; a sitting
 * senator seeking return "slight".
 *
 * A member with no reason bearing on any candidate casts no ballot.
 *
 * NOT MODELED: each house voting separately first (the 1866 act's first
 * step); a member of the joint assembly who is the player casts no ballot
 * yet (no screen asks them); a deadlock is not balloted again day after day
 * as the act required, since the same members would vote the same way.
 */

export interface JointAssemblyCandidate {
  /** Stable within one vote: `party:<key>` or `person:<id>`. */
  readonly key: string;
  /** Null for a caucus nominee who is not yet a person in this world. */
  readonly personId: EntityId | null;
  readonly party: string;
  readonly incumbent: boolean;
}

export interface JointAssemblyBallot {
  readonly personId: EntityId;
  /** Null for a member who cast no ballot. */
  readonly candidateKey: string | null;
  readonly reason: string;
}

export interface JointAssemblyVote {
  readonly candidates: readonly JointAssemblyCandidate[];
  readonly ballots: readonly JointAssemblyBallot[];
  readonly tallies: Readonly<Record<string, number>>;
  /** Null when no candidate won a majority of the votes cast. */
  readonly winner: JointAssemblyCandidate | null;
}

/** A state's sitting legislators, or null where no legislature is seated. */
export function seatedStateLegislators(
  world: World,
  stateUsps: string,
): readonly StateLegislatorView[] | null {
  const pack = stateCandidacyPack(`US-${stateUsps}`);
  if (!pack || !stateLegislatureEstablished(world, pack.packId)) return null;
  const members = stateLegislators(world, pack.packId);
  return members.length > 0 ? members : null;
}

/**
 * The candidates before the joint assembly: each party caucus's nominee,
 * largest caucus first. A seeking incumbent is their own caucus's nominee,
 * and stands on their own where their party holds no seats there.
 */
export function jointAssemblyCandidates(
  members: readonly StateLegislatorView[],
  incumbent: {
    readonly personId: EntityId;
    readonly party: string;
  } | null,
): readonly JointAssemblyCandidate[] {
  const counts = new Map<string, number>();
  for (const member of members)
    if (member.party)
      counts.set(member.party, (counts.get(member.party) ?? 0) + 1);
  const parties = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([party]) => party);
  const candidates: JointAssemblyCandidate[] = parties.map((party) =>
    incumbent && incumbent.party === party
      ? {
          key: `person:${incumbent.personId}`,
          personId: incumbent.personId,
          party,
          incumbent: true,
        }
      : { key: `party:${party}`, personId: null, party, incumbent: false },
  );
  if (incumbent && !counts.has(incumbent.party))
    candidates.push({
      key: `person:${incumbent.personId}`,
      personId: incumbent.personId,
      party: incumbent.party,
      incumbent: true,
    });
  return candidates;
}

const BAND_IMPORTANCE: Readonly<
  Record<Exclude<StandingBand, "none">, DecisionImportance>
> = { slight: "slight", marked: "moderate", strong: "strong" };

function strongerBand(a: StandingBand, b: StandingBand): StandingBand {
  const order: readonly StandingBand[] = ["none", "slight", "marked", "strong"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function memberReasons(
  world: World,
  member: StateLegislatorView,
  candidate: JointAssemblyCandidate,
): DecisionConsideration[] {
  const reasons: DecisionConsideration[] = [];
  const optionKey = candidate.key;
  if (member.party && member.party === candidate.party)
    reasons.push({
      stableKey: `legislator:own-caucus:${optionKey}`,
      optionKey,
      sourceType: "context:own-caucus",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "The candidate is the nominee of the member's own caucus.",
      sourceRefs: [],
    });
  if (!candidate.personId || candidate.personId === member.personId)
    return reasons;
  if (candidate.incumbent)
    reasons.push({
      stableKey: `legislator:sitting-senator:${optionKey}`,
      optionKey,
      sourceType: "context:sitting-senator",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "The candidate already holds the seat.",
      sourceRefs: [],
    });
  const standing = readRelationshipStanding(
    world,
    member.personId,
    candidate.personId,
  );
  let good: StandingBand = "none";
  let bad: StandingBand = "none";
  const goodBasis = new Set<EntityId>();
  const badBasis = new Set<EntityId>();
  for (const dimension of ["warmth", "trust", "respect"] as const) {
    const reading = standing.readings[dimension];
    if (reading.band === "none") continue;
    if (reading.adverse) {
      bad = strongerBand(bad, reading.band);
      for (const id of reading.basis) badBasis.add(id);
    } else {
      good = strongerBand(good, reading.band);
      for (const id of reading.basis) goodBasis.add(id);
    }
  }
  const tension = standing.readings.tension;
  if (tension.band !== "none") {
    bad = strongerBand(bad, tension.band);
    for (const id of tension.basis) badBasis.add(id);
  }
  if (good !== "none")
    reasons.push({
      stableKey: `legislator:relationship:${optionKey}`,
      optionKey,
      sourceType: "social:relationship",
      direction: "supports",
      importance: BAND_IMPORTANCE[good],
      confidence: "high",
      explanation: "The member knows and thinks well of the candidate.",
      sourceRefs: [...goodBasis].map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  if (bad !== "none")
    reasons.push({
      stableKey: `legislator:relationship-strain:${optionKey}`,
      optionKey,
      sourceType: "social:relationship",
      direction: "opposes",
      importance: BAND_IMPORTANCE[bad],
      confidence: "high",
      explanation: "The member has a strained history with the candidate.",
      sourceRefs: [...badBasis].map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  const agreement = principleAgreement(
    world,
    member.personId,
    candidate.personId,
  );
  if (agreement.importance)
    reasons.push({
      stableKey: `legislator:principles:${optionKey}`,
      optionKey,
      sourceType: "belief:political-principle",
      direction: agreement.score > 0 ? "supports" : "opposes",
      importance: agreement.importance,
      confidence: "high",
      explanation:
        agreement.score > 0
          ? "The candidate holds the member's own principles."
          : "The candidate's principles cut against the member's.",
      sourceRefs: agreement.recordIds.map((principleRecordId) => ({
        kind: "political-principle" as const,
        principleRecordId,
      })),
    });
  return reasons;
}

function strongestReason(
  considerations: readonly DecisionConsideration[],
  optionKey: string,
): string {
  const weight = (c: DecisionConsideration): number =>
    ({ slight: 1, moderate: 2, strong: 4, decisive: 6 })[c.importance] *
    { low: 1, medium: 2, high: 3 }[c.confidence];
  const best = considerations
    .filter((c) => c.optionKey === optionKey && c.direction === "supports")
    .sort((a, b) => weight(b) - weight(a))[0]?.stableKey;
  return best ? best.replace(`:${optionKey}`, "") : "legislator:no-reason";
}

/** The joint assembly's ballot. Pure: the caller records it. */
export function jointAssemblyVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly members: readonly StateLegislatorView[];
    readonly candidates: readonly JointAssemblyCandidate[];
  },
): JointAssemblyVote {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const options = input.candidates.map((candidate) => ({
    key: candidate.key,
    label: candidate.personId
      ? "Vote for the candidate"
      : "Vote for the nominee",
    description: `The ${candidate.party} candidate for the Senate.`,
  }));
  const ballots: JointAssemblyBallot[] = [];
  const tallies: Record<string, number> = {};
  for (const candidate of input.candidates) tallies[candidate.key] = 0;
  if (options.length > 0)
    for (const member of input.members) {
      if (member.personId === player) {
        ballots.push({
          personId: member.personId,
          candidateKey: null,
          reason: "legislator:player-not-asked",
        });
        continue;
      }
      const considerations = input.candidates.flatMap((candidate) =>
        memberReasons(world, member, candidate),
      );
      // A member with no caucus, tie or principle bearing on any candidate
      // has nothing to choose by, and casts no ballot rather than a default.
      if (!considerations.some((c) => c.direction === "supports")) {
        ballots.push({
          personId: member.personId,
          candidateKey: null,
          reason: "legislator:no-reason-to-choose",
        });
        continue;
      }
      const evaluation = evaluateDecision(world, {
        stableKey: `${input.stableKey}:${member.personId}`,
        decisionType: "governing.senate-joint-assembly-vote",
        actorPersonId: member.personId,
        cutoff: currentHistoricalCutoff(world),
        subject: {
          kind: "context:senate-joint-assembly",
          key: input.stableKey,
          entityId: null,
        },
        options,
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      const chosen = evaluation.selectedOptionKey;
      if (!chosen) {
        ballots.push({
          personId: member.personId,
          candidateKey: null,
          reason: "legislator:no-choice",
        });
        continue;
      }
      tallies[chosen] = (tallies[chosen] ?? 0) + 1;
      ballots.push({
        personId: member.personId,
        candidateKey: chosen,
        reason: strongestReason(considerations, chosen),
      });
    }
  const cast = ballots.filter((ballot) => ballot.candidateKey).length;
  const winner =
    input.candidates.find(
      (candidate) => (tallies[candidate.key] ?? 0) * 2 > cast,
    ) ?? null;
  return { candidates: input.candidates, ballots, tallies, winner };
}

export const JOINT_ASSEMBLY_VOTE_EVENT =
  "governing.senate-joint-assembly-vote" as const;

/**
 * Records the joint assembly's roll call as one public event naming every
 * member's ballot and its reason. `winnerPersonId` is the person who took
 * the seat (a caucus nominee is a person by then), or null on a deadlock.
 */
export function recordJointAssemblyVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly seatKey: string;
    readonly stateUsps: string;
    readonly title: string;
    readonly occurredAt: IsoDate;
    readonly vote: JointAssemblyVote;
    readonly winnerPersonId: EntityId | null;
  },
): World {
  if (hasStableKey(world.history.events, input.stableKey)) return world;
  const { vote } = input;
  const cast = vote.ballots.filter((ballot) => ballot.candidateKey).length;
  const winner = input.winnerPersonId
    ? world.people[input.winnerPersonId]
    : undefined;
  const winnerVotes = vote.winner ? (vote.tallies[vote.winner.key] ?? 0) : 0;
  const jurisdiction = stateJurisdictionForKey(`US-${input.stateUsps}`);
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: JOINT_ASSEMBLY_VOTE_EVENT,
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction?.id ?? null,
    involvedEntityIds: [
      ...(winner ? [winner.id] : []),
      ...vote.ballots.map((ballot) => ballot.personId),
    ],
    participants: [
      ...(winner
        ? [
            {
              personId: winner.id,
              role: "focus:subject" as const,
              detail: input.title,
            },
          ]
        : []),
      ...vote.ballots.map((ballot) => ({
        personId: ballot.personId,
        role: "agency:legislature-vote" as const,
        detail: `${ballot.candidateKey ?? "none"}|${ballot.reason}`,
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `seat:${input.seatKey}`,
      `state:${input.stateUsps}`,
      ...vote.candidates.map(
        (candidate) =>
          `votes:${candidate.key}:${vote.tallies[candidate.key] ?? 0}`,
      ),
      vote.winner ? "outcome:elected" : "outcome:deadlocked",
    ],
    summary: winner
      ? `The ${input.stateUsps} legislature elected ${personName(winner)} ${input.title}, with ${winnerVotes} of ${cast} votes cast.`
      : `The ${input.stateUsps} legislature could not elect a senator: no candidate won a majority of the ${cast} votes cast.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
