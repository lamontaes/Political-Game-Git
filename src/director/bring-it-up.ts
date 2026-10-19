/**
 * People bring it up (M4-05). A person mentions a change they learned of and
 * who they believe caused it, and that belief follows only what they heard:
 * a blame someone told them (which can be wrong), the record they saw (the
 * business its closure names), or, with neither, someone they know holds a
 * public role, when their temperament runs to blaming authority. Telling it
 * passes the change and the blame on, so the next person's belief follows
 * this one's words.
 */
import { P } from "../core2/parameters";
import { storyOfReadEvent } from "../core2/modules/news";
import { printedStoryOf } from "../core2/modules/press";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { decisionLean } from "../core2/trait-decisions";
import type { CoreState, PersonId, PersonState, Source } from "../core2/types";
import { storyTopicName } from "./question-names";
import { renderLine, type Variant } from "./render";
import { bringDataFromBank } from "./mined/scene-bank";
import { possessive, properName } from "./words";

export interface BringData {
  version: string;
  toldEvent: string;
  heardKey: string;
  blameKey: string;
  changes: readonly {
    eventKind: string;
    institutionFact: { prefix: string; suffix: string };
    /** A printed story a reader remembers: its subject is the outlet, its topic comes from the story record, and no one is blamed. */
    story?: boolean;
    /** Event ids that start this way are changes of this kind when heard from someone. */
    eventIdPrefix?: string;
    line: Variant[];
  }[];
  blame: Readonly<Record<Attribution["how"], Variant[]>>;
}
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
}
/** The default words are the mined bank's. */
export const BRING_IT_UP_DATA: BringData = bringDataFromBank();

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
  how: "told" | "record" | "assumed" | "unknown";
  blamedId?: string;
  /** The record the belief came from: a told event, the change, a public role. */
  sourceId?: string;
}

/** The changes a person learned of, newest first. */
export function changesKnownTo(
  core: Readonly<CoreState>,
  personId: PersonId,
  data: BringData = BRING_IT_UP_DATA,
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
  data: BringData = BRING_IT_UP_DATA,
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
  data: BringData = BRING_IT_UP_DATA,
): BroughtUp | null {
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
  const change = changesKnownTo(core, speakerId, data).find(speakable);
  const subject = change ? nameOf(core, change.institutionId) : null;
  if (!change || !subject) return null;
  const attribution = believedCause(core, speakerId, change, data);
  const words = data.changes.find((row) => row.eventKind === change.kind)!;
  const say = (
    part: string,
    variants: Variant[],
    facts: Record<string, { text: string; sourceRecordIds: readonly string[] }>,
  ) =>
    renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId: speakerId,
      bankKey: `bring-it-up:${part}`,
      version: data.version,
      variants,
      facts,
      momentKey: `${speakerId}:${listenerId}:${change.eventId}:${core.date}:${part}`,
      fallbackSourceId: change.eventId,
    });
  const lines = [];
  const topic = words.story ? storyTopic(change) : null;
  const first = say("change", words.line, {
    subject: {
      text: subject,
      sourceRecordIds: [change.eventId, change.institutionId],
    },
    ...(topic
      ? { topic: { text: topic, sourceRecordIds: [change.eventId] } }
      : {}),
  });
  if (first) lines.push(first);
  // A printed story blames no one: the outlet only printed it.
  const who =
    attribution.blamedId && !words.story
      ? nameOf(core, attribution.blamedId)
      : null;
  const second = words.story
    ? null
    : say(
        `blame:${attribution.how}`,
        data.blame[who ? attribution.how : "unknown"],
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
