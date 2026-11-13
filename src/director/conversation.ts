/**
 * Conversations on the new core (M4-02). Every subject is a record the
 * speaker holds. The other person asks or tells; every choice answers that
 * line (rule R3), each with a different move: plainly, with a further fact
 * from the records, or by turning the question back. A second sentence only
 * follows from the first (owner, batch 6); the other person moves the talk
 * on. Leaving is the screen's control, never a choice.
 *
 * Talking is time together: each exchange is recorded through the core's
 * relationship writer, so closeness grows and news passes as at any contact.
 * The lie (the scales control) exists only when the last line asks about the
 * player's own record and the listener doesn't already know it. Pressing it
 * turns the whole set of choices false: each stays a different move, and each
 * is a mined denial or a believable false alternative the player's own record
 * contradicts. A lie leaves its exact claim as a belief in everyone present,
 * the director keeps it, and anyone who knows the truth sets a believer
 * straight when they next talk.
 *
 * Every line is a mined sentence (`./mined/conversation-bank.ts`); a moment no
 * mined sentence covers is left unsaid.
 *
 * What a talk is about: it starts from the place
 * and the occasion, then from the biggest recorded event of either person in
 * the director's ledger, else from what they share; it keeps to that one
 * topic, may go on to one related topic, and the other person closes it when
 * the topic is done. Someone not in the room is asked after only when
 * something recorded happened to them; news is what the speaker received,
 * and the President's address weighs by how closely they follow politics.
 * The listener remembers the last talk's topic and doesn't open with it again.
 */
import { familyFactsOf, meetInTalk } from "../core2/modules/people";
import {
  PERSON_MOVED_IN,
  heldSinceRecord,
  preStartHistory,
  schoolsAttended,
} from "../core2/past";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../core2/kernel/dates";
import {
  ADDRESS_FACT,
  addressPoints,
  type AddressPoint,
} from "./opening-facts";
import { macroMonths } from "./opening-story";
import { stableHash } from "../core2/kernel/ids";
import {
  CALIBRATION,
  movePairFactor,
  type CalibrationTable,
} from "../english/calibration";
import {
  corePlaceByJurisdictionId,
  coreStateJurisdiction,
  searchCorePlaces,
  type CorePlace,
} from "../core2/place-lookup";
import { P } from "../core2/parameters";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { CRIME_EVENT, CRIME_MODULE_ID } from "../core2/modules/crime";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { sharedHistory } from "../core2/shared-history";
import {
  NEWS_MODULE_ID,
  newsKey,
  storiesHeard,
  storyOfReadEvent,
  type Story,
} from "../core2/modules/news";
import type { EntityId } from "../core2/kernel/brands";
import {
  PRESS_MODULE_ID,
  outletsHere,
  type OutletKind,
} from "../core2/modules/press";
import { decisionLean, hardshipStress } from "../core2/trait-decisions";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "../core2/types";
import { BRING_IT_UP_ROWS, bringItUp, changesKnownTo } from "./bring-it-up";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { SITUATION_LIBRARY } from "./scheduling";
import type { Moment } from "./types";
import {
  stanceRow,
  viewCell,
  viewOf,
  viewOn,
  VIEWS_KEYS,
} from "../core2/modules/views";
import { townMetrics } from "../core2/modules/world";
import { questionSubject } from "../english/policy-names";
import { questionAbout, townFigureWords } from "../english/question-names";
import { lawInForce } from "../core2/modules/laws";
import {
  asksQuestion,
  composeConversationLine,
  composedConversationBank,
  conversationHas,
  conversationMoves,
  CONVERSATION_WORDS,
  joinedReply,
  wordConversationMove,
  type ConversationPart,
  type Fact,
  type Said as WordedLine,
  type SubjectBank,
  type Wording,
} from "../english/conversation-words";
import {
  kinAddress,
  relationPhrase,
  withArticle,
} from "../english/journal-words";
import rulesFile from "./data/conversation-rules.json" with { type: "json" };
import { answerInTalk } from "./scene-talk";
import {
  declineInSitting,
  openSitting,
  saySitting,
  sittingFor,
  type Sitting,
} from "./sitting";
import WEEKDAYS from "./data/weekdays.json" with { type: "json" };
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import {
  properName,
  spoken,
  spokenDate,
  spokenWhen,
  spokenWhenRow,
  stateInSentence,
} from "./words";
import { dayParts, sceneMinute } from "./day-part";
import { dayPartSaid } from "../english/day-words";
import {
  learnView,
  learnViewQuestion,
  stanceRecordId,
  viewKey,
  viewSubjectOf,
} from "./view-learned";

const zero = P.zero;
const one = P.one;

/** Years after which a shared school or workplace is a reason to talk (conversation-rules.json, TUNABLE). */
/** The slots a person's own work detail is said under. */
const WORK_SLOTS = { position: "position", place: "work-place" };

/** The organization kind of a government's payroll. */
const GOVERNMENT_TREASURY = "government-treasury";

const LONG_AGO_YEARS = (
  rulesFile as unknown as { sharedPast: { longAgoYears: { value: number } } }
).sharedPast.longAgoYears.value;

export interface ConversationData {
  version: string;
  /** The owner's grades the offered replies are weighed by; the shipped table by default. */
  calibration?: CalibrationTable;
  toldEvent: string;
  lieEvent: string;
  minutesPerExchange: number;
  /**
   * The answer moves that fit a subject's question, where not every wording
   * of the subject answers it: "Where did you go to school?" is answered with
   * where, never "It's okay." (owner, batch 11).
   */
  answerMoves?: Readonly<Record<string, readonly string[]>>;
  /** The kind a reply is written as, when it differs from the raised one. */
  replyKinds: Readonly<Record<string, string>>;
  /** The subjects an answer to each subject may go on to raise: only ones that follow from it. */
  follows: Readonly<Record<string, readonly string[]>>;
  /** The topics a talk's main topic may lead on to (one of them, once). */
  related: Readonly<Record<string, readonly string[]>>;
  /** The subject a moment of the speaker's own is talked about as, by its label. */
  topicOfLabel: Readonly<Record<string, string>>;
  /**
   * What the other person tells when the player answers one of their lines
   * with a choice: by the line's kind, then the choice ("What happened?" to
   * "I lost my job." has them tell why). The told subject is a side remark on
   * the same topic, not a new one.
   */
  tells?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * The reply choices that answer a question, by the move of the line that
   * asked it (`news-ask-core`, "What do you make of {topic} closing?", is answered by an
   * opinion, not by having heard of it).
   */
  answersTo?: Readonly<Record<string, readonly string[]>>;
  /**
   * The fact that answers a question raised as a subject (how long: the
   * years; what they do there: the position). A reply that asks it is not
   * offered once the line before already said it.
   */
  answeredBy?: Readonly<Record<string, string>>;
  /** The kinds of line whose replies never say the same record's words twice on one screen. */
  namesOnce?: { kinds: readonly string[] };
  /** The ledger labels, by prefix, that are something happening to a person. */
  happenings?: { prefixes: readonly string[] };
  /** A relative's latest happening, by label prefix, as the stage their news is told in. */
  familyNews?: { stages: Readonly<Record<string, string>> };
  /** The subject kinds relatives do not raise or ask between them. */
  familyTalk: { dropped: readonly string[] };
  /** What the player answers when the other person raises one of their own subjects. */
  otherRaises: Readonly<Record<string, { kind: string; stage: string }>>;
  subjects: Readonly<Record<string, SubjectBank>>;
}
/** The mined words, read by default. */
export const CONVERSATION_DATA: ConversationData = CONVERSATION_WORDS;
/** The rules a conversation runs by, holding no sentence text. */
export const CONVERSATION_RULES = rulesFile as unknown as Omit<
  ConversationData,
  "version" | "subjects"
>;

type Facts = Record<string, Fact>;

/** What move each answer the player gives makes, for the scene engine's `talk` answer (conversation-rules.json). */
const REPLY_MOVES = (
  rulesFile as unknown as {
    replyMoves: {
      default: string;
      answerable: readonly string[];
      notes: readonly string[];
    } & Readonly<Record<string, unknown>>;
  }
).replyMoves;

/**
 * The move the player's answer to a line of this kind makes: "note" for one
 * that only takes the line in ("Oh, okay."), which the talk does not answer.
 */
export function replyMoveOf(kind: string, choice: string): string {
  if (
    REPLY_MOVES.notes.some(
      (note) => choice === note || choice.startsWith(`${note}:`),
    )
  )
    return "note";
  const own = REPLY_MOVES[kind.replace(/-new$/, "")] as
    Readonly<Record<string, string>> | undefined;
  return own?.[choice] ?? REPLY_MOVES.default;
}

/** Something real to talk about, from the speaker's records. */
export interface Subject {
  id: string;
  kind: string;
  facts: Facts;
  /** For the player's own record: the knowledge key and its true value. */
  own?: { key: string; value: string };
  /** What else a true answer about it tells, each told the same way as `own` (what they do at their work). */
  alsoOwn?: readonly { key: string; value: string; fact: string }[];
  /** The person a mutual or kin subject is about, or the shared context's record. */
  aboutId?: string;
  /** The stage its own line is said in, from its record (a layoff, a closure). */
  stage?: string;
  /** For the address's point a hearer raises: the question and why they raised it. */
  point?: { question: string; reason: PointReason };
  /** For news: the policy question a story is about, or the place a change in town names. */
  news?: { question?: string; institutionId?: string };
  /**
   * How much it weighs as a talk's topic when the speaker's willingness to
   * raise it is what decides (where they stand politically), not a recorded
   * event; zero when small talk outweighs it.
   */
  weight?: number;
  /** What the listener learns once it is said: the knowledge key and the records it cites, and the question they care most about. */
  learned?: { key: string; recordIds: readonly string[]; question?: string };
}

/** Which mined sentence said a line, and what picked it (for reports and grading). */
export type { Wording };

export interface ConversationLine {
  speakerId: PersonId;
  subjectId: string;
  kind: string;
  act: "ask" | "answer" | "lie" | "tell";
  text: string;
  sourceRecordIds: readonly string[];
  wording?: Wording;
}

export interface ConversationChoice {
  key: string;
  /** The move it makes: plain, a further fact, turning it back, brief. */
  move: string;
  text: string;
  /** The subject of the line it answers. */
  answers: string;
  /** The new subject it raises, if any. */
  raises?: string;
  lie: boolean;
  sourceRecordIds: readonly string[];
  wording?: Wording;
  /** A lie's exact claim about the player's own record. */
  claim?: { key: string; value: string };
  /** What follows the answer itself: the raised subject or a turned-back question. */
  tail?: { text: string; sourceRecordIds: readonly string[]; parts: string[] };
}

/** What the last line was about, and the facts and stage it was said with. */
interface LastLine {
  subject: Subject;
  kind: string;
  facts: Facts;
  stage: string;
}

export interface Conversation {
  playerId: PersonId;
  otherId: PersonId;
  /** Everyone else present, who hears what is said. */
  presentIds: readonly PersonId[];
  lines: ConversationLine[];
  choices: ConversationChoice[];
  /**
   * The scales control's set: the same choices made false, each a different
   * move. Empty dims the scales (nothing about the player's own record is in
   * play, or the listener already knows the truth).
   */
  lies: ConversationChoice[];
  used: string[];
  /** Ids of the events the conversation recorded. */
  recorded: string[];
  /** What the last line was about (internal; the screen reads `lines`). */
  last?: LastLine;
  /** The talk's topics in order: the main one, then the one it led to. */
  topics: string[];
  /** The main topic's facts, which the goodbye may name (internal). */
  topicFacts?: Facts;
  /** The minute of the day the talk is had at, when the caller gave it (internal). */
  minuteOfDay?: number;
  /** The organization whose place the player came to for the talk, when the screen knows it (internal). */
  visitOrganizationId?: string;
  /** A look only: whether there is anything to say, with nothing learned (internal). */
  look?: boolean;
  /** The director's ledger, read for what happened to whom (internal). */
  director?: Director;
  /** The moment the talk is the occasion of (a scene's), from the player's ledger. */
  occasion?: Moment;
  /**
   * An interview the player said yes to, sat for in this talk: the reporter
   * puts each of its questions and the player's answers publish it
   * (`./sitting`).
   */
  sitting?: Sitting;
}

/**
 * How either speaker says someone: by first name for their own household or
 * family ("I saw Stephen."), by full name otherwise (batch 10: "I talked to
 * Stephen Harrison yesterday" about the player's own household).
 */
function spokenName(
  core: Readonly<CoreState>,
  between: readonly PersonId[],
  id: PersonId,
): string {
  const named = core.people.get(id);
  const close = between.some((who) => {
    const row = core.people.get(who);
    return (
      !!row &&
      !!named &&
      (row.householdId === named.householdId || row.familyIds.has(id))
    );
  });
  return close && named ? named.givenName : fullName(core, id);
}

function fullName(core: Readonly<CoreState>, id: PersonId): string {
  const row = core.people.get(id)!;
  return `${row.givenName} ${row.familyName}`;
}

function jobOf(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  return job && org ? { job, org } : null;
}

/**
 * An employer said the way people say it. A government's payroll is the
 * government ("the City of Alexandria", never "City of Alexandria
 * treasury"), and a government named for its place takes "the", as in "I
 * work for the Village of Jackson Center".
 */
function employerText(org: { name: string; kind: string }): string {
  const name = properName(org.name);
  const said =
    org.kind === GOVERNMENT_TREASURY ? name.replace(/\s+treasury$/i, "") : name;
  return /^\p{Lu}\p{Ll}+ of /u.test(said) ? `the ${said}` : said;
}

/**
 * A person's job, when its employer can be named: never the outside
 * buyers and sellers that stand in for work out of town.
 */
function namedJobOf(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  const held = jobOf(core, person);
  return held && !held.org.outsideFlow ? held : null;
}

/**
 * Whether a job's title can be said the way people say a job: never a form's
 * title with a parenthesis, a comma or a slash in it.
 */
function sayableTitle(title: string | undefined): title is string {
  return !!title && !/[(),/]/.test(title);
}

/**
 * What a person does at their job and, when the employer is out of their
 * town, the town it is in: from the job record's title and the employer's
 * place, each citing its record. Under the slot names given (the speaker's
 * own, or the player's).
 */
function workDetail(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  held: NonNullable<ReturnType<typeof jobOf>>,
  slots: { position: string; place?: string },
): Facts {
  const facts: Facts = {};
  if (sayableTitle(held.job.title))
    facts[slots.position] = {
      text: withArticle(held.job.title),
      sourceRecordIds: [held.job.id],
    };
  const away =
    slots.place && held.org.placeId !== person.placeId
      ? corePlaceByJurisdictionId(held.org.placeId as never)
      : undefined;
  if (away && slots.place)
    facts[slots.place] = {
      text: spoken(away),
      sourceRecordIds: [held.org.id],
    };
  return facts;
}

/** The last school a person's records name, by the school's own record. */
function schoolOf(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  const named = schoolsAttended(core, person.id).filter((row) => row.name);
  const school = named.at(-one);
  return school
    ? {
        text: properName(school.name!),
        sourceRecordIds: [school.recordId, school.schoolId],
        recordId: school.recordId,
      }
    : undefined;
}

/** Whether a person is past school age, which sets the tense they speak of school in. */
function schoolStage(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  return ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
    P.votingAge
    ? "graduated"
    : "enrolled";
}

/**
 * How long someone has held their job, in completed years, counted to the
 * anniversary of the day they started: what people say ("for seven years"),
 * never the month they started. Nobody says a date in speech. Under two
 * years there is no count to say.
 */
export function tenureYears(
  started: { date: string; factId: string } | null,
  today: string,
): { text: string; sourceRecordIds: readonly string[] } | undefined {
  if (!started) return undefined;
  const years = ageOnDate(started.date, today);
  return years > one
    ? { text: String(years), sourceRecordIds: [started.factId] }
    : undefined;
}

/** When the person started their current job, from the record of their working life before the start. */
function startedOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): { date: string; factId: string } | null {
  const held = heldSinceRecord(core as CoreState, person.id, person.jobId);
  return held ? { date: String(held.facts.startedAt), factId: held.id } : null;
}

function lastContact(
  core: Readonly<CoreState>,
  personId: PersonId,
  otherId: PersonId,
): { date: IsoDate; tieId: string } | null {
  let best: { date: IsoDate; tieId: string } | null = null;
  for (const id of core.relationshipsByPerson.get(personId) ?? []) {
    const row = core.relationships.get(id)!;
    if (row.actorId !== otherId && row.otherId !== otherId) continue;
    if (!best || row.lastContactDate > best.date)
      best = { date: row.lastContactDate, tieId: id };
  }
  return best;
}

/** How far back a recorded event still makes something to talk about. */
const recentDays = () =>
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkRecentDays!.value;

/** The moments of a person's ledger within the recent window, newest first. */
function recentMoments(
  core: Readonly<CoreState>,
  director: Director | undefined,
  personId: PersonId,
) {
  const book = director?.ledger.people.get(personId);
  const since = addDays(makeIsoDate(core.date), -recentDays());
  // Someone the director does not watch (a relative living elsewhere) has
  // no book; what happened to them is still on record, read from their own
  // events (the core's index by person, never the whole log), so a talk
  // with them has their news (words-talk-husk-acquaintances-empty).
  if (!book) return recordedMoments(core, personId, since);
  const moments = book.moments;
  const out = [];
  for (let at = moments.length - one; at >= zero; at -= one) {
    const moment = moments[at]!;
    if (moment.date <= since) break;
    if (moment.date <= core.date) out.push(moment);
  }
  return out;
}

/**
 * A person's own recorded events within the window, newest first, read as
 * the moments a book would hold: the event is the cause, its other people
 * the counterparts.
 */
