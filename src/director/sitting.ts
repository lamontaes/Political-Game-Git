/**
 * The sitting (owner, Oct 26-29: interviews are scenes). A candidate who said
 * yes to an asker (a reporter's interview, a debate's moderator) sits for it
 * in the conversation engine: the asker puts each of the sitting's own
 * questions as a line, the player picks how to answer each (plainly, with a
 * further fact from their record, by turning it back on a rival, or briefly;
 * the lie where their record allows one; or says nothing), and when the last
 * question is answered the engine that made the sitting publishes it with
 * exactly those moves.
 *
 * This file is the loop and knows no kind of sitting. A kind brings a source
 * (`SittingSource`, one per kind: `./interview-sitting`, `./debate-sitting`): how to find the
 * sitting a talk is the occasion of, who asks, which questions, and how to
 * publish. Its settings (the record it stages from, the bank subjects) are a
 * row of `data/sittings.json`.
 *
 * Nothing is typed here. Every line is a piece of the conversation bank
 * (`data/english/parts/conversation.json`), and a piece is said only when the
 * record holds the fact it needs: a vote to stand on, a rival with a stand of
 * their own. What the platform the player filed says is their stand; the
 * sitting never answers for them. A question the asker cannot put in words is
 * left unanswered, and only then does the filed platform stand in.
 */
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { ballot } from "../core2/modules/elections";
import {
  lastVoteOn,
  platformAnswers,
  type InterviewAnswer,
  type InterviewMove,
} from "../core2/modules/press";
import {
  wordConversationMove,
  type Fact,
  type Said,
} from "../english/conversation-words";
import { questionAbout, questionTo } from "../english/question-names";
import rulesFile from "./data/sittings.json" with { type: "json" };
import type {
  Conversation,
  ConversationChoice,
  ConversationData,
} from "./conversation";
import { debateSource } from "./debate-sitting";
import { interviewSource } from "./interview-sitting";
import type { Moment } from "./types";

const zero = P.zero;
const one = P.one;

/** The settings every kind of sitting shares, and a row for each kind. */
const RULES = rulesFile as unknown as {
  moves: readonly InterviewMove[];
  lie: InterviewMove;
  declined: string;
  stages: { only: string; first: string; next: string; last: string };
  order: {
    carryOn: readonly InterviewMove[];
    keepShort: readonly InterviewMove[];
  };
  kinds: Readonly<
    Record<
      string,
      {
        stagedBy: string;
        published: string;
        subjects: {
          open: string;
          question: string;
          /** The bank the player's answers and the lie come from. */
          answers: string;
          close: string;
          takePrefix: string;
        };
      }
    >
  >;
};

export type Facts = Record<string, Fact>;

/** A sitting waiting for the player, as its kind gives it to the loop. */
export interface SittingRow {
  /** The row of `data/sittings.json` this sitting follows (`interview`, `debate`). */
  readonly kind: string;
  /** The sitting's record: the interview's or the debate's id. */
  readonly id: string;
  readonly candidateId: PersonId;
  /** Who puts the questions: the reporter, or the debate's moderator. */
  readonly askerId: PersonId;
  /** The candidate's filing, whose platform is their stand. */
  readonly filingId: string | null;
  /** The race, whose ballot holds the rivals a turned-back answer can name. */
  readonly contestId: string | null;
  /** The questions the sitting asks, in its own order. */
  readonly questions: readonly string[];
  /** Facts any line may use: the sitting's record, who hosts it, the tie. */
  readonly ties: Facts;
  /**
   * Publishes the sitting with the player's answers, one for each question.
   * Returns the id of the record it made and the ids of those it wrote.
   */
  finish(
    core: CoreState,
    answers: readonly InterviewAnswer[],
  ): { id: string; recordIds: readonly string[] };
}

