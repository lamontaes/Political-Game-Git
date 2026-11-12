/**
 * People bring it up (M4-05). A person mentions a change they learned of and
 * who they believe caused it, and that belief follows only what they heard:
 * a blame someone told them (which can be wrong), the record they saw (the
 * business its closure names), or, with neither, someone they know holds a
 * public role, when their temperament runs to blaming authority. Telling it
 * passes the change and the blame on, so the next person's belief follows
 * this one's words. The director says which change and which blame; the
 * English engine (`src/english/bring-it-up-words.ts`) words them.
 */
import { closenessBetween } from "../core2/closeness";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { daysBetweenText } from "../core2/kernel/dates";
import { lifeOf, type LifeEvent } from "../core2/person-life";
import { P } from "../core2/parameters";
import { storyOfReadEvent } from "../core2/modules/news";
import { printedStoryOf } from "../core2/modules/press";
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { decisionLean, decisionTraitWeight } from "../core2/trait-decisions";
import type { CoreState, PersonId, PersonState, Source } from "../core2/types";
import { storyTopicName } from "../english/policy-names";
import {
  wordBringMove,
  type BillOutcome,
  type BlameHow,
  type BringMove,
  type BringWords,
} from "../english/bring-it-up-words";
import rowsJson from "./data/bring-it-up-rows.json" with { type: "json" };
import { possessive, properName } from "./words";

/** `data/bring-it-up-rows.json`: the structure, holding no sentences. */
export interface BringRows {
  version: string;
  toldEvent: string;
  heardKey: string;
  blameKey: string;
  changes: readonly {
    eventKind: string;
    institutionFact: { prefix: string; suffix: string };
    story?: boolean;
    eventIdPrefix?: string;
  }[];
  blame: readonly Attribution["how"][];
  /** What a person brings up from their own life: the record's weights and window. */
  remembered: {
    /** The told event's fact key for a remembered event (`remembered:<record id>`). */
    toldKey: string;
    ownWithinDays: { value: number };
    /** How much an event of each kind changed a life, by the life record's kind. */
    weights: Readonly<Record<string, { value: number }>>;
  };
}
export const BRING_IT_UP_ROWS = rowsJson as unknown as BringRows;

export interface KnownChange {
  eventId: string;
  /** The change row it matched (its event kind); heard changes keep the first. */
  kind: string;
  institutionId: string;
  learnedAt: string;
  /** "seen" from the record itself, or "heard" from someone. */
  route: "seen" | "heard";
}

export interface Attribution {
  eventId: string;
  how: BlameHow;
  blamedId?: string;
  /** The record the belief came from: a told event, the change, a public role. */
  sourceId?: string;
}

/** The changes a person learned of, newest first. */
export function changesKnownTo(
  core: Readonly<CoreState>,
  personId: PersonId,
  data: BringRows = BRING_IT_UP_ROWS,
): KnownChange[] {
  const known = core.knowledgeByPerson.get(personId);
  if (!known) return [];
  const out = new Map<string, KnownChange>();
  for (const fact of known.values()) {
    for (const change of data.changes) {
      const { prefix, suffix } = change.institutionFact;
      if (
        fact.key.startsWith(prefix) &&
        fact.key.endsWith(suffix) &&
        fact.access === "perceived"
      )
        out.set(fact.sourceId, {
          eventId: fact.sourceId,
          kind: change.eventKind,
          institutionId: fact.key.slice(
            prefix.length,
            fact.key.length - suffix.length,
          ),
          learnedAt: fact.learnedAt,
          route: "seen",
        });
    }
    if (fact.key.startsWith(`${data.heardKey}:`)) {
      const eventId = fact.key.slice(data.heardKey.length + P.one);
      if (!out.has(eventId))
        out.set(eventId, {
          eventId,
          kind: (
            data.changes.find(
              (row) =>
                row.eventIdPrefix && eventId.startsWith(row.eventIdPrefix),
            ) ?? data.changes[P.zero]!
          ).eventKind,
          institutionId: fact.value,
          learnedAt: fact.learnedAt,
          route: "heard",
        });
    }
  }
  return [...out.values()].sort(
    (a, b) =>
      b.learnedAt.localeCompare(a.learnedAt) ||
      a.eventId.localeCompare(b.eventId),
  );
}