// stopgapId: SG-JOBS-job-start-not-a-person-event
function recordedMoments(
  core: Readonly<CoreState>,
  personId: PersonId,
  since: string,
): Moment[] {
  const out: Moment[] = [];
  for (const id of core.logByPerson.get(personId) ?? []) {
    const row = core.durableLog.get(id as never);
    if (!row || row.date <= since || row.date > core.date) continue;
    // Only what happened to them (the owner's Q7 happenings): a speech they
    // heard or a vote they cast is not their news.
    const label = `feeling:event:${row.kind}`;
    if (
      !(CONVERSATION_RULES.happenings?.prefixes ?? []).some((prefix) =>
        label.startsWith(prefix),
      )
    )
      continue;
    out.push({
      id: `record:${row.id}`,
      personId,
      date: row.date,
      label,
      causeId: row.id,
      causeKind: `event:${row.kind}`,
      counterpartIds: row.personIds.filter((other) => other !== personId),
      selfNamed: true,
      // Not appraised for someone unwatched: weighed as the least a book
      // keeps, so it is news but never outranks an appraised moment.
      impact: DEFAULT_DIRECTOR_DATA.parameters.directorMomentFloor!.value,
      channels: [],
      hindsight: zero,
      hindsightAt: row.date,
      echoes: [],
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * The newest recorded moment about someone, as the speaker could know it:
 * their own ledger's, or one of the speaker's that names them.
 */
function latestMoment(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
  aboutId: PersonId,
) {
  const happening = (moment: Moment) =>
    (CONVERSATION_RULES.happenings?.prefixes ?? []).some((prefix) =>
      moment.label.startsWith(prefix),
    );
  return (
    recentMoments(core, director, aboutId).find(happening) ??
    recentMoments(core, director, speakerId).find(
      (moment) => happening(moment) && moment.counterpartIds.includes(aboutId),
    )
  );
}

/** The knowledge key that says who a relative is to someone, learned when they are mentioned. */
const knowsOfKey = (relativeId: PersonId) => `person:${relativeId}:relation`;

/** The stage a relative's death is told in (`familyNews.stages`). */
const DIED = "died";

/**
 * What a relative's latest recorded happening gives a talk about them (the
 * owner, Nov 1: every life is simulated, and under Q7 what happened to them
 * is the news): the stage their news is told in, and the facts it needs,
 * where they moved and where they work now, each cited to its record.
 */
function familyNews(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
  relativeId: PersonId,
): { stage: string; facts: Facts } {
  const stages = CONVERSATION_RULES.familyNews?.stages ?? {};
  const stageOf = (moment: Moment) =>
    Object.keys(stages).find((row) => moment.label.startsWith(row));
  // The newest happening that is news (a stage), theirs or the speaker's
  // that names them; else their latest happening of any kind.
  const staged = [
    ...recentMoments(core, director, relativeId).filter(
      (row) => !!stageOf(row),
    ),
    ...recentMoments(core, director, speakerId).filter(
      (row) => !!stageOf(row) && row.counterpartIds.includes(relativeId),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));
  // A death is the news once it is recorded, whatever its records say after
  // (a job's end, an estate).
  const moment =
    staged.find((row) => stages[stageOf(row)!] === DIED) ??
    staged[zero] ??
    latestMoment(core, director, speakerId, relativeId);
  const prefix = moment ? stageOf(moment) : undefined;
  if (!moment || !prefix) return { stage: "default", facts: {} };
  const stage = stages[prefix]!;
  const cited = [moment.causeId];
  // Whatever the line says, it cites the record of what happened, even a
  // line that names no place or employer ("Dana moved away.").
  const facts: Facts = { happened: { text: stage, sourceRecordIds: cited } };
  // An illness or a death is told with when it happened, as people say it
  // ("last week"), from the moment's own date.
  if (stage === "ill" || stage === "died")
    facts.when = {
      text: spokenWhen(moment.date, core.date),
      sourceRecordIds: cited,
    };
  if (stage === "moved") {
    const move = core.durableLog.get(moment.causeId);
    const place = move?.topic
      ? corePlaceByJurisdictionId(move.topic as never)
      : null;
    // A move with no new place on record (where they went is where they
    // left: a new home within their state's record, or no destination the
    // moves engine could find) names none: they "moved away", never "moved
    // to" the place they already lived in.
    if (place && move!.topic !== move!.placeId)
      facts.place = { text: spoken(place), sourceRecordIds: cited };
  }
  if (stage === "job") {
    const job = core.jobs.get(moment.causeId);
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    if (org)
      facts.employer = {
        text: properName(org.name),
        sourceRecordIds: [...cited, org.id],
      };
  }
  return { stage, facts };
}

/**
 * How much a subject weighs as a talk's main topic: the impact of the
 * biggest recent moment of its holder it is about (the moment's cause or
 * counterpart in the subject's records, or the subject its label is talked
 * about as), and for the President's address, how closely the speaker
 * follows politics. Zero when no recorded event stands behind it.
 */
function topicWeight(
  core: Readonly<CoreState>,
  director: Director | undefined,
  holderId: PersonId,
  subject: Subject,
  data: ConversationData,
): number {
  if (subject.kind === "address") {
    const engagement = viewOf(coreAPI(core as CoreState), holderId)?.engagement;
    return (
      (engagement ?? zero) *
      DEFAULT_DIRECTOR_DATA.parameters.directorTalkAddressImpact!.value
    );
  }
  // Where they stand politically weighs what their willingness makes it, and
  // only when that outweighs the small talk that would lead instead.
  if (subject.weight !== undefined) return subject.weight;
  let weight = zero;
  for (const moment of recentMoments(core, director, holderId))
    if (isAbout(subject, moment, data) && moment.impact > weight)
      weight = moment.impact;
  return weight;
}

/**
 * Whether a subject is about a moment: the moment's cause or counterpart in
 * the subject's records, or a moment of the holder's own talked about as
 * this subject by its label.
 */
function isAbout(subject: Subject, moment: Moment, data: ConversationData) {
  const ids = new Set<string>([
    ...Object.values(subject.facts).flatMap((fact) => fact.sourceRecordIds),
    ...(subject.aboutId ? [subject.aboutId] : []),
    ...(subject.own ? [subject.own.value] : []),
  ]);
  return (
    ids.has(moment.causeId) ||
    (!!subject.aboutId &&
      moment.counterpartIds.includes(subject.aboutId as PersonId)) ||
    (data.topicOfLabel[moment.label] === subject.kind &&
      !moment.counterpartIds.length)
  );
}

/** The stage a lost job's cause is told in, by the jobs engine's reason. */
const JOB_LOSS_STAGES: Readonly<Record<string, string>> = {
  "demand-below-staff": "layoff",
  "employer-closed": "closure",
};

/** The jobs engine's record that someone is looking for work, if any. */
function seekingOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): { id: string; reasonKey: string } | undefined {
  if (!core.modules.has(JOBS_MODULE_ID)) return undefined;
  const row = coreAPI(core as CoreState)
    .moduleState(JOBS_MODULE_ID)
    .table("seekers")
    .get(personId) as { isSeeker?: boolean; reasonKey?: string } | undefined;
  return row?.isSeeker && row.reasonKey
    ? { id: `${JOBS_MODULE_ID}:seekers:${personId}`, reasonKey: row.reasonKey }
    : undefined;
}

/** The job a person last saw end, from their own record of it. */
function lastEndedJob(core: Readonly<CoreState>, personId: PersonId) {
  let best: { jobId: string; at: string } | undefined;
  for (const [key, row] of core.knowledgeByPerson.get(personId) ?? []) {
    const match = /^job:(.+):status$/.exec(key);
    if (!match || row.value !== "ended") continue;
    if (!best || row.learnedAt > best.at)
      best = { jobId: match[one]!, at: row.learnedAt };
  }
  return best ? core.jobs.get(best.jobId) : undefined;
}

/** The news a household member tells of a relative, by the label of the listener's moment. */
const NEWS_KINDS: Readonly<Record<string, string>> = {
  "feeling:event:life.death": "death-news",
  "feeling:event:health.serious-illness": "illness-news",
  "feeling:event:justice.imprisoned": "prison-news",
};

// A counted household evicted and filled in later holds its case and status
// row but no such moment, so its people never tell it.
// stopgapId: SG-WORDS-eviction-moment-at-fill-in
const EVICTION_LABEL = "feeling:event:housing.eviction";
const EVICTION_EVENT = "event:housing.eviction:";

/**
 * A household's eviction as the speaker can tell it, from the housing
 * engine's records: that it happened (their ledger's moment, or the
 * listener's when they live together, since the record is the household's),
 * why (the case's rent owed at removal) and where they go now (the
 * household's housing status: a relative's home, a shelter, nowhere).
 */
function evictionSubjects(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
  listenerId: PersonId,
): Subject[] {
  const speaker = core.people.get(speakerId)!;
  const together =
    core.people.get(listenerId)?.householdId === speaker.householdId;
  const evicted = [
    ...recentMoments(core, director, speakerId),
    ...(together ? recentMoments(core, director, listenerId) : []),
  ].find(
    // The record is the household's: it may name the other members too.
    (moment) =>
      moment.label === EVICTION_LABEL &&
      moment.causeId.startsWith(EVICTION_EVENT),
  );
  if (!evicted || !core.modules.has(HOUSING_MODULE_ID)) return [];
  const housing = coreAPI(core as CoreState).moduleState(HOUSING_MODULE_ID);
  const caseId = evicted.causeId.slice(EVICTION_EVENT.length);
  const out: Subject[] = [
    {
      id: `eviction:${evicted.causeId}`,
      kind: "eviction",
      aboutId: evicted.causeId,
      facts: { evicted: { text: "", sourceRecordIds: [evicted.causeId] } },
    },
  ];
  const kept = housing.table("cases").get(caseId) as
    | { owedAtRemovalMinor?: number; removalAt?: string; removedAt?: string }
    | undefined;
  const owed = kept?.owedAtRemovalMinor;
  // How long they had: the day the court set for the removal, from the case
  // (Fable A, Nov 13, rule 5: "How long do we have?" is answered from the
  // eviction's record), said "today" on the day itself.
  const until = kept?.removalAt ?? kept?.removedAt;
  if (until)
    out.push({
      id: `eviction-until:${caseId}`,
      kind: "eviction-until",
      aboutId: evicted.causeId,
      facts: {
        until: {
          text:
            until === core.date
              ? spokenWhen(until, core.date)
              : spokenDate(until, core.date),
          sourceRecordIds: [caseId],
        },
      },
    });
  if (owed !== undefined && owed > zero)
    out.push({
      id: `eviction-cause:${caseId}`,
      kind: "eviction-cause",
      aboutId: evicted.causeId,
      stage: "rent",
      facts: { owed: { text: "", sourceRecordIds: [caseId] } },
    });
  const status = housing.table("statuses").get(speaker.householdId) as
    | {
        status: string;
        caseId: string;
        reasons: Readonly<Record<string, number | string>>;
      }
    | undefined;
  if (status?.caseId === caseId) {
    const facts: Facts = {
      status: { text: "", sourceRecordIds: [caseId, speaker.householdId] },
    };
    const hostId = status.reasons.relative;
    const kin =
      typeof hostId === "string"
        ? familyFactsOf(speaker).get(hostId as PersonId)
        : undefined;
    const host =
      typeof hostId === "string"
        ? core.people.get(hostId as PersonId)
        : undefined;
    const phrase = kin
      ? relationPhrase(kin.relation, host?.looks?.gender ?? "other", "journal")
      : undefined;
    if (kin && phrase)
      facts.relation = {
        text: phrase,
        sourceRecordIds: [kin.factId, caseId],
      };
    out.push({
      id: `eviction-where:${caseId}`,
      kind: "eviction-where",
      aboutId: evicted.causeId,
      stage: status.status,
      facts,
    });
  }
  return out;
}

const VICTIMIZED_LABEL = `feeling:event:${CRIME_EVENT}`;

/**
 * The speaker's latest victimization as they can tell it, from the crime
 * engine's record: what happened (the crime's kind, the stage the line is
 * worded for) and when. Only the speaker's own moment counts: the record
 * names whom it happened to (every member for a crime against the household,
 * only the victim for a robbery or an assault), and the lines are told in the
 * first person.
 */
function victimizationSubjects(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
): Subject[] {
  if (!core.modules.has(CRIME_MODULE_ID)) return [];
  const moment = recentMoments(core, director, speakerId).find(
    (row) =>
      row.label === VICTIMIZED_LABEL &&
      row.causeId.startsWith(`${CRIME_EVENT}:`),
  );
  if (!moment) return [];
  // The record's id is the crime's kind, the household and the day.
  const [type] = moment.causeId.slice(CRIME_EVENT.length + one).split(":");
  if (!type) return [];
  return [
    {
      id: `victimization:${moment.causeId}`,
      kind: "victimization",
      aboutId: moment.causeId,
      stage: type,
      facts: {
        victimized: { text: "", sourceRecordIds: [moment.causeId] },
        when: {
          text: spokenWhen(moment.date, core.date),
          sourceRecordIds: [moment.causeId],
        },
      },
    },
  ];
}

/**
 * The justice engine's events a person can talk about, by the ledger label
 * of the moment they made and the subject each is told as.
 */
const JUSTICE_SUBJECTS: Readonly<Record<string, string>> = {
  "feeling:event:justice.charged": "charge",
  "feeling:event:justice.convicted": "conviction",
  "feeling:event:justice.acquitted": "acquittal",
};

/**
 * A charge, a conviction or an acquittal as the speaker can tell it: their
 * own ledger's moment of it, or the listener's moment that names them as the
 * accused (the record is the case's). A case is told by its newest event, so
 * a verdict stands in for the charge that came before it.
 */
function justiceSubjects(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speakerId: PersonId,
  listenerId: PersonId,
): Subject[] {
  const moments = [
    ...recentMoments(core, director, speakerId).filter(
      (moment) => !moment.counterpartIds.length,
    ),
    ...recentMoments(core, director, listenerId).filter((moment) =>
      moment.counterpartIds.includes(speakerId),
    ),
  ].filter((moment) => JUSTICE_SUBJECTS[moment.label]);
  const told = new Set<string>();
  const out: Subject[] = [];
  for (const moment of moments) {
    const caseId = moment.causeId.slice(moment.causeId.indexOf(":") + one);
    if (told.has(caseId)) continue;
    told.add(caseId);
    out.push({
      id: `${JUSTICE_SUBJECTS[moment.label]}:${moment.causeId}`,
      kind: JUSTICE_SUBJECTS[moment.label]!,
      aboutId: moment.causeId,
      facts: {
        case: { text: "", sourceRecordIds: [moment.causeId, caseId] },
      },
    });
  }
  return out;
}

/** The job a person has hours at on the core's date, by its id; none on a day off. */
function workToday(
  core: Readonly<CoreState>,
  personId: PersonId,
): string | undefined {
  try {
    return workSpansOnDateV1(coreAPI(core as CoreState), {
      controlledPersonId: personId,
      date: core.date,
    }).owners.find((owner) => owner.plannedMinutes > zero)?.job.id;
  } catch {
    // Work terms that cannot be read for the date are not a work day.
    return undefined;
  }
}

/**
 * A quiet evening at home as a subject: the day of the week (the household
 * is where they are), when the two last spent time together, and whether
 * either had work that day, each from its record.
 */
function quietDay(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
): Subject {
  const day = new Date(`${core.date}T00:00:00Z`).getUTCDay();
  const facts: Facts = {
    weekday: {
      text: WEEKDAYS.days[day]!,
      sourceRecordIds: [speaker.householdId],
    },
  };
  const seen = lastContact(core, speaker.id, listener.id);
  // Not seeing much of someone takes some days apart: never "since
  // yesterday".
  if (
    seen &&
    daysBetween(makeIsoDate(seen.date), makeIsoDate(core.date)) >=
      DEFAULT_DIRECTOR_DATA.parameters.directorTalkSeenLittleDays!.value
  )
    // Kebab case, as the English engine's slots are ({last-together}).
    facts["last-together"] = {
      text: spokenWhen(seen.date, core.date),
      sourceRecordIds: [seen.tieId],
    };
  // A work day for either of them, from the job's own hours for the date.
  for (const person of [speaker, listener]) {
    const shift = person.jobId ? workToday(core, person.id) : undefined;
    if (shift) {
      facts.dayDone = { text: "", sourceRecordIds: [shift] };
      break;
    }
  }
  return { id: `quiet:${speaker.id}:${core.date}`, kind: "quiet", facts };
}

/** The news engine's kind for a story an outlet printed (press desk). */
const PRINTED_STORY = "press.printed";

/** How each kind of outlet carries a story: printed on paper or broadcast. */
const MEDIUM: Readonly<Partial<Record<OutletKind, "paper" | "broadcast">>> = {
  newspaper: "paper",
  "national-paper": "paper",
  magazine: "paper",
  television: "broadcast",
  radio: "broadcast",
  cable: "broadcast",
};

/** Whether a person knows of a change or a story: learned of the change, or heard the story. */
function knowsNews(
  core: Readonly<CoreState>,
  personId: PersonId,
  aboutId: string | undefined,
): boolean {
  if (!aboutId) return false;
  if (core.knowledgeByPerson.get(personId)?.has(newsKey(aboutId))) return true;
  return changesKnownTo(core, personId).some((row) => row.eventId === aboutId);
}

/**
 * What a story or a change in town has to do with a person, from their own
 * records, in order: they worked at the place that closed (their job now,
 * or the last one they left), or they hold a view on the story's question
 * (the views engine's, past its own no-view rule: exactly zero is none).
 * No chance decides it.
 */
export function newsStake(
  core: Readonly<CoreState>,
  personId: PersonId,
  subject: Pick<Subject, "news">,
):
  | { reason: "worked-there"; recordIds: readonly string[] }
  | { reason: "stance"; side: "for" | "against"; recordIds: readonly string[] }
  | { reason: "none" } {
  const institutionId = subject.news?.institutionId;
  if (institutionId) {
    const person = core.people.get(personId);
    const now = person?.jobId ? core.jobs.get(person.jobId) : undefined;
    const ended = lastEndedJob(core, personId);
    const job = [now, ended].find(
      (row) => row?.organizationId === institutionId,
    );
    if (job) return { reason: "worked-there", recordIds: [job.id] };
  }
  const question = subject.news?.question;
  if (question) {
    const api = coreAPI(core as CoreState);
    const lean = viewOf(api, personId)?.lean;
    const view =
      lean === undefined ? zero : viewOn(api, personId, question, lean);
    if (view !== zero)
      return {
        reason: "stance",
        side: view > zero ? "for" : "against",
        recordIds: [stanceRow(api, personId, question)?.id ?? personId],
      };
  }
  return { reason: "none" };
}

/** A stake as marks a line may require: `<prefix>worked-there`, `<prefix>for` or `<prefix>against`. */
function stakeMarks(
  stake: ReturnType<typeof newsStake>,
  prefix: string,
): Facts {
  if (stake.reason === "none") return {};
  const key = stake.reason === "worked-there" ? "worked-there" : stake.side;
  return {
    [`${prefix}${key}`]: { text: "yes", sourceRecordIds: stake.recordIds },
  };
}

/**
 * The newest printed story a person heard within the recent window, as a
 * news subject: its headline (worded by the director's story words), the
 * outlet that printed it and the story's id, each citing the story.
 */
function printedHeard(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  director: Director | undefined,
): Subject | null {
  if (!director?.storyWords || !core.modules.has(NEWS_MODULE_ID)) return null;
  const since = addDays(makeIsoDate(core.date), -recentDays());
  for (const story of storiesHeard(coreAPI(core), speakerId, since)) {
    const subject = printedSubject(core, story, director);
    if (subject) return subject;
  }
  return null;
}

/**
 * One printed story as a subject: its headline and the outlet that printed
 * it, or null where it is not a printed story or has no headline in words.
 */
function printedSubject(
  core: Readonly<CoreState>,
  story: Story,
  director: Director | undefined,
): Subject | null {
  const words = director?.storyWords;
  if (!words || story.kind !== PRINTED_STORY) return null;
  {
    const said = words(core as CoreState, story);
    if (!said?.headline) return null;
    const cited = [story.id, ...said.sourceRecordIds];
    const outlet = story.outletId
      ? core.organizations.get(story.outletId as EntityId)
      : undefined;
    // A paper prints it; a station has it on the air ("in the Courier", "on
    // WMQB"); a site online is neither.
    const row = core.modules.has(PRESS_MODULE_ID)
      ? outletsHere(coreAPI(core as CoreState)).find(
          (entry) => entry.organizationId === story.outletId,
        )
      : undefined;
    const medium = row ? MEDIUM[row.kind] : undefined;
    const carried = medium
      ? { [medium]: { text: "", sourceRecordIds: [story.id, row!.id] } }
      : {};
    // The policy question the story is about, as people say it, where the
    // story names one ("a mileage fee in place of the fuel tax").
    const about = story.topic ? questionAbout(story.topic) : null;
    return {
      id: `news:${story.id}`,
      kind: "news",
      aboutId: story.id,
      ...(about ? { news: { question: story.topic! } } : {}),
      facts: {
        ...(about
          ? { about: { text: about, sourceRecordIds: [story.id] } }
          : {}),
        // As a person says it: a bill by what it does, not its number.
        headline: {
          text: said.spoken ?? said.headline,
          sourceRecordIds: cited,
        },
        storyId: { text: "", sourceRecordIds: [story.id] },
        // The day it ran, said in passing ("yesterday", "on Monday").
        ran: {
          text: spokenWhen(story.date, core.date),
          sourceRecordIds: [story.id],
        },
        ...carried,
        ...(outlet
          ? {
              // As the paper's own masthead or call sign has it.
              outlet: {
                text: outlet.name,
                sourceRecordIds: [story.id, outlet.id],
              },
            }
          : {}),
      },
    };
  }
}

/** The subjects a speaker can raise with a listener, from the speaker's records. */
export function subjectsBetween(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  director?: Director,
): Subject[] {
  const speaker = core.people.get(speakerId)!;
  // Someone not in the room is talked about only when something recorded
  // happened to them lately.
  const happened = (id: PersonId) =>
    !!latestMoment(core, director, speakerId, id);
  // Someone told who a relative is (in an earlier talk) knows of them.
  const knowsOf = (personId: PersonId, id: PersonId) =>
    !!core.knowledgeByPerson.get(personId)?.has(knowsOfKey(id));
  const listener = core.people.get(listenerId)!;
  const out: Subject[] = [];
  const mine = namedJobOf(core, speaker);
  if (mine)
    out.push({
      id: `own-work:${speakerId}`,
      kind: "own-work",
      facts: {
        employer: {
          text: employerText(mine.org),
          sourceRecordIds: [mine.job.id, mine.org.id],
        },
        ...workDetail(core, speaker, mine, WORK_SLOTS),
      },
      own: { key: `person:${speakerId}:employer`, value: mine.org.id },
      // A true answer also tells what they do there, for the person card.
      ...(sayableTitle(mine.job.title)
        ? {
            alsoOwn: [
              {
                key: `person:${speakerId}:position`,
                value: mine.job.id,
                fact: "position",
              },
            ],
          }
        : {}),
    });
  // A job the speaker lost lately, from the director's ledger: the money
  // moment of its end, theirs or a household member's that names them.
  const lost =
    recentMoments(core, director, speakerId).find(
      (moment) =>
        moment.label === "money:job-ended" && !moment.counterpartIds.length,
    ) ??
    recentMoments(core, director, listenerId).find(
      (moment) =>
        moment.label === "money:job-ended" &&
        moment.counterpartIds.includes(speakerId),
    );
  if (lost && !mine) {
    out.push({
      id: `job-lost:${lost.causeId}`,
      kind: "job-lost",
      aboutId: lost.causeId,
      facts: { lost: { text: "yes", sourceRecordIds: [lost.causeId] } },
    });
    // Why, and what now: the jobs engine's record of their search, which
    // names the reason (a layoff, the employer closing) and that they are
    // looking.
    const seeking = seekingOf(core, speakerId);
    const ended = lastEndedJob(core, speakerId);
    const stage = seeking && JOB_LOSS_STAGES[seeking.reasonKey];
    if (seeking && stage) {
      const org = ended
        ? core.organizations.get(ended.organizationId)
        : undefined;
      out.push({
        id: `job-cause:${lost.causeId}`,
        kind: "job-cause",
        aboutId: lost.causeId,
        stage,
        facts: {
          reason: { text: "", sourceRecordIds: [seeking.id] },
          ...(org
            ? {
                employer: {
                  text: properName(org.name),
                  sourceRecordIds: [ended!.id, org.id],
                },
              }
            : {}),
        },
      });
      out.push({
        id: `job-hope:${seeking.id}`,
        kind: "job-hope",
        aboutId: lost.causeId,
        facts: { seeking: { text: "", sourceRecordIds: [seeking.id] } },
      });
    }
  }
  // A new job of the speaker's own, from the money moment of its start: the
  // job record names the employer, so the talk opens on it ("I got a job at
  // ..."), and the listener answers (congratulate, ask, brief).
  const started = recentMoments(core, director, speakerId).find(
    (moment) =>
      moment.label === "money:job-started" && !moment.counterpartIds.length,
  );
  const startedJob = started ? core.jobs.get(started.causeId) : undefined;
  const startedOrg = startedJob
    ? core.organizations.get(startedJob.organizationId)
    : undefined;
  if (started && startedJob && startedOrg) {
    const employer = {
      text: properName(startedOrg.name),
      sourceRecordIds: [startedJob.id, startedOrg.id],
    };
    out.push({
      id: `job-new:${started.causeId}`,
      kind: "job-new",
      aboutId: started.causeId,
      facts: { employer },
    });
    // What the new job is, from its record, for the listener who asks
    // ("What will you be doing there?"): a question is never left unanswered.
    if (startedJob.title)
      out.push({
        id: `job-new-detail:${started.causeId}`,
        kind: "job-new-detail",
        aboutId: started.causeId,
        facts: {
          employer,
          position: {
            text: withArticle(startedJob.title),
            sourceRecordIds: [startedJob.id],
          },
        },
      });
  }
  // The listener's own new job, as the speaker would take it up ("Congratulations
  // on the job at ..."). Said only once the rules map "job-new-told" to a
  // reply kind and the bank has words for it (src/director/data/conversation-rules.json).
  const listenerStarted = recentMoments(core, director, listenerId).find(
    (moment) =>
      moment.label === "money:job-started" && !moment.counterpartIds.length,
  );
  const listenerJob = listenerStarted
    ? core.jobs.get(listenerStarted.causeId)
    : undefined;
  const listenerOrg = listenerJob
    ? core.organizations.get(listenerJob.organizationId)
    : undefined;
  if (listenerStarted && listenerJob && listenerOrg)
    out.push({
      id: `job-new-told:${listenerStarted.causeId}`,
      kind: "job-new-told",
      aboutId: listenerStarted.causeId,
      facts: {
        employer: {
          text: properName(listenerOrg.name),
          sourceRecordIds: [listenerJob.id, listenerOrg.id],
        },
      },
    });
  // Hard news about a relative, told by the household member who has it: a
  // death, a serious illness, a prison sentence. The listener's own moment
  // names the person it is about; the listener's family record names how
  // they are related ("Your grandmother passed away.").
  for (const moment of recentMoments(core, director, listenerId)) {
    const kind = NEWS_KINDS[moment.label];
    const aboutId = moment.counterpartIds[zero];
    if (!kind || !aboutId || aboutId === speakerId) continue;
    const about = core.people.get(aboutId);
    const row = familyFactsOf(listener).get(aboutId);
    const phrase = row
      ? relationPhrase(row.relation, about?.looks?.gender ?? "other", "scene")
      : undefined;
    if (!about || !row || !phrase) continue;
    out.push({
      id: `${kind}:${moment.causeId}`,
      kind,
      aboutId,
      facts: {
        relation: {
          text: phrase,
          sourceRecordIds: [row.factId, moment.causeId],
        },
        name: { text: about.givenName, sourceRecordIds: [row.factId] },
      },
    });
  }
  out.push(...evictionSubjects(core, director, speakerId, listenerId));
  out.push(...victimizationSubjects(core, director, speakerId));
  out.push(...justiceSubjects(core, director, speakerId, listenerId));
  const theirs = jobOf(core, listener);
  if (!mine || theirs?.org.id !== mine.org.id)
    out.push({ id: `their-work:${listenerId}`, kind: "their-work", facts: {} });
  // Asked only right after they name their work.
  if (theirs)
    out.push({
      id: `their-tenure:${listenerId}`,
      kind: "their-tenure",
      facts: {},
    });
  // What they do there, asked right after they name their work: answered
  // from the job record's title.
  if (theirs && !theirs.org.outsideFlow && sayableTitle(theirs.job.title))
    out.push({
      id: `their-position:${listenerId}`,
      kind: "their-position",
      facts: {
        employer: {
          text: employerText(theirs.org),
          sourceRecordIds: [theirs.job.id, theirs.org.id],
        },
      },
    });
  const place = corePlaceByJurisdictionId(speaker.placeId as never);
  if (place)
    out.push({
      id: `home:${speakerId}`,
      kind: "home",
      facts: {
        place: { text: spoken(place), sourceRecordIds: [speaker.householdId] },
      },
      own: { key: `person:${speakerId}:place`, value: speaker.placeId },
    });
  // School and work the two shared, from the school's and the employer's
  // records: the same rows the person card shows.
  const thisYear = Number(core.date.slice(zero, core.date.indexOf("-")));
  for (const row of sharedHistory(core, speakerId, listenerId)) {
    if (row.kind === "schoolmate" && row.year !== undefined) {
      const school = core.organizations.get(row.recordId);
      if (!school) continue;
      out.push({
        id: `shared-school:${row.recordId}:${row.year}`,
        kind: "shared-school",
        aboutId: row.recordId,
        facts: {
          school: {
            text: properName(school.name),
            sourceRecordIds: [row.recordId],
          },
          years: {
            text: String(thisYear - row.year),
            sourceRecordIds: [row.recordId],
          },
          // A reason to raise it: the years since, past the rules' threshold.
          ...(thisYear - row.year >= LONG_AGO_YEARS
            ? { "long-ago": { text: "yes", sourceRecordIds: [row.recordId] } }
            : {}),
        },
      });
    }
    if (row.kind === "coworker" && row.recordId !== mine?.org.id) {
      const org = core.organizations.get(row.recordId);
      if (!org) continue;
      out.push({
        id: `shared-work:${org.id}`,
        kind: "shared-work",
        aboutId: org.id,
        facts: {
          employer: {
            text: properName(org.name),
            sourceRecordIds: [org.id],
          },
          // Work together that ended long ago is a reason to ask after it.
          ...(row.endedOn &&
          thisYear -
            Number(row.endedOn.slice(zero, row.endedOn.indexOf("-"))) >=
            LONG_AGO_YEARS
            ? { "long-ago": { text: "yes", sourceRecordIds: [org.id] } }
            : {}),
        },
      });
    }
  }
  for (const id of [...speaker.knownIds].sort()) {
    if (id === listenerId || id === speakerId || !listener.knownIds.has(id))
      continue;
    if (!core.people.get(id)?.alive || !happened(id)) continue;
    out.push({
      id: `mutual:${id}`,
      kind: "mutual",
      aboutId: id,
      facts: {
        name: {
          text: spokenName(core, [speakerId, listenerId], id),
          sourceRecordIds: [speaker.knownIdSources?.[id]?.sourceFactId ?? id],
        },
        first: {
          text: core.people.get(id)!.givenName,
          sourceRecordIds: [speaker.knownIdSources?.[id]?.sourceFactId ?? id],
        },
      },
    });
  }
  // The speaker's relatives the listener has not met, named by relation. A
  // relative the two share is never introduced; they ask after them below.
  const relationOf = familyFactsOf(speaker);
  for (const id of [...speaker.familyIds].sort()) {
    // A relative who lives out of town is kept as a husk: named, with their
    // town, and never filled in for being mentioned.
    const person = core.people.get(id);
    const husk = person ? undefined : core.husks.get(id);
    const relative = person ?? husk;
    const row = relationOf.get(id);
    if (
      !relative ||
      (person ? !person.alive : !!husk?.diedOn) ||
      !row ||
      listener.knownIds.has(id) ||
      knowsOf(listenerId, id) ||
      listener.familyIds.has(id) ||
      id === listenerId
    )
      continue;
    const phrase = relationPhrase(
      row.relation,
      relative.looks?.gender ?? "other",
      "journal",
    );
    if (!phrase) continue;
    // Where they live, when it is not the speaker's town, and where they
    // work, each from its record: what the speaker says of them.
    const home =
      relative.placeId !== speaker.placeId
        ? corePlaceByJurisdictionId(relative.placeId as never)
        : undefined;
    const work = person ? namedJobOf(core, person) : null;
    // Mentioned only with something of their life to tell.
    if (!home && !work) continue;
    out.push({
      id: `kin:${id}`,
      kind: "kin",
      aboutId: id,
      facts: {
        relation: {
          text: phrase,
          sourceRecordIds: [row.factId],
        },
        name: { text: relative.givenName, sourceRecordIds: [row.factId] },
        ...(home
          ? {
              place: {
                text: spoken(home),
                sourceRecordIds: [person?.householdId ?? id],
              },
            }
          : {}),
        ...(work
          ? {
              employer: {
                text: employerText(work.org),
                sourceRecordIds: [work.job.id, work.org.id],
              },
            }
          : {}),
      },
      // Once said, the listener knows who they are to the speaker.
      own: { key: knowsOfKey(id), value: row.relation },
    });
  }
  // The speaker's relatives the listener knows, asked after by name. One the
  // two share is asked after as they call them ("How's Dad?"): a parent or
  // grandparent to both by the kin address, a shared sibling by first name,
  // and only by someone who does not live with them.
  const listenerRelation = familyFactsOf(listener);
  for (const id of [...speaker.familyIds].sort()) {
    const relative = core.people.get(id);
    const row = relationOf.get(id);
    if (!relative || !row) continue;
    if (!listener.knownIds.has(id) && !knowsOf(listenerId, id)) continue;
    if (id === listenerId || !happened(id)) continue;
    // A relative who died is asked after only by someone who has not heard,
    // and answered with the death (its moment sets the stage).
    if (
      !relative.alive &&
      familyNews(core, director, speakerId, id).stage !== DIED
    )
      continue;
    const gender = relative.looks?.gender ?? "other";
    let phrase: string | undefined;
    let sourceRecordIds = [row.factId];
    if (listener.familyIds.has(id)) {
      const theirs = listenerRelation.get(id);
      if (
        !theirs ||
        theirs.relation !== row.relation ||
        relative.householdId === listener.householdId
      )
        continue;
      phrase =
        kinAddress(row.relation, gender) ??
        (row.relation === "sibling" ? relative.givenName : undefined);
      sourceRecordIds = [row.factId, theirs.factId];
    } else phrase = relationPhrase(row.relation, gender, "scene");
    if (!phrase) continue;
    const shared = listener.familyIds.has(id);
    const news = familyNews(core, director, speakerId, id);
    out.push({
      id: `family:${id}`,
      kind: "family",
      aboutId: id,
      facts: {
        relation: { text: phrase, sourceRecordIds },
        // "I'll tell Dad you asked": a shared relative goes by what both call them.
        name: { text: shared ? phrase : relative.givenName, sourceRecordIds },
        ...news.facts,
      },
      stage: news.stage,
    });
  }
  // The listener's relatives the speaker knows, asked after in turn once the
  // speaker has answered about their own ("And how's your sister?").
  const theirRelation = familyFactsOf(listener);
  for (const id of [...listener.familyIds].sort()) {
    const relative = core.people.get(id);
    const row = theirRelation.get(id);
    if (!relative?.alive || !row || !speaker.knownIds.has(id)) continue;
    if (id === speakerId || speaker.familyIds.has(id) || !happened(id))
      continue;
    const phrase = relationPhrase(
      row.relation,
      relative.looks?.gender ?? "other",
      "scene",
    );
    if (!phrase) continue;
    out.push({
      id: `their-family:${id}`,
      kind: "their-family",
      aboutId: id,
      facts: {
        relation: {
          text: phrase,
          sourceRecordIds: [row.factId],
        },
        name: { text: relative.givenName, sourceRecordIds: [row.factId] },
      },
    });
  }
  // The speaker's own school, when the listener didn't share it.
  const school = schoolOf(core, speaker);
  const shared = out.some((row) => row.kind === "shared-school");
  if (school && !shared)
    out.push({
      id: `school:${speakerId}`,
      kind: "school",
      aboutId: school.recordId,
      facts: {
        school: {
          text: school.text,
          sourceRecordIds: school.sourceRecordIds,
        },
      },
      own: { key: `person:${speakerId}:school`, value: school.recordId },
    });
  // Where the listener went to school, asked when they didn't share it.
  if (!shared && schoolOf(core, listener))
    out.push({
      id: `their-school:${listenerId}`,
      kind: "their-school",
      facts: {},
    });
  // The newest printed story the speaker read or heard of lately, said by
  // its headline and the outlet that printed it.
  const printed = printedHeard(core, speakerId, director);
  if (printed) out.push(printed);
  // The newest change the speaker learned of, as news to pass on: a place
  // that closed, said by its name. A story the speaker read is the printed
  // subject above, said by its headline; its outlet is not what happened.
  const stories = new Set(
    BRING_IT_UP_ROWS.changes
      .filter((row) => row.story)
      .map((row) => row.eventKind),
  );
  const news = changesKnownTo(core, speakerId).find(
    (change) => !stories.has(change.kind),
  );
  const institution = news
    ? core.organizations.get(news.institutionId)
    : undefined;
  if (news && institution)
    out.push({
      id: `news:${news.eventId}`,
      kind: "news",
      aboutId: news.eventId,
      news: { institutionId: institution.id },
      facts: {
        topic: {
          text: properName(institution.name),
          sourceRecordIds: [news.eventId, institution.id],
        },
        // A place in town that closed, by the change's own record.
        closed: { text: "yes", sourceRecordIds: [news.eventId] },
      },
    });
  // The President's address, once the speaker saw it or heard of it: its
  // remembered line is theirs to quote. Last, so it never takes the place of
  // a subject the banks can word. It is the day's news only for the weeks
  // after it was given (its record's date), however late someone heard it.
  const known = core.knowledgeByPerson.get(speakerId);
  const address = known?.get(ADDRESS_FACT.event);
  const quote = known?.get(ADDRESS_FACT.remembered);
  const givenOn =
    address?.value.match(/\d{4}-\d{2}-\d{2}$/)?.[zero] ?? address?.learnedAt;
  if (
    address &&
    quote &&
    givenOn &&
    givenOn >
      addDays(
        makeIsoDate(core.date),
        -DEFAULT_DIRECTOR_DATA.parameters.directorTalkAddressDays!.value,
      )
  ) {
    out.push({
      id: `address:${address.value}`,
      kind: "address",
      aboutId: address.value,
      facts: {
        quote: {
          text: quote.value,
          sourceRecordIds: [address.value, quote.sourceId],
        },
        // The day it was given, as people say it ("today", "yesterday").
        when: {
          text: spokenWhen(givenOn, core.date),
          sourceRecordIds: [address.value],
        },
      },
    });
    // The point of the address the speaker raises, from their own life, and
    // where they stand on it (owner, Nov 11: "the relative raises a real
    // thing the President said in that address and where they stand on it
    // from their own life").
    const opening = director?.ledger.opening;
    const point =
      opening?.id === address.value
        ? addressPointFor(
            core,
            speakerId,
            addressPoints(opening),
            listenerId,
            director,
          )
        : null;
    if (point && opening)
      out.push(
        pointSubject(
          core,
          speakerId,
          listenerId,
          address.value,
          point,
          opening.president,
        ),
      );
  }
  // Where the speaker stands politically, from the views engine's record of
  // their lean, said only as far as their tie to the listener and their
  // temperament allow (`./view-learned`). Once said, the listener knows it.
  const stand = viewSubjectOf(core, speakerId, listenerId);
  if (stand) {
    // The question they care most about, the side they are on and why, from
    // their own life, each citing its record.
    const top = stand.strongest;
    const reason = stand.reason;
    const speakerPlace = corePlaceByJurisdictionId(speaker.placeId as never);
    out.push({
      id: `own-view:${speakerId}`,
      kind: "own-view",
      stage: stand.stage,
      weight: stand.weight,
      ...(top ? { news: { question: top.question } } : {}),
      facts: {
        stand: { text: "", sourceRecordIds: [stand.recordId] },
        ...(top
          ? {
              about: { text: top.about, sourceRecordIds: [top.recordId] },
              [`side-${top.side}`]: {
                text: "yes",
                sourceRecordIds: [top.recordId],
              },
            }
          : {}),
        ...(reason?.reason === "work"
          ? {
              employer: {
                text: properName(reason.employer),
                sourceRecordIds: reason.recordIds,
              },
            }
          : {}),
        ...(reason?.reason === "money"
          ? {
              "why-money": { text: "yes", sourceRecordIds: reason.recordIds },
              ...(speakerPlace
                ? {
                    place: {
                      text: spoken(speakerPlace),
                      sourceRecordIds: [speaker.householdId],
                    },
                  }
                : {}),
            }
          : {}),
        ...(reason
          ? { "has-reason": { text: "yes", sourceRecordIds: reason.recordIds } }
          : {}),
        // How the player calls the speaker ("Dad", else their first name),
        // for the player's replies.
        first: calledBy(core, listenerId, speakerId),
      },
      learned: {
        key: viewKey(speakerId),
        recordIds: [stand.recordId, ...(top ? [top.recordId] : [])],
        ...(top ? { question: top.question } : {}),
      },
    });
  }
  // At home, the day itself: the weekday, the last time the two spent
  // together and a work day, from records. Raised last, when
  // nothing else opens the talk.
  if (listener.householdId === speaker.householdId)
    out.push(quietDay(core, speaker, listener));
  // Between relatives, a talk is personal only.
  if (speaker.familyIds.has(listenerId))
    return out.filter(
      (row) => !CONVERSATION_RULES.familyTalk.dropped.includes(row.kind),
    );
  return out;
}

/** Why someone raises the point of the address they raise. */
export type PointReason = "work" | "money" | "view" | "first";

/** The point of the address a person raises, why, and where they stand on it. */
export interface PointPick {
  readonly point: AddressPoint;
  readonly reason: PointReason;
  /** The records the reason stands on: the job lost or the search for one, the hardship, the view. */
  readonly reasonIds: readonly string[];
  /** Where they stand on it against the President. */
  readonly stand: "with" | "against" | "unsure";
  /** The employer a work reason names: the job they lost. */
  readonly employer?: Fact;
  /** The jobs engine's record that they are looking for work, for a work reason. */
  readonly seeking?: string;
}

interface PointRules {
  readonly work: { readonly subjects: readonly string[] };
  readonly money: {
    readonly subjects: readonly string[];
    readonly questions: readonly string[];
  };
  readonly back: string;
  readonly claims: Readonly<
    Record<string, { area: "work" | "money"; says: "worse" | "better" }>
  >;
}
const POINT_RULES = (rulesFile as unknown as { addressPoint: PointRules })
  .addressPoint;
/** The subject a hearer raises the address's point as, and the one they answer a reply with. */
const POINT = "address-point";
const POINT_BACK = POINT_RULES.back;

/** Whether a point is about work and pay, or about prices, rent and housing: a year point by its claim, a policy point by the bill catalog's subject. */
function pointArea(point: AddressPoint): "work" | "money" | null {
  if (point.kind === "year")
    return POINT_RULES.claims[point.claim ?? ""]?.area ?? null;
  const question = point.question;
  const subject = questionSubject(question);
  if (
    POINT_RULES.money.questions.includes(question) ||
    (subject && POINT_RULES.money.subjects.includes(subject))
  )
    return "money";
  return subject && POINT_RULES.work.subjects.includes(subject) ? "work" : null;
}

/** The knowledge key a person keeps of what the player said to them on one of the address's questions. */
const pointKey = (playerId: PersonId, question: string) =>
  `talk:${playerId}:address-point:${question}`;

/** An employer as a person says it: never the market outside the town or a treasury. */
function employerFact(
  core: Readonly<CoreState>,
  job: { id: string; organizationId: string } | undefined,
): Fact | undefined {
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (!job || !org || org.outsideFlow || org.kind === "government-treasury")
    return undefined;
  return { text: properName(org.name), sourceRecordIds: [job.id, org.id] };
}

/**
 * Which point of the address a person raises, from their own life. No chance
 * decides it. In order: a point on work or pay when they lost a job this year
 * or are looking for one; a point on prices, rent or housing when money is
 * hard for them (the trait engine's hardship stress) or their household is
 * being evicted; else the point they hold the strongest view on; else the
 * President's first point. A point they already talked over with the
 * listener (the record `say` keeps) is behind them, and another is raised.
 */
export function addressPointFor(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  points: readonly AddressPoint[],
  listenerId?: PersonId,
  director?: Director,
): PointPick | null {
  const speaker = core.people.get(speakerId);
  if (!speaker) return null;
  const known = core.knowledgeByPerson.get(speakerId);
  const open = listenerId
    ? points.filter((row) => !known?.get(pointKey(listenerId, row.question)))
    : points;
  if (!open.length) return null;
  const api = coreAPI(core as CoreState);
  const lean = viewOf(api, speakerId)?.lean;
  const viewAt = (row: AddressPoint) =>
    lean === undefined || row.kind === "year"
      ? zero
      : viewOn(api, speakerId, row.question, lean);
  // Their own life, as their records hold it: work lost or looked for, a job
  // held, money hard (hardship stress or an eviction), and the town's figures.
  const year = core.date.slice(zero, "YYYY".length);
  const ended = lastEndedJob(core, speakerId);
  const endedAt = ended
    ? known?.get(`job:${ended.id}:status`)?.learnedAt
    : undefined;
  const lostThisYear = ended && endedAt?.startsWith(year) ? ended : undefined;
  const seeking = seekingOf(core, speakerId);
  // A job lost this year counts, even with another one found since.
  const outOfWork = !!(lostThisYear || seeking);
  const working = !!jobOf(core, speaker);
  const hardship = hardshipStress(core, speaker) > zero;
  const evicted = evictionSubjects(
    core,
    director,
    speakerId,
    listenerId ?? speakerId,
  )[zero];
  const town = townBacks(core, speaker.placeId);
  /**
   * Where they stand on a year point: with what the President said when
   * their own life bears it out, against it when their life says otherwise,
   * unsure when their records say neither.
   */
  const yearStand = (point: AddressPoint): PointPick["stand"] => {
    const rule = POINT_RULES.claims[point.claim ?? ""];
    if (!rule) return "unsure";
    const hard =
      rule.area === "work"
        ? outOfWork || town.includes("why-town-jobs")
        : hardship || !!evicted || town.includes("why-town-rent");
    const easy =
      rule.area === "work" ? working && !outOfWork : working && !hardship;
    const bears = rule.says === "worse" ? hard : easy && !hard;
    const belies = rule.says === "worse" ? easy && !hard : hard;
    return bears ? "with" : belies ? "against" : "unsure";
  };
  const pick = (
    point: AddressPoint,
    reason: PointReason,
    reasonIds: readonly string[],
    employer?: Fact,
    seeking?: string,
  ): PointPick => {
    const view = viewAt(point);
    const side = point.stance === "for" ? one : -one;
    return {
      point,
      reason,
      reasonIds,
      // A view of exactly nothing is no view (the views engine's own rule).
      stand:
        point.kind === "year"
          ? yearStand(point)
          : view === zero
            ? "unsure"
            : Math.sign(view) === side
              ? "with"
              : "against",
      ...(employer ? { employer } : {}),
      ...(seeking ? { seeking } : {}),
    };
  };
  const work = open.find((row) => pointArea(row) === "work");
  if (work && (lostThisYear || seeking)) {
    const employer = employerFact(core, lostThisYear ?? ended);
    return pick(
      work,
      "work",
      [
        ...(lostThisYear ? [lostThisYear.id] : []),
        ...(seeking ? [seeking.id] : []),
      ],
      employer,
      seeking?.id,
    );
  }
  // Money: hardship on their record, or an eviction.
  const money = open.find((row) => pointArea(row) === "money");
  if (money && (hardship || evicted))
    return pick(money, "money", [
      ...(hardship ? [speakerId] : []),
      ...(evicted ? [evicted.aboutId!] : []),
    ]);
  // Someone who follows politics more than the average of people like them
  // (the views engine's engagement against its survey cell) raises the policy
  // point they hold the strongest view on; anyone else talks about the year
  // as their own life shows it, where it shows it either way.
  const view = viewOf(api, speakerId);
  const follows =
    !!view &&
    view.engagement >
      (viewCell(speaker, core.startedAt, core.seed).cell.engagement ??
        VIEWS_KEYS.national.engagement!);
  const lived = open.find(
    (row) => row.kind === "year" && yearStand(row) !== "unsure",
  );
  if (lived && !follows) return pick(lived, "view", [speakerId]);
  // The point they hold the strongest view on.
  const held = open
    .filter((row) => row.kind === "policy")
    .map((row) => ({ row, size: Math.abs(viewAt(row)) }))
    .filter((row) => row.size > zero)
    .sort((a, b) => b.size - a.size)[zero];
  if (held) return pick(held.row, "view", [speakerId]);
  if (lived) return pick(lived, "view", [speakerId]);
  return pick(open[zero]!, "first", []);
}

/**
 * The town's own figures, from the economy engines' records (`townMetrics`):
 * its unemployment against the country's (the macro months), and a year of
 * its typical rent against its typical household's earnings, against HUD's
 * burden line. `backs` are the reasons a figure gives for a point on work or
 * money (unemployment above the country's, rent above the line); `figures`
 * say each comparison either way, for the answer to "what would it mean
 * here?". Read once a day.
 */
interface TownFigures {
  readonly backs: readonly string[];
  readonly figures: readonly string[];
  readonly ids: readonly string[];
}
const townBacking = new WeakMap<
  object,
  { date: string; rows: Map<string, TownFigures> }
>();
const NO_FIGURES: TownFigures = { backs: [], figures: [], ids: [] };
function townFigures(core: Readonly<CoreState>, placeId: string): TownFigures {
  const kept = townBacking.get(core);
  if (kept?.date === core.date) return kept.rows.get(placeId) ?? NO_FIGURES;
  const rows = new Map<string, TownFigures>();
  const nation = macroMonths(core as CoreState)?.now;
  const burden =
    DEFAULT_DIRECTOR_DATA.parameters.directorRentBurdenShare!.value;
  for (const row of townMetrics(coreAPI(core as CoreState))) {
    const backs: string[] = [];
    const figures: string[] = [];
    if (nation) {
      const high = row.unemploymentRate * P.percent > nation.unemploymentPct;
      if (high) backs.push("why-town-jobs");
      figures.push(high ? "town-jobs-high" : "town-jobs-low");
    }
    if (row.rentToEarnings > burden) {
      backs.push("why-town-rent");
      figures.push("town-rent-high");
    } else if (row.rentToEarnings > zero) figures.push("town-rent-low");
    rows.set(row.placeId, {
      backs,
      figures,
      ids: [row.placeId, ...(nation ? [nation.id] : [])],
    });
  }
  townBacking.set(core, { date: core.date, rows });
  return rows.get(placeId) ?? NO_FIGURES;
}
const townBacks = (core: Readonly<CoreState>, placeId: string) =>
  townFigures(core, placeId).backs;

/**
 * The point as a subject the speaker raises (`address-point`): its stage is
 * where they stand, its facts what the President said (`about`, `to`), their
 * town (`place`), and the one fact of their own life the reason names: the
 * employer for work, their money or the town's figures for money, nothing
 * more for a view.
 */
function pointSubject(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  eventId: string,
  pick: PointPick,
  president: { name: string; sourceRecordIds: readonly string[] },
): Subject {
  const speaker = core.people.get(speakerId)!;
  const said = [eventId, ...pick.point.sourceRecordIds];
  const facts: Facts = {
    about: { text: pick.point.about, sourceRecordIds: said },
    // Who gave it, by name, from the officials engine's record.
    president: {
      text: president.name,
      sourceRecordIds: [eventId, ...president.sourceRecordIds],
    },
  };
  const place = corePlaceByJurisdictionId(speaker.placeId as never);
  if (place)
    facts.place = {
      text: spoken(place),
      sourceRecordIds: [speaker.householdId],
    };
  const mark = (key: string, ids: readonly string[]) => {
    if (ids.length) facts[key] = { text: "yes", sourceRecordIds: [...ids] };
  };
  // What the President would do, and the President's side, for a policy
  // point; a year point is something the address said happened. Their own
  // stand, which the words follow.
  if (pick.point.to) facts.to = { text: pick.point.to, sourceRecordIds: said };
  mark(`${pick.point.kind}-point`, said);
  if (pick.point.stance) mark(`president-${pick.point.stance}`, said);
  mark(`stand-${pick.stand}`, [...said, ...pick.reasonIds, speakerId]);
  if (pick.reason === "work") {
    mark("why-work", pick.reasonIds);
    if (pick.seeking) mark("why-seeking", [pick.seeking]);
    if (pick.employer) facts.employer = pick.employer;
  }
  if (pick.reason === "money") mark("why-money", pick.reasonIds);
  // A view of a policy; a year point their life speaks to has its town.
  if (pick.reason === "view" && pick.point.kind === "policy")
    mark("why-view", [...pick.reasonIds, ...said]);
  if (pick.stand !== "unsure") mark("stand-decided", [...said, speakerId]);
  // How the listener calls them: "Mom", "Grandpa", else their first name.
  facts.name = calledBy(core, listenerId, speakerId);
  // What it would mean here, from what this world keeps: the state's own law
  // on the same question where one is on record, else the town's figure.
  const stateKey = place?.stateJurisdictionKey;
  const stateRow =
    pick.point.kind === "policy" && stateKey
      ? lawInForce(coreAPI(core as CoreState), pick.point.question).levels.find(
          (row) => row.level === "state",
        )?.row
      : undefined;
  const state = stateKey ? coreStateJurisdiction(stateKey) : null;
  if (stateRow && state) {
    facts.state = {
      text: stateInSentence(state.name),
      sourceRecordIds: [stateRow.id],
    };
    mark(stateRow.value === one ? "law-state-yes" : "law-state-no", [
      stateRow.id,
    ]);
  } else if (place) {
    const town = townFigures(core, speaker.placeId);
    const area = pointArea(pick.point);
    const figure =
      town.figures.find((key) =>
        area === "money" ? key.startsWith("town-rent") : false,
      ) ?? town.figures.find((key) => key.startsWith("town-jobs"));
    const words = figure ? townFigureWords(figure) : null;
    if (words)
      facts["town-figure"] = { text: words, sourceRecordIds: [...town.ids] };
  }
  // The town's own figures back a point on work or money that is not the
  // speaker's own trouble.
  const area = pointArea(pick.point);
  if (place && (pick.reason === "first" || pick.reason === "view") && area)
    for (const key of townBacks(core, speaker.placeId))
      if (
        (key === "why-town-jobs" && area === "work") ||
        (key === "why-town-rent" && area === "money")
      )
        mark(key, [speaker.placeId]);
  // Nothing of their own life or their town's behind it: the town, as a
  // closing thought.
  if (
    pick.reason === "first" &&
    !facts["why-town-jobs"] &&
    !facts["why-town-rent"]
  )
    mark("why-first", said);
  return {
    id: `${POINT}:${eventId}`,
    kind: POINT,
    aboutId: eventId,
    stage: pick.stand,
    facts,
    point: { question: pick.point.question, reason: pick.reason },
  };
}

/**
 * A line the English engine composes from parts (opener, core, reason,
 * closer), for a subject whose lines are made that way: the hearer's point of
 * the address and their answer to the player's reply. Null when no core can
 * be said from the facts given.
 */
export function composedLine(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  subject: string,
  facts: Facts,
  stage: string,
  momentKey: string,
  recentPartKeys: readonly string[] = [],
): Said | null {
  const line = composeConversationLine({
    seed: core.seed,
    subject,
    speakerId,
    traits: core.people.get(speakerId)?.traits ?? {},
    facts,
    stage,
    momentKey,
    said: recentPartKeys,
  });
  if (!line) return null;
  const { asks, afterPlain, ...said } = line;
  void asks;
  void afterPlain;
  return said;
}

/** The parts this speaker said earlier in the talk, so the next composed line says the point in other words. */
const saidParts = (conversation: Conversation, speakerId: PersonId) =>
  conversation.lines
    .filter((line) => line.speakerId === speakerId)
    .flatMap((line) => line.wording?.parts ?? []);

/** The facts the listener answers a raised subject with, from their own records. */
function replyFacts(
  core: Readonly<CoreState>,
  listenerId: PersonId,
  subject: Subject,
): { facts: Facts; stage: string } | null {
  const listener = core.people.get(listenerId)!;
  switch (subject.kind) {
    case "home": {
      const place = corePlaceByJurisdictionId(listener.placeId as never);
      return place
        ? {
            facts: {
              place: {
                text: spoken(place),
                sourceRecordIds: [listener.householdId],
              },
            },
            stage: "default",
          }
        : null;
    }
    case "own-work":
      return { facts: subject.facts, stage: "default" };
    case "their-work": {
      const theirs = jobOf(core, listener);
      // Work out of town for outside buyers has no employer to name.
      if (theirs?.org.outsideFlow) return null;
      if (theirs)
        return {
          facts: {
            employer: {
              text: employerText(theirs.org),
              sourceRecordIds: [theirs.job.id, theirs.org.id],
            },
            ...workDetail(core, listener, theirs, WORK_SLOTS),
          },
          stage: "working",
        };
      // Out of work: the last employer on record, when there is one.
      const ended = lastEndedJob(core, listenerId);
      const was = ended
        ? core.organizations.get(ended.organizationId)
        : undefined;
      return {
        facts:
          was && !was.outsideFlow
            ? {
                employer: {
                  text: employerText(was),
                  sourceRecordIds: [ended!.id, was.id],
                },
              }
            : {},
        stage: "none",
      };
    }
    case "their-position": {
      const theirs = namedJobOf(core, listener);
      return theirs && sayableTitle(theirs.job.title)
        ? {
            facts: {
              employer: {
                text: employerText(theirs.org),
                sourceRecordIds: [theirs.job.id, theirs.org.id],
              },
              ...workDetail(core, listener, theirs, WORK_SLOTS),
            },
            stage: "default",
          }
        : null;
    }
    case "their-tenure": {
      const years = tenureYears(startedOf(core, listener), core.date);
      return years ? { facts: { years }, stage: "default" } : null;
    }
    case "shared-work": {
      const theirs = jobOf(core, listener);
      return {
        facts: subject.facts,
        stage: theirs?.org.id === subject.aboutId ? "still" : "left",
      };
    }
    case "mutual": {
      const name = {
        text: spokenName(core, [listenerId], subject.aboutId!),
        sourceRecordIds: [
          listener.knownIdSources?.[subject.aboutId!]?.sourceFactId ??
            subject.aboutId!,
        ],
      };
      const seen = lastContact(core, listenerId, subject.aboutId!);
      return seen
        ? {
            facts: {
              name,
              when: {
                text: spokenWhen(seen.date, core.date),
                sourceRecordIds: [seen.tieId],
              },
            },
            stage: "saw",
          }
        : { facts: { name }, stage: "not" };
    }
    case "their-family": {
      const relative = core.people.get(subject.aboutId!);
      return relative?.alive
        ? { facts: subject.facts, stage: "default" }
        : null;
    }
    case "their-school": {
      const school = schoolOf(core, listener);
      return school
        ? {
            facts: {
              school: {
                text: school.text,
                sourceRecordIds: school.sourceRecordIds,
              },
            },
            stage: schoolStage(core, listener),
          }
        : null;
    }
    case "news":
      return {
        facts: subject.facts,
        stage: knowsNews(core, listenerId, subject.aboutId)
          ? "heard"
          : "not-heard",
      };
    default:
      return { facts: subject.facts, stage: "default" };
  }
}

/**
 * How a listener calls a speaker to their face: a parent or grandparent by
 * the family word ("Mom", "Grandpa", from the journal words' kin address),
 * anyone else by their first name.
 */
function calledBy(
  core: Readonly<CoreState>,
  listenerId: PersonId,
  speakerId: PersonId,
): Fact {
  const speaker = core.people.get(speakerId)!;
  const tie = familyFactsOf(core.people.get(listenerId)!).get(speakerId);
  return {
    text:
      (tie && kinAddress(tie.relation, speaker.looks?.gender ?? "")) ??
      speaker.givenName,
    sourceRecordIds: [tie?.factId ?? speakerId],
  };
}

/** The facts the player's own answers can add, from the player's records. */
function playerFacts(
  core: Readonly<CoreState>,
  playerId: PersonId,
  last: LastLine,
  otherId?: PersonId,
): { facts: Facts; stage?: string } {
  const player = core.people.get(playerId)!;
  const facts: Facts = {};
  const mine = namedJobOf(core, player);
  if (mine) {
    facts["my-employer"] = {
      text: employerText(mine.org),
      sourceRecordIds: [mine.job.id, mine.org.id],
    };
    Object.assign(
      facts,
      workDetail(core, player, mine, { position: "my-position" }),
    );
  }
  // How long the player has worked there; a home answer counts its own years.
  const tenure = last.kind.startsWith("home")
    ? undefined
    : tenureYears(startedOf(core, player), core.date);
  if (tenure) facts.years = tenure;
  const place = corePlaceByJurisdictionId(player.placeId as never);
  if (place)
    facts["my-place"] = {
      text: spoken(place),
      sourceRecordIds: [player.householdId],
    };
  // News: what the story or the change has to do with the player.
  // Where they stand: whether the player's own view on the same question is
  // on the same side, the other side, or none.
  if (last.kind === "own-view" && last.subject.news?.question) {
    const mine = newsStake(core, playerId, last.subject);
    const theirs = last.subject.facts["side-for"] ? "for" : "against";
    if (mine.reason === "stance")
      facts[mine.side === theirs ? "my-same" : "my-other"] = {
        text: "yes",
        sourceRecordIds: mine.recordIds,
      };
  }
  if (last.kind === "news") {
    const stake = newsStake(core, playerId, last.subject);
    Object.assign(facts, stakeMarks(stake, "my-"));
    // No stake in it: the player may say they have no view yet.
    if (stake.reason === "none")
      facts["my-none"] = { text: "yes", sourceRecordIds: [playerId] };
    // One screen names a thing once: where the headline already says the
    // question, a stand names the person told instead.
    const other = otherId ? core.people.get(otherId) : undefined;
    if (headlineSays(last.facts) && other?.givenName) {
      facts["about-said"] = { text: "yes", sourceRecordIds: [last.subject.id] };
      facts.first = calledBy(core, playerId, other.id as PersonId);
    } else
      facts["about-unsaid"] = {
        text: "yes",
        sourceRecordIds: [last.subject.id],
      };
  }
  // Asked whether they saw the President's address, the player says yes only
  // when their own record holds it; else they missed it.
  if (last.kind === "address") {
    const saw = core.knowledgeByPerson.get(playerId)?.get(ADDRESS_FACT.event);
    if (saw) facts.seen = { text: "", sourceRecordIds: [saw.value] };
    else
      facts.missed = {
        text: "",
        sourceRecordIds: [last.subject.aboutId ?? last.subject.id],
      };
  }
  let stage: string | undefined;
  if (last.kind === "home" || last.kind === "home-new") {
    // The move the run of the years before the start recorded, and where
    // the player was born, from the run's birth record (or the opening's).
    const moved = preStartHistory(core as CoreState, {
      kind: PERSON_MOVED_IN,
      personId: player.id,
    })[zero];
    const born =
      preStartHistory(core as CoreState, {
        kind: "person.birth",
        personId: player.id,
      }).find((row) => row.placeId === player.placeId) ??
      (player.pastFacts ?? []).find(
        (row) =>
          row.kind === "birthplace" && row.facts?.placeId === player.placeId,
      );
    if (moved) {
      facts.years = {
        text: String(
          Number(core.date.slice(zero, core.date.indexOf("-"))) -
            Number(moved.date.slice(zero, moved.date.indexOf("-"))),
        ),
        sourceRecordIds: [moved.id],
      };
      stage = "moved";
    } else if (born) stage = "born";
  }
  if (last.kind === "home-reply") {
    const theirs = last.facts.place?.text;
    if (theirs && theirs === facts["my-place"]?.text) stage = "same";
  }
  if (
    (last.kind === "mutual" || last.kind === "asked-mutual") &&
    last.subject.aboutId
  ) {
    const seen = lastContact(core, playerId, last.subject.aboutId);
    if (seen)
      facts["my-when"] = {
        text: spokenWhen(seen.date, core.date),
        sourceRecordIds: [seen.tieId],
      };
    else facts["my-not"] = { text: "", sourceRecordIds: [playerId] };
  }
  if (last.kind === "news" && last.subject.aboutId)
    stage = knowsNews(core, playerId, last.subject.aboutId)
      ? "heard"
      : "not-heard";
  if (last.kind === "school") stage = schoolStage(core, player);
  if (last.kind === "kin" && last.subject.aboutId) {
    const relative = core.people.get(last.subject.aboutId);
    if (relative?.householdId === player.householdId)
      facts.housemate = { text: "", sourceRecordIds: [player.householdId] };
  }
  return { facts, ...(stage ? { stage } : {}) };
}

/** A line as said, with the mined sentence that said it. */
type Said = Omit<WordedLine, "asks" | "afterPlain">;

/** Which wordings of a move may say a line: those of some moves only, or only those that ask nothing. */
interface WordingPick {
  keys?: readonly string[];
  statementsOnly?: boolean;
  /** The bank the moves come from, when it is not the line's own (an acknowledgment offered as an answer). */
  from?: { subject: string; part: ConversationPart };
}
const ALL: WordingPick = {};

/** The English engine words the move; the director says which it is, who says it and what it answers. */
function worded(
  core: Readonly<CoreState>,
  data: ConversationData,
  speakerId: PersonId,
  kind: string,
  part: ConversationPart,
  pick: WordingPick,
  facts: Facts,
  momentKey: string,
  stage = "default",
  about?: Subject,
): WordedLine | null {
  const person = about?.aboutId ? core.people.get(about.aboutId) : undefined;
  return wordConversationMove({
    seed: core.seed,
    subject: kind,
    part,
    speakerId,
    traits: core.people.get(speakerId)?.traits ?? {},
    facts,
    momentKey,
    stage,
    ...(person ? { about: { gender: person.looks?.gender } } : {}),
    ...(about?.facts.relation
      ? { relationText: about.facts.relation.text }
      : {}),
    ...(pick.keys ? { keys: pick.keys } : {}),
    ...(pick.statementsOnly ? { statementsOnly: true } : {}),
    ...(pick.from ? { from: pick.from } : {}),
    words: data,
  });
}

/** A line as said, for the talk's record. */
function words(...args: Parameters<typeof worded>): Said | null {
  const line = worded(...args);
  if (!line) return null;
  const { asks, afterPlain, ...said } = line;
  void asks;
  void afterPlain;
  return said;
}

/** The bank a question about the player's own record is asked from: as news to someone who doesn't know it. */
function askedKind(
  core: Readonly<CoreState>,
  data: ConversationData,
  askerId: PersonId,
  playerId: PersonId,
  subject: Subject,
): string {
  const fresh = `${subject.kind}-new`;
  return subject.own &&
    conversationHas(fresh, undefined, data) &&
    !knowsTruth(core, askerId, playerId, subject.own)
    ? fresh
    : subject.kind;
}

/** The other person asks about one of the player's subjects. */
function askSubject(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  subject: Subject,
): boolean {
  const { playerId, otherId } = conversation;
  // Nobody asks what they already know (a relative asking "Where do you come
  // from?", batch 11).
  if (subject.own && knowsTruth(core, otherId, playerId, subject.own)) {
    conversation.used.push(subject.id);
    return false;
  }
  const kind = askedKind(core, data, otherId, playerId, subject);
  const momentKey = `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:ask`;
  // A question the engine composes, where the subject has one (news: "What
  // do you make of {topic} closing?"), else a wording of the bank's.
  const composedAsk = composedLine(
    core,
    otherId,
    `${kind}-ask`,
    subject.facts,
    "default",
    momentKey,
  );
  const line = composedAsk
    ? { ...composedAsk, asks: asksQuestion(composedAsk), afterPlain: false }
    : words(
        core,
        data,
        otherId,
        kind,
        "ask",
        ALL,
        subject.facts,
        momentKey,
        "default",
        subject,
      );
  conversation.used.push(subject.id);
  if (!line) return false;
  const before = conversation.last;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: subject.id,
    kind,
    act: "ask",
    ...line,
  });
  conversation.last = {
    subject,
    kind,
    facts: subject.facts,
    stage: subject.stage ?? "default",
  };
  if (!conversation.topics.length) conversation.topicFacts = subject.facts;
  conversation.topics.push(subject.id);
  offerChoices(core, conversation, data);
  // A question the player has no answer to is not asked (someone who never
  // saw the President's address asking about it gets nothing back): the
  // talk goes on to something else.
  if (!conversation.choices.length) {
    conversation.lines.pop();
    conversation.topics.pop();
    if (before) conversation.last = before;
    else delete conversation.last;
    conversation.lies = [];
    return false;
  }
  return true;
}

/** The other person raises one of their own subjects. */
function raiseSubject(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  subject: Subject,
  /** A side remark on the topic in hand, not a topic of its own. */
  remark = false,
  /** Lines already worded that raise it (what they brought up), said instead. */
  said?: readonly { text: string; sourceRecordIds: readonly string[] }[],
): boolean {
  const { playerId, otherId } = conversation;
  conversation.used.push(`${otherId}>${subject.id}`);
  const then = data.otherRaises[subject.kind];
  if (!then) return false;
  const momentKey = `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:theirs`;
  // A subject whose raise the engine composes: the address's point, or one
  // with a `<kind>-say` sentence in the bank (where they stand).
  const composedRaise =
    subject.kind === POINT
      ? POINT
      : composedConversationBank(`${subject.kind}-say`)
        ? `${subject.kind}-say`
        : null;
  const composed =
    !said && composedRaise
      ? composedLine(
          core,
          otherId,
          composedRaise,
          subject.facts,
          subject.stage ?? "default",
          momentKey,
          saidParts(conversation, otherId),
        )
      : null;
  const line = said
    ? null
    : composed
      ? composed
      : words(
          core,
          data,
          otherId,
          subject.kind,
          "raise",
          ALL,
          subject.facts,
          momentKey,
          subject.stage ?? "default",
          subject,
        );
  const lines = said ?? (line ? [line] : []);
  if (!lines.length) return false;
  for (const row of lines)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: `${otherId}>${subject.id}`,
      kind: then.kind,
      act: said || subject.kind === "own-work" ? "tell" : "ask",
      ...row,
      // The line stands on its subject's records too, even when the words
      // need none of its facts ("We're being evicted." cites the eviction).
      sourceRecordIds: [
        ...new Set([
          ...row.sourceRecordIds,
          ...Object.values(subject.facts).flatMap(
            (fact) => fact.sourceRecordIds,
          ),
        ]),
      ],
    });
  // Someone both know, or news both may know, is shared: neither raises it again.
  if (subject.kind === "mutual" || subject.kind === "news")
    conversation.used.push(subject.id);
  // Who a relative of theirs is, the player now knows (and so does anyone
  // else in the room), told the way a true answer is: the next talk asks
  // after them by name instead of introducing them again.
  if (subject.kind === "kin" && subject.own) {
    const toldId = `conversation:${otherId}:${playerId}:${core.date}:${conversation.lines.length}:${subject.id}`;
    applyCoreEvent(core as CoreState, {
      id: toldId,
      date: core.date,
      kind: data.toldEvent,
      personIds: [playerId, ...conversation.presentIds],
      witnessIds: [otherId],
      placeId: core.people.get(playerId)!.placeId,
      facts: { [subject.own.key]: subject.own.value },
      source: {
        tag: "SOURCED",
        citation: "Recorded conversation: the relative the speaker named.",
        asOf: core.date,
      },
    });
    conversation.recorded.push(toldId);
  }
  // What they said they stand for, the player now knows (and so does anyone
  // else in the room): the card reads this key. A look at whether there is
  // anything to say (the room's check) teaches nothing: only a talk the
  // player has does.
  if (subject.learned && !conversation.look) {
    const api = coreAPI(core as CoreState);
    const sourceId = `conversation:${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.kind}`;
    for (const hearerId of [playerId, ...conversation.presentIds]) {
      learnView(api, hearerId, otherId, subject.learned.recordIds, sourceId);
      if (subject.learned.question)
        learnViewQuestion(
          api,
          hearerId,
          otherId,
          subject.learned.question,
          sourceId,
        );
    }
  }
  // Theirs, not the player's: no own record the player could lie about.
  const raised: Subject = {
    id: `${otherId}>${subject.id}`,
    kind: subject.kind,
    facts: subject.facts,
    ...(subject.aboutId ? { aboutId: subject.aboutId } : {}),
    ...(subject.stage ? { stage: subject.stage } : {}),
    ...(subject.point ? { point: subject.point } : {}),
    ...(subject.news ? { news: subject.news } : {}),
  };
  conversation.last = {
    subject: raised,
    kind: then.kind,
    facts: subject.facts,
    stage: then.stage,
  };
  if (!remark) {
    if (!conversation.topics.length) conversation.topicFacts = subject.facts;
    conversation.topics.push(raised.id);
  }
  offerChoices(core, conversation, data);
  return true;
}

