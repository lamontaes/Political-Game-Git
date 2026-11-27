import type { CoreAPI, CoreState, CoreEventInput } from "../types";
import { votesCast } from "./record";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./elections";
import type { ModuleCalendarWork } from "../module-calendar";
import { stanceReader } from "./campaigns";
import { ACCEPTING_MOVES, REFUSING_MOVES } from "../scene-replies";
import type { ModuleRow } from "../module-data";
import { lawChain } from "./laws";
import { SPEECH_MODULE_ID, deliverSpeech } from "./people";
import type {
  InterviewAnswer,
  InterviewMove,
  InterviewRow,
  OutletRow,
  Speaker,
} from "./press-base";
import {
  DISTRUST,
  INTERVIEW_ACCEPTED_EVENT,
  INTERVIEW_INVITED_EVENT,
  PRESS_MODULE_ID,
  arrange,
  arrangeWith,
  asSpeaker,
  contestOf,
  followCache,
  invitation,
  outletsHere,
  platformOf,
  record,
  servingTerms,
  standingOn,
  table,
} from "./press-base";
import { publish } from "./press-stories";

/** An officeholder as a speaker, or null for someone who holds no seat. */
export function officeholderSpeaker(
  api: CoreAPI,
  personId: string,
): Speaker | null {
  const term = servingTerms(api, personId)[0];
  return term ? { personId, party: term.party ?? null, filing: null } : null;
}

/**
 * The vote on a question that a person's record holds last: its id and the
 * way it went (the position, above zero for the measure), or null for none.
 * What a sitting's further fact stands on and its lie contradicts.
 */
export function lastVoteOn(
  api: CoreAPI,
  personId: string,
  question: string,
): { readonly id: string; readonly position: number } | null {
  const vote = votesCast(api.state as CoreState, personId)
    .filter((entry) => entry.stance.question === question)
    .at(-1);
  return vote ? { id: vote.id, position: vote.stance.position } : null;
}

/**
 * A candidate or an officeholder asks an outlet for an interview, at any
 * time. A candidate asks with their filing; an officeholder between races
 * with no filing. The outlet decides by its reads: a reporter with room this
 * week, and its interest (`outletInterest`: how newsworthy they are, its
 * editor's and owner's regard, its followers who know them) over its bar.
 * A refusal is a record like a yes. A yes comes with its questions, for the
 * one asked to answer (`answerInterview`).
 */
export function requestInterview(
  api: CoreAPI,
  input: {
    readonly outletId: string;
    readonly filingId?: string | null;
    readonly personId?: string;
  },
): InterviewRow {
  if (input.filingId)
    return arrange(api, input.filingId, input.outletId, "candidate");
  if (!input.personId)
    throw new Error("An interview needs a filing or a person");
  const speaker = officeholderSpeaker(api, input.personId) ?? {
    personId: input.personId,
    party: null,
    filing: null,
  };
  return arrangeWith(api, speaker, input.outletId, "candidate");
}

/**
 * Interviews offered to or arranged by a person, newest first; with a filing,
 * only that race's, read from its own index. The sort is by date, then id, so
 * the order is the same whichever index the rows come from.
 */
