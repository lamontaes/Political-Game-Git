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
 * What a talk is about (owner, Oct 14, 2026, night): it starts from the place
 * and the occasion, then from the biggest recorded event of either person in
 * the director's ledger, else from what they share; it keeps to that one
 * topic, may go on to one related topic, and the other person closes it when
 * the topic is done. Someone not in the room is asked after only when
 * something recorded happened to them; news is what the speaker received,
 * and the President's address weighs by how closely they follow politics.
 * The listener remembers the last talk's topic and doesn't open with it again.
 */
import { declareSnapshotCovered } from "../core2/snapshot";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { ADDRESS_FACT } from "./opening-facts";
import { stableHash } from "../core2/kernel/ids";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { decisionLean } from "../core2/trait-decisions";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "../core2/types";
import { changesKnownTo } from "./bring-it-up";
import { JOURNAL_DATA } from "./journal";
import { DEFAULT_DIRECTOR_DATA, type Director } from "./ledger";
import { SITUATION_LIBRARY } from "./scheduling";
import type { Moment } from "./types";
import { viewOf } from "../core2/modules/views";
import {
  CONVERSATION_RULES,
  MINED_CONVERSATION,
} from "./mined/conversation-bank";
import { renderLine, type Fact } from "./render";
import { properName, spoken, spokenMonth, spokenWhen } from "./words";

const zero = P.zero;
const one = P.one;

export interface Move {
  /** The choice it makes (an answer), or the choice and its part (any other role). */
  key: string;
  /** The mined part it is worded from. */
  part?: string;
  text: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
  /** Whom the sentence speaks of, when it opens with a pronoun. */
  pronoun?: "he" | "she" | "they";
  /** A bare question turned back ("And you?"), said after the plain answer. */
  afterPlain?: boolean;
}
interface SubjectBank {
  ask?: Move[];
  raise?: Move[];
  reply?: Move[];
  answers?: Move[];
  lie?: Move[];
  open?: Move[];
  leave?: Move[];
}
export interface ConversationData {
  version: string;
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
  /** The ledger labels, by prefix, that are something happening to a person. */
  happenings?: { prefixes: readonly string[] };
  /** The subject kinds relatives do not raise or ask between them (owner, Oct 15, evening). */
  familyTalk: { dropped: readonly string[] };
  /** What the player answers when the other person raises one of their own subjects. */
  otherRaises: Readonly<Record<string, { kind: string; stage: string }>>;
  subjects: Readonly<Record<string, SubjectBank>>;
}
/** The mined words, read by default. */
export const CONVERSATION_DATA: ConversationData = MINED_CONVERSATION;

type Facts = Record<string, Fact>;

/** Something real to talk about, from the speaker's records. */
export interface Subject {
  id: string;
  kind: string;
  facts: Facts;
  /** For the player's own record: the knowledge key and its true value. */
  own?: { key: string; value: string };
  /** The person a mutual or kin subject is about, or the shared context's record. */
  aboutId?: string;
  /** The stage its own line is said in, from its record (a layoff, a closure). */
  stage?: string;
}

/** Which mined sentence said a line, and what picked it (for reports and grading). */
export interface Wording {
  /** The bank and role: `conversation:own-work:ask`. */
  bank: string;
  /** The mined parts the line is made of, in order. */
  parts: string[];
  stage: string;
  /** The record facts the line copied. */
  facts: string[];
}

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
  /** The director's ledger, read for what happened to whom (internal). */
  director?: Director;
  /** The moment the talk is the occasion of (a scene's), from the player's ledger. */
  occasion?: Moment;
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

