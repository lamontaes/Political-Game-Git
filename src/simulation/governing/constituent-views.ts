import { UNRESEARCHED_ISSUE_RECORD } from "../issue-record";
import { whoCaresAbout } from "../provision-public-face";
import type {
  DecisionConsideration,
  EntityId,
  PropositionAnswerRef,
  World,
} from "../types";

/**
 * How the voters of `jurisdictionId` hold the answers on the table, as a
 * reason for a member who answers to them. Read from the people of the place:
 * every eligible voter's own held view, weighted by how much the question
 * matters to them with the issue record's salience weights
 * (`UNRESEARCHED_ISSUE_RECORD`), so a member counts a voter as that voter's
 * own judgment of the record does. Null when nobody there holds a settled
 * view, or the sides are even.
 *
 * GAME ASSUMPTION (Build 25), hand-set until the research on how local
 * officials weigh their voters is read: the voters' side is a "moderate"
 * reason where it outweighs the other side two to one, and a "slight" one
 * otherwise.
 */
export function constituentsConsideration(
  world: World,
  jurisdictionId: EntityId,
  answers: readonly PropositionAnswerRef[],
): DecisionConsideration | null {
  const weight = UNRESEARCHED_ISSUE_RECORD.salienceWeight;
  let forIt = 0;
  let against = 0;
  let people = 0;
  for (const answer of answers) {
    const views = whoCaresAbout(world, answer.propositionId, jurisdictionId);
    const weigh = (side: typeof views.support) =>
      side.bySalience.low * weight.low +
      side.bySalience.moderate * weight.moderate +
      side.bySalience.high * weight.high +
      side.bySalience.central * weight.central;
    const yes = weigh(views.support);
    const no = weigh(views.oppose);
    people += views.support.people + views.oppose.people;
    forIt += answer.answer === "yes" ? yes : no;
    against += answer.answer === "yes" ? no : yes;
  }
  if (forIt === against) return null;
  const favor = forIt > against;
  const [more, less] = favor ? [forIt, against] : [against, forIt];
  return {
    stableKey: favor
      ? "member:constituents:for"
      : "member:constituents:against",
    optionKey: favor ? "vote-yea" : "vote-nay",
    sourceType: "context:constituents",
    direction: "supports",
    importance: more >= 2 * less ? "moderate" : "slight",
    confidence: "medium",
    explanation: `Of the ${people} voters here who hold a settled view, those who care most lean ${favor ? "for" : "against"} it.`,
    sourceRefs: [],
  };
}