export function interviewsFor(
  api: CoreAPI,
  personId: string,
  filingId?: string,
): readonly InterviewRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (
    (filingId === undefined
      ? table(api, "interviews").query("byCandidate", [personId])
      : table(api, "interviews").query("byCandidateFiling", [
          personId,
          filingId,
        ])) as unknown as InterviewRow[]
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/**
 * Answer an arranged interview: a position on each question asked, or null
 * to decline it, each said with one of the conversation's moves (plain where
 * not given): plainly, with a further fact from the record, turning it back
 * on a rival, briefly, or the lie (a position the candidate's record
 * contradicts). The interview runs at once and the outlet prints it.
 */
export function answerInterview(
  api: CoreAPI,
  interviewId: string,
  answers: readonly InterviewAnswer[],
): InterviewRow {
  const row = table(api, "interviews").get(interviewId) as unknown as
    InterviewRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No interview waiting: ${interviewId}`);
  const speaker = speakerOf(api, row);
  const given = row.questions.map((question): InterviewAnswer => {
    const answer = answers.find((a) => a.question === question);
    const position =
      answer?.position === null || answer?.position === undefined
        ? null
        : Math.max(-1, Math.min(1, answer.position));
    const move: InterviewMove = answer?.move ?? "plain";
    // The record the answer rests on, or that it contradicts: the one the
    // answer names (a vote the sitting's further fact or lie is about), else
    // the vote their stand rests on.
    const truth = standingOn(api, speaker, question);
    return {
      question,
      position,
      move,
      recordId:
        answer?.recordId ?? (truth.from === "vote" ? truth.recordId : null),
    };
  });
  return publish(api, row, given);
}

/** Who an interview row is with: the filing's candidate, else the officeholder. */
function speakerOf(api: CoreAPI, row: InterviewRow): Speaker {
  if (row.filingId) {
    const filing = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(row.filingId) as unknown as FilingRow;
    return asSpeaker(filing);
  }
  return (
    officeholderSpeaker(api, row.candidateId) ?? {
      personId: row.candidateId,
      party: null,
      filing: null,
    }
  );
}

/**
 * A candidate refuses an interview: the refusal is on the record, and the
 * outlet's people take it as a snub that their drives may answer with a
 * grudge (the drives engine decides, from each one's traits).
 */
export function refuse(api: CoreAPI, row: InterviewRow): InterviewRow {
  const done = record(api, {
    ...row,
    status: "declined",
    reason: "candidate-declined",
  });
  snubbed(api, "press.snubbed", row.outletId, row.candidateId, row.id);
  return done;
}

function snubbed(
  api: CoreAPI,
  kind: "press.snubbed" | "press.attacked",
  outletId: string,
  byId: string,
  sourceId: string,
  /** Those in the room when it was said (an attack in a speech): they saw it, so nobody tells them of it. */
  presentIds: readonly string[] = [],
): void {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet || !api.state.people.has(byId)) return;
  const staff = [
    outlet.ownerId,
    outlet.headId,
    ...(outlet.reporterIds ?? []),
  ].filter((id): id is string => !!id && !!api.state.people.get(id)?.alive);
  if (!staff.length) return;
  api.emit({
    id: `${kind}:${sourceId}`,
    date: api.state.date,
    kind,
    personIds: staff,
    ...(presentIds.length
      ? {
          witnessIds: presentIds.filter(
            (id) =>
              id !== byId &&
              !staff.includes(id) &&
              api.state.people.get(id)?.alive,
          ),
        }
      : {}),
    placeId: outlet.placeId,
    // The one who snubbed or attacked them is the responsible party.
    topic: byId,
    desiredChange: kind,
    facts: { outletId, byId },
    source: {
      tag: "SOURCED",
      citation: `${kind === "press.snubbed" ? "Interview refused" : "Speech against the outlet"}: ${sourceId}`,
      asOf: api.state.date,
    },
  });
}

/** The day an outlet's turn comes: its invitation goes out if it still stands. */
export function inviteDay(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  const row = table(api, "interviews").get(
    work.sourceRecordIds[0] ?? "",
  ) as unknown as InterviewRow | undefined;
  if (
    row?.status === "invited" &&
    (!row.contestId ||
      contestOf(api, row.contestId).electionDate > api.state.date)
  )
    invitation(api, row);
}

/**
 * A candidate's own answers to a sitting's questions (an interview, a
 * debate): what their filed platform states, and no answer where it states
 * nothing. The engine never answers for them.
 */
export function platformAnswers(
  api: CoreAPI,
  filingId: string | null,
  questions: readonly string[],
): readonly InterviewAnswer[] {
  const filing = filingId
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(filingId) as unknown as FilingRow | undefined)
    : undefined;
  const platform = filing ? platformOf(api, filing) : [];
  return questions.map((question): InterviewAnswer => {
    const stated = platform.find((s) => s.question === question);
    return {
      question,
      position: stated ? stated.position : null,
      move: "plain",
    };
  });
}

/** A stand on a question and where it comes from. */
export interface StandOnRecord {
  readonly question: string;
  /** In [-1, 1], or null where the candidate holds none of their own. */
  readonly position: number | null;
  /** The filed platform, a vote, their own view; null for none (a stand only their party takes is not theirs). */
  readonly source: "platform" | "vote" | "view" | null;
}

/**
 * What a candidate holds on each question, on the record, when a sitting
 * puts it: the stand their filed platform states; where it states none, a
 * vote of theirs or their own view (`candidateStance`, the read the platform
 * itself is built from, blended with their party's position). A stand that
 * rests only on their party's position is not theirs and counts as none.
 * Nothing is made up and nothing is said for them: the sitting offers the
 * candidate this stand as one of the sides they may take.
 */
export function standsOnRecord(
  api: CoreAPI,
  filingId: string | null,
  questions: readonly string[],
): readonly StandOnRecord[] {
  const filing = filingId
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(filingId) as unknown as FilingRow | undefined)
    : undefined;
  const reader = filing
    ? stanceReader(api, filing.personId, filing.party ?? null)
    : null;
  return platformAnswers(api, filingId, questions).map(
    ({ question, position }): StandOnRecord => {
      if (position !== null) return { question, position, source: "platform" };
      const grounds = reader?.grounds(question) ?? null;
      const stance =
        grounds === "vote" || grounds === "view"
          ? reader!.stance(question)
          : null;
      return stance === null
        ? { question, position: null, source: null }
        : {
            question,
            position: Math.round(stance * 1000) / 1000,
            source: grounds as "vote" | "view",
          };
    },
  );
}

/**
 * The answer to an outlet's invitation, said in its scene: a yes puts the
 * sitting on the record (`interview-accepted`, one for the outlet that
 * asked) and the interview waits for the candidate to sit for it, answering
 * each question as a line of their own; a no is a refusal on the record (the
 * outlet's people may take it as a snub); and anything else leaves it open
 * until the race is over.
 */
export function answerInvitation(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== INTERVIEW_INVITED_EVENT) return;
  const move = String(facts.move);
  const row = table(api, "interviews").get(
    String(cause.facts?.interviewId ?? ""),
  ) as unknown as InterviewRow | undefined;
  if (row?.status !== "invited" || !event.personIds.includes(row.candidateId))
    return;
  if (ACCEPTING_MOVES.has(move)) accepted(api, row, event.id);
  else if (REFUSING_MOVES.has(move)) refuse(api, row);
}

/** What a person told a reporter about a record, or that they declined (the press-interview scene's ending). */
export interface CommentRow {
  readonly id: string;
  readonly causeId: string;
  readonly personId: string;
  readonly date: string;
  readonly quote: string | null;
  readonly replyId: string;
}

/** The comment kept on a record, by the record's id. */
export function commentOn(api: CoreAPI, causeId: string): CommentRow | null {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return null;
  return (
    (table(api, "comments").get(causeId) as unknown as
      CommentRow | undefined) ?? null
  );
}

/** The scandal call's answers the paper quotes: owning it, denying it, or a lie. */
const CALL_ANSWERS: ReadonlySet<string> = new Set(["confess", "deny", "lie"]);

/** The endings whose story quotes what the person said (purpose-arcs.json). */
const SAID_ENDINGS: ReadonlySet<string> = new Set([
  "on-record",
  "on-the-record",
  "denial-printed",
  "lie-printed",
  "caught",
]);

/**
 * A press interview that ends on the record keeps what the person said; one
 * that ends in no comment or a walk-off keeps that they declined. A story
 * that runs (the ending's keeps) is told in the paper's story of the record
 * the reporter asked about. The reporter's call on an exposure (a scandal
 * call) is kept the same way, before the story runs (runExposure): what the
 * paper quotes is the official's own answer on the call (owning it, denying
 * it or a lie), not a parting line after it; an answer is kept as it is said,
 * so a call that stops after it still reaches the story; a call that ends
 * without one is a decline. With no call there is no row, and the story
 * says nothing of comment.
 */
export function keepComment(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  const call = facts.typeKey === "scandal";
  const answer = call && CALL_ANSWERS.has(String(facts.move ?? ""));
  const kept =
    (facts.typeKey === "press-interview" && facts.keeps === "story-runs") ||
    (call && (answer || Boolean(facts.ending)));
  if (!kept) return;
  const causeId = String(facts.causeId ?? "");
  const personId = event.personIds[0];
  if (!causeId || !personId) return;
  const line = String(facts.line ?? "") || null;
  const answered = call ? (commentOn(api, causeId)?.quote ?? null) : null;
  const quote = answer
    ? line
    : SAID_ENDINGS.has(String(facts.ending ?? ""))
      ? (answered ?? line)
      : null;
  table(api, "comments").put({
    id: causeId,
    causeId,
    personId,
    date: api.state.date,
    quote,
    replyId: event.id,
  } satisfies CommentRow as unknown as ModuleRow);
}

/**
 * A candidate who lost conceded on the call after the count, or would not
 * concede that night (the director marks the reply `conceded`): either is
 * put on the public record, so the paper prints it and the town hears it.
 * Once each way for a candidate and a race.
 */
export function reportConcession(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  const conceded = facts.conceded;
  if (conceded !== "yes" && conceded !== "no") return;
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== "election-result") return;
  // The candidate on the call: the one in the reply the count names, not the
  // winner.
  const winnerId = String(cause.facts?.winnerId ?? "");
  const counted = JSON.parse(String(cause.facts?.totals ?? "{}")) as Record<
    string,
    number
  >;
  const loserId = event.personIds.find(
    (id) => id in counted && id !== winnerId,
  );
  if (!loserId || !winnerId || loserId === winnerId) return;
  const contestId = String(cause.facts?.contestId ?? "");
  const id = `concession:${contestId}:${loserId}:${conceded}`;
  if (api.state.durableLog.has(id)) return;
  api.emit({
    id,
    date: api.state.date,
    kind: "concession",
    personIds: [loserId, winnerId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `The concession call after ${cause.id}, in ${event.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      contestId,
      office: String(cause.facts?.office ?? ""),
      winnerId,
      loserId,
      conceded,
      resultId: cause.id,
      replyId: event.id,
    },
  });
}

