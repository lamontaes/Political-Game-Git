/**
 * A press interview as a conversation (SG-PEOPLE-press-interview-conversation).
 * The reporter asks each question of an invited interview as a line from the
 * mined interview bank (`data/english/parts/interview.json`); the player
 * answers each with one of the conversation's moves, each worded from the
 * bank's official parts: plainly (a commitment), with a further fact from the
 * record (the vote they cast, said only where there is one), turning it back
 * on a rival (only where the race has one), briefly, or the lie (the vote the
 * record contradicts). Declining is its own choice. The positions are the
 * candidate's own recorded standing; the move is the player's choice, and
 * `finishInterviewTalk` passes it to the press engine's `answerInterview`.
 * Nothing here is written by hand: a move with no mined wording is not offered.
 */
import bankJson from "../../data/english/parts/interview.json" with { type: "json" };
import { heldByGrades } from "../english/english-grades";
import { questionName } from "./question-names";
import { votesOf } from "../core2/modules/record";
import { renderLine, type Fact, type Variant } from "./render";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type FilingRow,
} from "../core2/modules/elections";
import {
  PRESS_MODULE_ID,
  answerInterview,
  leakToReporter,
  candidateAnswers,
  speakerOf,
  standingOn,
  type InterviewAnswer,
  type InterviewMove,
  type InterviewRow,
} from "../core2/modules/press";
import type { CoreAPI, CoreState } from "../core2/types";

interface MinedPart {
  key: string;
  text: string;
  shippable: boolean;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
}
const PARTS = (bankJson as unknown as { parts: MinedPart[] }).parts;
const VERSION = "interview-talk/1";

