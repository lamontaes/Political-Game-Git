import type { DecisionConsideration, EntityId } from "../../simulation/types";
import type {
  BallotMember,
  JointAssemblyCandidate,
  JointAssemblyVote,
  JointAssemblyBallot,
} from "../../simulation/governing/joint-assembly";
import type { StateLegislatorView } from "../../simulation/nationwide-world/state-legislature-opening";
import type { readRelationshipStanding } from "../../simulation/relationship-standing";
import { considerationScore } from "./reason-ranking";
import {
  principleAgreement,
  type PrincipleAgreementFacts,
} from "./principle-agreement";
import { relationshipConsiderations } from "./relationship-reasons";
export interface BallotFacts extends PrincipleAgreementFacts {
  readonly playerPersonId: EntityId | null;
  readonly relationships: ReadonlyMap<
    string,
    ReturnType<typeof readRelationshipStanding>
  >;
  readonly selectedOptions: ReadonlyMap<string, string | null>;
}
const JOINT_ASSEMBLY_VOTE_EVENT = "governing.senate-joint-assembly-vote";
function memberReasons(
  facts: BallotFacts,
  member: BallotMember,
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
  if (candidate.seniorMost)
    reasons.push({
      stableKey: `legislator:seniority:${optionKey}`,
      optionKey,
      sourceType: "context:seniority",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "The candidate is the caucus's longest-serving member.",
      sourceRefs: [],
    });
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
  reasons.push(
    ...relationshipConsiderations(
      facts.relationships.get(`${member.personId}:${candidate.personId}`)!,
      member.personId,
      candidate.personId,
      {
        optionKey,
        fond: {
          stableKey: `legislator:relationship:${optionKey}`,
          explanation: "The member knows and thinks well of the candidate.",
        },
        strain: {
          stableKey: `legislator:relationship-strain:${optionKey}`,
          explanation: "The member has a strained history with the candidate.",
        },
      },
    ),
  );
  const agreement = principleAgreement(
    facts,
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
  const best = considerations
    .filter((c) => c.optionKey === optionKey && c.direction === "supports")
    .sort(
      (a, b) =>
        Math.abs(considerationScore(b)) - Math.abs(considerationScore(a)),
    )[0]?.stableKey;
  return best ? best.replace(`:${optionKey}`, "") : "legislator:no-reason";
}

export function jointAssemblyVote(
  facts: BallotFacts,
  input: {
    readonly stableKey: string;
    readonly members: readonly StateLegislatorView[];
    readonly candidates: readonly JointAssemblyCandidate[];
  },
): JointAssemblyVote {
  return castBallots(facts, {
    ...input,
    decisionType: JOINT_ASSEMBLY_VOTE_EVENT,
    subjectKind: "context:senate-joint-assembly",
    describe: (candidate) => `The ${candidate.party} candidate for the Senate.`,
  });
}

export function castBallots(
  facts: BallotFacts,
  input: {
    readonly stableKey: string;
    readonly decisionType: string;
    readonly subjectKind: `context:${string}`;
    readonly describe: (candidate: JointAssemblyCandidate) => string;
    readonly members: readonly BallotMember[];
    readonly candidates: readonly JointAssemblyCandidate[];
  },
): JointAssemblyVote {
  const player = facts.playerPersonId;
  const options = input.candidates.map((candidate) => ({
    key: candidate.key,
    label: candidate.personId
      ? "Vote for the candidate"
      : "Vote for the nominee",
    description: input.describe(candidate),
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
        memberReasons(facts, member, candidate),
      );
      if (!considerations.some((c) => c.direction === "supports")) {
        ballots.push({
          personId: member.personId,
          candidateKey: null,
          reason: "legislator:no-reason-to-choose",
        });
        continue;
      }
      const chosen =
        facts.selectedOptions.get(`${input.stableKey}:${member.personId}`) ??
        null;

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
