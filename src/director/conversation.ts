/**
 * Conversations on the new core (M4-02). Every subject is a record the
 * speaker holds. The other person asks or tells; every choice answers that
 * line (rule R3), each with a different move: plainly, with a further fact
 * from the records, by turning the question back, or briefly before raising
 * something else. Leaving is the screen's control, never a choice.
 *
 * Talking is time together: each exchange is recorded through the core's
 * relationship writer, so closeness grows and news passes as at any contact.
 * The lie (the scales control) exists only when the last line asks about the
 * player's own record and the listener doesn't already know it. A lie leaves
 * its exact claim as a belief in everyone present, the director keeps it, and
 * anyone who knows the truth sets a believer straight when they next talk.
 */
import {
  declareSnapshotCovered,
  registerSnapshotPart,
} from "../core2/snapshot";
import { addDays, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { P } from "../core2/parameters";
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
import conversationJson from "./data/conversation.json" with { type: "json" };
import { JOURNAL_DATA } from "./journal";
import { withParts } from "./parts";
import { renderLine, type Fact } from "./render";
import { markWordsStopgap } from "./stopgaps";
import {
  properName,
  schoolName,
  spoken,
  spokenMonth,
  spokenWhen,
} from "./words";

const zero = P.zero;
const one = P.one;

interface Move {
  key: string;
  text: string;
  stages?: string[];
  raises?: string;
  requiresFacts?: string[];
}
interface SubjectBank {
  ask?: Move[];
  raise?: Move[];
  reply?: Move[];
  answers?: Move[];
  lie?: Move[];
}
export interface ConversationData {
  version: string;
  stopgapId: string;
  minimumChoices: number;
  toldEvent: string;
  lieEvent: string;
  minutesPerExchange: number;
  /** The kind a reply is written as, when it differs from the raised one. */
  replyKinds: Readonly<Record<string, string>>;
  /** What the player answers when the other person raises one of their own subjects. */
  otherRaises: Readonly<Record<string, { kind: string; stage: string }>>;
  subjects: Readonly<Record<string, SubjectBank>>;
  /** How many of their relatives a person asks about in one conversation. */
  kinPerConversation: number;
  /** Recent news someone witnessed about a person both know, by event kind. */
  news: {
    days: number;
    kinds: Readonly<Record<string, string>>;
    possessive: Readonly<Record<string, string>>;
  };
}
export const CONVERSATION_DATA =
  conversationJson as unknown as ConversationData;

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
  /** The stage its replies are chosen in (good or bad news). */
  stage?: string;
}

