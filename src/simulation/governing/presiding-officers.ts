import { hasStableKey } from "../history-index";
import { personName } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  castBallots,
  type BallotMember,
  type JointAssemblyCandidate,
  type JointAssemblyVote,
} from "./joint-assembly";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";

/**
 * A CHAMBER ELECTS ITS PRESIDING OFFICER by vote: the Speaker of the House
 * and the President pro tempore of the Senate (CTO ruling, September 29,
 * 2026, 12:54 a.m.).
 *
 * Two ballots, as the parties hold them. First each caucus chooses its
 * nominee from among its own members; then the chamber votes among the
 * nominees. Every member decides both ballots through the shared evaluator
 * from their caucus, their recorded relationship with each candidate and how
 * far each candidate's principles agree with their own (`joint-assembly.ts`).
 * A caucus's longest-serving member has a slight reason in their favor, the
 * Senate's long custom for its President pro tempore.
 *
 * The chamber elects the candidate with a majority of the votes cast (for
 * the House, Rule I and precedent: a majority of those voting for a person
 * by name). Without one, nobody is elected on this reading, and the chair
 * stays empty.
 *
 * GAME ASSUMPTION (hand-set): a caucus's candidates are its five
 * longest-serving members, since a caucus weighing all of its members one by
 * one against each other made the vote too slow, and the nominee is the one
 * with the most caucus votes.
 *
 * NOT MODELED: repeated ballots (the House's 15 in January 2023); the
 * election is held when the line of succession is read, not at each
 * Congress's first sitting. A player in the chamber casts no ballot and is
 * not a candidate unless they choose to run, which no screen offers yet.
 */

export const PRESIDING_OFFICER_VOTE_EVENT =
  "governing.presiding-officer-vote" as const;

/** PLACEHOLDER (hand-set): how many of a caucus's members stand for its nomination. */
const CAUCUS_CANDIDATES = 5;

export interface ChamberMember extends BallotMember {
  readonly party: string;
  /** When their continuous service began; earlier is more senior. */
  readonly serviceSince: IsoDate | null;
}

export interface PresidingOfficerElection {
  readonly caucusVotes: readonly {
    readonly caucus: string;
    readonly vote: JointAssemblyVote;
  }[];
  readonly floorVote: JointAssemblyVote;
  /** Null when no nominee won a majority of the votes cast. */
  readonly winnerPersonId: EntityId | null;
}

export function electPresidingOfficer(
  world: World,
  input: {
    readonly stableKey: string;
    readonly officeTitle: string;
    readonly members: readonly ChamberMember[];
  },
): { readonly world: World; readonly election: PresidingOfficerElection } {
  const next = ensureOfficeholderPrinciples(
    world,
    input.members.map((member) => member.personId),
  );
  const player = next.control.kind === "person" ? next.control.personId : null;
  const caucuses = new Map<string, ChamberMember[]>();
  for (const member of input.members)
    caucuses.set(member.party, [...(caucuses.get(member.party) ?? []), member]);
  const caucusVotes: {
    readonly caucus: string;
    readonly vote: JointAssemblyVote;
  }[] = [];
  const nominees: JointAssemblyCandidate[] = [];
  for (const [caucus, members] of [...caucuses.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )) {
    const standing = members
      .filter((member) => member.personId !== player)
      .sort(
        (a, b) =>
          (a.serviceSince ?? "9999").localeCompare(b.serviceSince ?? "9999") ||
          a.personId.localeCompare(b.personId),
      )
      .slice(0, CAUCUS_CANDIDATES);
    if (standing.length === 0) continue;
    const vote = castBallots(next, {
      stableKey: `${input.stableKey}:caucus:${caucus}`,
      decisionType: PRESIDING_OFFICER_VOTE_EVENT,
      subjectKind: "context:caucus-nomination",
      describe: () =>
        `A candidate for the caucus's nomination for ${input.officeTitle}.`,
      members,
      candidates: standing.map((member, index) => ({
        key: `person:${member.personId}`,
        personId: member.personId,
        party: caucus,
        incumbent: false,
        seniorMost: index === 0,
      })),
    });
    caucusVotes.push({ caucus, vote });
    // The caucus's choice: the most votes, the more senior on a tie.
    const nominee = [...vote.candidates].sort(
      (a, b) => (vote.tallies[b.key] ?? 0) - (vote.tallies[a.key] ?? 0),
    )[0];
    if (nominee && (vote.tallies[nominee.key] ?? 0) > 0)
      nominees.push({ ...nominee, seniorMost: false });
  }
  const floorVote = castBallots(next, {
    stableKey: `${input.stableKey}:floor`,
    decisionType: PRESIDING_OFFICER_VOTE_EVENT,
    subjectKind: "context:presiding-officer",
    describe: () => `A caucus's nominee for ${input.officeTitle}.`,
    members: input.members,
    candidates: nominees,
  });
  return {
    world: next,
    election: {
      caucusVotes,
      floorVote,
      winnerPersonId: floorVote.winner?.personId ?? null,
    },
  };
}

/** Records the chamber's roll call, each ballot with its reason. */
export function recordPresidingOfficerVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly chamberKey: string;
    readonly officeTitle: string;
    readonly occurredAt: IsoDate;
    readonly election: PresidingOfficerElection;
  },
): World {
  if (hasStableKey(world.history.events, input.stableKey)) return world;
  const vote = input.election.floorVote;
  const cast = vote.ballots.filter((ballot) => ballot.candidateKey).length;
  const winner = input.election.winnerPersonId
    ? world.people[input.election.winnerPersonId]
    : undefined;
  const winnerVotes = vote.winner ? (vote.tallies[vote.winner.key] ?? 0) : 0;
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: PRESIDING_OFFICER_VOTE_EVENT,
    occurredAt: input.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      ...(winner ? [winner.id] : []),
      ...vote.ballots
        .map((ballot) => ballot.personId)
        .filter((id) => id !== winner?.id),
    ],
    participants: [
      ...(winner
        ? [
            {
              personId: winner.id,
              role: "focus:subject" as const,
              detail: input.officeTitle,
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
      `chamber:${input.chamberKey}`,
      ...input.election.caucusVotes.map(
        ({ caucus, vote: caucusVote }) =>
          `nominee:${caucus}:${
            [...caucusVote.candidates].sort(
              (a, b) =>
                (caucusVote.tallies[b.key] ?? 0) -
                (caucusVote.tallies[a.key] ?? 0),
            )[0]?.personId ?? "none"
          }`,
      ),
      ...vote.candidates.map(
        (candidate) =>
          `votes:${candidate.key}:${vote.tallies[candidate.key] ?? 0}`,
      ),
      winner ? "outcome:elected" : "outcome:deadlocked",
    ],
    summary: winner
      ? `The chamber elected ${personName(winner)} ${input.officeTitle}, with ${winnerVotes} of ${cast} votes cast.`
      : `The chamber could not elect a ${input.officeTitle}: no nominee won a majority of the ${cast} votes cast.`,
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