/** The other person's own subject of a kind, not yet said, that the banks can word. */
function tellable(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  kind: string,
): Subject | undefined {
  const { playerId, otherId } = conversation;
  return subjectsBetween(core, otherId, playerId, conversation.director).find(
    (row) =>
      row.kind === kind &&
      !conversation.used.includes(`${otherId}>${row.id}`) &&
      !!data.otherRaises[row.kind] &&
      !!(row.kind === POINT
        ? composedLine(
            core,
            otherId,
            POINT,
            row.facts,
            row.stage ?? "default",
            `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${row.id}:theirs`,
          )
        : words(
            core,
            data,
            otherId,
            row.kind,
            "raise",
            ALL,
            row.facts,
            `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${row.id}:theirs`,
            row.stage ?? "default",
            row,
          )),
  );
}

/** The other person asks about the first of these kinds they share with the player, else raises one of their own. */
function otherAsks(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  order: readonly string[],
): boolean {
  const { playerId, otherId } = conversation;
  // News is raised by whoever heard it, saying what it was; asked about by
  // someone who may not know it, it is a "What do you think?" about nothing.
  const subjects = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  ).filter((row) => row.kind !== "news" && !conversation.used.includes(row.id));
  const other = core.people.get(otherId)!;
  const sameWork = order.includes("own-work")
    ? subjects.find(
        (row) =>
          row.kind === "own-work" &&
          jobOf(core, other)?.org.id === row.own?.value,
      )
    : undefined;
  const ordered = [
    ...(sameWork ? [sameWork] : []),
    ...order.flatMap((kind) =>
      subjects.filter((row) => row.kind === kind && row !== sameWork),
    ),
  ];
  for (const subject of ordered)
    if (askSubject(core, conversation, data, subject)) return true;
  return otherRaises(core, conversation, data, order);
}

