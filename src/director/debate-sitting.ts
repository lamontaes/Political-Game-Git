/**
 * The debate's part of the sitting (owner, Oct 26-29: interviews and debates
 * are scenes; the loop is `./sitting`). When the player says yes to a debate's
 * invitation, the meetings engine puts `debate-accepted` on the record and
 * the director stages the `debate-sitting` scene from it. This source finds
 * the debate that record is about, names the moderator who asks, the outlet
 * that hosts it and the tie, and holds the debate with the answers the
 * sitting collected (`answerDebate`): the other candidates answer from their
 * own positions at that moment. Everything else is the loop's.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { ballot } from "../core2/modules/elections";
import {
  answerDebate,
  debatesIn,
  type DebateRow,
} from "../core2/modules/meetings";
import type { InterviewAnswer } from "../core2/modules/press";
import sittings from "./data/sittings.json" with { type: "json" };
import type { Facts, SittingRow, SittingSource } from "./sitting";
import { outletFact, tieBetween } from "./sitting-ties";

const KIND = "debate";
/** The record a debate's holding writes (`kinds.debate.published`). */
const PUBLISHED = sittings.kinds.debate.published;

/** The facts any line of the sitting may use: the debate, the outlet, the tie. */
function tieFacts(
  core: Readonly<CoreState>,
  row: DebateRow,
  candidateId: PersonId,
  moderatorId: PersonId,
): Facts {
  return {
    debate: { text: "yes", sourceRecordIds: [row.id] },
    ...tieBetween(core, candidateId, moderatorId),
    ...outletFact(core, row.outletId, row.id),
  };
}

/** The debate as the loop plays it: the candidate's own filing is their stand. */
function asSitting(
  core: Readonly<CoreState>,
  row: DebateRow,
  candidateId: PersonId,
  moderatorId: PersonId,
): SittingRow {
  const filing = ballot(coreAPI(core as CoreState), row.contestId).find(
    (entry) => entry.personId === candidateId,
  );
  return {
    kind: KIND,
    id: row.id,
    candidateId,
    askerId: moderatorId,
    filingId: filing?.id ?? null,
    contestId: row.contestId,
    questions: row.questions,
    ties: tieFacts(core, row, candidateId, moderatorId),
    finish: (state: CoreState, answers: readonly InterviewAnswer[]) => {
      const held = answerDebate(coreAPI(state), row.id, answers);
      return { id: held.id, recordIds: [`${PUBLISHED}:${held.id}`] };
    },
  };
}

export const debateSource: SittingSource = {
  kind: KIND,
  find(core, playerId, askerId, cause) {
    const row = debatesIn(
      coreAPI(core as CoreState),
      cause.facts.contestId ?? "",
    ).find((entry) => entry.id === cause.facts.debateId);
    return row?.status === "invited" &&
      cause.facts.invitedId === playerId &&
      cause.facts.reporterId === askerId
      ? asSitting(core, row, playerId, askerId)
      : null;
  },
};
