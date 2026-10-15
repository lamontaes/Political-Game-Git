import { candidacyPackForJurisdiction } from "./candidacy";
import { measurePosition, measuresForJurisdiction } from "./legislation";
import { stateJurisdictionForKey } from "./life-places";
import {
  measurePropositionAnswer,
  type PropositionAnswer,
} from "./issue-record";
import { recordCampaignCommitment } from "./politics";
import type { ElectionContestRecord, EntityId, World } from "./types";

/**
 * A candidate says where they stand on a bill in front of the body they want
 * to join, and it becomes a campaign pledge.
 *
 * The question is never invented: it is a bill already filed in that place,
 * still undecided, that says which way it answers a policy question. When no
 * such bill exists, there is nothing live to be asked about, and nothing is.
 * The pledge is judged later from the candidate's own record once they hold
 * the office (`assessUndertaking`), never from a stored verdict.
 */

export interface LiveQuestion {
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly propositionId: EntityId;
  readonly question: string;
  /** "yes" when passing the bill does what the question proposes. */
  readonly answer: PropositionAnswer;
}

/**
 * The bills still in play in a place that say which way they answer a
 * question, newest first.
 */
export function liveQuestionsIn(
  world: World,
  jurisdictionId: EntityId,
): readonly LiveQuestion[] {
  return measuresForJurisdiction(world, jurisdictionId)
    .filter((measure) => {
      const position = measurePosition(world, measure.id);
      return !position.terminal && position.phase !== "drafting";
    })
    .slice()
    .sort((a, b) => b.sequence - a.sequence)
    .flatMap((measure) =>
      (measure.propositionIds ?? []).flatMap((propositionId) => {
        const answer = measurePropositionAnswer(measure, propositionId);
        const definition = world.policyCatalog.propositions[propositionId];
        if (!answer || !definition) return [];
        return [
          {
            measureId: measure.id,
            designation: measure.designation,
            shortTitle: measure.shortTitle,
            propositionId,
            question: definition.question,
            answer,
          },
        ];
      }),
    );
}

/**
 * Where the body a race fills files its bills: the state, for a seat in the
 * state legislature; the place itself, for a seat on its own council. Null
 * when the game cannot say, and then nobody is asked about a bill.
 */
export function officeBodyJurisdiction(
  world: World,
  contest: ElectionContestRecord,
): EntityId | null {
  const pack = candidacyPackForJurisdiction(contest.jurisdictionId);
  if (
    pack &&
    pack.offices.some((office) => office.officeKey === contest.office.officeKey)
  ) {
    const state = stateJurisdictionForKey(pack.jurisdictionKey);
    return state && world.jurisdictions[state.id] ? state.id : null;
  }
  return world.jurisdictions[contest.jurisdictionId]
    ? contest.jurisdictionId
    : null;
}

export interface StateCampaignStandInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly question: LiveQuestion;
  /** Whether they said they would vote for the bill. */
  readonly backsTheBill: boolean;
  /** Their own words. */
  readonly statement: string;
  /** Where they said it, when that was recorded. */
  readonly sourceEventId: EntityId | null;
}

/**
 * Records a stand on a bill as a public pledge on the question it answers.
 * Backing a bill that answers "no" is a pledge against the question.
 */
export function stateCampaignStand(
  world: World,
  input: StateCampaignStandInput,
): World {
  const forTheQuestion =
    (input.question.answer === "yes") === input.backsTheBill;
  const earlier = world.history.campaignCommitments
    .filter(
      (record) =>
        record.personId === input.personId &&
        record.propositionId === input.question.propositionId,
    )
    .at(-1);
  return recordCampaignCommitment(world, {
    stableKey: input.stableKey,
    personId: input.personId,
    propositionId: input.question.propositionId,
    madeAt: world.currentDate,
    stance: forTheQuestion ? "support" : "oppose",
    level: "pledge",
    statement: input.statement,
    conditions: null,
    sourceEventId: input.sourceEventId,
    supersedesCommitmentId: earlier?.id ?? null,
  });
}
