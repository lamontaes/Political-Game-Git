/**
 * An interview told as a conversation: the reporter opens, asks each question
 * the record put in play, and the candidate answers in the move they chose;
 * the reporter closes. The questions and answers are the interview row's
 * (`src/core2/modules/press.ts`); every line is worded from the mined interview
 * bank and cites the interview, the vote or the outlet it rests on.
 */
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { votesOf } from "../core2/modules/record";
import type { InterviewMove, InterviewRow } from "../core2/modules/press";
import type { CoreState } from "../core2/types";
import {
  interviewWordsFromBank,
  type InterviewWords,
} from "./mined/interview-bank";
import { storyTopicName } from "./question-names";
import { renderLine, type Fact } from "./render";

export const INTERVIEW_WORDS: InterviewWords = interviewWordsFromBank();

export interface InterviewLine {
  speaker: "reporter" | "candidate";
  text: string;
  sourceRecordIds: readonly string[];
  variantKey?: string;
}

/** Which kind of mined answer each move of the conversation is. */
const ROLE: Readonly<Record<InterviewMove, string>> = {
  plain: "commit",
  further: "record",
  turn: "opponent",
  brief: "commit",
  lie: "commit",
};

export function interviewLines(
  core: Readonly<CoreState>,
  row: InterviewRow,
  words: InterviewWords = INTERVIEW_WORDS,
): InterviewLine[] {
  const api = coreAPI(core as CoreState);
  const lines: InterviewLine[] = [];
  const reporter = row.reporterId ?? row.outletId;
  const say = (
    speaker: InterviewLine["speaker"],
    part: string,
    variants: InterviewWords["open"],
    facts: Record<string, Fact>,
  ) => {
    const line = renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId: speaker === "reporter" ? reporter : row.candidateId,
      bankKey: `interview:${part}`,
      version: words.version,
      variants,
      facts,
      momentKey: `${row.id}:${lines.length}:${part}`,
      fallbackSourceId: row.id,
    });
    if (line)
      lines.push({
        speaker,
        text: line.text,
        sourceRecordIds: line.sourceRecordIds,
        ...(line.variantKey ? { variantKey: line.variantKey } : {}),
      });
  };
  const own = [row.id, row.outletId];
  say("reporter", "open", words.open, {
    outlet: { text: row.outletId, sourceRecordIds: own },
  });
  const votes = votesOf(api, row.candidateId);
  for (const question of row.questions) {
    const name = storyTopicName(question)?.toLowerCase();
    if (!name) continue;
    const answer = row.answers.find((a) => a.question === question);
    const issue: Fact = { text: name, sourceRecordIds: [row.id] };
    say("reporter", "ask", words.ask, { issue });
    if (!answer) continue;
    // A candidate who declined the question deflects; otherwise the move
    // they chose picks the answer, and a further fact rests on the vote.
    const declined = answer.position === null;
    const vote = answer.recordId
      ? votes.find((v) => v.id === answer.recordId)
      : undefined;
    // A further fact needs the vote it rests on; without one it is a plain answer.
    const move = answer.move ?? "plain";
    const role = declined
      ? "deflect"
      : move === "further" && !vote
        ? ROLE.plain
        : ROLE[move];
    const facts = new Set<string>(
      vote ? [vote.stance.position >= P.zero ? "voted-yes" : "voted-no"] : [],
    );
    say("candidate", role, words.answer[role]!(facts), {
      issue: {
        ...issue,
        sourceRecordIds: [row.id, ...(vote ? [vote.id] : [])],
      },
      topic: issue,
    });
  }
  if (row.answers.length) say("candidate", "close", words.close, {});
  return lines;
}
