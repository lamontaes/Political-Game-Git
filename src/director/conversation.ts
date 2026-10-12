/**
 * Conversations on the new core (M4-02). Every subject is a record the
 * speaker holds; the other person asks about one; each of the player's
 * choices answers that line and raises another real subject. Leaving is the
 * screen's control, never a choice. The lie (the scales control) exists only
 * when the last line asks about the player's own record; telling it records
 * the exact claim and who heard it, so the director keeps it until the hearer
 * learns the truth. Words come from the English engine's grounded renderer.
 */
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { P } from "../core2/parameters";
import { applyCoreEvent } from "../core2/state";
import type { CoreState, IsoDate, PersonId, Source } from "../core2/types";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishKnowledge,
  type GroundedEnglishPacket,
} from "../presentation/grounded-english";
import conversationJson from "./data/conversation.json" with { type: "json" };
import { JOURNAL_DATA } from "./journal";
import { properName, spoken, spokenDate } from "./words";

const zero = P.zero;
const one = P.one;

interface Variant {
  key: string;
  text: string;
  stages?: string[];
}
interface SubjectBank {
  ask?: Variant[];
  answer?: Variant[];
  lie?: Variant[];
  lieClaim?: string;
  raise?: Variant[];
  reply?: Variant[];
}
export interface ConversationData {
  version: string;
  stopgapId: string;
  minimumChoices: number;
  toldEvent: string;
  lieEvent: string;
  /** The subject a reply is written as, when it differs from the raised one. */
  replyKinds: Readonly<Record<string, string>>;
  subjects: Readonly<Record<string, SubjectBank>>;
}
export const CONVERSATION_DATA = conversationJson as ConversationData;

interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}
type Facts = Record<string, Fact>;

/** Something real to talk about, from the speaker's records. */
export interface Subject {
  id: string;
  kind: string;
  facts: Facts;
  /** For the player's own record: the knowledge key and its true value. */
  own?: { key: string; value: string };
  /** The person a mutual subject is about, or the shared context's record. */
  aboutId?: string;
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
  text: string;
  /** The subject of the line it answers. */
  answers: string;
  /** The new subject it raises, if any. */
  raises?: string;
  lie: boolean;
  sourceRecordIds: readonly string[];
}

export interface Conversation {
  playerId: PersonId;
  otherId: PersonId;
  lines: ConversationLine[];
  choices: ConversationChoice[];
  /** The scales control's line; null dims it (nothing false to say). */
  lie: ConversationChoice | null;
  used: string[];
  /** Ids of the events the conversation recorded. */
  recorded: string[];
}