/** The other person raises the first of these kinds of their own. */
function otherRaises(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  order: readonly string[],
): boolean {
  const { playerId, otherId } = conversation;
  const theirs = subjectsBetween(
    core,
    otherId,
    playerId,
    conversation.director,
  ).filter(
    (row) =>
      order.includes(row.kind) &&
      data.otherRaises[row.kind] &&
      !conversation.used.includes(`${otherId}>${row.id}`) &&
      !conversation.used.includes(row.id),
  );
  for (const subject of theirs)
    if (raiseSubject(core, conversation, data, subject)) return true;
  return false;
}

/**
 * What the place and the occasion open with when no recorded event leads:
 * what they share, then the player's work or home, then the day's news, the
 * President's address while it is recent (at home, where relatives don't
 * talk about work or home, the address is what the evening gives), and last
 * the quiet day itself.
 */
const OPENING_ORDER = [
  "shared-school",
  "shared-work",
  "own-work",
  "home",
  // A relative the listener has not met, by name, with their town or work
  // (owner, Nov 11: "This introduces people to their world").
  "kin",
  "address",
  "quiet",
];

/** The subjects that are the two speakers' relationship: what they share. */
const SHARED_KINDS = ["shared-school", "shared-work"];

/**
 * The key a listener remembers each topic the player talked over with them
 * under (owner, Nov 1: a talk with nothing new is no talk; remembering only
 * the last topic let two topics alternate forever).
 */