/** Whether a person's traits lean toward blaming an official over withholding blame. */
export function leansToBlame(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
): boolean {
  return (
    decisionLean(
      core,
      person,
      "bring-it-up.blame",
      "blame-official",
      "withhold-blame",
    ) > P.zero
  );
}

/** Who a person believes caused a change, from what they heard. */
export function believedCause(
  core: Readonly<CoreState>,
  personId: PersonId,
  change: KnownChange,
  data: BringRows = BRING_IT_UP_ROWS,
): Attribution {
  const known = core.knowledgeByPerson.get(personId);
  const told = known?.get(`${data.blameKey}:${change.eventId}`);
  if (told)
    return {
      eventId: change.eventId,
      how: "told",
      blamedId: told.value,
      sourceId: told.sourceId,
    };
  if (change.route === "seen")
    return {
      eventId: change.eventId,
      how: "record",
      blamedId: change.institutionId,
      sourceId: change.eventId,
    };
  // Heard only that it happened: someone whose traits lean more toward
  // blaming authority than withholding blame puts it on the public figure
  // they know of (every trait, through the shared trait table).
  const person = core.people.get(personId);
  if (person && leansToBlame(core, person)) {
    const official = [...(known?.values() ?? [])]
      .filter(
        (fact) =>
          fact.key.endsWith(":public-role") && fact.key.startsWith("person:"),
      )
      .sort(
        (a, b) =>
          b.learnedAt.localeCompare(a.learnedAt) || a.key.localeCompare(b.key),
      )[P.zero];
    if (official)
      return {
        eventId: change.eventId,
        how: "assumed",
        blamedId: official.key.slice(
          "person:".length,
          official.key.length - ":public-role".length,
        ),
        sourceId: official.sourceId,
      };
  }
  return { eventId: change.eventId, how: "unknown" };
}

function nameOf(core: Readonly<CoreState>, id: string): string | null {
  const org = core.organizations.get(id);
  if (org) return properName(org.name);
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : null;
}

/** The vote on the listener's own bill a story printed, and how it came out. */
function ownBillVote(
  core: Readonly<CoreState>,
  api: ReturnType<typeof coreAPI>,
  change: KnownChange,
  listenerId: PersonId,
): { outcome: BillOutcome; form: string; recordId: string } | null {
  const storyId = storyOfReadEvent(change.eventId);
  const story = storyId ? printedStoryOf(api, storyId) : undefined;
  const record = story ? core.durableLog.get(story.wireId as never) : undefined;
  if (!record) return null;
  const facts = record.facts ?? {};
  const outcome: BillOutcome | null =
    record.kind === "bill-failed"
      ? "failed"
      : record.kind === "legislative-vote" &&
          facts.yes !== undefined &&
          facts.no !== undefined
        ? Number(facts.yes) > Number(facts.no)
          ? "passed"
          : "failed"
        : null;
  // What the bill is in its body (an ordinance, a bill), from its own row.
  const billId = String(facts.billId ?? "");
  const bill =
    billId && api.state.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(api, billId)
      : undefined;
  const form = bill?.form?.kind;
  // Theirs only when they sponsored it: a vote they merely cast on another's
  // bill is not "your ordinance".
  if (bill?.sponsorId !== listenerId) return null;
  return outcome && form ? { outcome, form, recordId: record.id } : null;
}

export interface BroughtUp {
  lines: { text: string; sourceRecordIds: readonly string[] }[];
  change: KnownChange;
  attribution: Attribution;
  toldEventId: string;
}