/** One kind of sitting: how to find the one a talk is the occasion of. */
export interface SittingSource {
  readonly kind: string;
  /**
   * The sitting this talk is for: the moment it is the occasion of is the
   * record the kind stages from, the sitting has not been sat, and the asker
   * is the person the player talks to. Null for any other talk.
   */
  find(
    core: Readonly<CoreState>,
    playerId: PersonId,
    askerId: PersonId,
    cause: {
      id: string;
      kind: string;
      facts: Readonly<Record<string, string>>;
    },
  ): SittingRow | null;
}

/** The kinds of sitting there are, one source each. */
const SOURCES: readonly SittingSource[] = [interviewSource, debateSource];

/** The settings of a kind of sitting (its record and its bank subjects). */
export function settingsOf(kind: string) {
  const row = RULES.kinds[kind];
  if (!row) throw new Error(`No kind of sitting ${kind}`);
  return row;
}

/** What the asker asks and what each of the player's answers would store. */
interface Asking {
  question: string;
  /** The facts the question's lines are said with, each from a record. */
  facts: Facts;
  /** The answer each move stands for, where the record allows the move. */
  answers: Map<string, InterviewAnswer>;
  /** The rival a turned-back answer names, for the asker's reply. */
  rival?: Fact;
}

/** A sitting in progress: the sitting, where it has got to, and what was said. */
export interface Sitting {
  readonly row: SittingRow;
  /** The questions the asker can put in words, in the sitting's order. */
  readonly asking: readonly string[];
  /** Index of the question now put; `asking.length` once all are put. */
  at: number;
  /** What the player said, by question. */
  readonly said: Map<string, InterviewAnswer>;
  now?: Asking;
  /** How far the player's replies reach (above zero: carries a talk on). */
  readonly reach: number;
  /** The player said nothing to at least one question. */
  passed: boolean;
  /** The published record's id, once the sitting is over. */
  published?: string;
}

/**
 * The sitting a conversation with this person is for: the moment it is the
 * occasion of is a kind's record that the player said yes. Null for any other
 * talk.
 */
export function sittingFor(
  core: Readonly<CoreState>,
  playerId: PersonId,
  askerId: PersonId,
  occasion: Moment | undefined,
): SittingRow | null {
  if (!occasion) return null;
  const cause = core.durableLog.get(occasion.causeId);
  if (!cause) return null;
  for (const source of SOURCES) {
    if (cause.kind !== settingsOf(source.kind).stagedBy) continue;
    const row = source.find(core, playerId, askerId, {
      id: cause.id,
      kind: cause.kind,
      facts: (cause.facts ?? {}) as Readonly<Record<string, string>>,
    });
    if (row) return row;
  }
  return null;
}

/** A filing's stated stand on a question: nonzero, or null where its platform says nothing. */
function standOf(
  core: Readonly<CoreState>,
  filingId: string | null,
  question: string,
): number | null {
  const stated = platformAnswers(coreAPI(core as CoreState), filingId, [
    question,
  ])[zero]?.position;
  return stated === null || stated === undefined || stated === zero
    ? null
    : stated;
}

/**
 * The flags a question's lines are fitted by, from three signs: the player's
 * filed stand (null where the platform says nothing), their vote on the
 * question (zero for none) and a rival's stated stand (null for no rival
 * whose stand differs). A piece of the bank names the flags it needs, so a
 * line that claims a vote or a rival is said only where the record holds it.
 */
export function flagsOf(
  stand: number | null,
  voted: number,
  rival: number | null,
): readonly string[] {
  const flags = [
    stand === null
      ? "no-stand"
      : stand > zero
        ? "stance-for"
        : "stance-against",
  ];
  if (voted !== zero) {
    flags.push("vote", voted > zero ? "vote-for" : "vote-against");
    if (stand !== null)
      flags.push(Math.sign(stand) === voted ? "vote-same" : "vote-changed");
  }
  if (rival !== null) flags.push(rival > zero ? "rival-for" : "rival-against");
  return flags;
}