const talkedKeyPrefix = (playerId: PersonId) => `talk:${playerId}:topic:`;
const talkedKey = (playerId: PersonId, topic: string) =>
  `${talkedKeyPrefix(playerId)}${topic}`;

/** The subjects a person tells as news of their own life; a reaction to one is never answered with small talk. */
const NEWS_SUBJECTS: ReadonlySet<string> = new Set([
  "job-lost",
  "job-cause",
  "job-hope",
  "eviction",
  "eviction-cause",
  "eviction-where",
  "eviction-until",
  "victimization",
  "death-news",
  "illness-news",
  "prison-news",
  "job-new",
  "job-new-detail",
  "job-new-told",
]);

/** The kind of a subject the talk opened, by its id ("own-work:...", "them>mutual:..."). */
function subjectKindOf(subjectId: string): string {
  const own = subjectId.replace(/^[^>]*>/, "");
  return own.slice(zero, own.indexOf(":"));
}

/**
 * After an answer that raised nothing, or a silence: the main topic may lead
 * to one related topic, then the other person closes the talk (owner,
 * Oct 14, 2026, night).
 */
function carryOn(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  /** The last line already ends the talk if nothing follows: no goodbye. */
  options: { quietly?: boolean } = {},
): void {
  const main = conversation.topics[zero];
  const related = main ? (data.related[subjectKindOf(main)] ?? []) : [];
  // Asked to sit a while, they bring up what they have, as a talk opens.
  const next = options.quietly && !related.length ? OPENING_ORDER : related;
  if (
    conversation.topics.length > one ||
    !otherAsks(core, conversation, data, next)
  ) {
    if (options.quietly) {
      conversation.choices = [];
      conversation.lies = [];
    } else endConversation(core, conversation, data);
  }
}

/**
 * The talk's main topic: the subject of either person that the biggest
 * recent recorded event is about, never the topic of their last talk.
 */