export interface ConversationLine {
  speakerId: PersonId;
  subjectId: string;
  kind: string;
  act: "ask" | "answer" | "lie" | "tell";
  text: string;
  sourceRecordIds: readonly string[];
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
  /** The scales control's line; null dims it (nothing false to say). */
  lie: ConversationChoice | null;
  used: string[];
  /** Ids of the events the conversation recorded. */
  recorded: string[];
  /** What the last line was about (internal; the screen reads `lines`). */
  last?: LastLine;
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

/** The subjects a speaker can raise with a listener, from the speaker's records. */
export function subjectsBetween(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
): Subject[] {
  const speaker = core.people.get(speakerId)!;
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
  const place = lifePlaceByJurisdictionId(speaker.placeId as never);
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
            text: schoolName(context.facts?.schoolName ?? ""),
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
    if (id === listenerId || !listener.knownIds.has(id)) continue;
    const about = core.people.get(id);
    if (!about?.alive) continue;
    // Someone either of them lives with needs no asking after.
    if (
      about.householdId === speaker.householdId ||
      about.householdId === listener.householdId
    )
      continue;
    // Family go by their first names.
    const family = speaker.familyIds.has(id) || listener.familyIds.has(id);
    out.push({
      id: `mutual:${id}`,
      kind: "mutual",
      aboutId: id,
      facts: {
        name: {
          text: family ? about.givenName : fullName(core, id),
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
  const relationOf = new Map<string, { relation: string; factId: string }>();
  for (const fact of speaker.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      relationOf.set(fact.facts.otherPersonId, {
        relation: fact.kind.slice("family:".length),
        factId: fact.id,
      });
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
  out.push(...newsBetween(core, speaker, listener));
  return out;
}

/**
 * News the speaker witnessed in the last months about someone the listener
 * knows (a marriage, a baby, a move away, a lost job), told by name.
 */
function newsBetween(
  core: Readonly<CoreState>,
  speaker: Readonly<PersonState>,
  listener: Readonly<PersonState>,
): Subject[] {
  const news = CONVERSATION_DATA.news;
  const out: Subject[] = [];
  const since = addDays(makeIsoDate(core.date), -news.days);
  for (const fact of core.knowledgeByPerson.get(speaker.id)?.values() ?? []) {
    if (!fact.key.startsWith("event:") || !fact.key.endsWith(":experienced"))
      continue;
    const event = core.durableLog.get(fact.sourceId);
    const stage = event ? news.kinds[event.kind] : undefined;
    if (!event || !stage || event.date < since) continue;
    const childId = event.facts?.childId;
    // The speaker's own news: told in the first person.
    if (event.personIds.includes(speaker.id) && speaker.id !== childId) {
      out.push({
        id: `news:${event.id}`,
        kind: "news",
        aboutId: speaker.id,
        stage: `own-${stage}`,
        facts: {},
      });
      continue;
    }
    const aboutId = event.personIds.find(
      (id) =>
        id !== speaker.id &&
        id !== listener.id &&
        id !== childId &&
        listener.knownIds.has(id) &&
        core.people.get(id)?.alive,
    );
    if (!aboutId) continue;
    const about = core.people.get(aboutId)!;
    out.push({
      id: `news:${event.id}`,
      kind: "news",
      aboutId,
      stage,
      facts: {
        name: { text: about.givenName, sourceRecordIds: [event.id] },
        their: {
          text:
            news.possessive[about.looks?.gender ?? "other"] ??
            news.possessive.other!,
          sourceRecordIds: [event.id],
        },
      },
    });
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
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
      const place = lifePlaceByJurisdictionId(listener.placeId as never);
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
    // News told: the listener answers it as good or bad news.
    case "news":
      return {
        facts: subject.facts,
        stage: subject.stage ?? "default",
      };
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
        text: fullName(core, subject.aboutId!),
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
  const place = lifePlaceByJurisdictionId(player.placeId as never);
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
  if (last.kind === "kin" && last.subject.aboutId) {
    const relative = core.people.get(last.subject.aboutId);
    if (relative?.householdId === player.householdId)
      facts.housemate = { text: "", sourceRecordIds: [player.householdId] };
  }
  return { facts, ...(stage ? { stage } : {}) };
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
) {
  markWordsStopgap(data.stopgapId);
  return renderLine({
    seed: core.seed,
    surface: "dialogue",
    holderId: speakerId,
    bankKey: `conversation:${kind}:${part}`,
    version: data.version,
    variants: moves?.flatMap((row) =>
      withParts("conversation", kind, part, {
        key: row.key,
        text: row.text,
        ...(row.stages ? { stages: row.stages } : {}),
      }),
    ),
    facts: Object.fromEntries(
      Object.entries(facts).filter(([, fact]) => fact.text !== ""),
    ),
    momentKey,
    stage,
    fallbackSourceId: speakerId,
  });
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

/** The other person asks about the next thing they share with the player. */
function otherAsks(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  order: readonly string[],
): boolean {
  const { playerId, otherId } = conversation;
  const subjects = subjectsBetween(core, playerId, otherId).filter(
    (row) => !conversation.used.includes(row.id),
  );
  const other = core.people.get(otherId)!;
  const sameWork = subjects.find(
    (row) =>
      row.kind === "own-work" && jobOf(core, other)?.org.id === row.own?.value,
  );
  const subject =
    sameWork ??
    order
      .map((kind) => subjects.find((row) => row.kind === kind))
      .find(Boolean);
  if (!subject) return otherRaises(core, conversation, data);
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
  );
  if (!line) return false;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: subject.id,
    kind,
    act: "ask",
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
  });
  conversation.used.push(subject.id);
  conversation.last = { subject, kind, facts: subject.facts, stage: "default" };
  offerChoices(core, conversation, data);
  return true;
}

/** Subjects raised only by a move that names them, never as "something else". */
const EXPLICIT_ONLY = ["their-tenure"];
/** With nothing left to ask, the other person raises something of their own. */
function otherRaises(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): boolean {
  const { playerId, otherId } = conversation;
  // Fresh news comes first; a person asks about only a few of their
  // relatives in one conversation.
  const kinAsked = conversation.used.filter((id) =>
    id.startsWith(`${otherId}>kin:`),
  ).length;
  const theirs = subjectsBetween(core, otherId, playerId)
    .filter(
      (row) =>
        data.otherRaises[row.kind] &&
        !conversation.used.includes(`${otherId}>${row.id}`) &&
        !conversation.used.includes(row.id) &&
        (row.kind !== "kin" || kinAsked < data.kinPerConversation),
    )
    .sort((a, b) => Number(b.kind === "news") - Number(a.kind === "news"));
  const subject = theirs[zero];
  if (!subject) return false;
  const then = data.otherRaises[subject.kind]!;
  const line = words(
    core,
    data,
    otherId,
    subject.kind,
    "raise",
    data.subjects[subject.kind]?.raise,
    subject.facts,
    `${playerId}:${otherId}:${core.date}:${conversation.lines.length}:${subject.id}:theirs`,
    subject.stage,
  );
  if (!line) return false;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: `${otherId}>${subject.id}`,
    kind: then.kind,
    act: subject.kind === "own-work" ? "tell" : "ask",
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
  });
  conversation.used.push(`${otherId}>${subject.id}`);
  // Someone both know is a shared subject: neither raises them again.
  if (subject.kind === "mutual") conversation.used.push(subject.id);
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
    stage: subject.stage ?? then.stage,
  };
  offerChoices(core, conversation, data);
  return true;
}

const OPENING_ORDER = ["shared-school", "shared-work", "own-work", "home"];
const FOLLOW_ORDER = ["own-work", "home", "shared-school", "shared-work"];

/** Opens a conversation: the other person asks about something they share with the player. */
export function openConversation(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
  options: { presentIds?: readonly PersonId[]; data?: ConversationData } = {},
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
    lie: null,
    used: [],
    recorded: [],
  };
  // Work they share or know of first, then a shared past, then the player's
  // work or home.
  otherAsks(core, conversation, data, OPENING_ORDER);
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
      knower.familyIds.has(subjectId) ||
      (!!knower.jobId &&
        core.jobs.get(knower.jobId)?.organizationId === own.value)
    );
  // Family know where their relatives live and work; housemates know where
  // they live.
  if (knower.familyIds.has(subjectId)) return true;
  return knower.householdId === core.people.get(subjectId)?.householdId;
}

