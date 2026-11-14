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
import { OPENING_ADDRESS_EVENT, macroMonths } from "./opening-story";
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
  BUSINESS_ANNIVERSARY,
  MILESTONE_BIRTHDAY,
  PRESS_MODULE_ID,
  RETIREMENT,
  outletsHere,
  type OutletKind,
} from "../core2/modules/press";
import { decisionLean, hardshipStress } from "../core2/trait-decisions";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  KnownFact,
  OrganizationInput,
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
  VIEWS_MODULE_ID,
} from "../core2/modules/views";
import { townMetrics } from "../core2/modules/world";
import { questionSubject } from "../english/policy-names";
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionSide,
  questionTo,
  townFigureWords,
} from "../english/question-names";
import { lawInForce } from "../core2/modules/laws";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import {
  asksQuestion,
  composeConversationLine,
  composedConversationBank,
  conversationHas,
  conversationMoves,
  CONVERSATION_WORDS,
  HELD_SAID,
  heldPieces,
  joinedReply,
  wordConversationMove,
  type ConversationPart,
  type Fact,
  type Said as WordedLine,
  type SubjectBank,
  type Wording,
} from "../english/conversation-words";
import { kinAddress, relationPhrase } from "../english/journal-words";
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
import { directorStopgap, WORDS_STOPGAP_HITS } from "./stopgaps";
import {
  clockSaid,
  daysSaid,
  hoursSaid,
  moneySaid,
} from "../english/count-words";
import type { FinanceContractInput } from "../core2/modules/finance";
import { SCHOOL_MODULE_ID, schoolDayOf } from "../core2/modules/people";
import { SAID_AS_DATA as saidAsData } from "../english/said-as";
import { COMPOSED_CHECKS_DATA as composedChecksData } from "../english/composed-checks";
import { budgetPurposeSaid } from "../english/bill-names";
import {
  properName,
  spoken,
  spokenWhen,
  spokenWhenRow,
  stateInSentence,
} from "./words";
import { dayParts, sceneMinute } from "./day-part";
import {
  employerSaidAs,
  jobSaidAs,
  officeWords,
  personSlot,
  nameOnceThen,
  ownPlaceSaid,
  sentenceStarts,
  wordPersonSlots,
} from "../english/said-as";
import { personWorkOf } from "../core2/person-work";
import localAddressData from "./data/local-address.json" with { type: "json" };
import { saidPersonOf } from "./said-person";
import {
  learnView,
  learnViewQuestion,
  stanceRecordId,
  viewKey,
  viewRecordId,
  viewSubjectOf,
} from "./view-learned";

const zero = P.zero;
const one = P.one;

/** Years after which a shared school or workplace is a reason to talk (conversation-rules.json, TUNABLE). */
/** The slots a person's own work detail is said under. */
const WORK_SLOTS = { position: "position", place: "work-place" };

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
  /** The policy questions this talk named (internal): kept as heard today, so a housemate names another. */
  questions?: string[];
  /** The player gave their name in this talk, so the other may now say it (internal). */
  nameGiven?: boolean;
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
 * An employer as the one said-as reader says it, from its record: a
 * government's payroll as the government, a business by its name, and never
 * the outside market that stands in for work out of town (null).
 */
function employerWords(org: Readonly<OrganizationInput>): string | null {
  return employerSaidAs({
    name: properName(org.name),
    kind: org.kind,
    outside: !!org.outsideFlow,
    ...(org.classification ? { classification: org.classification } : {}),
    ...(org.governmentFacts ? { governmentFacts: org.governmentFacts } : {}),
  });
}

/** A person's job and its employer as said, when the employer can be named. */
function sayJob(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  const held = jobOf(core, person);
  const employer = held ? employerWords(held.org) : null;
  return held && employer ? { ...held, employer } : null;
}