function mainTopic(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): {
  subject: Subject;
  asks: boolean;
  /** Where they stand, when another subject leads: said if the leading one cannot be. */
  standing?: { subject: Subject; asks: boolean };
} | null {
  const { playerId, otherId, director } = conversation;
  let best: { subject: Subject; asks: boolean; weight: number } | null = null;
  let standing: { subject: Subject; asks: boolean; weight: number } | null =
    null;
  // The occasion comes first: a talk a scene opens is about the scene's
  // moment.
  const occasion = conversation.occasion;
  const consider = (subject: Subject, asks: boolean, holderId: PersonId) => {
    if (
      conversation.used.includes(subject.id) ||
      conversation.used.includes(`${otherId}>${subject.id}`)
    )
      return;
    // A scene's moment with the other person in it (a reunion) is about the
    // two of them: what they share stands for it when no subject is about
    // its cause, ahead of any other recorded event.
    const weight = !occasion
      ? topicWeight(core, director, holderId, subject, data)
      : isAbout(subject, occasion, data)
        ? // What the other person has to tell comes before the player's
          // question about the same thing.
          asks
          ? Number.MAX_VALUE
          : Number.POSITIVE_INFINITY
        : occasion.counterpartIds.includes(otherId) &&
            SHARED_KINDS.includes(subject.kind)
          ? Number.MAX_VALUE
          : topicWeight(core, director, holderId, subject, data);
    // Where they stand politically competes with small talk only: any
    // recorded event, or the address while it is news, leads before it.
    if (subject.weight !== undefined) {
      if (weight > zero && (!standing || weight > standing.weight))
        standing = { subject, asks, weight };
      return;
    }
    if (weight > zero && (!best || weight > best.weight))
      best = { subject, asks, weight };
  };
  for (const subject of subjectsBetween(core, playerId, otherId, director))
    if (
      conversationHas(subject.kind, "ask", data) ||
      composedConversationBank(`${subject.kind}-ask`)
    )
      consider(subject, true, playerId);
  for (const subject of subjectsBetween(core, otherId, playerId, director))
    if (data.otherRaises[subject.kind]) consider(subject, false, otherId);
  const lead = best as { subject: Subject; asks: boolean } | null;
  const stand = standing as { subject: Subject; asks: boolean } | null;
  return lead ? { ...lead, ...(stand ? { standing: stand } : {}) } : stand;
}

/**
 * Opens a conversation: a greeting, then the talk's one main topic: the
 * biggest recent recorded event of either person, else what they share,
 * else the player's work or home.
 */
export function openConversation(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
  options: {
    presentIds?: readonly PersonId[];
    data?: ConversationData;
    /** The director's ledger, for what happened to whom. */
    director?: Director;
    /** The id of the player's moment the talk is the occasion of (a scene's). */
    occasionId?: string;
    /** The minute of the day the talk is had at, where the screen knows it better than the clock (the opening evening). */
    minuteOfDay?: number;
    /** The organization whose place the player came to (a visit), where the screen knows it. */
    visitOrganizationId?: string;
    /** Only looking whether there is anything to say (the room's check): nothing is learned. */
    look?: boolean;
  } = {},
): Conversation {
  const data = options.data ?? CONVERSATION_DATA;
  const conversation: Conversation = {
    playerId,
    otherId,
    presentIds: (options.presentIds ?? []).filter(
      (id) => id !== playerId && id !== otherId,
    ),
    lines: [],
    choices: [],
    lies: [],
    used: [],
    recorded: [],
    topics: [],
    ...(options.director ? { director: options.director } : {}),
    ...(options.minuteOfDay !== undefined
      ? { minuteOfDay: options.minuteOfDay }
      : {}),
    ...(options.visitOrganizationId
      ? { visitOrganizationId: options.visitOrganizationId }
      : {}),
    ...(options.look ? { look: true } : {}),
  };
  const occasion = options.occasionId
    ? options.director?.ledger.people
        .get(playerId)
        ?.momentsById.get(options.occasionId)
    : undefined;
  if (occasion) conversation.occasion = occasion;
  // The talk an accepted interview stages is the sitting for it, not small talk.
  const sitting = sittingFor(core, playerId, otherId, occasion);
  if (sitting)
    return openSitting(
      core,
      conversation,
      data,
      sitting,
      replyReach(core, playerId),
    );
  // A greeting first; a "How are you?" would need its own answer, so only a
  // greeting that asks nothing opens. The player's name only if they know it.
  const player = core.people.get(playerId)!;
  const knows = core.people.get(otherId)?.knownIds.has(playerId);
  // People who live together don't greet each other at home.
  const housemate =
    core.people.get(otherId)?.householdId === player.householdId;
  const greeting = housemate
    ? null
    : greetingLine(core, data, playerId, otherId, !!knows);
  if (greeting) {
    // The hello is its own short turn, as people say it ("Hi." then "Back
    // again?"): a composed greeting's opener is said first, the rest after.
    const parts = greeting.wording?.parts ?? [];
    const split =
      parts.length > one && parts[zero]!.includes(".greet-open-")
        ? /^(?<hello>.*?[.!?]) (?<rest>.+)$/s.exec(greeting.text)?.groups
        : undefined;
    const said =
      split?.hello && split.rest && greeting.wording
        ? [
            {
              ...greeting,
              text: split.hello,
              wording: {
                ...greeting.wording,
                parts: [parts[zero]!],
                facts: [],
              },
            },
            {
              ...greeting,
              text: split.rest,
              wording: { ...greeting.wording, parts: parts.slice(one) },
            },
          ]
        : [greeting];
    for (const line of said)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: `greet:${otherId}`,
        kind: "greet",
        act: "tell",
        ...line,
      });
  }
  // At home, a scene with the household's hard news opens by asking for the player's attention
  // ("We need to talk.") instead of a greeting (owner, Oct 14, 2026, night: a
  // mother asking the player to sit down).
  const familyNews =
    !!occasion &&
    [
      ...SITUATION_LIBRARY.scheduling.householdScenes,
      ...(SITUATION_LIBRARY.scheduling.householdRecordScenes ?? []),
    ].includes(occasion.label);
  const opener =
    housemate && familyNews
      ? words(
          core,
          data,
          otherId,
          "family-open",
          "open",
          ALL,
          {},
          `${playerId}:${otherId}:${occasion.id}:family-open`,
        )
      : null;
  if (opener)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: `family-open:${occasion!.id}`,
      kind: "family-open",
      act: "tell",
      ...opener,
      sourceRecordIds: [occasion!.causeId, ...opener.sourceRecordIds],
    });
  // Away from a scene's occasion, they mention the newest change they know
  // of and who they blame (bring-it-up, which passes both on). Those lines
  // are the talk's raise of that news, said once: the talk goes on from it.
  const brought = occasion
    ? null
    : bringItUp(core as CoreState, otherId, playerId);
  let raisedBrought = false;
  if (brought) {
    conversation.recorded.push(brought.toldEventId);
    const storyId = storyOfReadEvent(brought.change.eventId);
    const ids = [
      `news:${brought.change.eventId}`,
      ...(storyId ? [`news:${storyId}`] : []),
    ];
    // A printed story is raised by its own headline and outlet ("I saw it in
    // the Courier: ..."); other news by the lines bring-it-up worded.
    const story = storyId
      ? storiesHeard(coreAPI(core), otherId).find((row) => row.id === storyId)
      : undefined;
    const headline = story
      ? printedSubject(core, story, conversation.director)
      : null;
    const news =
      headline ??
      subjectsBetween(core, otherId, playerId, conversation.director)
        .filter((row) => ids.includes(row.id))
        .at(zero);
    raisedBrought = news
      ? raiseSubject(
          core,
          conversation,
          data,
          news,
          false,
          headline ? undefined : brought.lines,
        )
      : false;
    // News the talk can't go on from is still said, and not raised again.
    if (!raisedBrought) {
      for (const line of brought.lines)
        conversation.lines.push({
          speakerId: otherId,
          subjectId: ids[zero]!,
          kind: "brought-up",
          act: "tell",
          ...line,
        });
      conversation.used.push(...ids);
    }
  }
  // A topic already talked over isn't opened again (the listener remembers
  // each one; a new event is a new topic id).
  for (const [key, fact] of core.knowledgeByPerson.get(otherId) ?? [])
    if (key.startsWith(talkedKeyPrefix(playerId)))
      conversation.used.push(fact.value);
  const main = raisedBrought ? null : mainTopic(core, conversation, data);
  const open = (topic: { subject: Subject; asks: boolean }) =>
    topic.asks
      ? askSubject(core, conversation, data, topic.subject)
      : raiseSubject(core, conversation, data, topic.subject);
  // The leading subject first; when it cannot be said (no wording fits its
  // facts), where they stand, if they would say it, rather than nothing.
  const opened =
    raisedBrought ||
    (main ? open(main) || (!!main.standing && open(main.standing)) : false);
  // A scene's talk keeps to its occasion: if nothing can be said about it,
  // the talk doesn't turn to small talk instead.
  if (
    !opened &&
    (occasion || !otherAsks(core, conversation, data, OPENING_ORDER))
  ) {
    // Hello and goodbye with nothing between is not a talk (owner, Oct 24:
    // "that should be going to the hi, have a good day. That makes no
    // sense."): with nothing on record to say, nothing is said.
    if (conversation.lines.every((line) => line.kind === "greet")) {
      conversation.lines = [];
      conversation.choices = [];
      conversation.lies = [];
      return conversation;
    }
    endConversation(core, conversation, data);
  }
  return conversation;
}

/**
 * A talk the player really opened (the other person said a line) is how the
 * two meet: the encounters engine's own meeting, once per pair, the talk's
 * time together as its hours. Nobody else in the room is met by it. Called
 * only where the player opens a talk, never by a probe of who has something
 * to say (the room's `sceneNow` reads `openConversation` without writing).
 */
export function meetOverTalk(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData = CONVERSATION_DATA,
): boolean {
  const { playerId, otherId } = conversation;
  if (!conversation.lines.some((line) => line.speakerId === otherId))
    return false;
  return meetInTalk(
    coreAPI(core),
    playerId,
    otherId,
    core.people.get(playerId)!.placeId,
    (data.minutesPerExchange * conversation.lines.length) / P.minutesPerHour,
    `conversation:${playerId}:${otherId}:${core.date}:met`,
  );
}

/**
 * Whether the listener already holds the true value: told it, or sharing the
 * record (a coworker at the same employer, a housemate). Then there is
 * nothing false to say, and the scales dim.
 */
function knowsTruth(
  core: Readonly<CoreState>,
  knowerId: PersonId,
  subjectId: PersonId,
  own: { key: string; value: string },
): boolean {
  const known = core.knowledgeByPerson.get(knowerId)?.get(own.key);
  if (known?.value === own.value) return true;
  const knower = core.people.get(knowerId);
  if (!knower) return false;
  // What someone does for a living: their coworkers know, and so does anyone
  // who has worked their campaign or had them work theirs (shared-history.ts).
  if (own.key.endsWith(":employer"))
    return (
      (!!knower.jobId &&
        core.jobs.get(knower.jobId)?.organizationId === own.value) ||
      sharedHistory(core, knowerId, subjectId).some(
        (row) => row.kind === "campaign",
      )
    );
  // Where someone lives and went to school: their household and family
  // know, and so does anyone who has worked their campaign with them.
  return (
    knower.householdId === core.people.get(subjectId)?.householdId ||
    knower.familyIds.has(subjectId) ||
    sharedHistory(core, knowerId, subjectId).some(
      (row) => row.kind === "campaign",
    )
  );
}

interface Claim {
  /** The lie bank's stage: a denial ("none") or a false alternative ("elsewhere"). */
  stage: string;
  value: string;
  facts: Facts;
}

/**
 * The false things the player could claim about their own record: denying it
 * outright, or a real alternative from the records (another employer in
 * town, a place a relative lives). Each contradicts the record it is about.
 */
function lieClaims(
  core: Readonly<CoreState>,
  conversation: Conversation,
  subject: Subject,
): Claim[] {
  const own = subject.own!;
  const player = core.people.get(conversation.playerId)!;
  const key = `${core.seed}:${conversation.playerId}:${conversation.otherId}:${subject.id}`;
  const claims: Claim[] = [];
  if (subject.kind === "own-work") {
    claims.push({ stage: "none", value: "none", facts: {} });
    const nearby = [...(core.peopleByPlace.get(player.placeId) ?? [])]
      .map((id) => jobOf(core, core.people.get(id)!)?.org)
      .filter((org) => org && org.id !== own.value);
    const other = nearby.sort((a, b) =>
      stableHash(`${key}:${a!.id}`).localeCompare(
        stableHash(`${key}:${b!.id}`),
      ),
    )[zero];
    if (other)
      claims.push({
        stage: "elsewhere",
        value: other.id,
        facts: {
          claimed: {
            text: properName(other.name),
            sourceRecordIds: [other.id],
          },
        },
      });
  }
  if (subject.kind === "home") {
    // A lie about where the player is from names another place (owner, Oct 15:
    // never "Not here."): a place a relative or someone the player knows lives
    // in, else any other place the world holds people in.
    const away = awayPlaceOf(core, player, key);
    const place = away
      ? corePlaceByJurisdictionId(away.placeId as never)
      : null;
    if (away && place)
      claims.push({
        stage: "elsewhere",
        value: away.placeId,
        facts: {
          claimed: {
            text: spoken(place),
            sourceRecordIds: [away.recordId],
          },
        },
      });
  }
  return claims.filter((claim) => claim.value !== own.value);
}

/**
 * Another place the player could say they are from, with the record that puts
 * someone there: a living relative's household, else someone the player knows,
 * else anyone the world holds in another place. The pick among equals is a
 * stable ordering by the conversation's key, never a roll.
 */
function awayPlaceOf(
  core: Readonly<CoreState>,
  player: Readonly<PersonState>,
  key: string,
): { placeId: string; recordId: string } | null {
  const away = (ids: Iterable<string>) =>
    [...ids]
      .sort()
      .map((id) => core.people.get(id))
      .filter(
        (row): row is PersonState =>
          !!row?.alive &&
          row.placeId !== player.placeId &&
          row.placeId !== player.countyId &&
          !!corePlaceByJurisdictionId(row.placeId as never),
      )
      .sort((a, b) =>
        stableHash(`${key}:${a.id}`).localeCompare(
          stableHash(`${key}:${b.id}`),
        ),
      )[zero];
  const person =
    away(player.familyIds) ??
    away(player.knownIds) ??
    away(
      [...core.peopleByPlace.entries()]
        .filter(
          ([place]) => place !== player.placeId && place !== player.countyId,
        )
        .flatMap(([, ids]) => [...ids].slice(zero, one)),
    );
  if (person) return { placeId: person.placeId, recordId: person.householdId };
  // No one the world holds lives elsewhere (a played town holds its own
  // people, and the rest of the country only as counts by place): another town
  // of the player's state, which the place records name. The pick among equals
  // is a stable ordering by the conversation's key, never a roll.
  const home = corePlaceByJurisdictionId(player.placeId as never);
  const state = home?.stateJurisdictionKey;
  if (!state) return null;
  let towns = TOWNS_OF_STATE.get(state);
  if (!towns) {
    towns = searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    });
    TOWNS_OF_STATE.set(state, towns);
  }
  const town = towns
    .filter(
      (row) =>
        row.context.jurisdiction.id !== player.placeId &&
        row.context.jurisdiction.id !== player.countyId,
    )
    .sort((a, b) =>
      stableHash(`${key}:${a.key}`).localeCompare(
        stableHash(`${key}:${b.key}`),
      ),
    )[zero];
  return town
    ? {
        placeId: town.context.jurisdiction.id,
        recordId: town.context.jurisdiction.id,
      }
    : null;
}

/** Each state's towns, read once: the places a false answer about home can name. */
const TOWNS_OF_STATE = new Map<string, readonly CorePlace[]>();

/** The kinds the player can raise: the other person has words to reply with. */
function raisable(data: ConversationData, kind: string): boolean {
  return (
    conversationHas(kind, "raise", data) &&
    conversationHas(data.replyKinds[kind] ?? kind, "reply", data)
  );
}