/** Everything one question of the sitting needs, from the records. */
function askingFor(
  core: Readonly<CoreState>,
  row: SittingRow,
  question: string,
): Asking | null {
  const about = questionAbout(question);
  if (!about) return null;
  const cited = [`question:${question}`, row.id];
  const facts: Facts = {
    ...row.ties,
    about: { text: about, sourceRecordIds: cited },
  };
  const to = questionTo(question);
  if (to) facts.to = { text: to, sourceRecordIds: cited };
  // Their stand is the platform they filed; where it says nothing they have
  // none to state, and the sitting never states one for them.
  const stand = standOf(core, row.filingId, question);
  const filed = row.filingId ?? row.id;
  // The vote of theirs on this question that a further fact stands on, or a
  // lie would contradict.
  const vote = lastVoteOn(
    coreAPI(core as CoreState),
    row.candidateId,
    question,
  );
  const voted = vote ? Math.sign(vote.position) : zero;
  // A rival on the same ballot whose filed stand differs from theirs: the
  // one furthest from it, the foil an asker reaches for.
  const rivals = row.contestId
    ? ballot(coreAPI(core as CoreState), row.contestId)
        .filter((filing) => filing.personId !== row.candidateId)
        .flatMap((filing) => {
          const theirs = standOf(core, filing.id, question);
          return theirs === null ||
            (stand !== null && Math.sign(theirs) === Math.sign(stand))
            ? []
            : [{ filing, theirs, apart: Math.abs(theirs - (stand ?? zero)) }];
        })
        .sort(
          (a, b) => b.apart - a.apart || a.filing.id.localeCompare(b.filing.id),
        )
    : [];
  const rival = rivals[zero];
  const other = rival
    ? core.people.get(rival.filing.personId as PersonId)
    : null;
  let named: Fact | undefined;
  if (rival && other) {
    named = {
      text: `${other.givenName} ${other.familyName}`,
      sourceRecordIds: [rival.filing.id, other.id],
    };
    facts.rival = named;
  }
  // The flags the pieces are fitted by, each citing the record it rests on.
  for (const key of flagsOf(stand, voted, rival && other ? rival.theirs : null))
    facts[key] = {
      text: "yes",
      sourceRecordIds: key.startsWith("rival")
        ? [rival!.filing.id]
        : key.startsWith("vote")
          ? [
              vote!.id,
              ...(key === "vote-same" || key === "vote-changed" ? [filed] : []),
            ]
          : [filed],
    };
  // What each move would store. A further fact is a vote, a turn needs a
  // rival, the lie contradicts a vote; plain and brief state the filed stand.
  const answers = new Map<string, InterviewAnswer>();
  const plain: InterviewMove = "plain";
  answers.set(plain, { question, position: stand, move: plain });
  const brief: InterviewMove = "brief";
  answers.set(brief, { question, position: stand, move: brief });
  if (vote && voted !== zero) {
    const further: InterviewMove = "further";
    answers.set(further, {
      question,
      position: stand ?? vote.position,
      move: further,
      recordId: vote.id,
    });
    answers.set(RULES.lie, {
      question,
      position: -vote.position,
      move: RULES.lie,
      recordId: vote.id,
    });
  }
  if (named) {
    const turn: InterviewMove = "turn";
    answers.set(turn, { question, position: stand, move: turn });
  }
  return { question, facts, answers, ...(named ? { rival: named } : {}) };
}

/** One line of the bank, in a speaker's voice, or null where no piece fits the facts. */
function word(
  core: Readonly<CoreState>,
  data: ConversationData,
  request: {
    speakerId: PersonId;
    subject: string;
    part: "open" | "ask" | "answers" | "lie" | "reply" | "leave";
    facts: Facts;
    momentKey: string;
    stage?: string;
    keys?: readonly string[];
  },
): Said | null {
  return wordConversationMove({
    seed: core.seed,
    subject: request.subject,
    part: request.part,
    speakerId: request.speakerId,
    traits: core.people.get(request.speakerId)?.traits ?? {},
    facts: request.facts,
    momentKey: request.momentKey,
    ...(request.stage ? { stage: request.stage } : {}),
    ...(request.keys ? { keys: request.keys } : {}),
    words: data,
  });
}