function fullName(core: Readonly<CoreState>, id: PersonId): string {
  const row = core.people.get(id)!;
  return `${row.givenName} ${row.familyName}`;
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
  const job = speaker.jobId ? core.jobs.get(speaker.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && employer)
    out.push({
      id: `own-work:${speakerId}`,
      kind: "own-work",
      facts: {
        employer: {
          text: properName(employer.name),
          sourceRecordIds: [job.id, employer.id],
        },
      },
      own: { key: `person:${speakerId}:employer`, value: employer.id },
    });
  const sameWork =
    !!job &&
    !!listener.jobId &&
    core.jobs.get(listener.jobId)?.organizationId === job.organizationId;
  if (!sameWork)
    out.push({ id: `their-work:${listenerId}`, kind: "their-work", facts: {} });
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
  const place = lifePlaceByJurisdictionId(speaker.placeId as never);
  if (place)
    out.push({
      id: `home:${speakerId}`,
      kind: "home",
      facts: {
        place: {
          text: spoken(place),
          sourceRecordIds: [speaker.householdId],
        },
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
      const jobId = (fact.facts?.contextFactId ?? "").split(":")[zero]!;
      const past = core.jobs.get(jobId);
      const org = past
        ? core.organizations.get(past.organizationId)
        : undefined;
      if (org && org.id !== employer?.id)
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
    const other = core.people.get(id);
    if (!other?.alive) continue;
    out.push({
      id: `mutual:${id}`,
      kind: "mutual",
      aboutId: id,
      facts: {
        name: {
          text: fullName(core, id),
          sourceRecordIds: [speaker.knownIdSources?.[id]?.sourceFactId ?? id],
        },
      },
    });
  }
  return out;
}

/** The facts the listener answers a raised subject with, from their own records. */
function replyFacts(
  core: Readonly<CoreState>,
  listenerId: PersonId,
  subject: Subject,
): { facts: Facts; stage: string } | null {
  const listener = core.people.get(listenerId)!;
  if (subject.kind === "home") {
    const place = lifePlaceByJurisdictionId(listener.placeId as never);
    return place
      ? {
          facts: {
            place: {
              text: spoken(place),
              sourceRecordIds: [listener.householdId],
            },
          },
          stage: "still",
        }
      : null;
  }
  if (subject.kind === "own-work")
    return { facts: subject.facts, stage: "default" };
  if (subject.kind === "their-work") {
    const job = listener.jobId ? core.jobs.get(listener.jobId) : undefined;
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    return org
      ? {
          facts: {
            employer: {
              text: properName(org.name),
              sourceRecordIds: [job!.id, org.id],
            },
          },
          stage: "working",
        }
      : { facts: {}, stage: "none" };
  }
  if (subject.kind === "shared-work") {
    const job = listener.jobId ? core.jobs.get(listener.jobId) : undefined;
    return {
      facts: subject.facts,
      stage: job?.organizationId === subject.aboutId ? "still" : "left",
    };
  }
  if (subject.kind === "mutual") {
    let last: IsoDate | undefined;
    let tie: string | undefined;
    for (const id of core.relationshipsByPerson.get(listenerId) ?? []) {
      const row = core.relationships.get(id)!;
      if (row.actorId !== subject.aboutId && row.otherId !== subject.aboutId)
        continue;
      if (!last || row.lastContactDate > last) {
        last = row.lastContactDate;
        tie = id;
      }
    }
    const name = {
      text: fullName(core, subject.aboutId!),
      sourceRecordIds: [
        listener.knownIdSources?.[subject.aboutId!]?.sourceFactId ??
          subject.aboutId!,
      ],
    };
    if (!last || !tie) return { facts: { name }, stage: "not" };
    const when = spokenDate(last, core.date);
    return {
      facts: { name, when: { text: when, sourceRecordIds: [tie] } },
      stage: "saw",
    };
  }
  return { facts: subject.facts, stage: "default" };
}

export function openConversation(
  core: Readonly<CoreState>,
  playerId: PersonId,
  otherId: PersonId,
  data: ConversationData = CONVERSATION_DATA,
): Conversation {
  const conversation: Conversation = {
    playerId,
    otherId,
    lines: [],
    choices: [],
    lie: null,
    used: [],
    recorded: [],
  };
  // The other person asks about something they share with the player: work
  // they share or know of first, then a shared past, then the player's home.
  const subjects = subjectsBetween(core, playerId, otherId);
  const other = core.people.get(otherId)!;
  const knowsWork = subjects.find(
    (row) =>
      row.kind === "own-work" &&
      (other.jobId
        ? core.jobs.get(other.jobId)?.organizationId === row.own?.value
        : false),
  );
  const order = ["shared-school", "shared-work", "home"];
  const opening =
    knowsWork ??
    order
      .map((kind) => subjects.find((row) => row.kind === kind))
      .find(Boolean);
  if (!opening) return conversation;
  const line = render(
    core,
    data,
    otherId,
    opening.kind,
    "ask",
    opening.facts,
    `${opening.id}:ask`,
  );
  if (!line) return conversation;
  conversation.lines.push({
    speakerId: otherId,
    subjectId: opening.id,
    kind: opening.kind,
    act: "ask",
    text: line.text,
    sourceRecordIds: line.sourceRecordIds,
  });
  conversation.used.push(opening.id);
  offerChoices(core, conversation, data, opening);
  return conversation;
}

function render(
  core: Readonly<CoreState>,
  data: ConversationData,
  speakerId: PersonId,
  kind: string,
  part: "ask" | "answer" | "lie" | "raise" | "reply",
  facts: Facts,
  momentKey: string,
  stage = "default",
) {
  const rows = data.subjects[kind]?.[part];
  if (!rows?.length) return null;
  const bank: AuthoredEnglishBank = {
    key: `conversation:${kind}:${part}`,
    version: data.version,
    surface: "dialogue",
    variants: rows.map((row) => ({
      key: row.key,
      kind: "template" as const,
      text: row.text,
      ...(row.stages ? { stages: row.stages } : {}),
    })),
  };
  const sourceIds = [
    ...new Set(Object.values(facts).flatMap((fact) => fact.sourceRecordIds)),
  ];
  const packet = {
    surface: "dialogue",
    momentKey,
    worldSeed: core.seed,
    bankVersion: data.version,
    stage,
    sourceRecordIds: sourceIds.length ? sourceIds : [speakerId],
    facts,
    speaker: { personId: speakerId, traits: {} },
    // The speaker's own records establish what they say.
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })) as unknown as GroundedEnglishKnowledge[],
  } as unknown as GroundedEnglishPacket;
  const result = renderGroundedEnglish(packet, bank);
  return result.kind === "rendered" ? result : null;
}

/**
 * Whether the listener already holds the true value: they were told it, or
 * they share the record (a coworker at the same employer, a housemate).
 * Then there is nothing false to say, and the scales dim.
 */
function listenerKnows(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  own: { key: string; value: string },
): boolean {
  const known = core.knowledgeByPerson.get(listenerId)?.get(own.key);
  if (known?.value === own.value) return true;
  const listener = core.people.get(listenerId)!;
  if (own.key.endsWith(":employer"))
    return (
      !!listener.jobId &&
      core.jobs.get(listener.jobId)?.organizationId === own.value
    );
  return listener.householdId === core.people.get(speakerId)!.householdId;
}

