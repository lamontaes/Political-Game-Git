/**
 * A reporter's interview with a candidate (BOARD, Oct 12: the words for
 * campaign interviews). GOV arranges the interview and passes its records as
 * plain data: the outlet, the office, the race's issues (each with what it
 * would change) and the agreed terms. The reporter asks about each issue, or
 * about the candidate's own recorded stance on it where there is one; the
 * candidate answers for, against, turns to another issue, or declines. An
 * answer on the record is a public record (`press.answered`), so the news
 * carries it to readers and their views can move.
 */
import { P } from "../core2/parameters";
import { stancesOf } from "../core2/modules/views";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import interviewJson from "./data/interview.json" with { type: "json" };
import { renderLine, type Fact, type Variant } from "./render";
import { markWordsStopgap } from "./stopgaps";

interface InterviewWords {
  version: string;
  stopgapId: string;
  greet: Variant[];
  terms: Variant[];
  ask: Variant[];
  askRecord: Variant[];
  answers: Readonly<
    Record<"support" | "oppose" | "redirect" | "decline", Variant[]>
  >;
  close: Variant[];
}
export const INTERVIEW_WORDS = interviewJson as unknown as InterviewWords;
export const PRESS_ANSWERED = "press.answered";

/** One issue of the race, from GOV's records. */
export interface InterviewIssue {
  topic: string;
  /** The issue as the records name it ("the downtown park"). */
  label: string;
  /** What it would change, as a verb phrase ("build the park"). */
  change: string;
  /** The change's key, as stances record it. */
  desiredChange: string;
  sourceIds: readonly string[];
}

export interface InterviewSetup {
  id: string;
  reporterId?: PersonId;
  outlet: { id: string; name: string };
  contest: { id: string; title: string };
  /** The jurisdiction the race is for, as its records name it. */
  place: { id: string; name: string };
  issues: readonly InterviewIssue[];
  terms: "on-record" | "on-background" | "off-record";
}

export type InterviewAnswer = "support" | "oppose" | "redirect" | "decline";

export interface Interview {
  playerId: PersonId;
  setup: InterviewSetup;
  /** The issue now asked about, by index; past the end when done. */
  asking: number;
  lines: {
    speaker: "reporter" | "player";
    text: string;
    sourceRecordIds: readonly string[];
  }[];
  choices: {
    key: string;
    answer: InterviewAnswer;
    text: string;
    sourceRecordIds: readonly string[];
  }[];
  /** The answers given, each an event id when on the record. */
  answered: { topic: string; answer: InterviewAnswer; eventId?: string }[];
}

function speak(
  core: Readonly<CoreState>,
  interview: Interview,
  speaker: "reporter" | "player",
  part: string,
  variants: readonly Variant[] | undefined,
  facts: Record<string, Fact>,
  stage?: string,
) {
  markWordsStopgap(INTERVIEW_WORDS.stopgapId);
  return renderLine({
    seed: core.seed,
    surface: "dialogue",
    holderId:
      speaker === "reporter"
        ? (interview.setup.reporterId ?? interview.playerId)
        : interview.playerId,
    bankKey: `interview:${part}`,
    version: INTERVIEW_WORDS.version,
    variants,
    facts,
    momentKey: `${interview.setup.id}:${interview.lines.length}:${part}`,
    ...(stage ? { stage } : {}),
    fallbackSourceId: interview.setup.id,
  });
}

const issueFacts = (setup: InterviewSetup, issue: InterviewIssue) => {
  const ids = [setup.contest.id, ...issue.sourceIds];
  return {
    issue: { text: issue.label, sourceRecordIds: ids },
    change: { text: issue.change, sourceRecordIds: ids },
    place: { text: setup.place.name, sourceRecordIds: [setup.place.id] },
  };
};

