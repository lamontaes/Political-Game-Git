import type {
  EntityId,
  LegislativeVoteDisposition,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type { CouncilMember } from "../../simulation/governing/council-lawmaking";
import type { ChamberQuestion } from "../../simulation/governing/member-ballots";
import type { lawInForce } from "../../simulation/governing/law-in-force";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
export interface CouncilDecisionFacts extends ChamberDecisionFacts {
  readonly names: ReadonlyMap<EntityId, string>;
  readonly parties: ReadonlyMap<EntityId, string | null>;
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly laws: ReadonlyMap<string, ReturnType<typeof lawInForce>>;
  readonly playerBallot: LegislativeVoteDisposition["disposition"] | null;
}
export const COUNCIL_DEFERENCE_REASON = "member:council-deference";

export const COUNCIL_PRECEDENT_REASON = "member:council-precedent";

export function councilFloorQuestion(measureId: EntityId): ChamberQuestion {
  return {
    measureId,
    purpose: "floor-stage",
    forumKey: "council",
    floorStageKey: null,
  };
}

export function decideCouncilVote(
  facts: CouncilDecisionFacts,
  input: {
    readonly stableKey: string;
    readonly measureId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly members: readonly CouncilMember[];
    readonly playerPersonId: EntityId | null;
    readonly questionLabel: string;
    readonly executivePersonId: EntityId | null;
    readonly nonpartisan: boolean;
  },
): readonly LegislativeVoteDisposition[] {
  const question = councilFloorQuestion(input.measureId);
  const decided = decideChamberVote(facts, {
    stableKey: input.stableKey,
    question: {
      question: {
        ...question,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: input.questionLabel,
    },
    members: input.members.map((member, index) => ({
      memberKey: `council:${index + 1}`,
      name: facts.names.get(member.personId)!,
      personId: member.personId,
      caucusLabel: facts.parties.get(member.personId) ?? "No party",
    })),
    playerPersonId: input.playerPersonId,
    playerBallot: input.playerPersonId ? facts.playerBallot : null,
    constituencyId: input.jurisdictionId,
    executivePersonId: input.executivePersonId,
    nonpartisan: input.nonpartisan,
  });
  const undoes = undoesOwnLaw(facts, input.measureId);
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

function undoesOwnLaw(
  facts: CouncilDecisionFacts,
  measureId: EntityId,
): boolean {
  const measure = facts.measures?.find((row) => row.id === measureId);
  if (!measure) return false;
  return (measure.propositionAnswers ?? []).some((row) => {
    const law = facts.laws.get(
      `${measure.jurisdictionId}:${row.propositionId}`,
    );
    if (!law || law.origin !== "enacted" || law.answer === row.answer)
      return false;
    const enacted = facts.measures?.find((other) => other.id === law.measureId);
    return (
      enacted?.jurisdictionId === measure.jurisdictionId &&
      enacted.rulePackId === measure.rulePackId
    );
  });
}
