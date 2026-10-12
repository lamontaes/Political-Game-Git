import type {
  EntityId,
  LegislativeVoteDisposition,
} from "../../simulation/types";
import type { Voter } from "../../simulation/governing/article-v";
import type { ChamberConstitutionalVoteInput } from "../../simulation/governing/chamber-votes";
import {
  principledLeaning,
  type PrincipledLeaningFacts,
} from "./principled-leaning";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
export interface ArticleVLeaningFacts extends PrincipledLeaningFacts {
  readonly playerPersonId: EntityId | null;
}
export function mostLeanYes(
  facts: ArticleVLeaningFacts,
  personIds: readonly EntityId[],
  propositionId: EntityId,
): boolean {
  const player = facts.playerPersonId;
  const counted = personIds.filter((id) => id !== player);
  if (counted.length === 0) return false;
  const yes = counted.filter(
    (id) => principledLeaning(facts, id, propositionId).score > 0,
  ).length;
  return yes * 2 > counted.length;
}

export function mostLeanNo(
  facts: ArticleVLeaningFacts,
  personIds: readonly EntityId[],
  propositionId: EntityId,
): boolean {
  const player = facts.playerPersonId;
  const counted = personIds.filter((id) => id !== player);
  if (counted.length === 0) return false;
  const no = counted.filter(
    (id) => principledLeaning(facts, id, propositionId).score < 0,
  ).length;
  return no * 2 > counted.length;
}

export function leanShare(
  facts: ArticleVLeaningFacts,
  voters: readonly Voter[],
  propositionId: EntityId,
): number {
  const player = facts.playerPersonId;
  const counted = voters.filter((voter) => voter.personId !== player);
  if (counted.length === 0) return 0;
  return (
    counted.filter(
      (voter) =>
        principledLeaning(facts, voter.personId, propositionId).score > 0,
    ).length / counted.length
  );
}

export function memberBallot(
  facts: ChamberDecisionFacts,
  input: ChamberConstitutionalVoteInput,
): readonly LegislativeVoteDisposition[] {
  return decideChamberVote(facts, input);
}