function offerChoices(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): void {
  const { playerId, otherId } = conversation;
  const last = conversation.last!;
  conversation.choices = [];
  conversation.lies = [];
  const own = playerFacts(core, playerId, last, otherId);
  const other = core.people.get(otherId);
  const facts: Facts = {
    ...own.facts,
    ...last.facts,
    // The other person's given name, as the player says it to them.
    ...(other
      ? { "their-first": { text: other.givenName, sourceRecordIds: [otherId] } }
      : {}),
  };
  const stage = own.stage ?? last.stage;
  const turn = conversation.lines.length;
  const between = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  );
  const unused = between.filter(
    (row) =>
      !conversation.used.includes(row.id) &&
      row.id !== last.subject.id &&
      // Never the person or thing just asked about, under another subject.
      !(last.subject.aboutId && row.aboutId === last.subject.aboutId) &&
      raisable(data, row.kind),
  );
  const taken = new Set<string>();
  // A question put to the player is answered before anything is asked back
  // (owner, Oct 29): no reply to it opens with a question of its own.
  const said = conversation.lines.at(-one);
  const putQuestion = !!said && asksQuestion(said);
  // The question's own move, from the bank piece that asked it, and the
  // replies that answer it, where the rules name them.
  const askedMove = said?.wording?.parts.at(-one)?.split(".")[one];
  const fitting = askedMove ? data.answersTo?.[askedMove] : undefined;
  // A reply's second move follows from its first (owner, batch 6): turning
  // the same question back ("I'm from here. And you?"), or asking about their
  // work after naming yours. Never an unrelated subject tacked on.
  const follows = data.follows[last.kind.replace(/-new$/, "")] ?? [];
  const target = (raises: string): Subject | undefined => {
    if (!follows.includes(raises)) return undefined;
    if (raises === last.subject.kind) return last.subject;
    return unused.find((row) => row.kind === raises && !taken.has(row.id));
  };
  // One choice per move, worded from every mined wording of it.
  type Group = { key: string; raises?: string; from?: WordingPick["from"] };
  const groups = new Map<string, Group>(
    conversationMoves(last.kind, "answers", data).map((move) => [
      move.key,
      move,
    ]),
  );
  const seen = new Set<string>();
  const answerBank = `conversation:${last.kind}:answers`;
  const answerWith = (
    group: Group,
    momentKey: string,
    statementsOnly = false,
  ) =>
    worded(
      core,
      data,
      playerId,
      last.kind,
      "answers",
      {
        keys: [group.key],
        ...(group.from ? { from: group.from } : {}),
        ...(statementsOnly ? { statementsOnly } : {}),
      },
      facts,
      `${playerId}:${otherId}:${turn}:${momentKey}`,
      stage,
      last.subject,
    );
  const add = (
    choiceKey: string,
    group: Group,
    raised?: Subject,
    bank = answerBank,
    // A further wording of the same move (when a first one said what another did).
    again = "",
    statementsOnly = false,
  ): void => {
    // Each raised subject has its own moment, so brief answers vary.
    const answer = answerWith(
      group,
      raised ? `${choiceKey}:${raised.id}${again}` : `${choiceKey}${again}`,
      statementsOnly,
    );
    if (!answer) return;
    let head: Said = answer;
    let tail: Said | null = null;
    if (answer.afterPlain) {
      const plain =
        groups.get("plain") && answerWith(groups.get("plain")!, "plain");
      if (plain && !plain.asks) {
        head = plain;
        tail = answer;
      }
    }
    if (putQuestion && fitting && !fitting.includes(choiceKey)) return;
    // Never asked what the line before already said ("I've been there six
    // years." "How long have you been at Kroger?").
    const answeredBy = raised && data.answeredBy?.[raised.kind];
    if (answeredBy && said?.wording?.facts.includes(answeredBy)) return;
    // Turning the question back asks it; nothing more is said.
    if (raised === last.subject && !answer.asks) return;
    // A move that turns the question back says nothing without its subject.
    if (!raised && group.raises && answer.asks) return;
    if (raised && raised !== last.subject) {
      const line = words(
        core,
        data,
        playerId,
        raised.kind,
        "raise",
        ALL,
        raised.facts,
        `${playerId}:${otherId}:${turn}:${raised.id}:raise`,
        "default",
        raised,
      );
      if (!line) return;
      // A turned-back question ("And you?") already asks; it carries no second line.
      if (!answer.asks) tail = line;
    }
    // A reply that ends on a question is offered only where the other person
    // can answer it (owner, Oct 29: "Did you see the President's address?"
    // answered "Oh, okay. What about you?"): it raises a subject they have,
    // asks them to tell more, or makes a move the talk answers (a request, a
    // plea to be left alone, a reaction). Else a wording that asks nothing
    // stands in, or the reply is not offered.
    const asksLast = tail ? asksQuestion(tail) : answer.asks;
    // A question the player asks is answered from the record or the reply is
    // not offered (Fable A, Nov 13, rule 5; P1, Curtisville: "We're being
    // evicted." / "Oh, no. How long do we have?" / "I've got a few things to
    // get done this morning."): the subject it asks for must be one the other
    // person can tell now, with words to tell it. Bad news is otherwise only
    // taken in, so a question about it goes unanswered.
    const toldBack = data.tells?.[last.kind]?.[choiceKey];
    const heard =
      // What say() reads: the raised subject between them, and the other
      // person's own words for it.
      (!!raised &&
        between.some((row) => row.id === raised.id) &&
        !!replyFacts(core, otherId, raised)) ||
      (toldBack
        ? !!tellable(core, conversation, data, toldBack)
        : NEWS_SUBJECTS.has(last.subject.kind) && !asksLast) ||
      // Every reply to the address's point is answered, in composed words,
      // and so is asking someone why they stand where they do.
      last.kind === POINT ||
      (last.kind === "own-view" && choiceKey === OWN_VIEW_WHY) ||
      REPLY_MOVES.answerable.includes(replyMoveOf(last.kind, choiceKey));
    const text = joinedReply(head, tail);
    const opensAsking = asksQuestion({
      text: text.match(/^[^.?!]*[.?!]/)?.[zero] ?? text,
    });
    if ((asksLast && !heard) || (putQuestion && opensAsking)) {
      if (!statementsOnly && !raised)
        add(choiceKey, group, raised, bank, again, true);
      return;
    }
    if (seen.has(text)) return;
    seen.add(text);
    if (raised) taken.add(raised.id);
    conversation.choices.push({
      key: `${turn}:${choiceKey}${raised ? `:${raised.id}` : ""}${again}`,
      move: choiceKey,
      text,
      answers: last.subject.id,
      ...(raised ? { raises: raised.id } : {}),
      lie: false,
      sourceRecordIds: [
        ...new Set([...head.sourceRecordIds, ...(tail?.sourceRecordIds ?? [])]),
      ],
      wording: {
        bank,
        parts: [...head.wording.parts, ...(tail?.wording.parts ?? [])],
        stage,
        facts: [
          ...new Set([...head.wording.facts, ...(tail?.wording.facts ?? [])]),
        ],
      },
      ...(tail
        ? {
            tail: {
              text: tail.text,
              sourceRecordIds: tail.sourceRecordIds,
              parts: tail.wording.parts,
            },
          }
        : {}),
    });
  };
  // Every reply the bank words for this line: each move said plainly, and
  // carried on to the subject it leads to, and each way of taking it in
  // ("Okay.", "Right."). What the player already told is not offered again.
  const told = OWN_OF[last.kind];
  const wanted = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  const offer = (again: string) => {
    for (const [choiceKey, group] of groups) {
      if (
        choiceKey === "own" &&
        told &&
        conversation.used.includes(`${told}:${playerId}`)
      )
        continue;
      // Asking for more ("What happened?") only when the other person has it
      // on record and in words; a question nobody can answer is not offered.
      if (
        data.tells?.[last.kind]?.[choiceKey] &&
        !tellable(core, conversation, data, data.tells[last.kind]![choiceKey]!)
      )
        continue;
      const raises = group.raises;
      const subject = raises ? target(raises) : undefined;
      if (subject && !again) add(choiceKey, group, subject);
      add(choiceKey, group, undefined, answerBank, again);
    }
  };
  offer("");
  // Four replies that each answer the line: where a move's wordings collided
  // ("Of course." said twice), another wording of a move stands in for it,
  // never an acknowledgment.
  for (
    let again = one;
    again <= P.two + one && conversation.choices.length < wanted;
    again += one
  )
    offer(`:more${again}`);
  // "Okay." and "All right." take in a statement; they are not an answer to a
  // question ("How's Keanu?"), and each reply moves the talk.
  const question = conversation.lines.at(-one);
  // A bare "Okay." never answers bad news either: it does not continue the talk.
  // Nor the address's point: each reply there is a move about what was said.
  if (
    question?.act !== "ask" &&
    !(question && asksQuestion(question)) &&
    !NEWS_SUBJECTS.has(last.subject.kind) &&
    last.kind !== POINT
  ) {
    for (const move of conversationMoves("ack", "reply", data))
      add(
        `ack:${move.key}`,
        { ...move, from: { subject: "ack", part: "reply" } },
        undefined,
        "conversation:ack:reply",
      );
  }
  // The other person's last line, by the move it made: a question asks.
  const before = conversation.lines.at(-one);
  conversation.choices = rankChoices(core, playerId, conversation.choices, {
    kind: last.kind,
    ...(before ? { previous: asksQuestion(before) ? "ask" : before.act } : {}),
    table: data.calibration ?? CALIBRATION,
  });
  // One screen names a thing once (lead, Nov 11): of the replies that would
  // say the same record's words, one stays: a reply that carries the talk on
  // (turns the question back, asks more) before one that only answers, then
  // by rank.
  if (data.namesOnce?.kinds.includes(last.kind)) {
    const named = new Set<string>();
    const kept = new Set<ConversationChoice>();
    const ranked = conversation.choices;
    for (const choice of [
      ...ranked.filter((row) => row.raises),
      ...ranked.filter((row) => !row.raises),
    ]) {
      const said = (choice.wording?.facts ?? [])
        .map((key) => facts[key]?.text)
        .filter((text): text is string => !!text);
      if (said.some((text) => named.has(text))) continue;
      for (const text of said) named.add(text);
      kept.add(choice);
    }
    conversation.choices = ranked.filter((row) => kept.has(row));
  }
  // The scales: a question about the player's own record they could deny.
  const asked = conversation.lines.at(-one);
  if (
    last.subject.own &&
    asked?.speakerId === otherId &&
    asked.act === "ask" &&
    !knowsTruth(core, otherId, playerId, last.subject.own)
  )
    conversation.lies = lieChoices(core, conversation, data, turn, facts);
}

/**
 * How far the player's replies reach: above zero for someone who carries a
 * talk on, below it for someone who keeps it short. The trait engine decides
 * it (`conversation.reply-reach`); the calibration table reaches each reply's
 * wording through its voice (`words`), so the same traits are not counted
 * twice. The sitting orders its answers by it too.
 */
function replyReach(core: Readonly<CoreState>, playerId: PersonId): number {
  const player = core.people.get(playerId);
  return player
    ? decisionLean(
        core,
        player,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      )
    : zero;
}

/**
 * The four replies a turn offers, ranked by the player's traits: someone who carries talk on sees
 * the replies that raise or ask first, someone who keeps it short sees plain
 * answers and acknowledgments first. Each is a different move: a second
 * wording of a move offered is never one of them. "Say nothing" is a control beside them
 * (`sayNothing`), never one of the four.
 */
function rankChoices(
  core: Readonly<CoreState>,
  playerId: PersonId,
  pool: readonly ConversationChoice[],
  after: { kind: string; previous?: string; table: CalibrationTable },
): ConversationChoice[] {
  // The owner's grade of each reply's move after the other person's line
  // (`movePairs`, "ask>note"): a pair graded unnatural is offered after the
  // ones that read right, one graded natural before them (owner, Oct 29:
  // calibration reaches every line). Ungraded, every factor is 1 and the
  // order is the reach order below.
  const pair = (row: ConversationChoice) =>
    movePairFactor(
      after.previous,
      replyMoveOf(after.kind, row.move),
      after.table,
    );
  const reach = replyReach(core, playerId);
  const carries = (row: ConversationChoice) =>
    !!row.raises || !!row.tail || asksQuestion(row);
  const brief = (row: ConversationChoice) => row.move.startsWith("ack:");
  const place = (row: ConversationChoice) =>
    reach >= zero
      ? carries(row)
        ? zero
        : brief(row)
          ? P.two
          : one
      : carries(row)
        ? P.two
        : brief(row)
          ? one
          : zero;
  const ranked = pool
    .map((row, at) => ({ row, at }))
    .sort(
      (a, b) =>
        pair(b.row) - pair(a.row) || place(a.row) - place(b.row) || a.at - b.at,
    )
    .map(({ row }) => row);
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  // Four replies are four answers, never one reworded (owner, Oct 27, 4 PM
  // Eastern: "four replies are four different answers"): a second wording of
  // a move already offered is not offered.
  const moves = new Set<string>();
  return ranked
    .filter((row) => {
      const move = row.move.startsWith("ack:") ? "ack" : row.move;
      if (moves.has(move)) return false;
      moves.add(move);
      return true;
    })
    .slice(zero, count);
}

/**
 * The player says nothing (the smaller control beside the four replies): the
 * other person takes the silence and carries on with something else, or the
 * talk ends.
 */
export function sayNothing(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData = CONVERSATION_DATA,
): Conversation {
  // In a sitting, silence declines the question put.
  if (conversation.sitting) return declineInSitting(core, conversation, data);
  carryOn(core, conversation, data);
  return conversation;
}

/**
 * The scales' set: every true choice made false. Each lie keeps its choice's
 * move (what it raises or turns back) and swaps the answer for a mined denial
 * or false alternative, alternating so the set holds both; a choice whose lie
 * would read the same as another's is left out.
 */
function lieChoices(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  turn: number,
  facts: Facts,
): ConversationChoice[] {
  const { playerId, otherId } = conversation;
  const last = conversation.last!;
  const own = last.subject.own!;
  const bases = lieClaims(core, conversation, last.subject).flatMap((claim) => {
    const momentKey = `${playerId}:${otherId}:${turn}:lie:${claim.stage}`;
    let said = words(
      core,
      data,
      playerId,
      last.kind,
      "lie",
      ALL,
      { ...last.facts, ...claim.facts },
      momentKey,
      claim.stage,
    );
    // No mined lie for this question: a false alternative is the plain
    // answer with the false fact in it ("I'm at {claimed}."), and a denial is
    // what someone without that record says ("Not right now.").
    const claimed = claim.facts.claimed;
    if (!said && claimed)
      said = words(
        core,
        data,
        playerId,
        last.kind,
        "answers",
        { keys: ["plain"] },
        Object.fromEntries(
          Object.entries(facts).map(([key, fact]) => [
            key,
            OWN_SLOTS.includes(key) ? claimed : fact,
          ]),
        ),
        momentKey,
      );
    if (!said && claim.stage === "none" && last.kind.startsWith("own-work"))
      said = words(
        core,
        data,
        playerId,
        "other-work",
        "reply",
        ALL,
        {},
        momentKey,
        "none",
      );
    return said ? [{ claim, said }] : [];
  });
  if (!bases.length) return [];
  const out: ConversationChoice[] = [];
  const seen = new Set<string>();
  const sources = conversation.choices.length
    ? conversation.choices
    : [undefined];
  sources.forEach((choice, index) => {
    for (let step = zero; step < bases.length; step += one) {
      const { claim, said } = bases[(index + step) % bases.length]!;
      const text = joinedReply(said, choice?.tail);
      if (seen.has(text)) continue;
      seen.add(text);
      out.push({
        key: `${turn}:lie:${claim.stage}:${choice?.key ?? "plain"}`,
        move: `lie-${claim.stage}${choice?.tail ? `+${choice.move}` : ""}`,
        text,
        answers: last.subject.id,
        ...(choice?.tail && choice.raises ? { raises: choice.raises } : {}),
        lie: true,
        claim: { key: own.key, value: claim.value },
        sourceRecordIds: [
          ...new Set([
            ...said.sourceRecordIds,
            ...(choice?.tail?.sourceRecordIds ?? []),
          ]),
        ],
        wording: {
          ...said.wording,
          parts: [...said.wording.parts, ...(choice?.tail?.parts ?? [])],
        },
      });
      break;
    }
  });
  return out;
}

/** The player's own subject an "own" answer tells, by the subject it answers. */
const OWN_OF: Readonly<Record<string, string>> = {
  "other-work": "own-work",
  "tenure-reply": "own-work",
  "home-reply": "home",
};

/** What else the player told about a subject of their own: only what their words said (their job, when the line named it). */
function saidOwn(
  subject: Subject,
  wording: Wording | undefined,
): { key: string; value: string }[] {
  return (subject.alsoOwn ?? [])
    .filter(
      (also) =>
        wording?.facts.includes(also.fact) ||
        wording?.facts.includes(`my-${also.fact}`),
    )
    .map(({ key, value }) => ({ key, value }));
}

/** The slots that carry the player's own employer or place, which a false alternative replaces. */
const OWN_SLOTS = ["employer", "my-employer", "place", "my-place"];

/** How many wordings of a parting word are tried to find one not yet said in the talk. */
const farewellWordings = () =>
  DEFAULT_DIRECTOR_DATA.parameters.directorFarewellWordings!.value;

const GREET_AND_PART = (
  rulesFile as unknown as {
    greetAndPart: {
      greet: string;
      farewell: string;
      aboutFacts: readonly string[];
    };
  }
).greetAndPart;

/**
 * The greeting away from home: composed from a plain opener and a core that
 * names the listener (when the speaker knows their name) or when the two last
 * met, from the tie's contact record. A stranger, with neither on record,
 * gets a short hello alone.
 */
function greetingLine(
  core: Readonly<CoreState>,
  data: ConversationData,
  playerId: PersonId,
  otherId: PersonId,
  knows: boolean,
): ReturnType<typeof words> {
  const player = core.people.get(playerId)!;
  const momentKey = `${playerId}:${otherId}:${core.date}:greet`;
  const name: Facts = knows
    ? {
        name: {
          text: player.givenName,
          sourceRecordIds: [
            core.people.get(otherId)?.knownIdSources?.[playerId]
              ?.sourceFactId ?? playerId,
          ],
        },
      }
    : {};
  const facts: Facts = { ...name };
  // When they last met, said in passing, from the tie's own contact date;
  // never a meeting earlier today.
  const seen = lastContact(core, otherId, playerId);
  if (
    seen &&
    daysBetween(makeIsoDate(seen.date), makeIsoDate(core.date)) >= one
  ) {
    const row = spokenWhenRow(seen.date, core.date);
    facts.when = { text: row.said, sourceRecordIds: [seen.tieId] };
    facts[`when-${row.gap}`] = { text: "yes", sourceRecordIds: [seen.tieId] };
    if (row.since)
      facts["when-since"] = { text: "yes", sourceRecordIds: [seen.tieId] };
  } else if (facts.name)
    // Known, and no earlier meeting to name: the greeting names the person.
    facts["no-when"] = {
      text: "yes",
      sourceRecordIds: facts.name.sourceRecordIds,
    };
  const composed = composedLine(
    core,
    otherId,
    GREET_AND_PART.greet,
    facts,
    "default",
    momentKey,
  );
  if (composed) return composed;
  return words(
    core,
    data,
    otherId,
    "greet",
    "open",
    { statementsOnly: true },
    name,
    momentKey,
  );
}

/**
 * The goodbye, composed: a core that names what the talk was about (the
 * first topic's employer, school, town, news or relative, whichever it
 * carries, with a mark so the wording fits it), someone of the player's the
 * speaker knows, or at home the part of the day; and a short closer. Null
 * when none of those is on record.
 */
function partingLine(
  core: Readonly<CoreState>,
  conversation: Conversation,
  speakerId: PersonId,
  housemate: boolean,
  family: Fact | undefined,
  momentKey: string,
): ReturnType<typeof words> {
  const facts: Facts = {};
  const topic = conversation.topicFacts ?? {};
  const found = GREET_AND_PART.aboutFacts.find((fact) => topic[fact]?.text);
  // One screen names a thing once: a topic the talk already named is not
  // named again; the goodbye names the player instead.
  const named =
    found !== undefined &&
    conversation.lines.some((line) => line.text.includes(topic[found]!.text));
  const key = named ? undefined : found;
  const player = core.people.get(conversation.playerId);
  if (named && player?.givenName) {
    facts["about-again"] = topic[found!]!;
    facts["player-first"] = {
      text: player.givenName,
      sourceRecordIds: [player.id],
    };
    // Where and when it is said, for the goodbyes that need it: the player
    // came to the speaker's work, the player holds a job, they do not live
    // together, and the hour (owner's rule: words know the hour and the person).
    const mark = (name: string, ids: readonly string[]) => {
      facts[name] = { text: "yes", sourceRecordIds: ids };
    };
    const theirJob = jobOf(core, core.people.get(speakerId)!);
    if (
      theirJob &&
      conversation.visitOrganizationId &&
      theirJob.org.id === conversation.visitOrganizationId
    )
      mark("at-their-work", [theirJob.job.id, theirJob.org.id]);
    const mine = jobOf(core, player);
    if (mine) mark("player-works", [mine.job.id]);
    if (!housemate) mark("not-housemate", [speakerId]);
    for (const part of dayParts(
      conversation.minuteOfDay ?? sceneMinute(core, conversation.playerId),
    ))
      mark(part, [conversation.playerId]);
  }
  if (key) {
    const ids = topic[key]!.sourceRecordIds;
    facts["about-said"] = topic[key]!;
    facts[`about-${key}`] = { text: "yes", sourceRecordIds: ids };
    // Whose it is: the player's own (they were asked about it) or the
    // speaker's (they raised their own), by the topic's subject.
    const subject = (conversation.topics[zero] ?? "").replace(/^[^>]*>/, "");
    const whose = subject.endsWith(`:${conversation.playerId}`)
      ? "yours"
      : subject.endsWith(`:${speakerId}`)
        ? "mine"
        : undefined;
    if (whose)
      facts[`about-${key}-${whose}`] = { text: "yes", sourceRecordIds: ids };
  }
  // Someone of the player's they know, when the talk named nothing else.
  if (family && !found) facts.name = family;
  if (housemate)
    for (const mark of dayParts(
      conversation.minuteOfDay ?? sceneMinute(core, conversation.playerId),
    )) {
      const said = dayPartSaid(mark);
      facts[mark] = { text: "yes", sourceRecordIds: [conversation.playerId] };
      if (said)
        facts.daypart = {
          text: said,
          sourceRecordIds: [conversation.playerId],
        };
    }
  if (!Object.keys(facts).length) return null;
  const line = composedLine(
    core,
    speakerId,
    GREET_AND_PART.farewell,
    facts,
    housemate ? "home" : "default",
    momentKey,
    saidParts(conversation, speakerId),
  );
  return line ?? null;
}