/** The conversation's line for something said, with the pieces that said it. */
function lineOf(
  conversation: Conversation,
  speakerId: PersonId,
  subjectId: string,
  act: "ask" | "answer" | "lie" | "tell",
  said: Said,
): void {
  const { asks, afterPlain, ...rest } = said;
  void asks;
  void afterPlain;
  conversation.lines.push({
    speakerId,
    subjectId,
    kind: subjectId.split(":")[zero]!,
    act,
    ...rest,
  });
}

/** Opens the sitting: the asker's word, then the first question. */
export function openSitting(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  row: SittingRow,
  reach: number,
): Conversation {
  const subjects = settingsOf(row.kind).subjects;
  conversation.sitting = {
    row,
    asking: row.questions.filter((question) => questionAbout(question)),
    at: zero,
    said: new Map(),
    reach,
    passed: false,
  };
  const open = word(core, data, {
    speakerId: conversation.otherId,
    subject: subjects.open,
    part: "open",
    facts: row.ties,
    momentKey: `${row.id}:open`,
  });
  if (open)
    lineOf(
      conversation,
      conversation.otherId,
      `${subjects.open}:${row.id}`,
      "tell",
      open,
    );
  return put(core as CoreState, conversation, data);
}

/** Which stage of the sitting a question is put at: the only one, the first, the last or one between. */
function stageOf(sitting: Sitting): string {
  const last = sitting.at === sitting.asking.length - one;
  if (sitting.asking.length === one) return RULES.stages.only;
  if (sitting.at === zero) return RULES.stages.first;
  return last ? RULES.stages.last : RULES.stages.next;
}

/**
 * Puts the next question, with the four answers the record allows and the lie
 * where it allows one; once every question is put, ends the sitting.
 */
function put(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
): Conversation {
  const sitting = conversation.sitting!;
  const { row } = sitting;
  const subjects = settingsOf(row.kind).subjects;
  const { playerId, otherId } = conversation;
  conversation.choices = [];
  conversation.lies = [];
  while (sitting.at < sitting.asking.length) {
    const question = sitting.asking[sitting.at]!;
    const asking = askingFor(core, row, question);
    const subjectId = `${subjects.question}:${row.id}:${sitting.at}`;
    const line =
      asking &&
      word(core, data, {
        speakerId: otherId,
        subject: subjects.question,
        part: "ask",
        facts: asking.facts,
        momentKey: `${row.id}:${sitting.at}:ask`,
        stage: stageOf(sitting),
      });
    if (!asking || !line) {
      // The asker cannot put it in words: it stays unanswered, and the
      // filed platform stands in for it when the sitting is published.
      sitting.at += one;
      continue;
    }
    const answered = (key: string, part: "answers" | "lie") =>
      asking.answers.has(key)
        ? word(core, data, {
            speakerId: playerId,
            subject: subjects.answers,
            part,
            facts: asking.facts,
            momentKey: `${row.id}:${sitting.at}:${key}`,
            ...(part === "answers" ? { keys: [key] } : {}),
          })
        : null;
    const choiceFor = (key: string, said: Said): ConversationChoice => ({
      key: `${sitting.at}:${key}`,
      move: key,
      text: said.text,
      answers: subjectId,
      lie: key === RULES.lie,
      sourceRecordIds: said.sourceRecordIds,
      wording: said.wording,
    });
    const offered = RULES.moves.flatMap((move) => {
      const said = answered(move, "answers");
      return said ? [choiceFor(move, said)] : [];
    });
    if (!offered.length) {
      sitting.at += one;
      continue;
    }
    // Ranked by the player's traits: someone who carries a talk on sees the
    // answers that say more first, someone who keeps it short the brief ones.
    const order =
      sitting.reach >= zero ? RULES.order.carryOn : RULES.order.keepShort;
    conversation.choices = offered.sort(
      (a, b) =>
        order.indexOf(a.move as InterviewMove) -
        order.indexOf(b.move as InterviewMove),
    );
    const lie = answered(RULES.lie, "lie");
    conversation.lies = lie ? [choiceFor(RULES.lie, lie)] : [];
    lineOf(conversation, otherId, subjectId, "ask", line);
    sitting.now = asking;
    return conversation;
  }
  return finish(core, conversation, data);
}