/**
 * A candidate said yes to an outlet's invitation: the sitting is on the
 * record, with the reporter who will ask, for the director to stage. Said
 * once for an invitation; the interview stays invited until it is sat.
 */
function accepted(api: CoreAPI, row: InterviewRow, replyId: string): void {
  const id = `${INTERVIEW_ACCEPTED_EVENT}:${row.id}`;
  if (api.state.durableLog.has(id)) return;
  const ids = [row.candidateId, row.reporterId ?? ""].filter((who) =>
    api.state.people.has(who),
  );
  if (ids.length < 2) return;
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  const contest = row.contestId ? contestOf(api, row.contestId) : null;
  api.emit({
    id,
    date: api.state.date,
    kind: INTERVIEW_ACCEPTED_EVENT,
    personIds: ids,
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interview ${row.id}, accepted in ${replyId}`,
      asOf: api.state.date,
    },
    facts: {
      interviewId: row.id,
      invitedId: row.candidateId,
      outletId: outlet?.organizationId ?? row.outletId,
      reporterId: row.reporterId ?? "",
      ...(row.contestId ? { contestId: row.contestId } : {}),
      ...(contest ? { office: contest.title } : {}),
    },
  });
}

/** The player turns down an interview an outlet offered. */
export function declineInterview(
  api: CoreAPI,
  interviewId: string,
): InterviewRow {
  const row = table(api, "interviews").get(interviewId) as unknown as
    InterviewRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No interview waiting: ${interviewId}`);
  return refuse(api, row);
}

/**
 * A speech against an outlet: those in the room hear it as a speech on the
 * outlet (their stance on it moves toward distrust, nearest the speaker's
 * lean most), and the outlet's people take it as an attack their drives may
 * answer with a grudge. Followers who come to distrust the outlet drift to
 * another of its kind.
 */
export function attackOutlet(
  api: CoreAPI,
  input: {
    readonly speakerId: string;
    readonly outletId: string;
    readonly audienceIds: readonly string[];
  },
): string {
  const outlet = table(api, "outlets").get(input.outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) throw new Error(`No outlet ${input.outletId}`);
  const id = `speech:${input.speakerId}:${api.state.date}:attack:${outlet.organizationId}`;
  if (api.state.modules.has(SPEECH_MODULE_ID))
    deliverSpeech(api, {
      id,
      speakerId: input.speakerId,
      placeId: outlet.placeId,
      topic: outlet.organizationId,
      desiredChange: DISTRUST,
      audienceIds: input.audienceIds,
      occasion: { recordId: id, kind: "attack" },
    });
  snubbed(
    api,
    "press.attacked",
    outlet.id,
    input.speakerId,
    id,
    input.audienceIds,
  );
  followCache.delete(api.state);
  return id;
}
