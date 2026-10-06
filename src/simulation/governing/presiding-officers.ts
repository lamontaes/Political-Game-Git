import { hasStableKey } from "../history-index";
import { evaluateDecision } from "../decisions";
import { currentHistoricalCutoff, latestPersonalityTendency } from "../queries";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { personName } from "../people";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  castBallots,
  type BallotMember,
  type JointAssemblyCandidate,
  type JointAssemblyVote,
  type OwedLeadershipCommitment,
} from "./joint-assembly";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";

/**
 * Chamber leadership offices are filled by vote. The office and process are
 * supplied as data, so party leaders, whips, and presiding officers reuse the
 * same evaluator and ballot recorder.
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
 * The candidate field consists only of members who decide to declare. The
 * controlled player can be named in `playerDeclarations` by the scene action;
 * they never acquire a candidacy merely by being in the chamber.
 */

export const PRESIDING_OFFICER_VOTE_EVENT =
  "governing.presiding-officer-vote" as const;

export interface ChamberMember extends BallotMember {
  readonly party: string | null;
  /** When their continuous service began; earlier is more senior. */
  readonly serviceSince: IsoDate | null;
}

export interface ChamberLeaderElection {
  readonly postKey: string;
  readonly declarations: readonly {
    readonly personId: EntityId;
    readonly declared: boolean;
    readonly reason: string;
  }[];
  readonly caucusVotes: readonly {
    readonly caucus: string;
    readonly vote: JointAssemblyVote;
  }[];
  readonly floorVote: JointAssemblyVote;
  /** Null when no nominee won a majority of the votes cast. */
  readonly winnerPersonId: EntityId | null;
}

export interface ChamberLeaderPost {
  readonly key: string;
  readonly title: string;
  readonly selection: "caucus-and-floor-vote" | "floor-vote";
  readonly seniorityImportance: DecisionImportance;
}

