/**
 * The interview's part of the sitting (owner, Oct 26-29: interviews are
 * scenes; the loop is `./sitting`). When the player says yes to an outlet's
 * invitation, the press engine puts `interview-accepted` on the record and
 * the director stages the `interview-sitting` scene from it. This source
 * finds the interview that record is about, names the reporter who asks, the
 * outlet and the tie, and publishes the interview with the answers the
 * sitting collected (`answerInterview`). Everything else is the loop's.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  answerInterview,
  interviewsFor,
  type InterviewAnswer,
  type InterviewRow,
} from "../core2/modules/press";
import sittings from "./data/sittings.json" with { type: "json" };
import type { Facts, SittingRow, SittingSource } from "./sitting";
import { outletFact, tieBetween } from "./sitting-ties";

const KIND = "interview";
/** The record an interview's end writes (`kinds.interview.published`). */
const PUBLISHED = sittings.kinds.interview.published;

/** The facts any line of the sitting may use: the interview, the outlet, the tie. */
function tieFacts(core: Readonly<CoreState>, row: InterviewRow): Facts {
  return {
    interview: { text: "yes", sourceRecordIds: [row.id] },
    ...tieBetween(
      core,
      row.candidateId as PersonId,
      row.reporterId as PersonId,
    ),
    ...outletFact(core, row.outletId, row.id),
  };
}

/** The interview as the loop plays it. */
function asSitting(core: Readonly<CoreState>, row: InterviewRow): SittingRow {
  return {
    kind: KIND,
    id: row.id,
    candidateId: row.candidateId as PersonId,
    askerId: row.reporterId as PersonId,
    filingId: row.filingId,
    contestId: row.contestId,
    questions: row.questions,
    ties: tieFacts(core, row),
    finish: (state: CoreState, answers: readonly InterviewAnswer[]) => {
      const done = answerInterview(coreAPI(state), row.id, answers);
      return {
        id: done.id,
        recordIds: [`${PUBLISHED}:${row.id}`],
      };
    },
  };
}

export const interviewSource: SittingSource = {
  kind: KIND,
  find(core, playerId, askerId, cause) {
    const row = interviewsFor(coreAPI(core as CoreState), playerId).find(
      (entry) => entry.id === cause.facts.interviewId,
    );
    return row?.status === "invited" && row.reporterId === askerId
      ? asSitting(core, row)
      : null;
  },
};