/** The speaker brings up the newest change they know of, and tells the listener. */
export function bringItUp(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  options: {
    rows?: BringRows;
    words?: BringWords;
    /** Only a change about the listener (their vote, their bill), else nothing. */
    onlyAboutListener?: boolean;
  } = {},
): BroughtUp | null {
  const data = options.rows ?? BRING_IT_UP_ROWS;
  // The newest change they know of that can be put into words: a printed
  // story is remembered only when the catalog names its topic.
  const api = coreAPI(core);
  const storyTopic = (change: KnownChange): string | null => {
    const storyId = storyOfReadEvent(change.eventId);
    const story = storyId ? printedStoryOf(api, storyId) : undefined;
    const topic = story ? storyTopicName(story.topic) : null;
    return topic ? topic.toLowerCase() : null;
  };
  const speakable = (change: KnownChange) =>
    !!nameOf(core, change.institutionId) &&
    (!data.changes.find((row) => row.eventKind === change.kind)?.story ||
      storyTopic(change) !== null);
  // A story about the listener (a vote they cast, a bill they sponsored) is
  // what one brings up to them first; otherwise the newest change (the
  // owner's council member heard nothing of his own ordinance, Oct 29).
  const aboutListener = (known: KnownChange): boolean => {
    const storyId = storyOfReadEvent(known.eventId);
    const story = storyId ? printedStoryOf(api, storyId) : undefined;
    if (!story) return false;
    const record = core.durableLog.get(story.wireId as never);
    return (
      story.subjectIds.includes(listenerId) ||
      record?.facts?.sponsorId === listenerId
    );
  };
  const speakables = changesKnownTo(core, speakerId, data).filter(speakable);
  // What they read about the listener, by story: an outlet's latest story
  // replaces the one before it, but each story read is kept as its own
  // news fact, so a vote on the listener's bill printed beside newer stories
  // is still theirs to raise with them, the newest first.
  const storyRow = data.changes.find((row) => row.story);
  let readAbout: KnownChange | undefined;
  for (const fact of core.knowledgeByPerson.get(speakerId)?.values() ?? []) {
    if (!storyRow || !fact.key.startsWith("news:printed:")) continue;
    if (fact.key.endsWith(":outlet")) continue;
    const storyId = fact.key.slice("news:".length);
    const story = printedStoryOf(api, storyId);
    if (!story) continue;
    const known: KnownChange = {
      eventId: `${storyRow.eventIdPrefix ?? `${storyRow.eventKind}:`}${storyId}:${fact.learnedAt}`,
      kind: storyRow.eventKind,
      institutionId: story.organizationId,
      learnedAt: fact.learnedAt,
      route: "seen",
    };
    // The vote on a bill the listener sponsored comes before a vote they
    // only cast on another's; then the newest.
    const ownRank = (change: KnownChange) =>
      ownBillVote(core, api, change, listenerId) ? P.one : P.zero;
    if (
      aboutListener(known) &&
      speakable(known) &&
      (!readAbout ||
        ownRank(known) > ownRank(readAbout) ||
        (ownRank(known) === ownRank(readAbout) &&
          known.learnedAt > readAbout.learnedAt))
    )
      readAbout = known;
  }
  const change =
    readAbout ?? speakables.find(aboutListener) ?? speakables[P.zero];
  const subject = change ? nameOf(core, change.institutionId) : null;
  if (!change || !subject) return null;
  if (
    options.onlyAboutListener &&
    change !== readAbout &&
    !aboutListener(change)
  )
    return null;
  const attribution = believedCause(core, speakerId, change, data);
  const story = data.changes.find(
    (row) => row.eventKind === change.kind,
  )!.story;
  const say = (
    move: BringMove,
    facts: Record<string, { text: string; sourceRecordIds: readonly string[] }>,
  ) =>
    wordBringMove({
      seed: core.seed,
      move,
      speakerId,
      traits: core.people.get(speakerId)?.traits ?? {},
      facts,
      momentKey: `${speakerId}:${listenerId}:${change.eventId}:${core.date}`,
      fallbackSourceId: change.eventId,
      ...(options.words ? { words: options.words } : {}),
    });
  const lines = [];
  const topic = story ? storyTopic(change) : null;
  const facts = {
    subject: {
      text: subject,
      sourceRecordIds: [change.eventId, change.institutionId],
    },
    ...(topic
      ? { topic: { text: topic, sourceRecordIds: [change.eventId] } }
      : {}),
  };
  // A story about the listener's own bill is told as theirs, with how the
  // vote came out ("I read in the Courier that your ordinance on transit
  // failed."), from the vote's own record.
  const own =
    change === readAbout ? ownBillVote(core, api, change, listenerId) : null;
  const first =
    (own &&
      say(
        { part: "yours", outcome: own.outcome, form: own.form },
        {
          ...facts,
          subject: {
            ...facts.subject,
            sourceRecordIds: [...facts.subject.sourceRecordIds, own.recordId],
          },
        },
      )) ||
    say({ part: "change", eventKind: change.kind }, facts);
  if (first) lines.push(first);
  // A printed story blames no one: the outlet only printed it.
  const who =
    attribution.blamedId && !story ? nameOf(core, attribution.blamedId) : null;
  const second = story
    ? null
    : say(
        { part: "blame", how: attribution.how, named: !!who },
        who
          ? {
              who: {
                text: who,
                sourceRecordIds: [attribution.sourceId ?? change.eventId],
              },
              whose: {
                text: possessive(who),
                sourceRecordIds: [attribution.sourceId ?? change.eventId],
              },
            }
          : {},
      );
  if (second) lines.push(second);
  // What was said reaches the listener: the change, and the blame if any.
  const speaker = core.people.get(speakerId)!;
  const source: Source = {
    tag: "SOURCED",
    citation:
      "Recorded conversation: a person brought up a change and who they believe caused it.",
    asOf: core.date,
  };
  const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${change.eventId}:${core.date}`;
  applyCoreEvent(core, {
    id: toldEventId,
    date: core.date,
    kind: data.toldEvent,
    personIds: [listenerId],
    placeId: speaker.placeId,
    facts: {
      [`${data.heardKey}:${change.eventId}`]: change.institutionId,
      ...(attribution.blamedId
        ? { [`${data.blameKey}:${change.eventId}`]: attribution.blamedId }
        : {}),
    },
    source,
  });
  return { lines, change, attribution, toldEventId };
}

export interface RememberedUp {
  lines: { text: string; sourceRecordIds: readonly string[] }[];
  event: LifeEvent;
  /** Both remember it (`true`), or it is the speaker's own. */
  shared: boolean;
  toldEventId: string;
}

/**
 * The events of the speaker's life they could bring up with the listener,
 * the most telling first: one both remember (it is on both lists), or one of
 * the speaker's own from the last year, never one already told to this
 * listener. Each is weighed by how close the two are and how much an event
 * of its kind changes a life (data/bring-it-up-rows.json, `remembered`);
 * then the newest, then the record id. A stranger brings up nothing. No roll.
 */
export function rememberedToBringUp(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  listenerId: PersonId,
  data: BringRows = BRING_IT_UP_ROWS,
): { event: LifeEvent; shared: boolean; weight: number }[] {
  const rows = data.remembered;
  const close = closenessBetween(core, speakerId, listenerId);
  const speaker = core.people.get(speakerId);
  if (close <= P.zero || !speaker) return [];
  const theirs = new Set(lifeOf(core, listenerId).map((event) => event.id));
  const heard = core.knowledgeByPerson.get(listenerId);
  const out: { event: LifeEvent; shared: boolean; weight: number }[] = [];
  for (const event of lifeOf(core, speakerId)) {
    // What they were made with is who they are, not something that happened.
    if (event.from === "built") continue;
    const kind = rows.weights[event.life]?.value;
    if (kind === undefined) continue;
    if (heard?.has(`${rows.toldKey}:${event.id}`)) continue;
    const shared = theirs.has(event.id);
    if (
      !shared &&
      (event.date > core.date ||
        daysBetweenText(event.date, core.date) > rows.ownWithinDays.value)
    )
      continue;
    // One both remember is theirs to talk over; one of their own is told as
    // far as their traits lean toward telling it over keeping it.
    const open = shared
      ? P.one
      : Math.exp(
          decisionTraitWeight(core, "bring-it-up.remembered") *
            decisionLean(
              core,
              speaker,
              "bring-it-up.remembered",
              "tell-own",
              "keep-own",
            ),
        );
    out.push({ event, shared, weight: close * kind * open });
  }
  return out.sort(
    (a, b) =>
      b.weight - a.weight ||
      b.event.date.localeCompare(a.event.date) ||
      a.event.id.localeCompare(b.event.id),
  );
}

/**
 * The speaker brings up an event of their life, the most telling one a
 * sentence of the bank can say, and the listener learns of it: the told
 * event keeps `remembered:<record id>` on the listener's knowledge, with the
 * speaker as its value, so it is not brought up to them again. Null when no
 * event fits or no sentence says one.
 */
export function bringUpRemembered(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  options: { rows?: BringRows; words?: BringWords } = {},
): RememberedUp | null {
  const data = options.rows ?? BRING_IT_UP_ROWS;
  const speaker = core.people.get(speakerId);
  if (!speaker) return null;
  for (const { event, shared } of rememberedToBringUp(
    core,
    speakerId,
    listenerId,
    data,
  )) {
    const line = wordBringMove({
      seed: core.seed,
      move: {
        part: "remembered",
        event: `${event.life}/${event.what}`,
        shared,
      },
      speakerId,
      traits: speaker.traits ?? {},
      facts: rememberedFacts(core, event, speakerId, listenerId),
      momentKey: `${speakerId}:${listenerId}:${event.id}:${core.date}`,
      fallbackSourceId: event.id,
      ...(options.words ? { words: options.words } : {}),
    });
    if (!line) continue;
    const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${event.id}:${core.date}`;
    applyCoreEvent(core, {
      id: toldEventId,
      date: core.date,
      kind: data.toldEvent,
      personIds: [listenerId],
      placeId: speaker.placeId,
      facts: { [`${data.remembered.toldKey}:${event.id}`]: speakerId },
      source: {
        tag: "SOURCED",
        citation:
          "Recorded conversation: a person brought up an event of their life from their own list.",
        asOf: core.date,
      },
    });
    return {
      lines: [
        { ...line, sourceRecordIds: [event.id, ...line.sourceRecordIds] },
      ],
      event,
      shared,
      toldEventId,
    };
  }
  return null;
}