/** The false value a lie claims, chosen among real alternatives in the records. */
function lieClaim(
  core: Readonly<CoreState>,
  conversation: Conversation,
  subject: Subject,
): { stage: string; value: string; facts: Facts } {
  const key = `${core.seed}:${conversation.playerId}:${conversation.otherId}:${subject.id}`;
  if (subject.kind === "own-work") {
    const others = [...core.organizations.values()]
      .filter(
        (row) =>
          row.id !== subject.own!.value &&
          (core.peopleByPlace.get(row.placeId)?.size ?? zero) > zero,
      )
      .sort((a, b) =>
        stableHash(`${key}:${a.id}`).localeCompare(
          stableHash(`${key}:${b.id}`),
        ),
      );
    const other = others[zero];
    if (other && stableHash(`${key}:stage`) < stableHash(`${key}:none`))
      return {
        stage: "elsewhere",
        value: other.id,
        facts: {
          claimed: {
            text: properName(other.name),
            sourceRecordIds: [other.id],
          },
        },
      };
  }
  return {
    stage: "none",
    value: subject.kind === "own-work" ? "none" : "moved-away",
    facts: {},
  };
}

function offerChoices(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
): void {
  const { playerId, otherId } = conversation;
  const last = conversation.last!;
  conversation.choices = [];
  conversation.lie = null;
  const bank = data.subjects[last.kind];
  const own = playerFacts(core, playerId, last);
  const facts = { ...own.facts, ...last.facts };
  const stage = own.stage ?? last.stage;
  const turn = conversation.lines.length;
  const unused = subjectsBetween(core, playerId, otherId).filter(
    (row) => !conversation.used.includes(row.id) && row.id !== last.subject.id,
  );
  const taken = new Set<string>();
  const target = (raises: string): Subject | undefined => {
    const free = unused.filter((row) => !taken.has(row.id));
    const general = free.filter((row) => !EXPLICIT_ONLY.includes(row.kind));
    if (raises === "next") return general[zero];
    if (raises === "next-2") return general[one];
    return free.find((row) => row.kind === raises);
  };
  const seen = new Set<string>();
  const add = (move: Move, raisedSubject?: Subject) => {
    if (move.requiresFacts?.some((key) => !facts[key])) return;
    const answer = words(
      core,
      data,
      playerId,
      last.kind,
      "answers",
      [move],
      facts,
      `${playerId}:${otherId}:${turn}:${move.key}`,
      stage,
    );
    if (!answer) return;
    let text = answer.text;
    let ids = [...answer.sourceRecordIds];
    if (raisedSubject) {
      const raised = words(
        core,
        data,
        playerId,
        raisedSubject.kind,
        "raise",
        data.subjects[raisedSubject.kind]?.raise,
        raisedSubject.facts,
        `${playerId}:${otherId}:${turn}:${raisedSubject.id}:raise`,
        raisedSubject.stage,
      );
      if (!raised) return;
      // A turned-back question ("And you?") already asks; it carries no second line.
      if (!/\?$/.test(text)) text = `${text} ${raised.text}`;
      ids = [...new Set([...ids, ...raised.sourceRecordIds])];
    }
    if (seen.has(text)) return;
    seen.add(text);
    if (raisedSubject) taken.add(raisedSubject.id);
    conversation.choices.push({
      key: `${turn}:${move.key}${raisedSubject ? `:${raisedSubject.id}` : ""}`,
      move: move.key,
      text,
      answers: last.subject.id,
      ...(raisedSubject ? { raises: raisedSubject.id } : {}),
      lie: false,
      sourceRecordIds: ids,
    });
  };
  for (const move of bank?.answers ?? []) {
    if (move.raises) {
      const subject = target(move.raises);
      if (subject) add(move, subject);
    } else add(move);
  }
  // Four choices at least: further brief answers that raise the next subjects.
  const brief = (bank?.answers ?? []).find((row) => row.key === "brief");
  for (const subject of unused) {
    if (conversation.choices.length >= data.minimumChoices || !brief) break;
    if (EXPLICIT_ONLY.includes(subject.kind)) continue;
    if (!taken.has(subject.id)) add(brief, subject);
  }
  // The scales: a question about the player's own record they could deny.
  const asked = conversation.lines.at(-one);
  if (
    last.subject.own &&
    asked?.speakerId === otherId &&
    asked.act === "ask" &&
    !knowsTruth(core, otherId, playerId, last.subject.own)
  ) {
    const claim = lieClaim(core, conversation, last.subject);
    const lie = words(
      core,
      data,
      playerId,
      last.kind,
      "lie",
      bank?.lie,
      { ...last.facts, ...claim.facts },
      `${playerId}:${otherId}:${turn}:lie`,
      claim.stage,
    );
    if (lie)
      conversation.lie = {
        key: `${turn}:lie`,
        move: "lie",
        text: lie.text,
        answers: last.subject.id,
        lie: true,
        sourceRecordIds: lie.sourceRecordIds,
      };
  }
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
    (conversation.lie?.key === choiceKey ? conversation.lie : undefined);
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
  if (choice.lie && last.subject.own) {
    const claim = lieClaim(core, conversation, last.subject);
    // The exact claim and who heard it; the director keeps it as a lie.
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: data.lieEvent,
      personIds: [playerId, otherId],
      witnessIds: conversation.presentIds,
      placeId: player.placeId,
      topic: last.subject.own.key,
      facts: { [`claim:${last.subject.own.key}`]: claim.value },
      source,
    });
    conversation.recorded.push(eventId);
    // Each hearer believes the claim, until someone who knows better tells
    // them, unless their traits lean hard enough toward doubt to outweigh the
    // usual benefit of the doubt (every trait, through the shared table).
    const keeps = core.modules.has(BELIEFS_MODULE_ID);
    for (const hearerId of hearers) {
      const hearer = core.people.get(hearerId);
      if (hearer && doubtsClaim(core, hearer)) continue;
      api.observe(hearerId, {
        key: last.subject.own.key,
        value: claim.value,
        learnedAt: core.date,
        sourceId: eventId,
        access: "told",
      });
      if (!keeps) continue;
      beliefs(api).put({
        id: `${hearerId}:${last.subject.own.key}`,
        hearerId,
        subjectId: playerId,
        key: last.subject.own.key,
        claimed: claim.value,
        truth: last.subject.own.value,
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
  });
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
  const raised = subjectsBetween(core, playerId, otherId).find(
    (row) => row.id === choice.raises,
  );
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
    if (ack)
      conversation.lines.push({
        speakerId: otherId,
        subjectId: choice.answers,
        kind: "ack",
        act: "tell",
        text: ack.text,
        sourceRecordIds: [eventId, ...ack.sourceRecordIds],
      });
    if (!otherAsks(core, conversation, data, FOLLOW_ORDER)) {
      conversation.choices = [];
      conversation.lie = null;
    }
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
      )
    : null;
  if (!line || !reply) {
    conversation.choices = [];
    conversation.lie = null;
    return conversation;
  }
  conversation.lines.push({
    speakerId: otherId,
    subjectId: raised.id,
    kind,
    act: "tell",
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
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
// Snapshot: who believes something is rebuilt from the beliefs table.
registerSnapshotPart("beliefs-believers", {
  save: () => null,
  restore: (core) => {
    believerSets.delete(core);
  },
});
declareSnapshotCovered(BELIEFS_MODULE_ID);
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