/** The asker takes an answer in (or the silence), in words written for the move. */
function take(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
  move: string,
): void {
  const sitting = conversation.sitting!;
  const { row } = sitting;
  const subjects = settingsOf(row.kind).subjects;
  const said = word(core, data, {
    speakerId: conversation.otherId,
    subject: `${subjects.takePrefix}${move}`,
    part: "reply",
    facts: {
      ...row.ties,
      ...(sitting.now?.rival ? { rival: sitting.now.rival } : {}),
    },
    momentKey: `${row.id}:${sitting.at}:${move}:take`,
  });
  if (said)
    lineOf(
      conversation,
      conversation.otherId,
      `${subjects.question}:${row.id}:${sitting.at}`,
      "tell",
      said,
    );
}

/** Moves on from the question just answered. */
function next(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
): Conversation {
  const sitting = conversation.sitting!;
  sitting.at += one;
  delete sitting.now;
  return put(core, conversation, data);
}

/** The player picks a way to answer the question put. */
export function saySitting(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
  choiceKey: string,
): Conversation {
  const sitting = conversation.sitting!;
  const choice =
    conversation.choices.find((entry) => entry.key === choiceKey) ??
    conversation.lies.find((entry) => entry.key === choiceKey);
  const answer = sitting.now?.answers.get(choice?.move ?? "");
  if (!choice || !answer) throw new Error(`Not an offered line: ${choiceKey}`);
  conversation.lines.push({
    speakerId: conversation.playerId,
    subjectId: choice.answers,
    kind: settingsOf(sitting.row.kind).subjects.question,
    act: choice.lie ? "lie" : "answer",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
    ...(choice.wording ? { wording: choice.wording } : {}),
  });
  sitting.said.set(answer.question, answer);
  take(core, conversation, data, choice.move);
  return next(core, conversation, data);
}

/** The player says nothing to the question put: it is declined, and the asker notes it. */
export function declineInSitting(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
): Conversation {
  const sitting = conversation.sitting!;
  if (!sitting.now) return conversation;
  const plain: InterviewMove = "plain";
  sitting.said.set(sitting.now.question, {
    question: sitting.now.question,
    position: null,
    move: plain,
  });
  sitting.passed = true;
  take(core, conversation, data, RULES.declined);
  return next(core, conversation, data);
}

/**
 * Every question is put: the engine that made the sitting publishes it with
 * what the player said. A question left unanswered (one the asker could not
 * put in words) takes the filed platform's answer, and only that one.
 */
function finish(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
): Conversation {
  const sitting = conversation.sitting!;
  const { row } = sitting;
  const subjects = settingsOf(row.kind).subjects;
  const filed = platformAnswers(coreAPI(core), row.filingId, row.questions);
  const answers = row.questions.map(
    (question) =>
      sitting.said.get(question) ??
      filed.find((entry) => entry.question === question)!,
  );
  const done = row.finish(core, answers);
  sitting.published = done.id;
  conversation.recorded.push(...done.recordIds);
  const close = word(core, data, {
    speakerId: conversation.otherId,
    subject: subjects.close,
    part: "leave",
    facts: {
      ...row.ties,
      ...(sitting.passed
        ? { passed: { text: "yes", sourceRecordIds: [row.id] } }
        : {}),
    },
    momentKey: `${row.id}:close`,
  });
  if (close)
    lineOf(
      conversation,
      conversation.otherId,
      `${subjects.close}:${row.id}`,
      "tell",
      close,
    );
  return conversation;
}