/**
 * The names an event's sentence can use, each from the event's record: the
 * year, the employer, the office, the place, and the other person it names
 * (never the speaker or the listener, who are "I" and "you").
 */
function rememberedFacts(
  core: Readonly<CoreState>,
  event: LifeEvent,
  speakerId: PersonId,
  listenerId: PersonId,
): Record<string, { text: string; sourceRecordIds: readonly string[] }> {
  const from = [event.id];
  const facts: Record<
    string,
    { text: string; sourceRecordIds: readonly string[] }
  > = { year: { text: event.date.slice(0, 4), sourceRecordIds: from } };
  const employer = event.facts?.organizationId
    ? nameOf(core, event.facts.organizationId)
    : null;
  if (employer) facts.employer = { text: employer, sourceRecordIds: from };
  if (event.facts?.office)
    facts.office = {
      text: event.facts.office.replace(/-/g, " ").toLowerCase(),
      sourceRecordIds: from,
    };
  const place = event.placeId
    ? corePlaceByJurisdictionId(event.placeId as never)?.displayName
    : null;
  if (place) facts.place = { text: place, sourceRecordIds: from };
  const other = event.withIds.find(
    (id) => id !== speakerId && id !== listenerId,
  );
  const who = other ? nameOf(core, other) : null;
  if (who) facts.who = { text: who, sourceRecordIds: [event.id, other!] };
  return facts;
}