/** The last school a person's records name. */
function schoolOf(person: Readonly<PersonState>) {
  return (person.pastFacts ?? [])
    .filter(
      (row) => row.kind === "school:cohort-estimate" && row.facts?.schoolName,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[zero];
}

/** Whether a person is past school age, which sets the tense they speak of school in. */
function schoolStage(core: Readonly<CoreState>, person: Readonly<PersonState>) {
  return ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
    P.benchmarkAdultMinimumAge
    ? "graduated"
    : "enrolled";
}

/** When the person started their current job, from their own record. */
function startedOf(
  person: Readonly<PersonState>,
): { date: string; factId: string } | null {
  const fact = (person.pastFacts ?? []).find(
    (row) =>
      row.kind === "work:tenure-summary" && row.facts?.jobId === person.jobId,
  );
  return fact?.facts?.startedAt
    ? { date: fact.facts.startedAt, factId: fact.id }
    : null;
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
  const moments = director?.ledger.people.get(personId)?.moments ?? [];
  const since = addDays(makeIsoDate(core.date), -recentDays());
  const out = [];
  for (let at = moments.length - one; at >= zero; at -= one) {
    const moment = moments[at]!;
    if (moment.date <= since) break;
    if (moment.date <= core.date) out.push(moment);
  }
  return out;
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
    (moment) =>
      moment.label === EVICTION_LABEL &&
      moment.causeId.startsWith(EVICTION_EVENT) &&
      !moment.counterpartIds.length,
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
    const kin = (speaker.pastFacts ?? []).find(
      (fact) =>
        fact.kind.startsWith("family:") && fact.facts?.otherPersonId === hostId,
    );
    const host =
      typeof hostId === "string"
        ? core.people.get(hostId as PersonId)
        : undefined;
    const forms = kin
      ? JOURNAL_DATA.relationWords[kin.kind.slice("family:".length)]
      : undefined;
    const word = forms?.[host?.looks?.gender ?? "other"] ?? forms?.other;
    if (kin && word)
      facts.relation = {
        text: `${JOURNAL_DATA.possessive.journal} ${word}`,
        sourceRecordIds: [kin.id, caseId],
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

/** How a person is related to each relative, by the family record that says so. */
function relationsOf(
  person: Readonly<PersonState>,
): Map<string, { relation: string; factId: string }> {
  const out = new Map<string, { relation: string; factId: string }>();
  for (const fact of person.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      out.set(fact.facts.otherPersonId, {
        relation: fact.kind.slice("family:".length),
        factId: fact.id,
      });
  return out;
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
  // happened to them lately (owner, Oct 14, 2026, night: no cold "How is X?").
  const happened = (id: PersonId) =>
    !!latestMoment(core, director, speakerId, id);
  const listener = core.people.get(listenerId)!;
  const out: Subject[] = [];
  const mine = jobOf(core, speaker);
  if (mine)
    out.push({
      id: `own-work:${speakerId}`,
      kind: "own-work",
      facts: {
        employer: {
          text: properName(mine.org.name),
          sourceRecordIds: [mine.job.id, mine.org.id],
        },
      },
      own: { key: `person:${speakerId}:employer`, value: mine.org.id },
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
  out.push(...evictionSubjects(core, director, speakerId, listenerId));
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
  for (const fact of speaker.pastFacts ?? []) {
    if (fact.facts?.otherPersonId !== listenerId) continue;
    const context = (speaker.pastFacts ?? []).find(
      (row) => row.id === fact.facts?.contextFactId,
    );
    if (fact.kind === "social:generated-school-acquaintance" && context)
      out.push({
        id: `shared-school:${context.id}`,
        kind: "shared-school",
        aboutId: context.id,
        facts: {
          school: {
            text: properName(context.facts?.schoolName ?? ""),
            sourceRecordIds: [fact.id, context.id],
          },
          years: {
            text: String(
              Number(core.date.slice(zero, core.date.indexOf("-"))) -
                Number(context.date.slice(zero, context.date.indexOf("-"))),
            ),
            sourceRecordIds: [context.id],
          },
        },
      });
    if (fact.kind === "social:generated-coworker") {
      const past = core.jobs.get(
        (fact.facts?.contextFactId ?? "").split(":")[zero]!,
      );
      const org = past
        ? core.organizations.get(past.organizationId)
        : undefined;
      if (org && org.id !== mine?.org.id)
        out.push({
          id: `shared-work:${org.id}`,
          kind: "shared-work",
          aboutId: org.id,
          facts: {
            employer: {
              text: properName(org.name),
              sourceRecordIds: [fact.id, org.id],
            },
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
  // The speaker's relatives the listener has not met, named by relation.
  const relationOf = relationsOf(speaker);
  for (const id of [...speaker.familyIds].sort()) {
    const relative = core.people.get(id);
    const row = relationOf.get(id);
    if (
      !relative?.alive ||
      !row ||
      listener.knownIds.has(id) ||
      id === listenerId
    )
      continue;
    const words = JOURNAL_DATA.relationWords[row.relation];
    const word = words?.[relative.looks?.gender ?? "other"] ?? words?.other;
    if (!word) continue;
    out.push({
      id: `kin:${id}`,
      kind: "kin",
      aboutId: id,
      facts: {
        relation: {
          text: `${JOURNAL_DATA.possessive.journal} ${word}`,
          sourceRecordIds: [row.factId],
        },
        name: { text: relative.givenName, sourceRecordIds: [row.factId] },
      },
    });
  }
  // The speaker's relatives the listener knows, asked after by name.
  for (const id of [...speaker.familyIds].sort()) {
    const relative = core.people.get(id);
    const row = relationOf.get(id);
    if (!relative?.alive || !row || !listener.knownIds.has(id)) continue;
    if (id === listenerId || !happened(id)) continue;
    const words = JOURNAL_DATA.relationWords[row.relation];
    const word = words?.[relative.looks?.gender ?? "other"] ?? words?.other;
    if (!word) continue;
    out.push({
      id: `family:${id}`,
      kind: "family",
      aboutId: id,
      facts: {
        relation: {
          text: `${JOURNAL_DATA.possessive.scene} ${word}`,
          sourceRecordIds: [row.factId],
        },
        name: { text: relative.givenName, sourceRecordIds: [row.factId] },
      },
    });
  }
  // The listener's relatives the speaker knows, asked after in turn once the
  // speaker has answered about their own ("And how's your sister?").
  const theirRelation = relationsOf(listener);
  for (const id of [...listener.familyIds].sort()) {
    const relative = core.people.get(id);
    const row = theirRelation.get(id);
    if (!relative?.alive || !row || !speaker.knownIds.has(id)) continue;
    if (id === speakerId || !happened(id)) continue;
    const words = JOURNAL_DATA.relationWords[row.relation];
    const word = words?.[relative.looks?.gender ?? "other"] ?? words?.other;
    if (!word) continue;
    out.push({
      id: `their-family:${id}`,
      kind: "their-family",
      aboutId: id,
      facts: {
        relation: {
          text: `${JOURNAL_DATA.possessive.scene} ${word}`,
          sourceRecordIds: [row.factId],
        },
        name: { text: relative.givenName, sourceRecordIds: [row.factId] },
      },
    });
  }
  // The speaker's own school, when the listener didn't share it.
  const school = schoolOf(speaker);
  const shared = out.some((row) => row.kind === "shared-school");
  if (school && !shared)
    out.push({
      id: `school:${speakerId}`,
      kind: "school",
      aboutId: school.id,
      facts: {
        school: {
          text: properName(school.facts!.schoolName!),
          sourceRecordIds: [school.id],
        },
      },
      own: { key: `person:${speakerId}:school`, value: school.id },
    });
  // Where the listener went to school, asked when they didn't share it.
  if (!shared && schoolOf(listener))
    out.push({
      id: `their-school:${listenerId}`,
      kind: "their-school",
      facts: {},
    });
  // The newest change the speaker learned of, as news to pass on.
  const news = changesKnownTo(core, speakerId)[zero];
  const institution = news
    ? core.organizations.get(news.institutionId)
    : undefined;
  if (news && institution)
    out.push({
      id: `news:${news.eventId}`,
      kind: "news",
      aboutId: news.eventId,
      facts: {
        topic: {
          text: properName(institution.name),
          sourceRecordIds: [news.eventId, institution.id],
        },
      },
    });
  // The President's address, once the speaker saw it or heard of it: its
  // remembered line is theirs to quote. Last, so it never takes the place of
  // a subject the banks can word.
  const known = core.knowledgeByPerson.get(speakerId);
  const address = known?.get(ADDRESS_FACT.event);
  const quote = known?.get(ADDRESS_FACT.remembered);
  if (address && quote)
    out.push({
      id: `address:${address.value}`,
      kind: "address",
      aboutId: address.value,
      facts: {
        quote: {
          text: quote.value,
          sourceRecordIds: [address.value, quote.sourceId],
        },
      },
    });
  // Between relatives, a talk is personal only (owner, Oct 15, evening).
  if (speaker.familyIds.has(listenerId))
    return out.filter(
      (row) => !CONVERSATION_RULES.familyTalk.dropped.includes(row.kind),
    );
  return out;
}

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
      return theirs
        ? {
            facts: {
              employer: {
                text: properName(theirs.org.name),
                sourceRecordIds: [theirs.job.id, theirs.org.id],
              },
            },
            stage: "working",
          }
        : { facts: {}, stage: "none" };
    }
    case "their-tenure": {
      const started = startedOf(listener);
      return started
        ? {
            facts: {
              since: {
                text: spokenMonth(started.date),
                sourceRecordIds: [started.factId],
              },
            },
            stage: "default",
          }
        : null;
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
      const school = schoolOf(listener);
      return school
        ? {
            facts: {
              school: {
                text: properName(school.facts!.schoolName!),
                sourceRecordIds: [school.id],
              },
            },
            stage: schoolStage(core, listener),
          }
        : null;
    }
    case "news":
      return {
        facts: subject.facts,
        stage: changesKnownTo(core, listenerId).some(
          (row) => row.eventId === subject.aboutId,
        )
          ? "heard"
          : "not-heard",
      };
    default:
      return { facts: subject.facts, stage: "default" };
  }
}

/** The facts the player's own answers can add, from the player's records. */
function playerFacts(
  core: Readonly<CoreState>,
  playerId: PersonId,
  last: LastLine,
): { facts: Facts; stage?: string } {
  const player = core.people.get(playerId)!;
  const facts: Facts = {};
  const mine = jobOf(core, player);
  if (mine)
    facts["my-employer"] = {
      text: properName(mine.org.name),
      sourceRecordIds: [mine.job.id, mine.org.id],
    };
  const started = startedOf(player);
  if (started) {
    facts.since = {
      text: spokenMonth(started.date),
      sourceRecordIds: [started.factId],
    };
    facts["my-since"] = facts.since;
  }
  const place = corePlaceByJurisdictionId(player.placeId as never);
  if (place)
    facts["my-place"] = {
      text: spoken(place),
      sourceRecordIds: [player.householdId],
    };
  let stage: string | undefined;
  if (last.kind === "home" || last.kind === "home-new") {
    const moved = (player.pastFacts ?? []).find(
      (row) => row.kind === "life:moved-into-county",
    );
    const born = (player.pastFacts ?? []).find(
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
    stage = changesKnownTo(core, playerId).some(
      (row) => row.eventId === last.subject.aboutId,
    )
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
interface Said {
  text: string;
  sourceRecordIds: readonly string[];
  wording: Wording;
}

/** Every relation word, so a sentence naming one fits only that relative. */
const RELATION_WORDS = new Set(
  Object.values(JOURNAL_DATA.relationWords).flatMap((forms) =>
    Object.values(forms),
  ),
);
const RELATION_IN_TEXT = /\b(wife|husband|[a-z]+)\b/gi;

/**
 * The wordings that fit the person a line speaks of: a sentence opening with
 * "she" only for a woman, and one naming a relative ("my father") only for
 * that relative.
 */
function fitAbout(
  moves: readonly Move[] | undefined,
  about: Readonly<PersonState> | undefined,
  relationWord: string | undefined,
): Move[] | undefined {
  if (!moves) return moves;
  const pronoun =
    about?.looks?.gender === "male"
      ? "he"
      : about?.looks?.gender === "female"
        ? "she"
        : "they";
  return moves.filter((move) => {
    if (move.pronoun && (!about || move.pronoun !== pronoun)) return false;
    const named = [...move.text.matchAll(RELATION_IN_TEXT)]
      .map((match) => match[one]!.toLowerCase())
      .filter(
        (word) => RELATION_WORDS.has(word) || /^(?:wife|husband)$/.test(word),
      );
    return named.every((word) => word === relationWord);
  });
}

function variantKey(move: Move): string {
  return move.part && !move.key.endsWith(move.part)
    ? `${move.key}.${move.part}`
    : move.key;
}

function words(
  core: Readonly<CoreState>,
  data: ConversationData,
  speakerId: PersonId,
  kind: string,
  part: keyof SubjectBank,
  moves: readonly Move[] | undefined,
  facts: Facts,
  momentKey: string,
  stage = "default",
  about?: Subject,
): Said | null {
  const person = about?.aboutId ? core.people.get(about.aboutId) : undefined;
  const relationWord = about?.facts.relation?.text.split(" ").at(-one);
  const usable = fitAbout(moves, person, relationWord)?.filter(
    (row) => !row.requiresFacts?.some((key) => !facts[key]),
  );
  const bank = `conversation:${kind}:${part}`;
  const line = renderLine({
    seed: core.seed,
    surface: "dialogue",
    holderId: speakerId,
    bankKey: bank,
    version: data.version,
    variants: usable?.map((row) => ({
      key: variantKey(row),
      text: row.text,
      ...(row.stages ? { stages: row.stages } : {}),
    })),
    facts: Object.fromEntries(
      Object.entries(facts).filter(([, fact]) => fact.text !== ""),
    ),
    momentKey,
    stage,
    fallbackSourceId: speakerId,
  });
  if (!line) return null;
  const chosen = usable?.find((row) => variantKey(row) === line.variantKey);
  return {
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
    wording: {
      bank,
      parts: [chosen?.part ?? line.variantKey ?? bank],
      stage,
      facts: [...(line.factKeys ?? [])],
    },
  };
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
    data.subjects[fresh] &&
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
  const line = words(
    core,
    data,
    otherId,
    kind,
    "ask",
    data.subjects[kind]?.ask,
    subject.facts,
    `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:ask`,
    "default",
    subject,
  );
  conversation.used.push(subject.id);
  if (!line) return false;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: subject.id,
    kind,
    act: "ask",
    ...line,
  });
  conversation.last = { subject, kind, facts: subject.facts, stage: "default" };
  conversation.topics.push(subject.id);
  offerChoices(core, conversation, data);
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
): boolean {
  const { playerId, otherId } = conversation;
  conversation.used.push(`${otherId}>${subject.id}`);
  const then = data.otherRaises[subject.kind];
  if (!then) return false;
  const line = words(
    core,
    data,
    otherId,
    subject.kind,
    "raise",
    data.subjects[subject.kind]?.raise,
    subject.facts,
    `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:theirs`,
    subject.stage ?? "default",
    subject,
  );
  if (!line) return false;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: `${otherId}>${subject.id}`,
    kind: then.kind,
    act: subject.kind === "own-work" ? "tell" : "ask",
    ...line,
  });
  // Someone both know, or news both may know, is shared: neither raises it again.
  if (subject.kind === "mutual" || subject.kind === "news")
    conversation.used.push(subject.id);
  // Theirs, not the player's: no own record the player could lie about.
  const raised: Subject = {
    id: `${otherId}>${subject.id}`,
    kind: subject.kind,
    facts: subject.facts,
    ...(subject.aboutId ? { aboutId: subject.aboutId } : {}),
  };
  conversation.last = {
    subject: raised,
    kind: then.kind,
    facts: subject.facts,
    stage: then.stage,
  };
  if (!remark) conversation.topics.push(raised.id);
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
      !!words(
        core,
        data,
        otherId,
        row.kind,
        "raise",
        data.subjects[row.kind]?.raise,
        row.facts,
        `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${row.id}:theirs`,
        row.stage ?? "default",
        row,
      ),
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
  const subjects = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  ).filter((row) => !conversation.used.includes(row.id));
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

/** What the place and the occasion open with when no recorded event leads: what they share, then the player's work or home. */
const OPENING_ORDER = ["shared-school", "shared-work", "own-work", "home"];

/** The subjects that are the two speakers' relationship: what they share. */
const SHARED_KINDS = ["shared-school", "shared-work"];

/** The key a listener remembers the last talk's topic under. */
const lastTalkKey = (playerId: PersonId) => `talk:${playerId}:topic`;

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
): void {
  const main = conversation.topics[zero];
  const related = main ? (data.related[subjectKindOf(main)] ?? []) : [];
  if (
    conversation.topics.length > one ||
    !otherAsks(core, conversation, data, related)
  )
    endConversation(core, conversation, data);
}

/**
 * The talk's main topic: the subject of either person that the biggest
 * recent recorded event is about, never the topic of their last talk.
 */
function mainTopic(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): { subject: Subject; asks: boolean } | null {
  const { playerId, otherId, director } = conversation;
  let best: { subject: Subject; asks: boolean; weight: number } | null = null;
  // The occasion comes first: a talk a scene opens is about the scene's
  // moment (owner, Oct 14, 2026, night: the place and the occasion).
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
        ? Number.POSITIVE_INFINITY
        : occasion.counterpartIds.includes(otherId) &&
            SHARED_KINDS.includes(subject.kind)
          ? Number.MAX_VALUE
          : topicWeight(core, director, holderId, subject, data);
    if (weight > zero && (!best || weight > best.weight))
      best = { subject, asks, weight };
  };
  for (const subject of subjectsBetween(core, playerId, otherId, director))
    if (data.subjects[subject.kind]?.ask?.length)
      consider(subject, true, playerId);
  for (const subject of subjectsBetween(core, otherId, playerId, director))
    if (data.otherRaises[subject.kind]) consider(subject, false, otherId);
  return best;
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
  };
  const occasion = options.occasionId
    ? options.director?.ledger.people
        .get(playerId)
        ?.momentsById.get(options.occasionId)
    : undefined;
  if (occasion) conversation.occasion = occasion;
  // A greeting first; a "How are you?" would need its own answer, so only a
  // greeting that asks nothing opens. The player's name only if they know it.
  const player = core.people.get(playerId)!;
  const knows = core.people.get(otherId)?.knownIds.has(playerId);
  // People who live together don't greet each other at home.
  const housemate =
    core.people.get(otherId)?.householdId === player.householdId;
  const greeting = housemate
    ? null
    : words(
        core,
        data,
        otherId,
        "greet",
        "open",
        data.subjects.greet?.open?.filter((move) => !/\?$/.test(move.text)),
        knows
          ? {
              name: {
                text: player.givenName,
                sourceRecordIds: [
                  core.people.get(otherId)?.knownIdSources?.[playerId]
                    ?.sourceFactId ?? playerId,
                ],
              },
            }
          : {},
        `${playerId}:${otherId}:${core.date}:greet`,
      );
  if (greeting)
    conversation.lines.push({
      speakerId: otherId,
      subjectId: `greet:${otherId}`,
      kind: "greet",
      act: "tell",
      ...greeting,
    });
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
          data.subjects["family-open"]?.open,
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
  // The topic of their last talk isn't opened again (the listener remembers).
  const remembered = core.knowledgeByPerson
    .get(otherId)
    ?.get(lastTalkKey(playerId))?.value;
  if (remembered) conversation.used.push(remembered);
  const main = mainTopic(core, conversation, data);
  const opened = main
    ? main.asks
      ? askSubject(core, conversation, data, main.subject)
      : raiseSubject(core, conversation, data, main.subject)
    : false;
  // A scene's talk keeps to its occasion: if nothing can be said about it,
  // the talk doesn't turn to small talk instead.
  if (
    !opened &&
    (occasion || !otherAsks(core, conversation, data, OPENING_ORDER))
  )
    endConversation(core, conversation, data);
  return conversation;
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
  if (own.key.endsWith(":employer"))
    return (
      !!knower.jobId &&
      core.jobs.get(knower.jobId)?.organizationId === own.value
    );
  // Where someone lives and went to school: their household and family know.
  return (
    knower.householdId === core.people.get(subjectId)?.householdId ||
    knower.familyIds.has(subjectId)
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
  return person
    ? { placeId: person.placeId, recordId: person.householdId }
    : null;
}

/** The kinds the player can raise: the other person has words to reply with. */
function raisable(data: ConversationData, kind: string): boolean {
  return (
    !!data.subjects[kind]?.raise?.length &&
    !!data.subjects[data.replyKinds[kind] ?? kind]?.reply?.length
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
  const bank = data.subjects[last.kind];
  const own = playerFacts(core, playerId, last);
  const facts = { ...own.facts, ...last.facts };
  const stage = own.stage ?? last.stage;
  const turn = conversation.lines.length;
  const unused = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  ).filter(
    (row) =>
      !conversation.used.includes(row.id) &&
      row.id !== last.subject.id &&
      // Never the person or thing just asked about, under another subject.
      !(last.subject.aboutId && row.aboutId === last.subject.aboutId) &&
      raisable(data, row.kind),
  );
  const taken = new Set<string>();
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
  const groups = new Map<string, Move[]>();
  for (const move of bank?.answers ?? [])
    groups.set(move.key, [...(groups.get(move.key) ?? []), move]);
  const seen = new Set<string>();
  const answerBank = `conversation:${last.kind}:answers`;
  const answerWith = (group: readonly Move[], momentKey: string) =>
    words(
      core,
      data,
      playerId,
      last.kind,
      "answers",
      group,
      facts,
      `${playerId}:${otherId}:${turn}:${momentKey}`,
      stage,
      last.subject,
    );
  const add = (
    choiceKey: string,
    group: readonly Move[],
    raised?: Subject,
    bank = answerBank,
    // A further wording of the same move (when a first one said what another did).
    again = "",
  ) => {
    // Each raised subject has its own moment, so brief answers vary.
    const answer = answerWith(
      group,
      raised ? `${choiceKey}:${raised.id}${again}` : `${choiceKey}${again}`,
    );
    if (!answer) return;
    let head: Said = answer;
    let tail: Said | null = null;
    const chosen = group.find((row) => row.part === answer.wording.parts[zero]);
    if (chosen?.afterPlain) {
      const plain =
        groups.get("plain") && answerWith(groups.get("plain")!, "plain");
      if (plain && !/\?$/.test(plain.text)) {
        head = plain;
        tail = answer;
      }
    }
    // Turning the question back asks it; nothing more is said.
    if (raised === last.subject && !/\?$/.test(answer.text)) return;
    // A move that turns the question back says nothing without its subject.
    if (!raised && group[zero]!.raises && /\?$/.test(answer.text)) return;
    if (raised && raised !== last.subject) {
      const line = words(
        core,
        data,
        playerId,
        raised.kind,
        "raise",
        data.subjects[raised.kind]?.raise,
        raised.facts,
        `${playerId}:${otherId}:${turn}:${raised.id}:raise`,
        "default",
        raised,
      );
      if (!line) return;
      // A turned-back question ("And you?") already asks; it carries no second line.
      if (!/\?$/.test(answer.text)) tail = line;
    }
    const text = tail ? `${head.text} ${tail.text}` : head.text;
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
      const raises = group[zero]!.raises;
      const subject = raises ? target(raises) : undefined;
      if (subject && !again) add(choiceKey, group, subject);
      add(choiceKey, group, undefined, answerBank, again);
    }
  };
  offer("");
  // Four replies that each answer the line: where a move's wordings collided
  // ("Of course." said twice), another wording of a move stands in for it,
  // never an acknowledgment (owner, Oct 15).
  for (
    let again = one;
    again <= P.two + one && conversation.choices.length < wanted;
    again += one
  )
    offer(`:more${again}`);
  // "Okay." and "All right." take in a statement; they are not an answer to a
  // question ("How's Keanu?"), and each reply moves the talk (owner, Oct 15).
  const question = conversation.lines.at(-one);
  if (question?.act !== "ask" && !/\?$/.test(question?.text ?? "")) {
    const acks = new Map<string, Move[]>();
    for (const move of data.subjects.ack?.reply ?? [])
      acks.set(move.key, [...(acks.get(move.key) ?? []), move]);
    for (const [key, group] of acks)
      add(`ack:${key}`, group, undefined, "conversation:ack:reply");
  }
  conversation.choices = rankChoices(core, playerId, conversation.choices);
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
 * The four replies a turn offers (owner, Oct 14: "four dynamic choices,
 * always"), ranked by the player's traits: someone who carries talk on sees
 * the replies that raise or ask first, someone who keeps it short sees plain
 * answers and acknowledgments first. Different moves come before a second
 * wording of the same move. "Say nothing" is a control beside them
 * (`sayNothing`), never one of the four.
 */
function rankChoices(
  core: Readonly<CoreState>,
  playerId: PersonId,
  pool: readonly ConversationChoice[],
): ConversationChoice[] {
  const player = core.people.get(playerId);
  const reach = player
    ? decisionLean(
        core,
        player,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      )
    : zero;
  const carries = (row: ConversationChoice) =>
    !!row.raises || !!row.tail || /\?$/.test(row.text);
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
    .sort((a, b) => place(a.row) - place(b.row) || a.at - b.at)
    .map(({ row }) => row);
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  const moves = new Set<string>();
  const first = ranked.filter((row) => {
    const move = row.move.startsWith("ack:") ? "ack" : row.move;
    if (moves.has(move)) return false;
    moves.add(move);
    return true;
  });
  return [...first, ...ranked.filter((row) => !first.includes(row))].slice(
    zero,
    count,
  );
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
  const bank = data.subjects[last.kind];
  const bases = lieClaims(core, conversation, last.subject).flatMap((claim) => {
    const momentKey = `${playerId}:${otherId}:${turn}:lie:${claim.stage}`;
    let said = words(
      core,
      data,
      playerId,
      last.kind,
      "lie",
      bank?.lie,
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
        bank?.answers?.filter((move) => move.key === "plain"),
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
        data.subjects["other-work"]?.reply,
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
      const text = choice?.tail
        ? `${said.text} ${choice.tail.text}`
        : said.text;
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

/** The slots that carry the player's own employer or place, which a false alternative replaces. */
const OWN_SLOTS = ["employer", "my-employer", "place", "my-place"];

/** How many wordings of a parting word are tried to find one not yet said in the talk. */
const farewellWordings = () =>
  DEFAULT_DIRECTOR_DATA.parameters.directorFarewellWordings!.value;

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
  // "Say hello to {name}." only for someone in the player's family they know.
  const family = subjectsBetween(
    core,
    playerId,
    otherId,
    conversation.director,
  ).find((row) => row.kind === "family");
  // A parting word is not one already said in this talk ("Nice to see you."
  // opening and closing it): a further wording of the same move stands in.
  const said = new Set(conversation.lines.map((row) => row.text));
  let line: ReturnType<typeof words> = null;
  for (let attempt = zero; attempt < farewellWordings(); attempt += one) {
    const next = words(
      core,
      data,
      otherId,
      "farewell",
      "leave",
      data.subjects.farewell?.leave,
      family ? { name: family.facts.name! } : {},
      `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:farewell${attempt ? `:${attempt}` : ""}`,
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
  } else if (last.subject.own && conversation.lines.at(-one)?.act === "ask")
    // A true answer tells everyone present the fact.
    tell(eventId, last.subject.own);
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
      data.subjects.lie?.reply,
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
      key: lastTalkKey(playerId),
      value: conversation.topics[zero],
      learnedAt: core.date,
      sourceId: eventId,
      access: "told",
    });
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
  if (!raised) {
    // Nothing new raised: the other person takes the answer in, as people do
    // in small talk, then carries on with something else.
    const ack = words(
      core,
      data,
      otherId,
      "ack",
      "reply",
      data.subjects.ack?.reply,
      {},
      `${playerId}:${otherId}:${conversation.lines.length}:ack`,
    );
    if (ack && !doubted)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: "ack",
        act: "tell",
        ...ack,
        sourceRecordIds: [eventId, ...ack.sourceRecordIds],
      });
    carryOn(core, conversation, data);
    return conversation;
  }
  conversation.used.push(raised.id);
  if (raised.own) tell(`${eventId}:told`, raised.own);
  const reply = replyFacts(core, otherId, raised);
  const kind = data.replyKinds[raised.kind] ?? raised.kind;
  const line = reply
    ? words(
        core,
        data,
        otherId,
        kind,
        "reply",
        data.subjects[kind]?.reply,
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

// Every table this engine keeps is in the snapshot; see scripts/core2-guard/snapshot-roundtrip.mjs.
declareSnapshotCovered("beliefs");