/** The reporter's question on the current issue, and the candidate's answers to it. */
function ask(core: Readonly<CoreState>, interview: Interview): void {
  const { setup } = interview;
  interview.choices = [];
  const issue = setup.issues[interview.asking];
  if (!issue) {
    const done = speak(
      core,
      interview,
      "reporter",
      "close",
      INTERVIEW_WORDS.close,
      {},
    );
    if (done) interview.lines.push({ speaker: "reporter", ...done });
    return;
  }
  const facts = issueFacts(setup, issue);
  // The candidate's own recorded stance on this issue, where there is one.
  const stance = stancesOf(coreAPI(core as CoreState), interview.playerId).find(
    (row) =>
      row.topic === issue.topic &&
      row.desiredChange === issue.desiredChange &&
      row.strength > P.zero,
  );
  const question = stance
    ? speak(
        core,
        interview,
        "reporter",
        "ask-record",
        INTERVIEW_WORDS.askRecord,
        {
          ...facts,
          change: {
            text: issue.change,
            sourceRecordIds: [
              stance.id,
              ...stance.causes.map((row) => row.eventId),
            ],
          },
        },
      )
    : speak(core, interview, "reporter", "ask", INTERVIEW_WORDS.ask, facts);
  if (question) interview.lines.push({ speaker: "reporter", ...question });
  const other = setup.issues.find((row) => row.topic !== issue.topic);
  for (const answer of ["support", "oppose", "redirect", "decline"] as const) {
    if (answer === "redirect" && !other) continue;
    const line = speak(
      core,
      interview,
      "player",
      `answer-${answer}`,
      INTERVIEW_WORDS.answers[answer],
      {
        ...facts,
        ...(other
          ? {
              "other-issue": {
                text: other.label,
                sourceRecordIds: [setup.contest.id, ...other.sourceIds],
              },
            }
          : {}),
      },
    );
    if (line)
      interview.choices.push({
        key: `${answer}:${issue.topic}`,
        answer,
        text: line.text,
        sourceRecordIds: line.sourceRecordIds,
      });
  }
}

export function openInterview(
  core: Readonly<CoreState>,
  playerId: PersonId,
  setup: InterviewSetup,
): Interview {
  const interview: Interview = {
    playerId,
    setup,
    asking: P.zero,
    lines: [],
    choices: [],
    answered: [],
  };
  const office = {
    outlet: { text: setup.outlet.name, sourceRecordIds: [setup.outlet.id] },
    office: { text: setup.contest.title, sourceRecordIds: [setup.contest.id] },
  };
  const greet = speak(
    core,
    interview,
    "reporter",
    "greet",
    INTERVIEW_WORDS.greet,
    office,
  );
  if (greet) interview.lines.push({ speaker: "reporter", ...greet });
  const terms = speak(
    core,
    interview,
    "reporter",
    "terms",
    INTERVIEW_WORDS.terms,
    office,
    setup.terms,
  );
  if (terms) interview.lines.push({ speaker: "reporter", ...terms });
  ask(core, interview);
  return interview;
}

/** The candidate answers; on the record, the answer becomes a public record. */
export function answerInterview(
  core: CoreState,
  interview: Interview,
  key: string,
): Interview {
  const choice = interview.choices.find((row) => row.key === key);
  if (!choice) throw new Error(`Not an offered answer: ${key}`);
  const issue = interview.setup.issues[interview.asking]!;
  interview.lines.push({
    speaker: "player",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const taking = choice.answer === "support" || choice.answer === "oppose";
  let eventId: string | undefined;
  if (interview.setup.terms === "on-record" && taking) {
    eventId = `${PRESS_ANSWERED}:${interview.setup.id}:${issue.topic}`;
    const player = core.people.get(interview.playerId)!;
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: PRESS_ANSWERED,
      personIds: [interview.playerId],
      ...(interview.setup.reporterId
        ? { witnessIds: [interview.setup.reporterId] }
        : {}),
      placeId: interview.setup.place.id ?? player.placeId,
      publicRecord: true,
      news: true,
      topic: issue.topic,
      // A stance against is recorded as wanting the change not made.
      desiredChange:
        choice.answer === "support"
          ? issue.desiredChange
          : `not:${issue.desiredChange}`,
      source: {
        tag: "SOURCED",
        citation: `${interview.setup.outlet.name} interview, on the record.`,
        asOf: core.date,
      },
      facts: {
        outletId: interview.setup.outlet.id,
        contestId: interview.setup.contest.id,
        answer: choice.answer,
        quote: choice.text,
      },
    });
  }
  interview.answered.push({
    topic: issue.topic,
    answer: choice.answer,
    ...(eventId ? { eventId } : {}),
  });
  interview.asking += P.one;
  ask(core, interview);
  return interview;
}