function offerChoices(
  core: Readonly<CoreState>,
  conversation: Conversation,
  data: ConversationData,
  last: Subject,
  lastFacts: Facts = last.facts,
  stage = "default",
): void {
  const { playerId, otherId } = conversation;
  const answer = render(
    core,
    data,
    playerId,
    last.kind,
    "answer",
    lastFacts,
    `${conversation.lines.length}:${last.id}:answer`,
    stage,
  );
  conversation.choices = [];
  conversation.lie = null;
  if (!answer) return;
  const turn = conversation.lines.length;
  // Answering alone is always a choice; each other one raises a new subject.
  conversation.choices.push({
    key: `${turn}:answer`,
    text: answer.text,
    answers: last.id,
    lie: false,
    sourceRecordIds: answer.sourceRecordIds,
  });
  for (const subject of subjectsBetween(core, playerId, otherId)) {
    if (conversation.used.includes(subject.id) || subject.id === last.id)
      continue;
    const raise = render(
      core,
      data,
      playerId,
      subject.kind,
      "raise",
      subject.facts,
      `${turn}:${subject.id}:raise`,
    );
    if (!raise) continue;
    conversation.choices.push({
      key: `${turn}:raise:${subject.id}`,
      text: `${answer.text} ${raise.text}`,
      answers: last.id,
      raises: subject.id,
      lie: false,
      sourceRecordIds: [
        ...new Set([...answer.sourceRecordIds, ...raise.sourceRecordIds]),
      ],
    });
  }
  // The scales: only a question about the player's own record can be lied to.
  if (
    last.own &&
    conversation.lines.at(-one)?.speakerId === otherId &&
    !listenerKnows(core, playerId, otherId, last.own)
  ) {
    const lie = render(
      core,
      data,
      playerId,
      last.kind,
      "lie",
      lastFacts,
      `${turn}:${last.id}:lie`,
    );
    if (lie)
      conversation.lie = {
        key: `${turn}:lie`,
        text: lie.text,
        answers: last.id,
        lie: true,
        sourceRecordIds: lie.sourceRecordIds,
      };
  }
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
  const player = core.people.get(playerId)!;
  const subjects = subjectsBetween(core, playerId, otherId);
  const answered = subjects.find((row) => row.id === choice.answers);
  const source: Source = {
    tag: "SOURCED",
    citation: "Recorded conversation: the line the player chose to say.",
    asOf: core.date,
  };
  const eventId = `conversation:${playerId}:${otherId}:${core.date}:${conversation.recorded.length}:${choice.key}`;
  if (choice.lie && answered?.own) {
    const claim = data.subjects[answered.kind]?.lieClaim ?? "";
    // The exact claim and who heard it; the director keeps it as a lie.
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: data.lieEvent,
      personIds: [playerId, otherId],
      placeId: player.placeId,
      topic: answered.own.key,
      facts: { [`claim:${answered.own.key}`]: claim },
      source,
    });
  } else if (answered?.own)
    // A true answer tells the other person the fact.
    applyCoreEvent(core, {
      id: eventId,
      date: core.date,
      kind: data.toldEvent,
      personIds: [otherId],
      witnessIds: [playerId],
      placeId: player.placeId,
      facts: { [answered.own.key]: answered.own.value },
      source,
    });
  if (core.eventIds.has(eventId)) conversation.recorded.push(eventId);
  conversation.lines.push({
    speakerId: playerId,
    subjectId: choice.raises ?? choice.answers,
    kind: answered?.kind ?? "",
    act: choice.lie ? "lie" : "answer",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const raised = subjects.find((row) => row.id === choice.raises);
  if (!raised) {
    conversation.choices = [];
    conversation.lie = null;
    return conversation;
  }
  conversation.used.push(raised.id);
  const reply = replyFacts(core, otherId, raised);
  // Telling one's own news tells the other person the fact.
  if (raised.own && !choice.lie) {
    const toldId = `${eventId}:told`;
    applyCoreEvent(core, {
      id: toldId,
      date: core.date,
      kind: data.toldEvent,
      personIds: [otherId],
      witnessIds: [playerId],
      placeId: player.placeId,
      facts: { [raised.own.key]: raised.own.value },
      source,
    });
    conversation.recorded.push(toldId);
  }
  const kind = data.replyKinds[raised.kind] ?? raised.kind;
  const line = reply
    ? render(
        core,
        data,
        otherId,
        kind,
        "reply",
        reply.facts,
        `${conversation.lines.length}:${raised.id}:reply`,
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
  offerChoices(
    core,
    conversation,
    data,
    { ...raised, kind },
    reply.facts,
    reply.stage,
  );
  return conversation;
}