/** One evaluator-driven leadership election for any post in the chamber row. */
export function electChamberLeader(
  world: World,
  input: {
    readonly stableKey: string;
    readonly post: ChamberLeaderPost;
    readonly members: readonly ChamberMember[];
    /** Explicit player choice supplied by the action or scene that asks them. */
    readonly playerDeclarations?: readonly EntityId[];
    /** Resolved b08 promises, supplied by the canonical commitment reader. */
    readonly owedLeadershipCommitments?: readonly OwedLeadershipCommitment[];
  },
): { readonly world: World; readonly election: ChamberLeaderElection } {
  const next = ensureOfficeholderPrinciples(
    world,
    input.members.map((member) => member.personId),
  );
  const player = next.control.kind === "person" ? next.control.personId : null;
  const owedCommitments =
    input.owedLeadershipCommitments?.filter(
      (commitment) => commitment.postKey === input.post.key,
    ) ?? [];
  const declarations: ChamberLeaderElection["declarations"][number][] = [];
  const declared: ChamberMember[] = [];
  for (const member of input.members) {
    if (member.personId === player) {
      const choseToRun =
        input.playerDeclarations?.includes(member.personId) ?? false;
      declarations.push({
        personId: member.personId,
        declared: choseToRun,
        reason: choseToRun
          ? "player:declared-for-post"
          : "player:did-not-declare",
      });
      if (choseToRun) declared.push(member);
      continue;
    }
    const considerations = declarationConsiderations(next, input, member);
    const evaluation = evaluateDecision(next, {
      stableKey: `${input.stableKey}:declaration:${member.personId}`,
      decisionType: "legislature.declare-chamber-leader",
      actorPersonId: member.personId,
      cutoff: currentHistoricalCutoff(next),
      subject: {
        kind: "context:chamber-leadership",
        key: input.post.key,
        entityId: null,
      },
      options: [
        {
          key: "declare",
          label: "Run",
          description: `Stand for ${input.post.title}.`,
        },
        {
          key: "decline",
          label: "Stay out",
          description: "Do not seek the post.",
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });
    const declares = evaluation.selectedOptionKey === "declare";
    const reason = bestReason(considerations, declares ? "declare" : "decline");
    declarations.push({
      personId: member.personId,
      declared: declares,
      reason,
    });
    if (declares) declared.push(member);
  }

  const caucusVotes: {
    readonly caucus: string;
    readonly vote: JointAssemblyVote;
  }[] = [];
  let nominees: JointAssemblyCandidate[] = declared.map((member) => ({
    key: `person:${member.personId}`,
    personId: member.personId,
    party: member.party ?? "independent",
    incumbent: false,
  }));
  if (input.post.selection === "caucus-and-floor-vote") {
    const caucuses = new Map<string, ChamberMember[]>();
    for (const member of declared) {
      const caucus = member.party ?? "independent";
      caucuses.set(caucus, [...(caucuses.get(caucus) ?? []), member]);
    }
    nominees = [];
    for (const [caucus, members] of [...caucuses.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    )) {
      const order = [...members].sort(
        (a, b) =>
          (a.serviceSince ?? "9999").localeCompare(b.serviceSince ?? "9999") ||
          a.personId.localeCompare(b.personId),
      );
      const vote = castBallots(next, {
        stableKey: `${input.stableKey}:caucus:${caucus}`,
        decisionType: PRESIDING_OFFICER_VOTE_EVENT,
        subjectKind: "context:caucus-nomination",
        describe: () =>
          `A candidate for the caucus's nomination for ${input.post.title}.`,
        members,
        owedLeadershipCommitments: owedCommitments,
        candidates: order.map((member, index) => ({
          key: `person:${member.personId}`,
          personId: member.personId,
          party: caucus,
          incumbent: false,
          seniorMost: index === 0,
          seniorityImportance: input.post.seniorityImportance,
        })),
      });
      caucusVotes.push({ caucus, vote });
      const nominee = [...vote.candidates].sort(
        (a, b) => (vote.tallies[b.key] ?? 0) - (vote.tallies[a.key] ?? 0),
      )[0];
      if (nominee && (vote.tallies[nominee.key] ?? 0) > 0)
        nominees.push({ ...nominee, seniorMost: false });
    }
  }
  const mostSeniorId = [...declared].sort(
    (left, right) =>
      (left.serviceSince ?? "9999").localeCompare(
        right.serviceSince ?? "9999",
      ) || left.personId.localeCompare(right.personId),
  )[0]?.personId;
  nominees = nominees.map((candidate) => ({
    ...candidate,
    seniorMost: candidate.personId === mostSeniorId,
    seniorityImportance: input.post.seniorityImportance,
  }));
  const floorVote = castBallots(next, {
    stableKey: `${input.stableKey}:floor`,
    decisionType: PRESIDING_OFFICER_VOTE_EVENT,
    subjectKind: "context:chamber-leadership",
    describe: () => `A candidate for ${input.post.title}.`,
    members: input.members,
    candidates: nominees,
    owedLeadershipCommitments: owedCommitments,
  });
  return {
    world: next,
    election: {
      postKey: input.post.key,
      declarations,
      caucusVotes,
      floorVote,
      winnerPersonId: floorVote.winner?.personId ?? null,
    },
  };
}

function declarationConsiderations(
  world: World,
  input: {
    readonly stableKey: string;
    readonly post: ChamberLeaderPost;
    readonly members: readonly ChamberMember[];
  },
  actor: ChamberMember,
): readonly DecisionConsideration[] {
  const considerations: DecisionConsideration[] = [];
  const ambitionId = SYNTHETIC_MIND_IDS.tendencies.ambition;
  const ambition = latestPersonalityTendency(world, actor.personId, ambitionId);
  if (ambition?.expressionKey === "ambitious") {
    const importance: DecisionImportance =
      ambition.strength === "defining" || ambition.strength === "strong"
        ? "moderate"
        : "slight";
    considerations.push({
      stableKey: `${input.stableKey}:ambition:${actor.personId}`,
      optionKey: "declare",
      sourceType: "mind:personality",
      direction: "supports",
      importance,
      confidence: "medium",
      explanation: `They often pursue positions with greater responsibility, such as ${input.post.title}.`,
      sourceRefs: [
        { kind: "personality-tendency", tendencyRecordId: ambition.id },
      ],
    });
  }
  // A recorded ambition can motivate entry. Seniority, standing, and ties are
  // weighed on the ballots after the member declares; they do not make every
  // seated member a candidate by default.
  return considerations;
}

function bestReason(
  considerations: readonly DecisionConsideration[],
  optionKey: string,
): string {
  return (
    considerations.find(
      (consideration) =>
        consideration.optionKey === optionKey &&
        consideration.direction === "supports",
    )?.stableKey ?? "legislator:no-recorded-reason"
  );
}

/** Records the chamber's roll call, each ballot with its reason. */
export function recordChamberLeaderVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly chamberKey: string;
    readonly postKey?: string;
    readonly officeTitle: string;
    readonly occurredAt: IsoDate;
    readonly election: ChamberLeaderElection;
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
        detail: `${ballot.candidateKey ?? "none"}|${ballot.reason}|${
          input.election.declarations.find(
            (declaration) => declaration.personId === ballot.personId,
          )?.declared
            ? "declared"
            : "not-declared"
        }`,
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `chamber:${input.chamberKey}`,
      `post:${input.postKey ?? input.election.postKey}`,
      ...input.election.declarations.map(
        ({ personId, declared, reason }) =>
          `declared:${personId}:${declared ? "yes" : "no"}:${reason}`,
      ),
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
      ...input.election.caucusVotes.flatMap(({ caucus, vote: caucusVote }) =>
        caucusVote.ballots.map(
          (ballot) =>
            `caucus-ballot:${caucus}:${ballot.personId}:${ballot.candidateKey ?? "none"}:${ballot.reason}`,
        ),
      ),
      ...vote.candidates.map(
        (candidate) =>
          `votes:${candidate.key}:${vote.tallies[candidate.key] ?? 0}`,
      ),
      ...(winner ? [`winner:${winner.id}`] : []),
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