/** The conversation runs out: the other person says goodbye. */
function endConversation(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): void {
  conversation.choices = [];
  conversation.lies = [];
  const { playerId, otherId } = conversation;
  if (conversation.lines.at(-one)?.kind === "farewell") return;
  // Nobody says goodbye right after their own question was answered
  // ("Do you remember the school?" "Yes." "Okay, bye." is not a talk): the
  // answer is where it stops, or the asker has gone on to something else.
  const lastFromOther = [...conversation.lines]
    .reverse()
    .find((line) => line.speakerId === otherId && line.kind !== "ack");
  if (
    lastFromOther &&
    asksQuestion(lastFromOther) &&
    conversation.lines.indexOf(lastFromOther) < conversation.lines.length - one
  )
    return;
  // People who live together close a talk as housemates do: never "Come
  // back soon." at home, and no hello passed on to their own family.
  const housemate =
    core.people.get(otherId)?.householdId ===
    core.people.get(playerId)?.householdId;
  // "Say hello to {name}." only for someone in the player's family they know.
  const family = housemate
    ? undefined
    : subjectsBetween(core, playerId, otherId, conversation.director).find(
        (row) => row.kind === "family",
      );
  // A parting word is not one already said in this talk ("Nice to see you."
  // opening and closing it): a further wording of the same move stands in.
  const said = new Set(conversation.lines.map((row) => row.text));
  let line: ReturnType<typeof words> = null;
  for (let attempt = zero; attempt < farewellWordings(); attempt += one) {
    const momentKey = `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:farewell${attempt ? `:${attempt}` : ""}`;
    // Composed first: what the talk was about, someone of the player's they
    // know, or the hour at home; a short goodbye only when none is on record.
    const next =
      partingLine(
        core,
        conversation,
        otherId,
        housemate,
        family ? family.facts.name! : undefined,
        momentKey,
      ) ??
      words(
        core,
        data,
        otherId,
        "farewell",
        "leave",
        ALL,
        family ? { name: family.facts.name! } : {},
        momentKey,
        housemate ? "home" : "default",
      );
    if (!next) break;
    line = next;
    if (!said.has(next.text)) break;
  }
  if (line)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: `farewell:${otherId}`,
      kind: "farewell",
      act: "tell",
      ...line,
    });
}

/**
 * Whether a hearer doubts a claim they cannot check: the usual benefit of the
 * doubt (truth-default) against every trait's lean toward doubting.
 */
export function doubtsClaim(
  core: Pick<CoreState, "data">,
  hearer: Pick<PersonState, "traits">,
): boolean {
  return (
    P.truthDefaultPull +
      decisionLean(
        core,
        hearer,
        "conversation.believe-claim",
        "believe",
        "doubt",
      ) <
    P.zero
  );
}

/** The player says a choice: it is recorded, and the other person replies. */
export function say(
  core: CoreState,
  conversation: Conversation,
  choiceKey: string,
  data: ConversationData = CONVERSATION_DATA,
): Conversation {
  if (conversation.sitting)
    return saySitting(core, conversation, data, choiceKey);
  const choice =
    conversation.choices.find((row) => row.key === choiceKey) ??
    conversation.lies.find((row) => row.key === choiceKey);
  if (!choice) throw new Error(`Not an offered line: ${choiceKey}`);
  const { playerId, otherId } = conversation;
  const api = coreAPI(core);
  const player = core.people.get(playerId)!;
  const last = conversation.last!;
  const hearers = [otherId, ...conversation.presentIds];
  const source: Source = {
    tag: "SOURCED",
    citation: "Recorded conversation: the line the player chose to say.",
    asOf: core.date,
  };
  const eventId = `conversation:${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${choice.key}`;
  const tell = (id: string, own: { key: string; value: string }) => {
    applyCoreEvent(core, {
      id,
      date: core.date,
      kind: data.toldEvent,
      personIds: hearers,
      witnessIds: [playerId],
      placeId: player.placeId,
      facts: { [own.key]: own.value },
      source,
    });
    conversation.recorded.push(id);
  };
  let doubted = false;
  if (choice.lie && choice.claim) {
    const claim = choice.claim;
    // The exact claim and who heard it; the director keeps it as a lie.
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: data.lieEvent,
      personIds: [playerId, otherId],
      witnessIds: conversation.presentIds,
      placeId: player.placeId,
      topic: claim.key,
      facts: { [`claim:${claim.key}`]: claim.value },
      source,
    });
    conversation.recorded.push(eventId);
    // Each hearer believes the claim, until someone who knows better tells
    // them, unless their traits lean hard enough toward doubt to outweigh the
    // usual benefit of the doubt (every trait, through the shared table).
    const keeps = core.modules.has(BELIEFS_MODULE_ID);
    for (const hearerId of hearers) {
      const hearer = core.people.get(hearerId);
      if (hearer && doubtsClaim(core, hearer)) {
        if (hearerId === otherId) doubted = true;
        continue;
      }
      api.observe(hearerId, {
        key: claim.key,
        value: claim.value,
        learnedAt: core.date,
        sourceId: eventId,
        access: "told",
      });
      if (!keeps) continue;
      beliefs(api).put({
        id: `${hearerId}:${claim.key}`,
        hearerId,
        subjectId: playerId,
        key: claim.key,
        claimed: claim.value,
        truth: last.subject.own!.value,
        lieEventId: eventId,
      });
      believers(api).add(hearerId);
    }
  } else if (last.subject.own && conversation.lines.at(-one)?.act === "ask") {
    // A true answer tells everyone present the fact.
    tell(eventId, last.subject.own);
    for (const also of saidOwn(last.subject, choice.wording))
      tell(`${eventId}:${also.key}`, also);
  }
  conversation.lines.push({
    speakerId: playerId,
    subjectId: choice.raises ?? choice.answers,
    kind: last.kind,
    act: choice.lie ? "lie" : "answer",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
    ...(choice.wording ? { wording: choice.wording } : {}),
  });
  // A listener who doubts the lie says so; the conversation carries on.
  if (doubted) {
    const doubt = words(
      core,
      data,
      otherId,
      "lie",
      "reply",
      ALL,
      {},
      `${eventId}:doubt`,
    );
    if (doubt)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: "lie-doubt",
        act: "ask",
        ...doubt,
      });
  }
  // Talking is time together, recorded through the core's own writer.
  for (const hearerId of hearers)
    api.relationship(
      playerId,
      hearerId,
      "contact",
      data.minutesPerExchange / P.minutesPerHour,
      undefined,
      {
        cause: "conversation",
        sourceId: eventId,
      },
    );
  // The listener remembers what this talk was about.
  if (conversation.topics[zero])
    api.observe(otherId, {
      key: talkedKey(playerId, conversation.topics[zero]),
      value: conversation.topics[zero],
      learnedAt: core.date,
      sourceId: eventId,
      access: "told",
    });
  // Asked why they stand where they do, they answer from the reason on
  // record (their work, or money in their town), in composed words.
  if (last.kind === "own-view" && !choice.lie && choice.move === OWN_VIEW_WHY) {
    const back = composedLine(
      core,
      otherId,
      OWN_VIEW_BACK,
      last.facts,
      "default",
      `${eventId}:back`,
      saidParts(conversation, otherId),
    );
    if (back)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: OWN_VIEW_BACK,
        act: "tell",
        ...back,
        sourceRecordIds: [...new Set([...back.sourceRecordIds, eventId])],
      });
    carryOn(core, conversation, data);
    return conversation;
  }
  // A reply to where they stand that agrees or disagrees tells them where
  // the player stands on the same question: they learn it (the views
  // engine's stance record), as the player learned theirs.
  if (
    last.kind === "own-view" &&
    !choice.lie &&
    last.subject.news?.question &&
    OWN_VIEW_TAKES.includes(choice.move)
  ) {
    const question = last.subject.news.question;
    for (const hearerId of hearers) {
      learnView(
        api,
        hearerId,
        playerId,
        [stanceRecordId(playerId, question)],
        eventId,
      );
      learnViewQuestion(api, hearerId, playerId, question, eventId);
    }
  }
  // A reply to the address's point: the other person keeps what the player
  // said on that question, and answers it in words the engine composes.
  if (last.kind === POINT && last.subject.point && !choice.lie) {
    tell(eventId, {
      key: pointKey(playerId, last.subject.point.question),
      value: choice.move,
    });
    answerPoint(core, conversation, data, choice, eventId);
    return conversation;
  }
  // A reply to news: a stand on the story's question is learned by everyone
  // who heard it (the views engine's stance record), and the other person
  // answers in words the engine composes, from their own stake in it.
  if (
    last.kind === "news" &&
    !choice.lie &&
    composedConversationBank(NEWS_BACK)
  ) {
    answerNews(core, conversation, data, choice, eventId, hearers, last);
    return conversation;
  }
  // A choice that asks the other person to say more ("What happened?"):
  // they tell it from their own records, on the same topic.
  const told = data.tells?.[last.kind]?.[choice.move];
  const theirs =
    told && !doubted ? tellable(core, conversation, data, told) : undefined;
  if (theirs && raiseSubject(core, conversation, data, theirs, true))
    return conversation;
  const raised = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  ).find((row) => row.id === choice.raises);
  if (
    !raised &&
    NEWS_SUBJECTS.has(subjectKindOf(conversation.topics[zero] ?? ""))
  ) {
    // Bad news told and reacted to (comfort, a reaction, a plain answer): the
    // teller never answers with small-talk "Huh."; they carry on to the one
    // related thing they have to say (a lost job: that they are looking; an
    // eviction: where they go), else the talk ends.
    const related =
      data.related[subjectKindOf(conversation.topics[zero]!)] ?? [];
    if (conversation.topics.length === one && !doubted)
      for (const kind of related) {
        const next = tellable(core, conversation, data, kind);
        if (next && raiseSubject(core, conversation, data, next, true))
          return conversation;
      }
    endConversation(core, conversation, data);
    return conversation;
  }
  if (!raised) {
    // Nothing new raised: the other person takes the answer in by the scene
    // engine's rule for the move it made (owner, Oct 29: one engine for every
    // line), in words written to answer it ("Sit with me a minute?" "Sure.",
    // never "That's what I thought too."), then carries on; after a request
    // or a plea to be left alone, their answer ends the talk. An answer that
    // only takes their line in ("Oh, okay.") gets none: the talk has no
    // answer to a note.
    const take = doubted
      ? null
      : answerInTalk(core, {
          replyMove: replyMoveOf(last.kind, choice.move),
          answered: `${last.kind.replace(/-new$/, "")}:${choice.move}`,
          key: last.kind,
          speakerId: otherId,
          momentKey: `${playerId}:${otherId}:${conversation.lines.length}:take`,
        });
    if (take)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: "ack",
        act: "tell",
        text: take.text,
        sourceRecordIds: [eventId],
        wording: {
          bank: "scene-talk",
          parts: [take.pieceKey],
          stage: "default",
          facts: [],
        },
      });
    // A yes never ends a talk (owner, Oct 15): after "Sit with me a minute?"
    // "Of course." they carry on with what they have. Where the answer
    // closes it ("Okay. I'll leave you be.", or they have nothing more),
    // their answer is the last word: no goodbye follows it.
    if (take?.closes) {
      if (
        take.move === "accept" &&
        replyMoveOf(last.kind, choice.move) === "request"
      )
        carryOn(core, conversation, data, { quietly: true });
      else {
        conversation.choices = [];
        conversation.lies = [];
      }
      return conversation;
    }
    carryOn(core, conversation, data);
    return conversation;
  }
  conversation.used.push(raised.id);
  if (raised.own) tell(`${eventId}:told`, raised.own);
  for (const also of saidOwn(raised, choice.wording))
    tell(`${eventId}:told:${also.key}`, also);
  const reply = replyFacts(core, otherId, raised);
  const kind = data.replyKinds[raised.kind] ?? raised.kind;
  const line = reply
    ? words(
        core,
        data,
        otherId,
        kind,
        "reply",
        ALL,
        reply.facts,
        `${playerId}:${otherId}:${conversation.lines.length}:${raised.id}:reply`,
        reply.stage,
        raised,
      )
    : null;
  if (!line || !reply) {
    endConversation(core, conversation, data);
    return conversation;
  }
  conversation.lines.push({
    speakerId: otherId,
    subjectId: raised.id,
    kind,
    act: "tell",
    ...line,
  });
  conversation.last = {
    subject: raised,
    kind,
    facts: reply.facts,
    stage: reply.stage,
  };
  offerChoices(core, conversation, data);
  return conversation;
}

/**
 * The other person's answer to the player's reply on the address's point,
 * once `say` has recorded what the player said on that question (agreed,
 * disagreed, or asked what it would mean here or what they would do
 * instead), keyed by the question, so a later talk reads it: words the
 * engine composes, naming the point; then the talk carries on.
 */
function answerPoint(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
  choice: ConversationChoice,
  eventId: string,
): void {
  const { otherId } = conversation;
  const last = conversation.last!;
  const back = composedLine(
    core,
    otherId,
    POINT_BACK,
    last.facts,
    choice.move,
    `${eventId}:back`,
    saidParts(conversation, otherId),
  );
  if (back)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: choice.answers,
      kind: POINT_BACK,
      act: "tell",
      ...back,
      sourceRecordIds: [...new Set([...back.sourceRecordIds, eventId])],
    });
  carryOn(core, conversation, data);
}

/** The player's replies to where someone stands that say where the player stands. */
const OWN_VIEW_TAKES: readonly string[] = ["agree", "disagree"];
/** The player's reply that asks them why, and the subject their answer is composed under. */
const OWN_VIEW_WHY = "why";
const OWN_VIEW_BACK = "own-view-back";

/** The subject the other person's answer to a reply on news is composed under. */
const NEWS_BACK = "news-back";

/** Whether a story's headline already says the question it is about. */
function headlineSays(facts: Facts): boolean {
  const about = facts.about?.text;
  const headline = facts.headline?.text;
  return !!about && !!headline?.toLowerCase().includes(about.toLowerCase());
}
/** The player's replies on news that take a side on the story's question. */
const NEWS_SIDES: readonly string[] = ["for", "against"];

/**
 * The other person's answer to the player's reply on a story or a change in
 * town: composed from the pieces under `news-back`, by the reply's move, with
 * the other person's own stake (their side on the question, or the place
 * they worked) and when they learned of it. A reply that takes a side is
 * learned through `learnView`, citing the player's stance record.
 */
function answerNews(
  core: CoreState,
  conversation: Conversation,
  data: ConversationData,
  choice: ConversationChoice,
  eventId: string,
  hearers: readonly PersonId[],
  /** The line the player answered, as `say` read it. */
  last: LastLine,
): void {
  const { otherId, playerId } = conversation;
  const api = coreAPI(core);
  if (NEWS_SIDES.includes(choice.move) && last.subject.news?.question) {
    const stance = stanceRow(api, playerId, last.subject.news.question);
    for (const hearerId of hearers)
      learnView(api, hearerId, playerId, [stance?.id ?? playerId], eventId);
  }
  const theirs = newsStake(core, otherId, last.subject);
  const facts: Facts = {
    ...last.facts,
    ...stakeMarks(theirs, "their-"),
    // No side of their own and no tie to the place: the answer says so.
    ...(theirs.reason === "none"
      ? { "their-none": { text: "yes", sourceRecordIds: [otherId] } }
      : {}),
    [`said-${choice.move}`]: { text: "yes", sourceRecordIds: [eventId] },
    // One screen names a thing once: where the headline already says the
    // question, the answer says "it" and gives what else the story holds.
    [headlineSays(last.facts) ? "about-said" : "about-unsaid"]: {
      text: "yes",
      sourceRecordIds: [eventId],
    },
    // A stand either way, for the answers that fit both.
    ...(NEWS_SIDES.includes(choice.move)
      ? { "said-side": { text: "yes", sourceRecordIds: [eventId] } }
      : {}),
  };
  // When they learned of it, said in passing, from their own record of it.
  const learned = last.subject.aboutId
    ? core.knowledgeByPerson.get(otherId)?.get(newsKey(last.subject.aboutId))
    : undefined;
  const known = learned
    ? undefined
    : changesKnownTo(core, otherId).find(
        (row) => row.eventId === last.subject.aboutId,
      );
  const at = learned?.learnedAt ?? known?.learnedAt;
  if (at)
    facts.when = {
      text: spokenWhen(at, core.date),
      sourceRecordIds: [learned?.sourceId ?? known?.eventId ?? otherId],
    };
  const back = composedLine(
    core,
    otherId,
    NEWS_BACK,
    facts,
    "default",
    `${eventId}:back`,
    saidParts(conversation, otherId),
  );
  if (back)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: choice.answers,
      kind: NEWS_BACK,
      act: "tell",
      ...back,
      sourceRecordIds: [...new Set([...back.sourceRecordIds, eventId])],
    });
  carryOn(core, conversation, data);
}

// Beliefs left by lies, and how they are found out.

export interface Belief {
  id: string;
  hearerId: PersonId;
  subjectId: PersonId;
  key: string;
  claimed: string;
  truth: string;
  lieEventId: string;
}

export const BELIEFS_MODULE_ID = "beliefs";
const beliefs = (api: CoreAPI) =>
  api.moduleState(BELIEFS_MODULE_ID).table("beliefs");
const believerSets = new WeakMap<object, Set<PersonId>>();
function believers(api: CoreAPI): Set<PersonId> {
  let set = believerSets.get(api.state);
  if (!set) {
    set = new Set(
      (beliefs(api).rows() as unknown as Belief[]).map((row) => row.hearerId),
    );
    believerSets.set(api.state, set);
  }
  return set;
}

/** The false beliefs a person holds from lies told to them. */
export function beliefsOf(api: CoreAPI, personId: PersonId): Belief[] {
  return beliefs(api).query("byHearer", [personId]) as unknown as Belief[];
}

/**
 * When a believer talks with someone who knows the truth (a coworker at the
 * real employer, a housemate, someone told it), they are set straight: the
 * truth is recorded as told, so the lie ends for anyone keeping it.
 */
export const beliefsModule: CoreModule = {
  id: BELIEFS_MODULE_ID,
  state: {
    schemaVersion: one,
    tables: { beliefs: { indexes: { byHearer: { fields: ["hearerId"] } } } },
  },
  relationshipKinds: ["*"],
  onRelationshipChange(api, notice) {
    if (notice.date !== api.state.date) return;
    const set = believers(api);
    for (const [hearerId, knowerId] of [
      [notice.actorId, notice.otherId],
      [notice.otherId, notice.actorId],
    ] as const) {
      if (!set.has(hearerId)) continue;
      for (const belief of beliefsOf(api, hearerId)) {
        // The liar keeps their own story.
        if (knowerId === belief.subjectId) continue;
        if (
          !knowsTruth(api.state, knowerId, belief.subjectId, {
            key: belief.key,
            value: belief.truth,
          })
        )
          continue;
        const told = api.state.knowledgeByPerson.get(knowerId)?.get(belief.key);
        if (told && told.value !== belief.truth) continue;
        api.emit({
          id: `${belief.lieEventId}:found-out:${hearerId}:${api.state.date}`,
          date: api.state.date,
          kind: CONVERSATION_DATA.toldEvent,
          personIds: [hearerId],
          witnessIds: [knowerId],
          placeId: api.state.people.get(hearerId)!.placeId,
          facts: { [belief.key]: belief.truth },
          source: {
            tag: "SOURCED",
            citation:
              "Someone who knew the truth told a person who had been lied to.",
            asOf: api.state.date,
          },
        });
        beliefs(api).remove(belief.id);
      }
      if (!beliefsOf(api, hearerId).length) set.delete(hearerId);
    }
  },
};