/** The bank's wordings for one role, as variants; `slot` is the one slot the line may fill. */
function wordings(
  subject: "reporter" | "official",
  role: string,
  accept: (part: MinedPart) => boolean = () => true,
): Variant[] {
  return PARTS.filter(
    (part) =>
      part.shippable &&
      !heldByGrades(part.key) &&
      part.uses.some((use) => use.subject === subject && use.role === role) &&
      accept(part),
  ).map((part) => ({
    key: part.key,
    text: part.text.replace(
      /\{(\w+)\}/g,
      (_all, slot: string) => `{{${slot}}}`,
    ),
  }));
}
const slotsOf = (part: MinedPart) =>
  [...part.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
const needs = (part: MinedPart) =>
  part.uses.flatMap((use) => use.requiresFacts ?? []);

export interface TalkChoice {
  readonly move: InterviewMove | "decline" | "leak";
  /** For a leak: the rival whose recorded vote on the question is passed to the reporter. */
  readonly leakAbout?: string;
  readonly text: string;
  /** The position it states; null when declining. */
  readonly position: number | null;
  /** The vote or interview the wording rests on, by record id. */
  readonly sourceRecordIds: readonly string[];
  readonly variantKey: string;
}
export interface TalkStep {
  readonly question: string;
  readonly reporterLine: string;
  readonly reporterVariantKey: string;
  readonly choices: readonly TalkChoice[];
}
export interface InterviewTalk {
  readonly interviewId: string;
  readonly opening: string | null;
  readonly steps: readonly TalkStep[];
  readonly closing: string | null;
}

export function openInterviewTalk(
  api: CoreAPI,
  interviewId: string,
): InterviewTalk {
  const core = api.state as CoreState;
  const row = api
    .moduleState(PRESS_MODULE_ID)
    .table("interviews")
    .get(interviewId) as unknown as InterviewRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No interview waiting: ${interviewId}`);
  const filing = row.filingId
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(row.filingId) as unknown as FilingRow)
    : null;
  const rival =
    filing && row.contestId
      ? ballot(api, row.contestId).some(
          (f) => f.status === "on-ballot" && f.personId !== row.candidateId,
        )
      : false;
  const say = (
    holderId: string,
    part: string,
    variants: readonly Variant[],
    facts: Record<string, Fact>,
    salt: string,
  ) =>
    renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId,
      bankKey: `press-interview:${part}`,
      version: VERSION,
      variants,
      facts,
      momentKey: `${row.id}:${salt}`,
      fallbackSourceId: row.id,
    });
  const reporterId = row.reporterId ?? row.candidateId;
  const none = {} as Record<string, Fact>;
  const opening = say(
    reporterId,
    "open",
    wordings("reporter", "open"),
    none,
    "open",
  );
  const steps: TalkStep[] = [];
  for (const question of row.questions) {
    // A question the catalog does not name has no wording to ask it by.
    const issue = questionName(question);
    if (!issue) continue;
    const issueFact: Record<string, Fact> = {
      issue: { text: issue, sourceRecordIds: [row.id] },
    };
    const asked = say(
      reporterId,
      "issue",
      wordings(
        "reporter",
        "issue",
        (p) => slotsOf(p).length === 1 && slotsOf(p)[0] === "issue",
      ),
      issueFact,
      `ask:${question}`,
    );
    if (!asked) continue;
    const truth = standingOn(api, speakerOf(api, row), question);
    const position = Math.max(-1, Math.min(1, truth.position));
    const recordIds = truth.recordId ? [truth.recordId, row.id] : [row.id];
    const choices: TalkChoice[] = [];
    const offer = (
      move: TalkChoice["move"],
      role: string,
      accept: (p: MinedPart) => boolean,
      at: number | null,
      ids: readonly string[],
      leakAbout?: string,
    ) => {
      const line = say(
        row.candidateId,
        `${role}:${move}`,
        wordings("official", role, accept),
        issueFact,
        `${move}:${question}`,
      );
      if (line)
        choices.push({
          move,
          text: line.text,
          position: at,
          sourceRecordIds: ids,
          variantKey: line.variantKey ?? "",
          ...(leakAbout ? { leakAbout } : {}),
        });
    };
    const plain = (p: MinedPart) => !slotsOf(p).length && !needs(p).length;
    const words = (p: MinedPart) => p.text.split(/\s+/).length;
    // Plainly: a commitment of a few words; briefly: the shortest the bank has.
    offer("plain", "commit", (p) => plain(p) && words(p) > 2, position, [
      row.id,
    ]);
    offer("brief", "commit", (p) => plain(p) && words(p) <= 2, position, [
      row.id,
    ]);
    if (truth.from === "vote") {
      const said = position > 0 ? "voted-yes" : "voted-no";
      const against = position > 0 ? "voted-no" : "voted-yes";
      // A further fact: the vote they cast, said only because the record holds it.
      offer(
        "further",
        "record",
        (p) => needs(p).length === 1 && needs(p)[0] === said,
        position,
        recordIds,
      );
      // The lie: the vote they did not cast, a position the record contradicts.
      offer(
        "lie",
        "record",
        (p) => needs(p).length === 1 && needs(p)[0] === against,
        position === 0 ? 1 : -position,
        recordIds,
      );
    }
    if (rival)
      offer("turn", "opponent", (p) => slotsOf(p).length === 0, position, [
        row.id,
      ]);
    // A leak: the rival's recorded vote on this question, passed to the
    // reporter off the record. It is offered only when the bank has a
    // wording for it, and none is mined yet.
    // stopgapId: SG-PEOPLE-press-leak-wording
    api.stopgap("SG-PEOPLE-press-leak-wording");
    const rivalVote = rivalVoteOn(api, row, question);
    if (rivalVote)
      offer(
        "leak",
        "leak",
        () => true,
        position,
        [rivalVote.id, row.id],
        rivalVote.personId,
      );
    // Declining: the wordings that refuse the question outright.
    offer(
      "decline",
      "deflect",
      (p) =>
        !slotsOf(p).length &&
        /^I(?:'m not going to| don't have anything| haven't made)/.test(p.text),
      null,
      [row.id],
    );
    steps.push({
      question,
      reporterLine: asked.text,
      reporterVariantKey: asked.variantKey ?? "",
      choices,
    });
  }
  const closing = say(
    row.candidateId,
    "close",
    wordings("official", "close"),
    none,
    "close",
  );
  return {
    interviewId,
    opening: opening?.text ?? null,
    steps,
    closing: closing?.text ?? null,
  };
}

/** The player's picks, one move per question, passed to the press engine. */
export function finishInterviewTalk(
  api: CoreAPI,
  talk: InterviewTalk,
  picks: Readonly<Record<string, InterviewMove | "decline">>,
): InterviewRow {
  const row = api
    .moduleState(PRESS_MODULE_ID)
    .table("interviews")
    .get(talk.interviewId) as unknown as InterviewRow;
  const answers: InterviewAnswer[] = talk.steps.map((step) => {
    const choice =
      step.choices.find((c) => c.move === picks[step.question]) ??
      step.choices.find((c) => c.move === "plain") ??
      step.choices[0];
    if (choice?.move === "leak" && choice.leakAbout && row.reporterId) {
      leakToReporter(api, {
        leakerId: row.candidateId,
        reporterId: row.reporterId,
        aboutId: choice.leakAbout,
        question: step.question,
      });
      return {
        question: step.question,
        position: choice.position,
        move: "plain" as InterviewMove,
      };
    }
    if (!choice || choice.move === "decline" || choice.position === null)
      return { question: step.question, position: null, move: "plain" };
    return {
      question: step.question,
      position: choice.position,
      move: choice.move as InterviewMove,
    };
  });
  // A question the conversation did not ask is answered from the candidate's standing.
  const asked = new Set(talk.steps.map((step) => step.question));
  answers.push(
    ...candidateAnswers(
      api,
      row.questions.filter((q) => !asked.has(q)),
      speakerOf(api, row),
    ),
  );
  return answerInterview(api, talk.interviewId, answers);
}

/** A rival's latest recorded vote on a question, in the same race. */
function rivalVoteOn(api: CoreAPI, row: InterviewRow, question: string) {
  if (!row.contestId) return null;
  for (const f of ballot(api, row.contestId))
    if (f.status === "on-ballot" && f.personId !== row.candidateId) {
      const vote = votesOf(api, f.personId)
        .filter((v) => v.stance.question === question)
        .at(-1);
      if (vote) return vote;
    }
  return null;
}