/** A job's title as said after "works as" ("a stocker"), through the said-as reader; undefined when it cannot be said. */
function titleWords(
  title: string | undefined,
  org: Readonly<OrganizationInput> | undefined,
): string | undefined {
  const said = jobSaidAs(
    title,
    org ? { outside: !!org.outsideFlow } : undefined,
  );
  return said?.kind === "title" ? said.asJob : undefined;
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
  const title = titleWords(held.job.title, held.org);
  if (title)
    facts[slots.position] = { text: title, sourceRecordIds: [held.job.id] };
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
    const said = org ? employerWords(org) : null;
    if (org && said)
      facts.employer = {
        text: said,
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
  // The address, and a printed story on a question the teller holds a stand
  // on, weigh what how closely they follow politics makes them: a story read
  // leaves no moment in the teller's own ledger (only the watched player's
  // is kept), so a moment's impact alone never let news with a stand open a
  // talk, and nobody's view was learned in talk (trace, Ramos, Puerto Rico
  // (7268771), Nov 12: the story's subject was there, weight 0, no talk).
  if (
    subject.kind === "address" ||
    (subject.kind === "news" &&
      !!subject.facts.story &&
      !!subject.news?.question)
  ) {
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
  const owed = (
    housing.table("cases").get(caseId) as
      { owedAtRemovalMinor?: number } | undefined
  )?.owedAtRemovalMinor;
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

/**
 * The job whose hours a person has finished today by this minute, by its id;
 * none on a day off or before the shift is over (words know the hour and
 * whose day it was: "Busy one at work today?" is never asked at 7:00 AM).
 * With no clock, any work day counts.
 */
function workDoneToday(
  core: Readonly<CoreState>,
  personId: PersonId,
  minuteOfDay: number | undefined,
): string | undefined {
  try {
    return workSpansOnDateV1(coreAPI(core as CoreState), {
      controlledPersonId: personId,
      date: core.date,
    }).owners.find(
      (owner) =>
        owner.plannedMinutes > zero &&
        (minuteOfDay === undefined ||
          (owner.spans.length > zero &&
            owner.spans.every((span) => span.endMinute <= minuteOfDay))),
    )?.job.id;
  } catch {
    // Work terms that cannot be read for the date are not a work day.
    return undefined;
  }
}

/**
 * A quiet evening at home as a subject: the day of the week (the household
 * is where they are), when the two last spent time together, and whether
 * the listener's work day is done, each from its record. Small talk is about
 * a day that is over: in the daytime, before the listener's shift is done,
 * there is none (its lines are all end-of-day lines). Its id holds no date,
 * so the topic memory keeps it: raised once, it waits a week
 * (`talkedWithin`).
 */
function quietDay(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
  minuteOfDay: number | undefined,
): Subject | null {
  const day = new Date(`${core.date}T00:00:00Z`).getUTCDay();
  const facts: Facts = {
    weekday: {
      text: WEEKDAYS.days[day]!,
      sourceRecordIds: [speaker.householdId],
    },
  };
  const seen = lastContact(core, speaker.id, listener.id);
  // Not seeing much of someone takes some days apart: never "since
  // yesterday", and never someone they live with, whom they see every day
  // whatever the last talk was (the telling's same household; lead, Nov 12).
  if (
    seen &&
    speaker.householdId !== listener.householdId &&
    daysBetween(makeIsoDate(seen.date), makeIsoDate(core.date)) >=
      DEFAULT_DIRECTOR_DATA.parameters.directorTalkSeenLittleDays!.value
  )
    // Kebab case, as the English engine's slots are ({last-together}).
    facts["last-together"] = {
      text: spokenWhen(seen.date, core.date),
      sourceRecordIds: [seen.tieId],
    };
  // The listener's own work day, over by the talk's minute: the day the
  // line asks about is theirs.
  const shift = listener.jobId
    ? workDoneToday(core, listener.id, minuteOfDay)
    : undefined;
  if (shift) facts.dayDone = { text: "", sourceRecordIds: [shift] };
  const evening = dayParts(minuteOfDay).includes("evening");
  if (minuteOfDay !== undefined && !shift && !evening) return null;
  return { id: `quiet:${speaker.id}`, kind: "quiet", facts };
}

/**
 * The speaker's own work day, told to someone they live with (words composer,
 * talk on ordinary days; owner, Nov 12: "the game says nothing at home"): the
 * work-spans engine's shift for today, before it starts (when they are on and
 * when they are done), after it ends (how long it ran), or none on a day off
 * from a job they hold. Each fact cites the job; the hourly pay cites it too,
 * for an answer about the day. Nothing at all without a clock, without a job,
 * or while the shift is under way (they are not home).
 */
function workDay(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  minuteOfDay: number | undefined,
): Subject | null {
  if (minuteOfDay === undefined || !speaker.jobId) return null;
  const mine = sayJob(core, speaker);
  if (!mine) return null;
  let owner;
  try {
    owner = workSpansOnDateV1(coreAPI(core as CoreState), {
      controlledPersonId: speaker.id,
      date: core.date,
    }).owners.find((row) => row.job.id === mine.job.id);
  } catch {
    // Work terms that cannot be read for the date are no work day to tell.
    return null;
  }
  const cites = [mine.job.id, mine.org.id];
  const mark = (key: string): Facts => ({
    [key]: { text: "yes", sourceRecordIds: cites },
  });
  const spans = owner?.spans ?? [];
  // The shift just worked is its own subject: the day ahead and the day
  // that was are two things to tell.
  let done = false;
  const facts: Facts = {
    employer: { text: mine.employer, sourceRecordIds: cites },
  };
  // A day off from a job they hold is no news by itself (a calendar fact).
  if (!owner || owner.plannedMinutes <= zero || !spans.length) return null;
  {
    const start = Math.min(...spans.map((span) => span.startMinute));
    const end = Math.max(...spans.map((span) => span.endMinute));
    facts.start = { text: clockSaid(start), sourceRecordIds: cites };
    facts.end = { text: clockSaid(end), sourceRecordIds: cites };
    facts.hours = {
      text: hoursSaid(owner.plannedMinutes),
      sourceRecordIds: cites,
    };
    if (minuteOfDay < start) {
      // The day ahead is news only when it is not the usual day: longer or
      // shorter than the job's usual hours (owner, Nov 12: a schedule line
      // that repeats daily tells nothing).
      const usual = usualShift(core, speaker.id, mine.job.id);
      if (usual === undefined) return null;
      const change = owner.plannedMinutes - usual;
      if (Math.abs(change) < DAY_TALK.unusualShiftMinutes.value) return null;
      Object.assign(facts, mark("shift-ahead"));
      Object.assign(facts, mark(change > zero ? "longer" : "shorter"));
      facts.usual = { text: hoursSaid(usual), sourceRecordIds: cites };
    } else if (minuteOfDay >= end) {
      // The shift just worked is news only when it was not the usual day
      // (lead, Nov 12: "Done at work for the day, finally." / "Same as
      // ever." is filler): longer or shorter than the job's usual hours.
      const usual = usualShift(core, speaker.id, mine.job.id);
      if (usual === undefined) return null;
      const change = owner.plannedMinutes - usual;
      if (Math.abs(change) < DAY_TALK.unusualShiftMinutes.value) return null;
      Object.assign(facts, mark(change > zero ? "longer" : "shorter"));
      facts.usual = { text: hoursSaid(usual), sourceRecordIds: cites };
      done = true;
    } else return null;
  }
  const hourly =
    mine.job.hourlyMinor ??
    (mine.job.hoursDaily > zero
      ? mine.job.wageDailyMinor / mine.job.hoursDaily
      : undefined);
  if (hourly && hourly > zero)
    facts.wage = { text: moneySaid(hourly), sourceRecordIds: [mine.job.id] };
  const kind = done ? "work-done" : "work-day";
  return { id: `${kind}:${speaker.id}`, kind, facts };
}

/**
 * The rent coming due, told by someone who pays it to someone they live with
 * (words composer, talk on ordinary days): the household's lease from the
 * finance engine (its amount and its next due date), in the days before it
 * is due (conversation-rules.json dayTalk.rentDaysBefore), with how the
 * household's cash stands against it (the accounts engine's balances), for
 * the answer when the listener asks. Once for each due date: the id holds it.
 */
function rentDue(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
): Subject | null {
  // The lease a household signed when the world was made, by its id; one
  // signed after a move is not read (a registered stopgap).
  directorStopgap("SG-DIRECTOR-rent-talk-first-lease", WORDS_STOPGAP_HITS);
  const lease = core.finance.contracts.get(`lease:${speaker.householdId}`) as
    (FinanceContractInput & { endedAt?: string }) | undefined;
  if (!lease || lease.endedAt || !lease.payerIds.includes(speaker.id))
    return null;
  // A child named on the lease does not carry the rent.
  if (
    ageOnDate(makeIsoDate(speaker.birthDate), makeIsoDate(core.date)) <
    P.votingAge
  )
    return null;
  const days = daysBetween(makeIsoDate(core.date), makeIsoDate(lease.dueAt));
  if (days < zero || days > DAY_TALK.rentDaysBefore.value) return null;
  const api = coreAPI(core as CoreState);
  const accounts = api.accounts();
  const ids: string[] = [];
  let cash = zero;
  for (const id of core.households.get(speaker.householdId)?.memberIds ?? []) {
    if (!core.people.get(id)?.alive) continue;
    const account = accounts.main(id);
    cash += accounts.balance(account);
    ids.push(account);
  }
  const standing =
    cash >= lease.amountMinor * DAY_TALK.rentCoveredMonths.value
      ? "cash-covered"
      : cash >= lease.amountMinor
        ? "cash-tight"
        : "cash-short";
  return {
    id: `rent-due:${lease.id}:${lease.dueAt}`,
    kind: "rent-due",
    aboutId: lease.id,
    facts: {
      rent: { text: moneySaid(lease.amountMinor), sourceRecordIds: [lease.id] },
      due: { text: daysSaid(days), sourceRecordIds: [lease.id] },
      [standing]: { text: "yes", sourceRecordIds: [lease.id, ...ids] },
    },
  };
}

/**
 * What someone at home asks the player about their own day, each from a
 * record of it (Words lead, Nov 14, rule 57): the school day just over, the
 * shift just worked, or the filing the player made. A day is asked about the
 * evening it happened, or the next morning; the house asks it once a day (its
 * id holds no speaker).
 */
function playerDay(
  core: Readonly<CoreState>,
  director: Director | undefined,
  listener: Readonly<PersonState>,
  minuteOfDay: number | undefined,
): Subject[] {
  if (minuteOfDay === undefined) return [];
  const evening = dayParts(minuteOfDay).includes("evening");
  const when = evening ? "today" : "yesterday";
  const rows: Subject[] = [];
  const row = (stage: string, facts: Facts, ids: readonly string[]) =>
    rows.push({
      id: `player-day:${stage}`,
      kind: "player-day",
      stage,
      facts: {
        when: { text: when, sourceRecordIds: ids },
        ...facts,
      },
    });
  // The school day just over, from the school engine's attendance.
  const day = schoolDayOf(coreAPI(core as CoreState), listener.id);
  if (
    day &&
    core.organizations.get(day.schoolId) &&
    (evening
      ? day.today && day.attended
      : day.yesterday.school && day.yesterday.attended)
  )
    row("school", {}, [
      day.schoolId,
      `${SCHOOL_MODULE_ID}:attended:${listener.id}`,
    ]);
  // The shift just worked, from the work-spans engine.
  const mine = sayJob(core, listener);
  if (mine) {
    let worked = false;
    try {
      worked = workSpansOnDateV1(coreAPI(core as CoreState), {
        controlledPersonId: listener.id,
        date: evening ? core.date : addDays(makeIsoDate(core.date), -one),
      }).owners.some(
        (owner) =>
          owner.job.id === mine.job.id &&
          owner.plannedMinutes > zero &&
          (!evening ||
            owner.spans.every((span) => span.endMinute <= minuteOfDay)),
      );
    } catch {
      // Work terms that cannot be read for the date are no shift to ask after.
    }
    if (worked)
      row(
        "shift",
        {
          employer: {
            text: mine.employer,
            sourceRecordIds: [mine.job.id, mine.org.id],
          },
        },
        [mine.job.id, mine.org.id],
      );
  }
  // A filing the player made yesterday or today, from the director's ledger.
  for (const moment of recentMoments(core, director, listener.id)) {
    if (moment.causeKind !== "event:candidate-filed") continue;
    const age = daysBetween(makeIsoDate(moment.date), makeIsoDate(core.date));
    if (age > one) break;
    const office = (
      core.durableLog.get(moment.causeId as never) as
        { facts?: Readonly<Record<string, string>> } | undefined
    )?.facts?.office;
    if (!office) continue;
    rows.push({
      id: `player-day:filing`,
      kind: "player-day",
      stage: "filing",
      facts: {
        when: {
          text: age ? "yesterday" : "today",
          sourceRecordIds: [moment.causeId],
        },
        office: {
          text: properName(office),
          sourceRecordIds: [moment.causeId],
        },
      },
    });
    break;
  }
  return rows;
}

/**
 * A school day the speaker missed, told the next morning to someone they
 * live with: the school engine's record of the day before (a school day, and
 * no attendance row for it), and whether today is a school day. None when
 * they went, which is the usual day.
 */
function schoolDay(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  minuteOfDay: number | undefined,
): Subject | null {
  if (minuteOfDay === undefined) return null;
  const day = schoolDayOf(coreAPI(core as CoreState), speaker.id);
  if (!day || !core.organizations.get(day.schoolId)) return null;
  // Read in the morning, from the day before, which has closed (the school
  // engine writes who went as a day closes; its cadence is its own). A day
  // they went is the usual day and no news; a school day they missed is.
  const morning = !dayParts(minuteOfDay).includes("evening");
  if (!morning || !day.yesterday.school || day.yesterday.attended) return null;
  const cites = [day.schoolId, `${SCHOOL_MODULE_ID}:attended:${speaker.id}`];
  const fact = (text: string): Fact => ({ text, sourceRecordIds: cites });
  return {
    id: `school-missed:${speaker.id}`,
    kind: "school-missed",
    facts: {
      // Their own school, as a student says it ("school"), never the
      // district's name (said-as).
      school: fact(ownPlaceSaid("student")),
      [day.today ? "school-today" : "no-school-today"]: fact("yes"),
    },
  };
}

const usualShifts = new WeakMap<object, Map<string, number | undefined>>();
/**
 * A job's usual working day, in minutes: the length its work days most often
 * run over the coming week, from the work-spans engine's own terms (the job
 * record's daily hours are a calendar average, days off included). Undefined
 * when the week holds no work day. Kept per job and date.
 */
function usualShift(
  core: Readonly<CoreState>,
  personId: PersonId,
  jobId: string,
): number | undefined {
  const byKey = usualShifts.get(core) ?? new Map<string, number | undefined>();
  usualShifts.set(core, byKey);
  const key = `${jobId}:${core.date}`;
  if (byKey.has(key)) return byKey.get(key);
  const counts = new Map<number, number>();
  const api = coreAPI(core as CoreState);
  for (let ahead = one; ahead <= DAY_TALK.usualWeekDays.value; ahead += one) {
    try {
      const minutes = workSpansOnDateV1(api, {
        controlledPersonId: personId,
        date: addDays(makeIsoDate(core.date), ahead),
      }).owners.find((row) => row.job.id === jobId)?.plannedMinutes;
      if (minutes && minutes > zero)
        counts.set(minutes, (counts.get(minutes) ?? zero) + one);
    } catch {
      // A day whose terms cannot be read is left out of the week.
    }
  }
  const usual = [...counts]
    .map(([minutes, days]) => ({ minutes, days }))
    .sort((a, b) => b.days - a.days || b.minutes - a.minutes)
    .at(zero)?.minutes;
  byKey.set(key, usual);
  return usual;
}

/** A job's hourly pay as people round it, from the job record, as a `wage` fact; none without a rate. */
function hourlyFact(
  core: Readonly<CoreState>,
  jobId: string | undefined,
): Facts {
  const job = jobId ? core.jobs.get(jobId as never) : undefined;
  if (!job) return {};
  const hourly =
    job.hourlyMinor ??
    (job.hoursDaily > zero ? job.wageDailyMinor / job.hoursDaily : undefined);
  return hourly && hourly > zero
    ? { wage: { text: moneySaid(hourly), sourceRecordIds: [job.id] } }
    : {};
}

/** The story kinds a person tells when the story names their own life, by the mark their lines require. */
const TOUCHING_STORIES: Readonly<Record<string, string>> = {
  [BUSINESS_ANNIVERSARY]: "anniversary",
  [RETIREMENT]: "retired",
  [MILESTONE_BIRTHDAY]: "birthday",
};

/**
 * A printed story that touches the speaker's own life, told to someone they
 * live with (words composer, talk from what is new on record): one the
 * speaker read lately whose record names their employer (the paper's
 * anniversary of it), or someone they know (a retirement, a milestone
 * birthday), by the story's own facts against the speaker's job and the
 * people they know. Its outlet, the day it ran and what it says, each citing
 * the story. None without such a story.
 */
function storyTouching(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
): Subject | null {
  if (!core.modules.has(NEWS_MODULE_ID)) return null;
  const since = addDays(makeIsoDate(core.date), -recentDays());
  const employerId = jobOf(core, speaker)?.org.id;
  for (const story of storiesHeard(coreAPI(core), speaker.id, since)) {
    const mark = TOUCHING_STORIES[story.facts.recordKind ?? ""];
    if (!mark) continue;
    const cites = [story.id];
    const fact = (text: string): Fact => ({ text, sourceRecordIds: cites });
    const outlet = story.outletId
      ? core.organizations.get(story.outletId as EntityId)
      : undefined;
    const facts: Facts = {
      [mark]: fact("yes"),
      ran: fact(spokenWhen(story.date, core.date)),
      ...(outlet ? { outlet: fact(outlet.name) } : {}),
    };
    if (mark === "anniversary") {
      if (!employerId || story.facts.organizationId !== employerId) continue;
      const org = core.organizations.get(employerId);
      if (!org || !story.facts.years) continue;
      facts.employer = fact(properName(org.name));
      facts.years = fact(story.facts.years);
    } else {
      const aboutId = story.facts.personId as PersonId | undefined;
      const about = aboutId ? core.people.get(aboutId) : undefined;
      if (!about || aboutId === speaker.id || !speaker.knownIds.has(aboutId!))
        continue;
      facts.name = fact(about.givenName);
      if (story.facts.age) facts.age = fact(story.facts.age);
      if (mark === "retired" && employerId === story.facts.organizationId)
        facts["same-work"] = fact("yes");
    }
    return {
      id: `news-touch:${story.id}`,
      kind: "news-touch",
      aboutId: story.id,
      facts,
    };
  }
  return null;
}

/** The player's own news a housemate brings up, by the moment's cause kind (conversation-rules.json playerNews, TUNABLE). */
interface StanceRow {
  readonly riskLow: string;
  readonly riskHigh: string;
}
const PLAYER_NEWS = (
  rulesFile as unknown as {
    playerNews: {
      causes: Readonly<Record<string, string>>;
      civic: readonly string[];
      losses: readonly string[];
      withinDays: { value: number };
      stances: Readonly<
        Record<
          string,
          { good: StanceRow; loss: StanceRow; civic: StanceRow } | string
        >
      >;
      riskBelow: { value: number };
      otherSideLean: { value: number };
    };
  }
).playerNews;
/** The trait the stance on the player's news reads: the cautious end worries (people-mind-v1). */
const RISK_TRAIT = "people-mind-v1:risk";
/** The heard key of a moment of the player's that a scene already played. */
const playerNewsHeard = (causeId: string) => `player-news:${causeId}`;

/**
 * The player's own recorded news, brought up by someone they live with (words
 * composer; lead, Nov 12: "the people at home talk most about the person in
 * front of them"): the newest moment of the player's own ledger within the
 * window whose cause kind the rules name (a job got or lost, a filing, a race
 * won or lost, their name in the paper, a vote, a bill). The housemate knows
 * it because they live with the player (the household is cited) or read it
 * (the printed story). Their stance is from their tie to the player and
 * their risk trait, or the other side when their lean and the player's
 * differ (the views engine). A moment a scene already played, or one the
 * house already told the player, is not brought up again.
 */
function playerNews(
  core: Readonly<CoreState>,
  director: Director | undefined,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
): Subject | null {
  if (!director?.ledger.people.has(listener.id)) return null;
  for (const moment of recentMoments(core, director, listener.id)) {
    const mark = PLAYER_NEWS.causes[moment.causeKind];
    if (!mark) continue;
    if (
      daysBetween(makeIsoDate(moment.date), makeIsoDate(core.date)) >
      PLAYER_NEWS.withinDays.value
    )
      break;
    // Another member's job named in the player's book is theirs, not the player's.
    if (moment.label.startsWith("money:") && moment.counterpartIds.length)
      continue;
    const id = playerNewsHeard(moment.causeId);
    // Told by the house once, or played as a scene: heard.
    if (heardRows.some((row) => row.key === `${HEARD_SUBJECT}${id}`)) continue;
    const record = core.durableLog.get(moment.causeId as never) as
      { facts?: Readonly<Record<string, string>> } | undefined;
    const cites = [moment.causeId];
    const fact = (text: string, ids = cites): Fact => ({
      text,
      sourceRecordIds: ids,
    });
    const facts: Facts = {
      // How they know: they live with the player.
      "knows-home": fact("yes", [listener.householdId, moment.causeId]),
      you: calledBy(core, speaker.id, listener.id),
      // What the player calls them, for the player's replies.
      first: calledBy(core, listener.id, speaker.id),
    };
    let said = mark;
    if (mark.startsWith("job-")) {
      const job =
        mark === "job-got" || mark === "job-changed"
          ? jobOf(core, listener)?.job
          : lastEndedJob(core, listener.id);
      const org = job ? core.organizations.get(job.organizationId) : undefined;
      const words = org ? employerWords(org) : null;
      if (!job || !org || !words) continue;
      facts.employer = fact(words, [job.id, org.id]);
    } else {
      const office = record?.facts?.office;
      if (office) facts.office = fact(properName(office));
      if (mark === "result") {
        said = record?.facts?.winnerId === listener.id ? "won" : "lost";
        if (!office) continue;
      }
      if (mark === "filed" && !office) continue;
      // Their name in the paper: the outlet that printed it and which way
      // the story ran, from the press desk's record of who it names.
      if (mark === "in-paper") {
        const outlet = record?.facts?.outletId
          ? core.organizations.get(record.facts.outletId)
          : undefined;
        if (!outlet || record?.facts?.subjectId !== listener.id) continue;
        facts.outlet = fact(properName(outlet.name), [
          moment.causeId,
          outlet.id,
        ]);
        facts[`ran-${record.facts.subjectFraming ?? "even"}`] = fact("yes");
        facts["knows-paper"] = fact("yes", [
          record.facts.storyId ?? moment.causeId,
        ]);
      }
    }
    // The stance, from their tie and their caution, or the other side.
    const relation =
      familyFactsOf(listener).get(speaker.id)?.relation ?? "other";
    const rows = PLAYER_NEWS.stances[relation] ?? PLAYER_NEWS.stances.other;
    if (!rows || typeof rows === "string") continue;
    const group = PLAYER_NEWS.losses.includes(said)
      ? rows.loss
      : PLAYER_NEWS.civic.includes(mark)
        ? rows.civic
        : rows.good;
    const cautious =
      (speaker.traits[RISK_TRAIT] ?? PLAYER_NEWS.riskBelow.value) <
      PLAYER_NEWS.riskBelow.value;
    let stance = cautious ? group.riskLow : group.riskHigh;
    const api = coreAPI(core as CoreState);
    const theirs = viewOf(api, speaker.id)?.lean;
    const mine = viewOf(api, listener.id)?.lean;
    if (
      PLAYER_NEWS.civic.includes(mark) &&
      theirs !== undefined &&
      mine !== undefined &&
      Math.sign(theirs) !== Math.sign(mine) &&
      Math.abs(theirs - mine) >= PLAYER_NEWS.otherSideLean.value
    )
      stance = "other-side";
    facts[`stance-${stance}`] = fact("yes", [
      ...(relation === "other" ? [speaker.id] : []),
      ...(stance === "other-side"
        ? [viewRecordId(speaker.id), viewRecordId(listener.id)]
        : [speaker.id]),
    ]);
    return {
      id,
      kind: "player-news",
      aboutId: moment.causeId,
      stage: said,
      weight: moment.impact,
      facts,
    };
  }
  return null;
}

/** What a government did, as a housemate with a source brings it up (conversation-rules.json governmentNews, TUNABLE). */
const GOVERNMENT_NEWS = (
  rulesFile as unknown as {
    governmentNews: {
      levels: readonly string[];
      withinDays: { value: number };
    };
  }
).governmentNews;
/** The news engine's record that a person read a story. */
const NEWS_READ = "news.read";
/** The town hall record of the meetings engine. */
const TOWN_HALL = "town-hall";
/** A governor's or mayor's address, by its event kind, and the office that gives it (local-address.json). */
const ADDRESS_OFFICES: ReadonlyMap<string, string> = new Map(
  Object.values(
    (
      localAddressData as unknown as {
        levels: Readonly<Record<string, { eventKind: string; office: string }>>;
      }
    ).levels,
  ).map((row) => [row.eventKind, row.office]),
);
/** A question by the words it is said in (question-names `about`). */
const QUESTION_BY_ABOUT: ReadonlyMap<string, string> = new Map(
  NAMED_QUESTIONS.flatMap((question) => {
    const about = questionAbout(question);
    return about ? [[about, question] as [string, string]] : [];
  }),
);

/**
 * What a government did, brought up by someone the player lives with who has
 * a source for it on record (owner's golden path: "the town visibly changes,
 * people bring it up"): an address they heard (a governor's or a mayor's, said
 * by role), a local budget line or ordinance that carried, from the story they
 * read, or a town hall they attended. Read from the speaker's own records
 * (their index, newest first, never the whole log) within the window. With the
 * question it was about, their own side on it from the views engine; with no
 * side of theirs, it is told in two beats. Whom it reached is not read (a
 * registered stopgap): they say only what they heard, read or saw.
 */
function governmentNews(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
): Subject | null {
  if (!takesStands(core, speaker.id)) return null;
  // One of these a day from each person: the next waits for tomorrow.
  for (const key of heardNow)
    if (key.startsWith(`${HEARD_SUBJECT}${speaker.id}>government-news:`))
      return null;
  const since = addDays(
    makeIsoDate(core.date),
    -GOVERNMENT_NEWS.withinDays.value,
  );
  const api = coreAPI(core as CoreState);
  const lean = viewOf(api, speaker.id)?.lean;
  const ids = [...(core.logByPerson.get(speaker.id) ?? [])];
  for (let at = ids.length - one; at >= zero; at -= one) {
    const row = core.durableLog.get(ids[at] as never) as
      | {
          id: string;
          kind: string;
          date: string;
          personIds?: readonly string[];
          facts?: Readonly<Record<string, string>>;
        }
      | undefined;
    if (!row || row.date <= since || row.date > core.date) continue;
    const facts = row.facts ?? {};
    const cites = [row.id];
    const fact = (text: string, ids = cites): Fact => ({
      text,
      sourceRecordIds: ids,
    });
    const out: Facts = {
      first: calledBy(core, listener.id, speaker.id),
      you: calledBy(core, speaker.id, listener.id),
    };
    let stage: string | null = null;
    let about: string | undefined;
    const office = ADDRESS_OFFICES.get(row.kind);
    if (office) {
      // An address they heard: said by the office's role ("the governor").
      const role = (
        saidAsData.offices as Readonly<Record<string, { again?: string }>>
      )[office]?.again;
      about = facts[ADDRESS_FACT.pointAbout];
      if (!role || !about) continue;
      stage = "address";
      out.who = fact(role);
      const stance = facts[ADDRESS_FACT.pointStance];
      if (stance) out[`official-${stance}`] = fact("yes");
      out.when = fact(spokenWhen(row.date, core.date));
    } else if (row.kind === TOWN_HALL && row.personIds?.includes(speaker.id)) {
      // A town hall they attended, never one they held.
      if (facts.hostId === speaker.id) continue;
      const question = (facts.questions ?? "").split(",")[zero];
      about = question ? (questionAbout(question) ?? undefined) : undefined;
      if (!about) continue;
      stage = "meeting";
      out.when = fact(spokenWhen(row.date, core.date));
    } else if (row.kind === NEWS_READ && facts.carried === "yes") {
      // A budget line a local government changed, from the story read.
      const body = facts.level
        ? (saidAsData.deciders as Readonly<Record<string, string>>)[facts.level]
        : undefined;
      if (!body || !GOVERNMENT_NEWS.levels.includes(facts.level!)) continue;
      const delta = Number(facts.deltaMinor ?? zero);
      const purpose = budgetPurposeSaid(facts.line ?? "", delta < zero);
      if (!purpose || !delta) continue;
      stage = "budget";
      // A line carried in the budget is decided: said as done, never as
      // what the body should do (lead, Nov 13).
      out.decided = fact("yes");
      out.body = fact(body);
      out.purpose = fact(purpose);
      out.amount = fact(moneySaid(Math.abs(delta)));
    } else if (
      row.kind === NEWS_READ &&
      facts.form === "ordinance" &&
      facts.motion === "adopt" &&
      Number(facts.yes ?? zero) > Number(facts.no ?? zero)
    ) {
      // An ordinance the local body passed, from the story read.
      const body = facts.level
        ? (saidAsData.deciders as Readonly<Record<string, string>>)[facts.level]
        : undefined;
      const question = (facts.subjects ?? "").split(",")[zero];
      about = question ? (questionAbout(question) ?? undefined) : undefined;
      if (!body || !about || !GOVERNMENT_NEWS.levels.includes(facts.level!))
        continue;
      stage = "ordinance";
      // An ordinance passed is decided (lead, Nov 13).
      out.decided = fact("yes");
      out.body = fact(body);
    } else continue;
    // How they know it: the record that names them (the story read, the
    // address heard, the meeting attended).
    out["knows-record"] = fact("yes");
    const question = about ? QUESTION_BY_ABOUT.get(about) : undefined;
    if (about) out.about = fact(about);
    if (question && lean !== undefined) {
      const held = viewOn(api, speaker.id, question, lean);
      if (held !== zero) {
        out[held > zero ? "wants-it" : "wants-not"] = fact("yes", [
          ...cites,
          viewRecordId(speaker.id),
        ]);
        const stance = facts[ADDRESS_FACT.pointStance];
        if (stance)
          out[
            held > zero === (stance === "for") ? "with-them" : "against-them"
          ] = fact("yes", [...cites, viewRecordId(speaker.id)]);
      }
    }
    // One telling for the house: the same measure read in two outlets, or
    // the town halls of one evening, is one subject; one told already is
    // passed over for the next.
    const id = `government-news:${
      stage === "meeting"
        ? `${TOWN_HALL}:${row.date}`
        : (facts.sourceRecordId ?? row.id)
    }`;
    if (heardRows.some((heard) => heard.key === `${HEARD_SUBJECT}${id}`))
      continue;
    directorStopgap("SG-DIRECTOR-town-change-reach-unread", WORDS_STOPGAP_HITS);
    return {
      id,
      kind: "government-news",
      aboutId: row.id,
      stage,
      ...(question ? { news: { question } } : {}),
      facts: out,
    };
  }
  return null;
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
    const subject = printedSubject(core, story, director, speakerId);
    if (subject) return subject;
  }
  return null;
}

/**
 * One printed story as a subject the teller can raise: what it is about, by
 * the policy question it names, said as people say it, with where the teller
 * stands on that question from their own record. News is told in a person's
 * own words, never read out as a headline (owner, Nov 12: "sworn in, gives
 * inaugural address. What do you make of that?"): a story that names no
 * question, or one the teller holds no view on, is not raised in talk. This
 * holds for every kind of printed story, by what it is about.
 */
/** The sponsor of the bill a printed story covers, by name, from the bill's record; null where none is on record. */
function storySponsor(core: Readonly<CoreState>, story: Story): Fact | null {
  const billId = story.facts.billId;
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const bill = coreAPI(core as CoreState)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as { readonly sponsorId?: string } | undefined;
  const person = bill?.sponsorId
    ? core.people.get(bill.sponsorId as PersonId)
    : undefined;
  return person
    ? {
        text: `${person.givenName} ${person.familyName}`,
        sourceRecordIds: [story.id, billId, person.id],
      }
    : null;
}

function printedSubject(
  core: Readonly<CoreState>,
  story: Story,
  director: Director | undefined,
  tellerId: PersonId,
): Subject | null {
  if (story.kind !== PRINTED_STORY) return null;
  // A child tells no policy story with a side (stands, conversation-rules.json).
  if (!takesStands(core, tellerId)) return null;
  {
    // Told by its question, never by its headline: the story's words are
    // only cited when the paper has them.
    const said = director?.storyWords?.(core as CoreState, story);
    const cited = [story.id, ...(said?.sourceRecordIds ?? [])];
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
    if (!about) return null;
    const news = { question: story.topic! };
    // What the teller makes of it: their side on the question, from their
    // own view record. None, and they have nothing of their own to say.
    const stake = newsStake(core, tellerId, { news });
    if (stake.reason !== "stance") return null;
    const sponsor = storySponsor(core, story);
    return {
      id: `news:${story.id}`,
      kind: "news",
      aboutId: story.id,
      news,
      facts: {
        about: { text: about, sourceRecordIds: [story.id] },
        ...stakeMarks(stake, "their-"),
        // A printed story, told by what it is about (never its headline).
        story: { text: "yes", sourceRecordIds: cited },
        // Who brought the bill it covers, where the bill's record names a
        // sponsor: the answer to "Who's behind it?" (lead, Nov 13).
        ...(sponsor ? { sponsor } : {}),
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

/**
 * What a stranger says first: who they are. Their own name and, where the
 * two are at the speaker's work, the work; the stage says why the two are in
 * one place (working there, a customer or visitor, or the street).
 */
function introduction(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
  work: ReturnType<typeof sayJob>,
  room: { visitOrganizationId?: string },
): Subject | null {
  if (
    speaker.householdId === listener.householdId ||
    speaker.familyIds.has(listener.id as PersonId) ||
    saysName(core, speaker.id as PersonId, listener.id as PersonId)
  )
    return null;
  const facts: Facts = {
    "their-name": { text: speaker.givenName, sourceRecordIds: [speaker.id] },
  };
  let stage = "street";
  if (room.visitOrganizationId) {
    stage = "customer";
    if (work && work.org.id === room.visitOrganizationId) {
      stage = "working";
      facts["their-employer"] = {
        text: work.employer,
        sourceRecordIds: [work.job.id, work.org.id],
      };
    }
  }
  return { id: `here:${speaker.id}`, kind: "here", facts, stage };
}

/** The subjects a speaker can raise with a listener, from the speaker's records. */
export function subjectsBetween(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  director?: Director,
  /** The talk's room and hour (the telling): who else is here, and the minute it is said at. */
  room: {
    presentIds?: readonly PersonId[];
    minuteOfDay?: number;
    visitOrganizationId?: string;
  } = {},
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
  const mine = sayJob(core, speaker);
  if (mine)
    out.push({
      id: `own-work:${speakerId}`,
      kind: "own-work",
      facts: {
        employer: {
          text: mine.employer,
          sourceRecordIds: [mine.job.id, mine.org.id],
        },
        ...workDetail(core, speaker, mine, WORK_SLOTS),
      },
      own: { key: `person:${speakerId}:employer`, value: mine.org.id },
      // A true answer also tells what they do there, for the person card.
      ...(titleWords(mine.job.title, mine.org)
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
  const startedSaid = startedOrg ? employerWords(startedOrg) : null;
  if (started && startedJob && startedOrg && startedSaid) {
    const employer = {
      text: startedSaid,
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
    const position = titleWords(startedJob.title, startedOrg);
    if (position)
      out.push({
        id: `job-new-detail:${started.causeId}`,
        kind: "job-new-detail",
        aboutId: started.causeId,
        facts: {
          employer,
          position: {
            text: position,
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
  const theirSaid = theirs ? employerWords(theirs.org) : null;
  if (theirs && theirSaid && titleWords(theirs.job.title, theirs.org))
    out.push({
      id: `their-position:${listenerId}`,
      kind: "their-position",
      facts: {
        employer: {
          text: theirSaid,
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
    // Nobody is asked after while they stand there, or when they live with
    // both of them (owner, Nov 12: "Have you talked to Maya?").
    const asked = core.people.get(id);
    if (
      room.presentIds?.includes(id) ||
      (asked?.householdId === speaker.householdId &&
        asked?.householdId === listener.householdId)
    )
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
    const work = person ? sayJob(core, person) : null;
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
                text: work.employer,
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
    // One person in the house raises the address in a day; the others raise
    // something of their own or stay quiet (lead, Nov 14, rule 61).
    const raisedToday = [...heardNow].some((key) =>
      key.startsWith(`${HEARD_SUBJECT}${POINT}:`),
    );
    const point =
      opening?.id === address.value &&
      takesStands(core, speakerId) &&
      !raisedToday
        ? addressPointFor(
            core,
            speakerId,
            // A point someone in the house made today comes after one nobody
            // made (owner, Nov 12: "basically saying the same thing"), but a
            // point is the speaker's own stand on it: with every point made,
            // they still make theirs (lead, Nov 13: two people in one house
            // agreeing or disagreeing on the same question is the scene).
            fresher(
              addressPoints(opening),
              (row) => !heardNow.has(`${HEARD_QUESTION}${row.question}`),
            ),
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
  // A stand is the speaker's own, given once: a question a housemate named
  // today is still theirs to stand on (lead, Nov 13: a fact is told once in
  // the house a day, a stand is not blocked by another's).
  const stand = takesStands(core, speakerId)
    ? viewSubjectOf(core, speakerId, listenerId)
    : null;
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
              // Which way they want it to go, for an answer about what
              // comes next.
              [top.side === "for" ? "wants-it" : "wants-not"]: {
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
              // The reason itself, as the fit the rules found: what the job
              // pays an hour (against the proposal, or for a worker whose job
              // does not set pay: their own paycheck, from the job record; a
              // stance cites its source), or that they make payroll.
              ...(reason.fit === "pay-near" || reason.fit === "worker"
                ? hourlyFact(core, reason.recordIds[zero])
                : {}),
              ...(reason.fit === "payroll"
                ? {
                    "why-payroll": {
                      text: "yes",
                      sourceRecordIds: reason.recordIds,
                    },
                  }
                : {}),
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
        // Who decides it, where its level is on record (a federal question:
        // Congress), for an answer that names what comes next.
        ...(top?.question.startsWith(FEDERAL_QUESTION)
          ? {
              decider: {
                text: saidAsData.deciders.federal,
                sourceRecordIds: [top.recordId],
              },
            }
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
  if (listener.householdId === speaker.householdId) {
    // Their own work day, from the shift on record: what people who live
    // together tell each other every morning and evening.
    // One thing of their own day a day: a person who told the player about
    // their morning does not tell the evening too (the next day it is theirs).
    const toldToday = DAY_TALK.comesBack.some((kind) =>
      heardNow.has(`${HEARD_SUBJECT}${kind}:${speaker.id}`),
    );
    const shift = toldToday ? null : workDay(core, speaker, room.minuteOfDay);
    if (shift) out.push(shift);
    const rent = rentDue(core, speaker);
    if (rent) out.push(rent);
    const touching = storyTouching(core, speaker);
    if (touching) out.push(touching);
    const lessons = schoolDay(core, speaker, room.minuteOfDay);
    if (lessons) out.push(lessons);
    // The player's own news, from the player's ledger, by someone they
    // live with (the people at home talk most about the person in front of
    // them).
    const theirNews = playerNews(core, director, speaker, listener);
    if (theirNews) out.push(theirNews);
    // What a government did, from a record the speaker has of it.
    const governed = governmentNews(core, speaker, listener);
    if (governed) out.push(governed);
    out.push(
      ...playerDay(
        core,
        director,
        listener,
        room.minuteOfDay ?? sceneMinute(core, listener.id),
      ),
    );
    const quiet = quietDay(core, speaker, listener, room.minuteOfDay);
    if (quiet) out.push(quiet);
  }
  // A stranger who meets the player says who they are (Words lead, Nov 14,
  // rules 51, 52 and 56): their own name, and why the two are in one place.
  const introduces = introduction(core, speaker, listener, mine, room);
  if (introduces) out.push(introduces);
  // A figure of their own (what they make an hour) told to this listener
  // lately and unchanged since is not said again (lead, Nov 12: Brett states
  // his hourly wage in three of four talks).
  const told = out.map((row) => withoutToldFigures(row, speakerId, core.date));
  // Between relatives, a talk is personal only.
  if (speaker.familyIds.has(listenerId))
    return told.filter(
      (row) => !CONVERSATION_RULES.familyTalk.dropped.includes(row.kind),
    );
  return told;
}

/** The heard key of a figure of a speaker's own, by its fact and its words (a changed figure is a new key). */
const ownFigureKey = (speakerId: string, fact: string, text: string) =>
  `${HEARD_FIGURE}own:${speakerId}:${fact}:${text}`;

/**
 * A subject without the speaker's own figures (conversation-rules.json
 * dayTalk.figures) that the player heard from them within the wait
 * (dayTalk.figureAgainDays, TUNABLE), at the same value.
 */
function withoutToldFigures(
  subject: Subject,
  speakerId: PersonId,
  today: string,
): Subject {
  const drop = DAY_TALK.figures.filter((key) => {
    const fact = subject.facts[key];
    if (!fact) return false;
    const heard = heardRows.find(
      (row) => row.key === ownFigureKey(speakerId, key, fact.text),
    );
    return (
      !!heard &&
      daysBetween(makeIsoDate(heard.at), makeIsoDate(today)) <
        DAY_TALK.figureAgainDays.value
    );
  });
  if (!drop.length) return subject;
  const facts = { ...subject.facts };
  for (const key of drop) delete facts[key];
  return { ...subject, facts };
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

/** An employer as a person says it, through the said-as reader: never the market outside the town, a treasury as its government. */
function employerFact(
  core: Readonly<CoreState>,
  job: { id: string; organizationId: string } | undefined,
): Fact | undefined {
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  const said = org ? employerWords(org) : null;
  return job && org && said
    ? { text: said, sourceRecordIds: [job.id, org.id] }
    : undefined;
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
  president: { id: string; name: string; sourceRecordIds: readonly string[] },
): Subject {
  const speaker = core.people.get(speakerId)!;
  const said = [eventId, ...pick.point.sourceRecordIds];
  // Who gave it, as a slot in its own case that the said-as reader words
  // once the talk is composed: the role the first time the screen names
  // them, then "he" or "she" (owner, Nov 12: "There needs to be pronouns and
  // titles", "saying the full name every time").
  const who = [eventId, ...president.sourceRecordIds];
  const facts: Facts = {
    about: { text: pick.point.about, sourceRecordIds: said },
    president: {
      text: personSlot(president.id, "subject"),
      sourceRecordIds: who,
    },
    "president-object": {
      text: personSlot(president.id, "object"),
      sourceRecordIds: who,
    },
    "president-possessive": {
      text: personSlot(president.id, "possessive"),
      sourceRecordIds: who,
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
  // A point the listener already heard today (from anyone in the house) is
  // not told again as news: the speaker says it was heard, then gives their
  // own stand (lead, Nov 13: Kagman, Northern Mariana Islands).
  if (heardNow.has(`${HEARD_QUESTION}${pick.point.question}`))
    mark("point-heard", [eventId]);
  // What the President would do, and the President's side, for a policy
  // point; a year point is something the address said happened. Their own
  // stand, which the words follow.
  // The act is named in full (owner, Nov 12, through the pre-grade: "Do
  // what? 'Do that'?"): a stand says plainly what the speaker would or would
  // not have done, never a pronoun for it.
  // The act as a person says it, from the question's own names (the plain
  // verb phrase, and what an opponent says), never the speech's sentence
  // ("not raise tariffs", "a plan to ...": item 5 of the Nov 12 brief).
  const plainTo = questionTo(pick.point.question) ?? pick.point.to;
  if (plainTo) facts.to = { text: plainTo, sourceRecordIds: said };
  const sayNo = questionSide(pick.point.question, "against");
  if (sayNo) facts.against = { text: sayNo, sourceRecordIds: said };
  // Who would act on it: the address's questions are Congress's to decide.
  facts.decider = { text: saidAsData.deciders.federal, sourceRecordIds: said };
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
  // Which way they want the act to go, from their stand against the
  // President's: an answer about what comes next fits it (lead, Nov 12: "I'll
  // believe it when Congress passes it" from someone who said no to the plan).
  if (pick.point.stance && pick.stand !== "unsure")
    mark(
      (pick.stand === "with") === (pick.point.stance === "for")
        ? "wants-it"
        : "wants-not",
      [...said, speakerId],
    );
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
  // The federal government as people in this state say it: "Washington"
  // means the capital except where the state goes by the same name.
  facts.capital = {
    text:
      state && PLACE_SAID_ONLY_AS[state.name]
        ? FEDERAL_WORDS.plain
        : FEDERAL_WORDS.name,
    sourceRecordIds: said,
  };
  // Only someone who would know says what it means here (owner, Nov 12:
  // "how the hell would she know?"): a person who holds an office in town
  // reads its laws and its figures as part of the work. Anyone else has no
  // source for them, and the question is not offered (pointAnswerable).
  const knowsHere = personWorkOf(core, speakerId).offices.length > zero;
  if (!knowsHere) {
    // nothing here: no state law or town figure to tell
  } else if (stateRow && state) {
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
  // speaker's own trouble, said only by someone who would know them.
  const area = pointArea(pick.point);
  if (
    knowsHere &&
    place &&
    (pick.reason === "first" || pick.reason === "view") &&
    area
  )
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
    // Each hearer's point is their own (their stand, their reason), so its
    // id names them: one housemate telling theirs does not silence the next
    // ("what the player heard from someone in the house today is not told
    // again" holds for that person's point, not the address itself).
    id: `${POINT}:${eventId}:${speaker.id}`,
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
  // How long they have held a stand, said once in this talk (the parts this
  // speaker said in it), is not said again (lead, Nov 13).
  const held = heldPieces();
  const heldSaid = recentPartKeys.some((key) => held.has(key));
  const line = composeConversationLine({
    seed: core.seed,
    subject,
    speakerId,
    traits: core.people.get(speakerId)?.traits ?? {},
    facts: heldSaid
      ? {
          ...facts,
          [HELD_SAID]: { text: "yes", sourceRecordIds: [speakerId] },
        }
      : facts,
    stage,
    momentKey,
    // Oldest first: what the player heard on earlier days, then today, then
    // this talk, so a wording heard longest ago is the one said again.
    said: [...heardOrderFor(speakerId), ...heardNow, ...recentPartKeys],
  });
  if (!line) return null;
  const { asks, afterPlain, ...said } = line;
  void asks;
  void afterPlain;
  return { ...said, text: sentenceStarts(shortAfterFirst(said.text, facts)) };
}

/** A question said again once the talk has named it, while it is the only one on the table (said-as questionAgain.it). */
const QUESTION_AGAIN_WORD: string = (
  saidAsData as unknown as { questionAgain: { it: string } }
).questionAgain.it;

/** The short forms of a question's act once the line has named it (said-as questionAgain). */
const QUESTION_AGAIN = (
  saidAsData as unknown as {
    questionAgain: Readonly<Record<"against" | "to", string>>;
  }
).questionAgain;

/**
 * A question named once in a line is said short after (lead, Nov 12: "say no
 * to raising the debt limit only with spending cuts to match" right after the
 * opener named it): where the question's own words (`about`) come first, a
 * later act in full (`against`, `to`) becomes its short form.
 */
function shortAfterFirst(text: string, facts: Facts): string {
  const about = facts.about?.text;
  const at = about ? text.indexOf(about) : -one;
  if (at < zero) return text;
  const from = at + about!.length;
  let rest = text.slice(from);
  for (const key of ["against", "to"] as const) {
    const full = facts[key]?.text;
    if (full && rest.includes(full))
      rest = rest.replace(full, QUESTION_AGAIN[key]);
  }
  return text.slice(zero, from) + rest;
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
      const said = theirs ? employerWords(theirs.org) : null;
      // Work out of town for outside buyers has no employer to name.
      if (theirs && !said) return null;
      if (theirs && said)
        return {
          facts: {
            employer: {
              text: said,
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
      const wasSaid = was ? employerWords(was) : null;
      return {
        facts:
          was && wasSaid
            ? {
                employer: {
                  text: wasSaid,
                  sourceRecordIds: [ended!.id, was.id],
                },
              }
            : {},
        stage: "none",
      };
    }
    case "their-position": {
      const theirs = sayJob(core, listener);
      return theirs && titleWords(theirs.job.title, theirs.org)
        ? {
            facts: {
              employer: {
                text: theirs.employer,
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
  const mine = sayJob(core, player);
  if (mine) {
    facts["my-employer"] = {
      text: mine.employer,
      sourceRecordIds: [mine.job.id, mine.org.id],
    };
    Object.assign(
      facts,
      workDetail(core, player, mine, { position: "my-position" }),
    );
  }
  if (last.kind === "here")
    facts.self = { text: player.givenName, sourceRecordIds: [playerId] };
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
    // One screen names a thing once: where the teller already said the
    // question, a stand names the person told instead.
    const other = otherId ? core.people.get(otherId) : undefined;
    if (aboutToldBy(last.facts) && other?.givenName) {
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
    ...(heardNow.size ? { avoid: heardNow } : {}),
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
  return { ...said, text: sentenceStarts(said.text) };
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
/** The small questions whose asker gives their own answer back after the player's (conversation-rules.json givesBack). */
const GIVES_BACK: readonly string[] = (
  CONVERSATION_RULES as unknown as { givesBack: { kinds: string[] } }
).givesBack.kinds;

/** The raised kinds a give-back already told, by the asked kind (conversation-rules.json givesBack.covers). */
const GIVES_COVER: Readonly<Record<string, readonly string[]>> = (() => {
  const { about: _about, ...covers } = (
    CONVERSATION_RULES as unknown as {
      givesBack: { covers: Record<string, string[] | string> };
    }
  ).givesBack.covers;
  return covers as Record<string, string[]>;
})();

/**
 * What the asker of a small question gives back after the player's answer,
 * from their own record (lead, Nov 13: "a person who asks the player a small
 * question gives their own answer back"): where they are from, where they
 * work (or that they have no work), where a relative they asked about works
 * or lives. The facts and the stage of the `<kind>-give` cell, and the fact
 * the player learns of them; null when their record holds nothing to give,
 * and then the question is not asked.
 */
function giveBack(
  core: Readonly<CoreState>,
  playerId: PersonId,
  askerId: PersonId,
  kind: string,
  subject: Subject,
  /** The facts the question itself already said. */
  said: readonly string[] = [],
): {
  facts: Facts;
  stage: string;
  /** What the player learns, by the fact a line says. */
  learned: Readonly<Record<string, { key: string; value: string }>>;
} | null {
  const asker = core.people.get(askerId);
  const player = core.people.get(playerId);
  if (!asker || !player) return null;
  const you = calledBy(core, askerId, playerId);
  // A fact the player already holds is not told again (a fact is told once
  // in the house; lead, Nov 13): the give-back leaves it out.
  const known = (own: { key: string; value: string }) =>
    core.knowledgeByPerson.get(playerId)?.get(own.key)?.value === own.value;
  if (kind === "home-new") {
    const place = corePlaceByJurisdictionId(asker.placeId as never);
    const own = { key: `person:${askerId}:place`, value: asker.placeId };
    if (!place || known(own)) return null;
    return {
      facts: {
        you,
        "their-home": {
          text: spoken(place),
          sourceRecordIds: [asker.householdId],
        },
      },
      stage: asker.placeId === player.placeId ? "same" : "elsewhere",
      learned: { "their-home": own },
    };
  }
  if (kind === "school") {
    // Where the asker went to school, given back after the player's answer
    // (lead, Nov 14, rule 55): a talk never ends on the player's answer.
    const own = schoolOf(core, asker);
    if (!own) return null;
    const ownFact = { key: `person:${askerId}:school`, value: own.recordId };
    if (known(ownFact)) return null;
    return {
      facts: {
        you,
        "their-school": {
          text: own.text,
          sourceRecordIds: own.sourceRecordIds,
        },
      },
      stage: schoolStage(core, asker),
      learned: { "their-school": ownFact },
    };
  }
  if (kind === "own-work-new") {
    const held = sayJob(core, asker);
    if (!held) return { facts: { you }, stage: "none", learned: {} };
    const own = { key: `person:${askerId}:employer`, value: held.org.id };
    if (known(own)) return null;
    const years = tenureYears(startedOf(core, asker), core.date);
    return {
      facts: {
        you,
        "their-employer": {
          text: held.employer,
          sourceRecordIds: [held.job.id, held.org.id],
        },
        ...(years
          ? {
              "their-years": {
                text: `${years.text} years`,
                sourceRecordIds: years.sourceRecordIds,
              },
            }
          : {}),
      },
      stage: "working",
      learned: { "their-employer": own },
    };
  }
  if (kind === "asked-kin" && subject.aboutId) {
    // From the relative's own facts the subject carries (their work, where
    // they live), less what the player already holds and what the question
    // itself said ("Lives out in Ohio."), while something else is left.
    const kinId = subject.aboutId as PersonId;
    const kin = core.people.get(kinId);
    // Said by the relative's pronoun, from their own record.
    const gender = kin?.looks?.gender;
    const pronoun =
      gender === "male" ? "kin-he" : gender === "female" ? "kin-she" : null;
    if (!kin || !pronoun) return null;
    const employerId = jobOf(core, kin)?.org.id;
    const ownWork = employerId
      ? { key: `person:${kinId}:employer`, value: employerId }
      : undefined;
    const ownHome = { key: `person:${kinId}:place`, value: kin.placeId };
    const work =
      subject.facts.employer && !(ownWork && known(ownWork))
        ? subject.facts.employer
        : undefined;
    const home =
      subject.facts.place && !known(ownHome) ? subject.facts.place : undefined;
    const fresh = {
      work: work && !said.includes("employer") ? work : undefined,
      home: home && !said.includes("place") ? home : undefined,
    };
    const give = fresh.work || fresh.home ? fresh : { work, home };
    if (!give.work && !give.home) return null;
    return {
      facts: {
        you,
        [pronoun]: { text: "yes", sourceRecordIds: [kinId] },
        ...(give.work ? { "kin-employer": give.work } : {}),
        ...(give.home ? { "kin-home": give.home } : {}),
      },
      stage: player.knownIds.has(kinId) ? "known" : "unknown",
      learned: {
        ...(give.work && ownWork ? { "kin-employer": ownWork } : {}),
        ...(give.home ? { "kin-home": ownHome } : {}),
      },
    };
  }
  return null;
}

/**
 * Whether the asker has an answer to give back that the bank can say: with
 * no `<kind>-give` piece for it, the small question is not offered (lead,
 * Nov 14: new subjects stay unoffered when their pieces are absent).
 */
function canGiveBack(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
  kind: string,
  subject: Subject,
): boolean {
  const back = giveBack(core, playerId, otherId, kind, subject);
  if (kind !== "school") return !!back;
  return (
    !!back &&
    !!composedLine(
      core,
      otherId,
      `${kind}-give`,
      back.facts,
      back.stage,
      `${playerId}:${otherId}:${core.date}:${subject.id}:can-give`,
    )
  );
}

/**
 * The asker's answer given back, with what the player learns of it (lead,
 * Nov 13): composed under `<kind>-give`, the facts its words said written to
 * the player as a told fact. False when nothing can be given.
 */
function sayGiveBack(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  last: LastLine,
  answeredId: string,
  eventId: string,
): boolean {
  const { playerId, otherId } = conversation;
  const asked = [...conversation.lines]
    .reverse()
    .find((row) => row.speakerId === otherId && row.kind === last.kind);
  const back = giveBack(
    core,
    playerId,
    otherId,
    last.kind,
    last.subject,
    asked?.wording?.facts ?? [],
  );
  const line = back
    ? composedLine(
        core,
        otherId,
        `${last.kind}-give`,
        back.facts,
        back.stage,
        `${eventId}:give`,
        saidParts(conversation, otherId),
      )
    : null;
  if (!back || !line) return false;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: answeredId,
    kind: `${last.kind}-give`,
    act: "tell",
    ...line,
  });
  const told = (line.wording?.facts ?? []).flatMap((fact) =>
    back.learned[fact] ? [back.learned[fact]!] : [],
  );
  if (told.length) {
    const id = `${eventId}:give`;
    applyCoreEvent(core as CoreState, {
      id,
      date: core.date,
      kind: data.toldEvent,
      personIds: [playerId, ...conversation.presentIds],
      witnessIds: [otherId],
      placeId: core.people.get(playerId)!.placeId,
      facts: Object.fromEntries(told.map((own) => [own.key, own.value])),
      source: {
        tag: "SOURCED",
        citation:
          "Recorded conversation: what the other person said of their own.",
        asOf: core.date,
      },
    });
    conversation.recorded.push(id);
  }
  return true;
}

/**
 * How a question about the player's school is put, from the player's own
 * record (Words lead, rule 54): a student the asker knows the school of is
 * asked if they are still there, any other student if they are in school, and
 * someone out of school where they went.
 */
function schoolAskStage(
  core: Readonly<CoreState>,
  askerId: PersonId,
  playerId: PersonId,
): string {
  const player = core.people.get(playerId)!;
  if (schoolStage(core, player) === "graduated") return "graduated";
  const mine = schoolOf(core, player);
  const theirs = schoolOf(core, core.people.get(askerId)!);
  return mine && theirs && mine.recordId === theirs.recordId
    ? "enrolled-holds"
    : "enrolled";
}

function askSubject(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  subject: Subject,
): boolean {
  const { playerId, otherId } = conversation;
  // Nobody asks what they already know (a relative asking "Where do you come
  // from?", batch 11).
  if (
    (subject.kind === "address" && watchedTogether(core, playerId, otherId)) ||
    (subject.own && knowsTruth(core, otherId, playerId, subject.own))
  ) {
    conversation.used.push(subject.id);
    return false;
  }
  // Nobody asks what they can see (Words lead, rule 52): "Where are you
  // from?" is for when one of the two is not from here.
  if (
    subject.kind === "home" &&
    core.people.get(otherId)?.placeId === core.people.get(playerId)?.placeId
  ) {
    conversation.used.push(subject.id);
    return false;
  }
  const kind = askedKind(core, data, otherId, playerId, subject);
  // A small question is asked only when the asker has their own answer to
  // give back (lead, Nov 13).
  if (
    GIVES_BACK.includes(kind) &&
    !canGiveBack(core, playerId, otherId, kind, subject)
  ) {
    conversation.used.push(subject.id);
    return false;
  }
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
        subject.kind === "school"
          ? schoolAskStage(core, otherId, playerId)
          : "default",
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
  // A small question is asked only when the asker has their own answer to
  // give back (lead, Nov 13): a relative with neither work nor a home on
  // record is not asked about.
  if (
    GIVES_BACK.includes(then.kind) &&
    !canGiveBack(core, playerId, otherId, then.kind, subject)
  )
    return false;
  const momentKey = `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:theirs`;
  // A subject whose raise the engine composes: the address's point, or one
  // with a `<kind>-say` sentence in the bank (where they stand).
  const composedRaise =
    subject.kind === POINT
      ? POINT
      : // A printed story, told by its reader: what it is about and their stand.
        subject.kind === "news" && subject.facts.story
        ? "news-ask"
        : composedConversationBank(`${subject.kind}-say`)
          ? `${subject.kind}-say`
          : null;
  // A question the talk already named is said again as "it" (questionOnce):
  // a frame that puts the name after "is" or "than" plays only as its first
  // naming ("The one I'd fight hardest is it."; lead, Nov 13).
  const aboutText = subject.facts.about?.text.toLowerCase();
  const named =
    !!aboutText &&
    conversation.lines.some((row) =>
      row.text.toLowerCase().includes(aboutText),
    );
  const composed =
    !said && composedRaise
      ? composedLine(
          core,
          otherId,
          composedRaise,
          named
            ? {
                ...subject.facts,
                "about-named": {
                  text: "yes",
                  sourceRecordIds: subject.facts.about!.sourceRecordIds,
                },
              }
            : subject.facts,
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
  // The policy question it names is named for the house today.
  const question = subject.news?.question ?? subject.point?.question;
  if (question) (conversation.questions ??= []).push(question);
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
  return subjectsBetween(
    core,
    otherId,
    playerId,
    conversation.director,
    conversation,
  ).find(
    (row) =>
      row.kind === kind &&
      !conversation.used.includes(`${otherId}>${row.id}`) &&
      !!data.otherRaises[row.kind] &&
      !!(row.kind === "here" || row.kind === "player-day"
        ? composedLine(
            core,
            otherId,
            `${row.kind}-say`,
            row.facts,
            row.stage ?? "default",
            `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${row.id}:theirs`,
          )
        : row.kind === POINT
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
    conversation,
  ).filter(
    (row) =>
      row.kind !== "news" &&
      // A day's own subject is told by its holder, never asked of the
      // player (asking it would mark the house's rent as said).
      !DAY_TALK.kinds.includes(row.kind) &&
      !conversation.used.includes(row.id),
  );
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
  // A stranger says who they are before asking anything.
  if (order.includes("here")) {
    const here = tellable(core, conversation, data, "here");
    if (
      here &&
      !heardNow.has(`${HEARD_SUBJECT}${here.id}`) &&
      raiseSubject(core, conversation, data, here)
    )
      return true;
  }
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
    conversation,
  ).filter(
    (row) =>
      order.includes(row.kind) &&
      data.otherRaises[row.kind] &&
      // Where they stand comes up only on the question the news just told
      // was about (its cause, in the same talk). A housemate's stand on the
      // same question today does not hold theirs back (lead, Nov 13).
      !(
        row.kind === "own-view" &&
        // Only as far as their tie and temperament allow (the views
        // engine's willingness): a stranger keeps where they stand.
        (!(row.weight ?? zero) ||
          !row.news?.question ||
          !(conversation.questions ?? []).includes(row.news.question))
      ) &&
      !conversation.used.includes(`${otherId}>${row.id}`) &&
      !conversation.used.includes(row.id) &&
      // Told to the player today by someone else in the house.
      !heardNow.has(`${HEARD_SUBJECT}${row.id}`) &&
      // A day's subject told once (the rent due by its date) is told to the
      // player once by the house, on any day.
      !(
        DAY_TALK.kinds.includes(row.kind) &&
        !DAY_TALK.comesBack.includes(row.kind) &&
        heardRows.some((heard) => heard.key === `${HEARD_SUBJECT}${row.id}`)
      ),
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
  // A stranger says who they are first.
  "here",
  "shared-school",
  "shared-work",
  "own-work",
  "home",
  // A relative the listener has not met, by name, with their town or work
  // (owner, Nov 11: "This introduces people to their world").
  "kin",
  "address",
  // What the player did today, from its record, asked by someone at home.
  "player-day",
  // Their own day, from its record (the shift, the rent coming due),
  // before the day itself; the player's own news first of these.
  "player-news",
  "government-news",
  "rent-due",
  "news-touch",
  "work-done",
  "work-day",
  "school-missed",
  "quiet",
];

/** The prefix of a federal policy question's id (the bill catalog's federal positions). */
const FEDERAL_QUESTION = "us-federal-positions:";

/** The youngest age at which someone takes a stand in talk, and how closely someone under the voting age must follow politics to take one (conversation-rules.json stands, TUNABLE). */
const STANDS = (
  rulesFile as unknown as {
    stands: { minAge: { value: number }; minEngagement: { value: number } };
  }
).stands;

/**
 * Whether a person takes a stand in talk: from the youngest age the rules
 * name, and under the voting age only when they follow politics closely (the
 * views engine's engagement; lead, Nov 12: a sixteen-year-old's stand is
 * gated by their engagement, not by age alone).
 */
export function takesStands(
  core: Readonly<CoreState>,
  personId: PersonId,
): boolean {
  const person = core.people.get(personId);
  if (!person) return false;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  if (age < STANDS.minAge.value) return false;
  if (age >= P.votingAge) return true;
  const engagement = core.modules.has(VIEWS_MODULE_ID)
    ? (viewOf(coreAPI(core as CoreState), personId)?.engagement ?? zero)
    : zero;
  return engagement >= STANDS.minEngagement.value;
}

/** Small talk's subject ids: the day itself, with nothing but the clock behind it. */
const SMALL_TALK_PREFIX = "quiet:";
/** Days before small talk is raised with the same person again (conversation-rules.json, TUNABLE). */
const SMALL_TALK_AGAIN_DAYS = (
  rulesFile as unknown as {
    smallTalk: { againAfterDays: { value: number } };
  }
).smallTalk.againAfterDays.value;

/** Subjects of a person's own day, and the days before one is told to the same person again (conversation-rules.json dayTalk, TUNABLE). */
const DAY_TALK = (
  rulesFile as unknown as {
    dayTalk: {
      kinds: readonly string[];
      comesBack: readonly string[];
      againAfterDays: { value: number };
      figures: readonly string[];
      figureAgainDays: { value: number };
      rentDaysBefore: { value: number };
      unusualShiftMinutes: { value: number };
      usualWeekDays: { value: number };
      rentCoveredMonths: { value: number };
    };
  }
).dayTalk;

/** The days a remembered topic waits before it may be opened again; undefined for one that never comes back. */
function againAfterDays(topic: string): number | undefined {
  // By its kind, whoever raised it ("them>quiet:..." as well as "quiet:...").
  if (`${subjectKindOf(topic)}:` === SMALL_TALK_PREFIX)
    return SMALL_TALK_AGAIN_DAYS;
  if (DAY_TALK.comesBack.includes(subjectKindOf(topic)))
    return DAY_TALK.againAfterDays.value;
  return undefined;
}

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
  "victimization",
  "death-news",
  "illness-news",
  "prison-news",
  "job-new",
  "job-new-detail",
  "job-new-told",
]);

/** The reply pieces that ask who is behind a story (conversation-rules.json askedWho). */
const ASKED_WHO: ReadonlySet<string> = new Set(
  (CONVERSATION_RULES as unknown as { askedWho: { pieces: string[] } }).askedWho
    .pieces,
);

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
 * Whether two people of one household watched the President's address
 * together: each holds the address's record, learned the same day.
 */
function watchedTogether(
  core: Readonly<CoreState>,
  a: PersonId,
  b: PersonId,
): boolean {
  if (core.people.get(a)?.householdId !== core.people.get(b)?.householdId)
    return false;
  const mine = core.knowledgeByPerson.get(a)?.get(ADDRESS_FACT.event);
  const theirs = core.knowledgeByPerson.get(b)?.get(ADDRESS_FACT.event);
  return (
    !!mine &&
    !!theirs &&
    mine.value === theirs.value &&
    mine.learnedAt === theirs.learnedAt
  );
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
} | null {
  const { playerId, otherId, director } = conversation;
  let best: { subject: Subject; asks: boolean; weight: number } | null = null;
  // The occasion comes first: a talk a scene opens is about the scene's
  // moment.
  const occasion = conversation.occasion;
  const consider = (subject: Subject, asks: boolean, holderId: PersonId) => {
    // Small talk loses to anything with a record: it is never the leading
    // subject, only the last thing the opening order reaches.
    if (subject.kind === "quiet") return;
    // What the two did together each of them knows (the telling's shared
    // events): nobody who watched the address with the player asks whether
    // they saw it; they open on their own point of it, which weighs what
    // the address would (owner, Nov 12: "settle in to listen to the
    // president's address").
    const together = watchedTogether(core, playerId, otherId);
    if (subject.kind === "address" && together) return;
    // Nor is the paper's story of it news between them.
    if (
      subject.kind === "news" &&
      together &&
      !!subject.aboutId &&
      storiesHeard(coreAPI(core as CoreState), holderId).some(
        (row) =>
          row.id === subject.aboutId &&
          row.facts.recordKind === OPENING_ADDRESS_EVENT,
      )
    )
      return;
    if (
      conversation.used.includes(subject.id) ||
      conversation.used.includes(`${otherId}>${subject.id}`)
    )
      return;
    // A scene's moment with the other person in it (a reunion) is about the
    // two of them: what they share stands for it when no subject is about
    // its cause, ahead of any other recorded event.
    const weight = !occasion
      ? subject.kind === POINT && together
        ? topicWeight(
            core,
            director,
            holderId,
            { ...subject, kind: "address" },
            data,
          )
        : topicWeight(core, director, holderId, subject, data)
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
    // A story's question already named in the house today is behind the
    // player: a second housemate does not bring the same news (owner, Nov
    // 12: "basically saying the same thing").
    if (
      subject.kind === "news" &&
      !!subject.news?.question &&
      heardNow.has(`${HEARD_QUESTION}${subject.news.question}`)
    )
      return;
    // Where someone stands never opens a talk (owner, Nov 12: "a statement
    // of politics from nowhere"): it comes up only after the news that is its
    // cause, told in the same talk (conversation-rules.json related.news).
    // A stand opens a talk only with its own reason from the speaker's life
    // (their work or their money, `has-reason`), never from nowhere.
    if (subject.kind === "own-view" && !subject.facts["has-reason"]) return;
    // What the player heard from someone in the house today is not told again.
    if (!asks && heardNow.has(`${HEARD_SUBJECT}${subject.id}`)) return;
    // A story is told to the player once, by whoever in the house tells it
    // first, on any day (one telling for the house).
    if (
      subject.kind === "news" &&
      heardRows.some(
        (row) =>
          row.key === `${HEARD_SUBJECT}${subject.id}` ||
          // Another paper's story on a question the house talked over this
          // week is the same news.
          (!!subject.news?.question &&
            row.key === `${HEARD_QUESTION}${subject.news.question}` &&
            daysBetween(makeIsoDate(row.at), makeIsoDate(core.date)) <
              SMALL_TALK_AGAIN_DAYS),
      )
    )
      return;
    if (weight > zero && (!best || weight > best.weight))
      best = { subject, asks, weight };
  };
  for (const subject of subjectsBetween(
    core,
    playerId,
    otherId,
    director,
    conversation,
  ))
    if (
      // A story is told by the one who read it, in their own words and
      // stand: nobody asks the player to tell the player's news back.
      subject.kind !== "news" &&
      (conversationHas(subject.kind, "ask", data) ||
        composedConversationBank(`${subject.kind}-ask`))
    )
      consider(subject, true, playerId);
  for (const subject of subjectsBetween(
    core,
    otherId,
    playerId,
    director,
    conversation,
  ))
    if (data.otherRaises[subject.kind]) consider(subject, false, otherId);
  return best as { subject: Subject; asks: boolean } | null;
}

/**
 * Opens a conversation: a greeting, then the talk's one main topic: the
 * biggest recent recorded event of either person, else what they share,
 * else the player's work or home.
 */
function openConversationNow(
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
  const knows = saysName(core, otherId, playerId);
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
  const told = occasion
    ? null
    : bringItUp(core as CoreState, otherId, playerId);
  // News someone else in the house already told the player today is not
  // told again (the telling's "said today").
  // News already talked over with the player (the listener's topic memory)
  // is not brought up again either.
  const talked = new Set(
    [...(core.knowledgeByPerson.get(otherId) ?? [])]
      .filter(([key]) => key.startsWith(talkedKeyPrefix(playerId)))
      .map(([, fact]) => fact.value),
  );
  const toldIds = told
    ? [
        `news:${told.change.eventId}`,
        `news:${storyOfReadEvent(told.change.eventId) ?? ""}`,
      ]
    : [];
  // News of something the two watched together is not news between them
  // (owner, Nov 12: the address's headline read out to someone who watched
  // it in the same room): it is not brought up.
  const toldStory = told ? storyOfReadEvent(told.change.eventId) : null;
  const aboutShared =
    !!toldStory &&
    watchedTogether(core, playerId, otherId) &&
    storiesHeard(coreAPI(core), otherId).some(
      (row) =>
        row.id === toldStory && row.facts.recordKind === OPENING_ADDRESS_EVENT,
    );
  const brought =
    told &&
    !aboutShared &&
    !toldIds.some(
      (id) =>
        heardNow.has(`${HEARD_SUBJECT}${id}`) ||
        heardRows.some((row) => row.key === `${HEARD_SUBJECT}${id}`) ||
        talked.has(id) ||
        talked.has(`${otherId}>${id}`),
    )
      ? told
      : null;
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
      ? printedSubject(core, story, conversation.director, otherId)
      : null;
    const news =
      headline ??
      subjectsBetween(
        core,
        otherId,
        playerId,
        conversation.director,
        conversation,
      )
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
    // A printed story is told only by what it is about and where the teller
    // stands (`printedSubject`), never by its bare mention ("There was
    // something in the paper about ..."): one with neither is not said.
    if (!raisedBrought) {
      for (const line of story ? [] : brought.lines)
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
  // News heard today from someone else in the house is behind the player.
  for (const key of heardNow)
    if (key.startsWith(`${HEARD_SUBJECT}news:`))
      conversation.used.push(key.slice(HEARD_SUBJECT.length));
  // Small talk is kept a week, and a day's own subject (a shift) a few days,
  // not for ever: past its wait it may come back with the day's new facts.
  for (const [key, fact] of core.knowledgeByPerson.get(otherId) ?? []) {
    if (!key.startsWith(talkedKeyPrefix(playerId))) continue;
    const wait = againAfterDays(fact.value);
    if (
      wait === undefined ||
      daysBetween(makeIsoDate(fact.learnedAt), makeIsoDate(core.date)) < wait
    )
      conversation.used.push(fact.value);
  }
  const main = raisedBrought ? null : mainTopic(core, conversation, data);
  const open = (topic: { subject: Subject; asks: boolean }) =>
    topic.asks
      ? askSubject(core, conversation, data, topic.subject)
      : raiseSubject(core, conversation, data, topic.subject);
  // The leading subject first; when it cannot be said (no wording fits its
  // facts), where they stand, if they would say it, rather than nothing.
  const opened = raisedBrought || (main ? open(main) : false);
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
 * What the player already heard today from anyone in the household (the
 * telling's "said today"): the wording pieces, kept as the player's own
 * knowledge, one key per piece, learned on the day. A wording heard today is
 * not picked again that day, so two housemates never give the same sentence
 * (owner, Nov 12: "basically saying the same thing").
 */
const HEARD_PREFIX = "talk:heard:";
/** The rows that pass, or all of them when none does. */
function fresher<T>(rows: readonly T[], keep: (row: T) => boolean): T[] {
  const kept = rows.filter(keep);
  return kept.length ? kept : [...rows];
}

/** A town or state figure told today. */
const HEARD_FIGURE = "figure:";
/** A policy question named today, by anyone in the house. */
const HEARD_QUESTION = "question:";
/** Lines that tell a stand without asking, whose replies are still the rules' own (`answersTo`). */
const STANDS_TOLD: ReadonlySet<string> = new Set(["news-ask-core"]);
/** A state whose bare name means the federal capital in speech (shared with the composed checks). */
const PLACE_SAID_ONLY_AS: Readonly<Record<string, string>> =
  composedChecksData.placeSaidOnlyAs.names;
/** How people say the federal government: by its capital, or plainly where that name is the state's. */
const FEDERAL_WORDS = saidAsData.federal;
/** A subject heard today, kept beside the pieces: news one housemate told is not told again by the next. */
const HEARD_SUBJECT = "subject:";
let heardNow: ReadonlySet<string> = new Set();
/** A piece heard from one speaker, kept beside the piece itself: each speaker's own wordings come round least recently used. */
const HEARD_BY = "by:";
/** Every piece the player has heard at home, with the day it was last heard and from whom (when kept). */
let heardRows: readonly { key: string; at: string; by?: string }[] = [];

/** The pieces the player heard, with the day each was last heard (the record keeps the last day) and the speaker, oldest first. */
function heardByDay(
  core: Readonly<CoreState>,
  playerId: PersonId,
): { key: string; at: string; by?: string }[] {
  const rows: { key: string; at: string; by?: string }[] = [];
  for (const [key, fact] of core.knowledgeByPerson.get(playerId) ?? []) {
    if (!key.startsWith(HEARD_PREFIX)) continue;
    const rest = key.slice(HEARD_PREFIX.length);
    const by = rest.startsWith(HEARD_BY)
      ? /^by:(?<speaker>[^:]+):(?<piece>.+)$/.exec(rest)?.groups
      : undefined;
    rows.push(
      by?.speaker && by.piece
        ? { key: by.piece, at: fact.learnedAt, by: by.speaker }
        : { key: rest, at: fact.learnedAt },
    );
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The pieces heard, oldest first, for one speaker: what the house said, then
 * what this speaker said, so a wording this speaker used comes back last and
 * one they used longest ago first (least recently used, no dice).
 */
function heardOrderFor(speakerId: PersonId): string[] {
  return [
    ...heardRows.filter((row) => !row.by).map((row) => row.key),
    ...heardRows.filter((row) => row.by === speakerId).map((row) => row.key),
  ];
}

function heardToday(
  core: Readonly<CoreState>,
  playerId: PersonId,
): Set<string> {
  const out = new Set<string>();
  for (const [key, fact] of core.knowledgeByPerson.get(playerId) ?? [])
    if (key.startsWith(HEARD_PREFIX) && fact.learnedAt === core.date)
      out.add(key.slice(HEARD_PREFIX.length));
  return out;
}

/**
 * Keeps every piece the other person said in this talk as heard today by the
 * player. Opening a talk writes nothing (it is also the room's probe); the
 * talk route calls this once the player really opened it, as it calls
 * `meetOverTalk`, and every `say` calls it for what follows.
 */
export function noteHeard(core: CoreState, conversation: Conversation): void {
  if (conversation.look) return;
  for (const line of conversation.lines) {
    if (line.speakerId === conversation.playerId) continue;
    for (const part of [
      ...(line.wording?.parts ?? []),
      // Who said each piece, for that speaker's least recently used wording.
      ...(line.wording?.parts ?? []).map(
        (piece) => `${HEARD_BY}${line.speakerId}:${piece}`,
      ),
      `${HEARD_SUBJECT}${line.subjectId}`,
      // The subject itself, whoever raised it: the next one in the house
      // does not tell the player the same thing (the rent coming due).
      `${HEARD_SUBJECT}${line.subjectId.replace(/^[^>]*>/, "")}`,
      // A key that starts with "=" is kept as it stands (a figure told).
      ...(conversation.questions ?? []).map((q) =>
        q.startsWith("=") ? q.slice(one) : `${HEARD_QUESTION}${q}`,
      ),
      // A figure of the speaker's own said in it (what they make an hour),
      // by its words, so it is said to the player once in its wait.
      ...ownFiguresSaid(core, line),
    ])
      hear(core, conversation.playerId, {
        key: `${HEARD_PREFIX}${part}`,
        value: part,
        learnedAt: core.date,
        sourceId: `conversation:${conversation.playerId}:${conversation.otherId}:${core.date}`,
        access: "perceived",
      });
  }
  // The replies offered to the player are kept too: the next talk today
  // offers other wordings while one fits ("Don't be late, then." to two
  // people one morning; lead, Nov 12).
  for (const choice of conversation.choices)
    for (const part of choice.wording?.parts ?? [])
      hear(core, conversation.playerId, {
        key: `${HEARD_PREFIX}${part}`,
        value: part,
        learnedAt: core.date,
        sourceId: `conversation:${conversation.playerId}:${conversation.otherId}:${core.date}`,
        access: "perceived",
      });
}

/**
 * Keeps a piece as heard now. The player's record holds its pieces in the
 * order last heard, so a piece heard again moves after the rest: the least
 * recently used wording is read from that order (`heardToday`,
 * `heardByDay`), and a piece kept where it was first heard would be the
 * "oldest" every time once a day had heard them all (conversation.test,
 * Jackson Center, Ohio: one hello, "Hey.", in nearly every greeting).
 */
function hear(core: CoreState, playerId: PersonId, fact: KnownFact): void {
  core.knowledgeByPerson.get(playerId)?.delete(fact.key);
  coreAPI(core).observe(playerId, fact);
}

/** The speaker's own figures a line said, as heard keys: their hourly pay, from their job record. */
function ownFiguresSaid(
  core: Readonly<CoreState>,
  line: ConversationLine,
): string[] {
  const used = line.wording?.facts ?? [];
  if (!DAY_TALK.figures.some((key) => used.includes(key))) return [];
  const wage = hourlyFact(
    core,
    core.people.get(line.speakerId)?.jobId ?? undefined,
  ).wage;
  return used.includes("wage") && wage
    ? [ownFigureKey(line.speakerId, "wage", wage.text)]
    : [];
}

/**
 * A scene the player played is heard like a talk (one telling for the house
 * and the day): the story its moment came from, and that story's question,
 * are not brought up again in talk that day (pre-grade of #8879, Fife,
 * Washington: a scene on the morning's story, then a talk on the same story
 * an hour later that contradicted it).
 */
export function noteSceneHeard(
  core: CoreState,
  director: Director,
  playerId: PersonId,
  momentId: string,
): void {
  const api = coreAPI(core);
  let causeId: string | undefined;
  for (const book of director.ledger.people.values()) {
    const moment = book.momentsById.get(momentId);
    if (moment) {
      causeId = moment.causeId;
      break;
    }
  }
  // The player's own news the scene played is heard: no one at home brings
  // it up again (the talk points back to the scene, never twins it).
  if (causeId)
    api.observe(playerId, {
      key: `${HEARD_PREFIX}${HEARD_SUBJECT}${playerNewsHeard(causeId)}`,
      value: playerNewsHeard(causeId),
      learnedAt: core.date,
      sourceId: `scene:${momentId}:${core.date}`,
      access: "perceived",
    });
  const storyId = causeId ? storyOfReadEvent(causeId) : null;
  if (!storyId) return;
  const story =
    storiesHeard(api, playerId).find((row) => row.id === storyId) ??
    (api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .get(storyId) as unknown as Story | undefined);
  for (const part of [
    `${HEARD_SUBJECT}news:${storyId}`,
    ...(story?.topic ? [`${HEARD_QUESTION}${story.topic}`] : []),
  ])
    api.observe(playerId, {
      key: `${HEARD_PREFIX}${part}`,
      value: part,
      learnedAt: core.date,
      sourceId: `scene:${momentId}:${core.date}`,
      access: "perceived",
    });
}

/** Runs a step of the talk with what the player heard today held back from the picks. */
function withHeard<T>(
  core: Readonly<CoreState>,
  playerId: PersonId,
  run: () => T,
): T {
  const before = heardNow;
  const order = heardRows;
  heardNow = heardToday(core, playerId);
  heardRows = heardByDay(core, playerId);
  try {
    return run();
  } finally {
    heardNow = before;
    heardRows = order;
  }
}

/**
 * Opens a conversation (see `openConversationNow`), handed the telling's
 * "said today": what the player heard from the household is not said again.
 */
export function openConversation(
  ...args: Parameters<typeof openConversationNow>
): Conversation {
  const [core, playerId] = args;
  const talk = withHeard(core, playerId, () => openConversationNow(...args));
  laterMentions(core, talk, zero);
  return talk;
}

/** The player says a line (see `sayNow`); what the other person says back is kept as heard today. */
export function say(...args: Parameters<typeof sayNow>): Conversation {
  const [core, conversation] = args;
  const from = conversation.lines.length;
  const talk = withHeard(core, conversation.playerId, () => sayNow(...args));
  laterMentions(core, talk, from);
  noteHeard(core, talk);
  return talk;
}

/**
 * The people a talk says by role, said once by role and then by pronoun
 * across the whole talk, its lines and the replies offered (said-as; owner,
 * Nov 12: "There needs to be pronouns and titles"). The President is the one
 * role talk says today.
 */
function laterMentions(
  core: Readonly<CoreState>,
  conversation: Conversation,
  from: number,
): void {
  employerOnce(conversation, from);
  presidentOnce(core, conversation, from);
  questionOnce(conversation);
}

/**
 * A policy question is named in full once in a talk; while it is the only
 * question on the table, every later mention, in the same turn or a reply,
 * is "it" (lead, Nov 13: "The council passed rent stabilization. I want it.
 * Have for a while."). When another question is named between, the name
 * comes back in full once. The whole talk is read each time (a mention
 * already said as "it" has no name left to match), then each reply offered
 * from where the talk stands.
 */
function questionOnce(conversation: Conversation): void {
  const names = [
    ...new Set(
      [
        ...(conversation.questions ?? [])
          .filter((question) => !question.startsWith("="))
          .map((question) => questionAbout(question)),
        conversation.topicFacts?.about?.text,
        conversation.last?.facts.about?.text,
      ].filter((text): text is string => !!text),
    ),
  ].sort((a, b) => b.length - a.length);
  if (!names.length) return;
  const pattern = new RegExp(
    `(?<![\\w'])(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w'])`,
    // A name that opens a sentence is said with a capital: it is the same name.
    "gi",
  );
  const say = (text: string, onTable: string | null) => {
    let table = onTable;
    const out = text.replace(pattern, (name) => {
      if (name.toLowerCase() === table) return QUESTION_AGAIN_WORD;
      table = name.toLowerCase();
      return name;
    });
    return { text: out === text ? text : sentenceStarts(out), table };
  };
  let table: string | null = null;
  for (const line of conversation.lines) {
    const said = say(line.text, table);
    line.text = said.text;
    table = said.table;
  }
  for (const choice of [...conversation.choices, ...conversation.lies])
    choice.text = say(choice.text, table).text;
}

/**
 * An employer the talk is about is named once, then said as "work" (said-as,
 * `nameOnceThen`; owner via the coordinator, Nov 12: "a day off from Walters
 * Supply Company?" / "Walters Supply Company wears me out."), across the
 * talk's lines and each reply offered.
 */
function employerOnce(conversation: Conversation, from: number): void {
  const names = new Set(
    [conversation.topicFacts?.employer, conversation.last?.facts.employer]
      .map((fact) => fact?.text)
      .filter((text): text is string => !!text),
  );
  for (const name of names) {
    const before = conversation.lines
      .slice(zero, from)
      .some((line) => line.text.includes(name));
    const lines = conversation.lines.slice(from);
    const said = nameOnceThen(
      lines.map((line) => line.text),
      name,
      "worker",
      before,
    );
    lines.forEach((line, at) => (line.text = said.texts[at]!));
    for (const choice of [...conversation.choices, ...conversation.lies])
      choice.text = nameOnceThen(
        [choice.text],
        name,
        "worker",
        said.named,
      ).texts[zero]!;
  }
}

function presidentOnce(
  core: Readonly<CoreState>,
  conversation: Conversation,
  from: number,
): void {
  const id = conversation.director?.ledger.opening?.president.id;
  const role = officeWords("president")?.again;
  if (!id || !role) return;
  const people = new Map([
    [
      id,
      {
        role,
        person: saidPersonOf(core, id, {
          speakerId: conversation.otherId,
          listenerId: conversation.playerId,
        }),
      },
    ],
  ]);
  const roleWords = new RegExp(`\\b${role.replace(/^the\s+/i, "")}\\b`, "i");
  const mentioned = new Set<string>();
  const note = (text: string) => {
    if (roleWords.test(text)) mentioned.add(id);
  };
  for (const line of conversation.lines.slice(zero, from)) note(line.text);
  for (const line of conversation.lines.slice(from)) {
    line.text = wordPersonSlots(line.text, people, mentioned);
    note(line.text);
  }
  for (const choice of [...conversation.choices, ...conversation.lies])
    choice.text = wordPersonSlots(choice.text, people, mentioned);
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
      // People who live together know each other's work (owner, Nov 12: a
      // housemate asking "What do you do?").
      knower.householdId === core.people.get(subjectId)?.householdId ||
      knower.familyIds.has(subjectId) ||
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
    conversation,
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
    // The replies the rules name for a line's move are its only replies:
    // after a question, and after news told with the teller's stand, which
    // is answered by agreeing, disagreeing or asking why, never a bare
    // "Wow." or "Really?" (owner, Nov 12: "the just non-replies").
    if (
      (putQuestion || STANDS_TOLD.has(askedMove ?? "")) &&
      fitting &&
      !fitting.includes(choiceKey)
    )
      return;
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
    const heard =
      NEWS_SUBJECTS.has(last.subject.kind) ||
      // What say() reads: the raised subject between them, and the other
      // person's own words for it.
      (!!raised &&
        between.some((row) => row.id === raised.id) &&
        !!replyFacts(core, otherId, raised)) ||
      !!data.tells?.[last.kind]?.[choiceKey] ||
      // Every reply to the address's point is answered, in composed words,
      // and so is asking someone why they stand where they do.
      (last.kind === POINT && pointAnswerable(last.facts, choiceKey)) ||
      (last.kind === "own-view" && choiceKey === OWN_VIEW_WHY) ||
      // A day's own subject answers every reply, in composed words.
      dayBack(last.kind) ||
      REPLY_MOVES.answerable.includes(replyMoveOf(last.kind, choiceKey));
    // A slot that opens a sentence is said with a capital, as every line is.
    const text = sentenceStarts(joinedReply(head, tail));
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
  // A stand is answered by agreeing, disagreeing or asking why (owner, Nov
  // 12: "Good to know." is not a reply to a stand).
  if (last.kind === "own-view")
    conversation.choices = conversation.choices.filter(
      (row) => OWN_VIEW_TAKES.includes(row.move) || row.move === OWN_VIEW_WHY,
    );
  // A reply that only takes the line in ("Oh, I see.", "Alright.") says
  // nothing and gets nothing back: it is not offered (owner, Nov 12: "the
  // just non-replies"). With nothing else to say, the talk ends on their line.
  conversation.choices = conversation.choices.filter(
    (row) => replyMoveOf(last.kind, row.move) !== "note",
  );
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
  const from = conversation.lines.length;
  carryOn(core, conversation, data);
  laterMentions(core, conversation, from);
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
/**
 * Whether the other person says the player's name: they knew the player
 * before today (or are kin). A stranger met in this very scene has not been
 * given it (lead, Nov 14, rule 51).
 */
function saysName(
  core: Readonly<CoreState>,
  otherId: PersonId,
  playerId: PersonId,
  conversation?: Pick<Conversation, "nameGiven">,
): boolean {
  if (conversation?.nameGiven) return true;
  const other = core.people.get(otherId);
  if (!other?.knownIds.has(playerId)) return false;
  if (other.familyIds.has(playerId)) return true;
  const learned = other.knownIdSources?.[playerId]?.learnedAt;
  if (learned !== undefined) return learned < core.date;
  const seen = lastContact(core, otherId, playerId);
  return !!seen && seen.date < core.date;
}

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
 * Whether the speaker is on shift for a goodbye that says they are due back:
 * the talk is at their own work, or the hour falls in their work span today.
 */
function onShift(
  core: Readonly<CoreState>,
  conversation: Conversation,
  speakerId: PersonId,
): boolean {
  const theirJob = jobOf(core, core.people.get(speakerId)!);
  if (!theirJob) return false;
  if (
    conversation.visitOrganizationId &&
    theirJob.org.id === conversation.visitOrganizationId
  )
    return true;
  const minute =
    conversation.minuteOfDay ?? sceneMinute(core, conversation.playerId);
  try {
    return workSpansOnDateV1(coreAPI(core as CoreState), {
      controlledPersonId: speakerId,
      date: core.date,
    }).owners.some(
      (owner) =>
        owner.job.id === theirJob.job.id &&
        owner.spans.some(
          (span) => span.startMinute <= minute && minute < span.endMinute,
        ),
    );
  } catch {
    // Work terms that cannot be read for the date are no shift.
    return false;
  }
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
  // A name given in this talk (the introduction) is a name to say goodbye by.
  const introduced = found === undefined && !!conversation.nameGiven;
  if (
    (named || introduced) &&
    player?.givenName &&
    saysName(core, speakerId, conversation.playerId, conversation)
  ) {
    facts["about-again"] = found
      ? topic[found]!
      : { text: "yes", sourceRecordIds: [conversation.playerId] };
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
    if (onShift(core, conversation, speakerId)) mark("on-shift", [speakerId]);
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
  if (facts["about-employer-mine"] && onShift(core, conversation, speakerId))
    facts["on-shift"] = { text: "yes", sourceRecordIds: [speakerId] };
  // Someone of the player's they know, when the talk named nothing else.
  if (family && !found) facts.name = family;
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
  // A talk between people who live together ends on its last line that says
  // something: nobody at home announces where they will be or that they will
  // check in (owner, Nov 12: "the same bullshit ... with the just
  // non-replies").
  if (housemate) return;
  // "Say hello to {name}." only for someone in the player's family they know.
  const family = housemate
    ? undefined
    : subjectsBetween(
        core,
        playerId,
        otherId,
        conversation.director,
        conversation,
      ).find((row) => row.kind === "family");
  // What a goodbye with no name in it may lean on: the hour, a first meeting,
  // and a town both live in (a stranger's goodbye never names the player).
  const nameless: Facts = {};
  const markNameless = (name: string, ids: readonly string[]) => {
    nameless[name] = { text: "yes", sourceRecordIds: ids };
  };
  for (const part of dayParts(
    conversation.minuteOfDay ?? sceneMinute(core, playerId),
  ))
    markNameless(part, [playerId]);
  if (!saysName(core, otherId, playerId))
    markNameless("first-meeting", [otherId]);
  const them = core.people.get(otherId);
  const me = core.people.get(playerId);
  const town = them?.placeId
    ? corePlaceByJurisdictionId(them.placeId as never)
    : null;
  if (town && them?.placeId === me?.placeId) {
    markNameless("both-here", [them.householdId]);
    nameless.place = {
      text: spoken(town),
      sourceRecordIds: [them.householdId],
    };
  }
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
        {
          ...(family ? { name: family.facts.name! } : {}),
          ...nameless,
        },
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
function sayNow(
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
      { ...last.facts, you: calledBy(core, otherId, playerId) },
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
  // Agreed or disagreed with, they answer from the same reason on record
  // (their work, their money): what they will do or expect, never only
  // that the two agree (words composer, Nov 12). Composed under
  // `own-view-take` by the reply's move; the talk carries on after.
  if (
    last.kind === "own-view" &&
    !choice.lie &&
    OWN_VIEW_TAKES.includes(choice.move)
  ) {
    const back = composedLine(
      core,
      otherId,
      OWN_VIEW_TAKE,
      { ...last.facts, you: calledBy(core, otherId, playerId) },
      choice.move,
      `${eventId}:take`,
      saidParts(conversation, otherId),
    );
    if (back)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: OWN_VIEW_TAKE,
        act: "tell",
        ...back,
        sourceRecordIds: [...new Set([...back.sourceRecordIds, eventId])],
      });
    if (back) {
      carryOn(core, conversation, data);
      return conversation;
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
  // A reply on a day's own subject (their shift): they answer it from the
  // same record, by the reply's move, and the talk carries on.
  if (dayBack(last.kind) && !choice.lie) {
    const back = composedLine(
      core,
      otherId,
      `${last.kind}-back`,
      { ...last.facts, you: calledBy(core, otherId, playerId) },
      choice.move,
      `${eventId}:back`,
      saidParts(conversation, otherId),
    );
    if (last.kind === "here") conversation.nameGiven = true;
    if (back)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: `${last.kind}-back`,
        act: "tell",
        ...back,
        sourceRecordIds: [...new Set([...back.sourceRecordIds, eventId])],
      });
    carryOn(core, conversation, data);
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
    conversation,
  ).find((row) => row.id === choice.raises);
  // Their own small question answered, they give their own answer back from
  // their record: the talk's last word is theirs and says something, and the
  // player learns it (lead, Nov 13). What the player's answer raised of their
  // own is told first, as a raised answer tells it.
  // Their own small question answered, they give their own answer back from
  // their record: the talk's last word is theirs and says something, and the
  // player learns it (lead, Nov 13). Where the player's answer raised
  // something of their own, it is told and answered as a raised answer is,
  // after the give-back.
  const gave =
    !doubted &&
    !choice.lie &&
    GIVES_BACK.includes(last.kind) &&
    sayGiveBack(core, conversation, data, last, choice.answers, eventId);
  // A raised answer the give-back already told (where they live, said as the
  // give-back) is not told again (lead, Nov 14, rule 53: one fact, once).
  const covered =
    gave && !!raised && GIVES_COVER[last.kind]?.includes(raised.kind) === true;
  if (gave && (!raised || covered)) {
    carryOn(core, conversation, data);
    return conversation;
  }
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
    const answered = doubted
      ? null
      : answerInTalk(core, {
          replyMove: replyMoveOf(last.kind, choice.move),
          answered: `${last.kind.replace(/-new$/, "")}:${choice.move}`,
          key: last.kind,
          speakerId: otherId,
          momentKey: `${playerId}:${otherId}:${conversation.lines.length}:take`,
          heard: heardNow,
        });
    // An answer says something or is not said: a bare taking-in ("Okay.",
    // "I see.") of an answer that asked nothing is a non-reply (owner, Nov
    // 12: "a useless interaction"); the talk carries on from its records
    // instead. Taking up a request ("Sit with me a minute?" "Sure.") stays.
    const take =
      answered?.move === "accept" &&
      replyMoveOf(last.kind, choice.move) !== "request"
        ? null
        : answered;
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
    // The answer may name the player as the speaker calls them.
    { ...last.facts, you: calledBy(core, otherId, conversation.playerId) },
    choice.move,
    `${eventId}:back`,
    saidParts(conversation, otherId),
  );
  // The town's or the state's record the answer told is heard for the day.
  const figure = last.facts.state ?? last.facts["town-figure"];
  if (
    back &&
    figure &&
    back.wording?.facts.some((key) => key === "state" || key === "town-figure")
  )
    (conversation.questions ??= []).push(`=${HEARD_FIGURE}${figure.text}`);
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

/**
 * Whether a question the player puts on the address's point can be answered
 * from what the other person holds (owner, Nov 12: "how the hell would she
 * know?"): what it means here needs this world's own record (the state's law
 * or the town's figure) that the player has not already heard today; what
 * they would do instead needs a stand of their own with a reason from their
 * own life. A dodge is never the whole answer, so with no record the
 * question is not offered.
 */
function pointAnswerable(facts: Facts, choiceKey: string): boolean {
  if (choiceKey === POINT_HERE) {
    const fact = facts.state ?? facts["town-figure"];
    return !!fact && !heardNow.has(`${HEARD_FIGURE}${fact.text}`);
  }
  if (choiceKey === POINT_INSTEAD)
    return (
      !!facts["stand-decided"] && !!(facts["why-work"] ?? facts["why-money"])
    );
  return true;
}
/** The point's replies that ask: what it means here, what they would do instead (conversation-rules.json replyMoves). */
const POINT_HERE = "here";
const POINT_INSTEAD = "instead";

/** Whether a line's kind is a day's own subject whose replies are answered in composed words (`<kind>-back`). */
function dayBack(kind: string): boolean {
  return (
    DAY_TALK.kinds.includes(kind) && !!composedConversationBank(`${kind}-back`)
  );
}

/** The player's replies to where someone stands that say where the player stands. */
const OWN_VIEW_TAKES: readonly string[] = ["agree", "disagree"];
/** The player's reply that asks them why, and the subject their answer is composed under. */
const OWN_VIEW_WHY = "why";
const OWN_VIEW_BACK = "own-view-back";
/** The subject their answer to an agreeing or disagreeing reply on where they stand is composed under. */
const OWN_VIEW_TAKE = "own-view-take";

/** The subject the other person's answer to a reply on news is composed under. */
const NEWS_BACK = "news-back";

/** Whether the teller already said the question a printed story is about: its lines tell it by that question. */
function aboutToldBy(facts: Facts): boolean {
  return !!facts.story && !!facts.about;
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
    you: calledBy(core, otherId, playerId),
    ...stakeMarks(theirs, "their-"),
    // No side of their own and no tie to the place: the answer says so.
    ...(theirs.reason === "none"
      ? { "their-none": { text: "yes", sourceRecordIds: [otherId] } }
      : {}),
    // "Who's behind it?" is asked as a why but answered as a who (lead,
    // Nov 13): the pieces that ask it are named in the rules (askedWho).
    [`said-${(choice.wording?.parts ?? []).some((part) => ASKED_WHO.has(part)) ? "who" : choice.move}`]:
      { text: "yes", sourceRecordIds: [eventId] },
    // One screen names a thing once: where the teller already said the
    // question, the answer says "it" and gives what else the story holds.
    [aboutToldBy(last.facts) ? "about-said" : "about-unsaid"]: {
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
