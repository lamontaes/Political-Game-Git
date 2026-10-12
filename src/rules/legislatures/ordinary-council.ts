import type {
  EntityId,
  LegislativeVoteDisposition,
  DecisionEvaluation,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type { SeatedMember } from "../../simulation/legislation-scenarios";
import type { ChamberQuestion } from "../../simulation/governing/member-ballots";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
export interface OrdinaryCouncilFacts extends ChamberDecisionFacts {
  readonly question: ChamberQuestion | null;
  readonly sitsOnAuthoredCalendar: boolean;
  readonly measure: LegislativeMeasureRecord;
  readonly seats: readonly {
    readonly participationId: EntityId;
    readonly personId: EntityId;
  }[];
  readonly names: ReadonlyMap<EntityId, string>;
  readonly playerPersonId: EntityId | null;
  readonly playerBallot: LegislativeVoteDisposition["disposition"] | null;
}
export function decideOrdinaryCouncilReading(
  facts: OrdinaryCouncilFacts,
  governmentKey: string,
  measureId: EntityId,
  ownBallot?: "yea" | "nay" | "present-not-voting" | null,
  onDecision?: (evaluation: DecisionEvaluation) => void,
): readonly LegislativeVoteDisposition[] | null {
  const question = facts.question;
  if (!question || facts.sitsOnAuthoredCalendar) return null;
  const measure = facts.measure;
  const seats = facts.seats;
  if (seats.length === 0) return null;
  const members: SeatedMember[] = seats.map((seat) => ({
    memberKey: `council:${seat.participationId}`,
    personId: seat.personId,
    name: facts.names.get(seat.personId)!,
    caucusLabel: "Council",
  }));
  const playerId = facts.playerPersonId;
  return decideChamberVote(facts, {
    stableKey: `${measure.stableKey}:reading:${question.floorStageKey}`,
    question: {
      question: { ...question, amendmentStableKey: null, provisionKey: null },
      questionLabel: `${measure.designation} council reading`,
    },
    members,
    ...(onDecision ? { onDecision } : {}),
    playerPersonId: playerId,
    playerBallot:
      ownBallot === undefined
        ? playerId
          ? facts.playerBallot
          : null
        : ownBallot,
  });
}
