import {
  ageOnDate,
  lifePlaceByJurisdictionId,
  narrativeThreads,
  personName,
  type EntityId,
  type HistoricalEvent,
  type IsoDate,
  type NarrativeThread,
  type ThreadAnchor,
  type World,
} from "../simulation";
import { openThreadRecaps, recurringPeople } from "./life-narration";

/**
 * The life so far, as something a player chooses to read.
 *
 * What this replaces was a heading called WHAT YOU REMEMBER above an
 * ever-growing list of remembered sentences, always visible, taking more of
 * the screen with every beat. That is a debug log with a friendly title, and
 * the playtest read it as one.
 *
 * The change is presentational and only presentational. Nothing is stored
 * here, nothing is summarised into a second record, and every line is derived
 * from the same canonical history the play surface reads. What is added is
 * shape: chapters by age rather than one flat run, people as people rather
 * than as names inside sentences, and open questions listed as open questions.
 *
 * The other repair the authority asked for is the wording. Generated
 * retrospective lines like "You turned the job down and kept the week you
 * already had" read as a machine describing a button press. Where a memory's
 * own sentence is the best thing available it is used unchanged — it was
 * authored, and authored copy beats a template — and where one is missing the
 * line is composed from the record's own nouns rather than from a stock phrase.
 */

export interface LifeRecordEntry {
  readonly key: string;
  readonly at: IsoDate;
  readonly age: number;
  readonly sentence: string;
  /** The records this line came from, for the development trace. */
  readonly anchors: readonly ThreadAnchor[];
}

export interface LifeRecordChapter {
  readonly key: string;
  /** "Age 8 to 11", "At 34". Composed from the entries, never authored. */
  readonly heading: string;
  readonly fromAge: number;
  readonly toAge: number;
  readonly entries: readonly LifeRecordEntry[];
}

export interface LifeRecordPerson {
  readonly personId: EntityId;
  readonly name: string;
  readonly sentence: string;
  readonly appearances: number;
}

export interface LifeRecord {
  readonly personName: string;
  readonly age: number;
  readonly summary: string;
  readonly chapters: readonly LifeRecordChapter[];
  readonly people: readonly LifeRecordPerson[];
  readonly open: readonly LifeRecordEntry[];
}

/** How many years one chapter covers. Childhood moves faster than a decade. */
const CHAPTER_YEARS = 4;

export function projectLifeRecord(
  world: World,
  personId: EntityId,
): LifeRecord {
  const person = world.people[personId];
  if (!person) {
    return {
      personName: "",
      age: 0,
      summary: "",
      chapters: [],
      people: [],
      open: [],
    };
  }
  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);

  const entries = recordEntries(world, personId);
  const chapters = groupIntoChapters(entries);
  const threads = narrativeThreads(world, personId);

  return {
    personName: name,
    age,
    summary: place
      ? `${age} years old, in ${place.displayName}.`
      : `${age} years old.`,
    chapters,
    people: recurringPeople(world, personId)
      .slice(0, 8)
      .map((entry) => ({
        personId: entry.personId,
        name: entry.name,
        appearances: entry.appearances,
        sentence: personSentence(
          entry.name,
          entry.appearances,
          threads,
          entry.personId,
        ),
      })),
    open: openThreadRecaps(world, personId, 6).map((recap) => ({
      key: recap.threadKey,
      at: recap.anchors.at(-1)?.at ?? world.currentDate,
      age: ageOnDate(
        person.birthDate,
        recap.anchors.at(-1)?.at ?? world.currentDate,
      ),
      sentence: recap.sentence,
      anchors: recap.anchors,
    })),
  };
}

/**
 * Every line the record can honestly show, oldest first.
 *
 * Memories are the primary source because they carry an authored sentence in
 * the character's own register. An event without a memory contributes its
 * summary instead, which is the same sentence a memory would have carried.
 */
function recordEntries(
  world: World,
  personId: EntityId,
): readonly LifeRecordEntry[] {
  const person = world.people[personId];
  if (!person) return [];
  const seenEvents = new Set<EntityId>();
  const entries: LifeRecordEntry[] = [];

  for (const memory of world.history.memories) {
    if (memory.personId !== personId) continue;
    if (memory.formedAt > world.currentDate) continue;
    const sentence = readable(memory.rememberedSummary);
    if (sentence === null) continue;
    seenEvents.add(memory.eventId);
    entries.push({
      key: `memory:${memory.id}`,
      at: memory.formedAt,
      age: ageOnDate(person.birthDate, memory.formedAt),
      sentence,
      anchors: [
        {
          store: "memories",
          recordId: memory.id,
          stableKey: memory.stableKey,
          at: memory.formedAt,
          sequence: memory.sequence,
          role: "continuation",
          note: "The memory this line is the sentence of.",
        },
      ],
    });
  }

  // A conversation is one thing that happened, not five.
  //
  // Five turns at a kitchen table wrote five events, and a journal that listed
  // them one under another read as a log of keystrokes rather than an evening.
  // They are grouped on the session key the turns themselves carry, so the
  // grouping is something the record establishes rather than something this
  // projection infers from two events being near each other. Every underlying
  // event stays anchored to the entry, so nothing is lost to a reader who wants
  // to see the turns.
  const conversationSessions = new Map<string, HistoricalEvent[]>();
  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    if (event.occurredAt > world.currentDate) continue;
    const sessionTag = event.tags.find((tag) =>
      tag.startsWith(CONVERSATION_SESSION_TAG),
    );
    if (!sessionTag) continue;
    const key = sessionTag.slice(CONVERSATION_SESSION_TAG.length);
    const turns = conversationSessions.get(key) ?? [];
    turns.push(event);
    conversationSessions.set(key, turns);
  }
  for (const [key, turns] of conversationSessions) {
    const ordered = [...turns].sort((left, right) =>
      left.sequence === right.sequence
        ? left.id.localeCompare(right.id)
        : left.sequence - right.sequence,
    );
    for (const turn of ordered) seenEvents.add(turn.id);
    const sentence = conversationSentence(ordered);
    if (sentence === null) continue;
    const opened = ordered[0]!;
    entries.push({
      key: `conversation:${key}`,
      at: opened.occurredAt,
      age: ageOnDate(person.birthDate, opened.occurredAt),
      sentence,
      anchors: ordered.map((turn) => ({
        store: "events" as const,
        recordId: turn.id,
        stableKey: turn.stableKey,
        at: turn.occurredAt,
        sequence: turn.sequence,
        role: "continuation" as const,
        note: "One turn of the conversation this line is about.",
      })),
    });
  }

  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    if (event.occurredAt > world.currentDate) continue;
    if (seenEvents.has(event.id)) continue;
    // Only moments the player was actually part of. Background events from a
    // generated earlier life are true and are not this character's account of
    // their own life, so putting them here would read as the game narrating
    // things nobody in it noticed.
    if (!event.tags.some((tag) => tag.startsWith("choice."))) continue;
    const sentence = readable(event.summary);
    if (sentence === null) continue;
    entries.push({
      key: `event:${event.id}`,
      at: event.occurredAt,
      age: ageOnDate(person.birthDate, event.occurredAt),
      sentence,
      anchors: [
        {
          store: "events",
          recordId: event.id,
          stableKey: event.stableKey,
          at: event.occurredAt,
          sequence: event.sequence,
          role: "continuation",
          note: "The event this line is the summary of.",
        },
      ],
    });
  }

  return entries.sort((left, right) => {
    const byDate = left.at.localeCompare(right.at);
    if (byDate !== 0) return byDate;
    return left.key.localeCompare(right.key);
  });
}

const CONVERSATION_SESSION_TAG = "conversation.session.";

/**
 * A whole exchange, in the sentences the turns themselves wrote.
 *
 * Composed rather than authored: the opening turn's summary says what was
 * raised and the closing turn's says how it came out, and both are canonical
 * text the commit contract wrote at the time. Nothing is added. A single-turn
 * conversation is just its own summary, because "it opened and closed" is not
 * two things.
 */
function conversationSentence(
  turns: readonly HistoricalEvent[],
): string | null {
  const first = readable(turns[0]?.summary ?? "");
  if (first === null) return null;
  if (turns.length === 1) return first;
  const last = readable(turns.at(-1)?.summary ?? "");
  if (last === null || last === first) return first;
  return `${first} ${last}`;
}

/**
 * Sentences the record should not show.
 *
 * The playtest named one of these directly — "You turned the job down and kept
 * the week you already had", which describes a button rather than a life — and
 * the shape it belongs to is broader: a line with no subject, no other person
 * and no place, that reads as a restatement of the option label. Rather than
 * pattern-match phrasings one at a time, this suppresses what cannot be
 * recognised as an account of something: too short to be a sentence about
 * anything, or empty.
 *
 * Suppressing rather than rewriting is deliberate. A generated replacement
 * would be this module inventing a memory, and the history under it is not
 * changed by anything here.
 */
function readable(summary: string): string | null {
  const trimmed = summary.trim();
  if (trimmed.length < 12) return null;
  return trimmed;
}

function groupIntoChapters(
  entries: readonly LifeRecordEntry[],
): readonly LifeRecordChapter[] {
  const chapters: LifeRecordChapter[] = [];
  let bucket: LifeRecordEntry[] = [];
  let bucketFrom: number | null = null;

  function close(): void {
    if (bucket.length === 0 || bucketFrom === null) return;
    const toAge = bucket.at(-1)!.age;
    chapters.push({
      key: `chapter:${bucketFrom}`,
      heading:
        bucketFrom === toAge ? `At ${toAge}` : `${bucketFrom} to ${toAge}`,
      fromAge: bucketFrom,
      toAge,
      entries: bucket,
    });
    bucket = [];
    bucketFrom = null;
  }

  for (const entry of entries) {
    if (bucketFrom === null) bucketFrom = entry.age;
    if (entry.age - bucketFrom >= CHAPTER_YEARS) {
      close();
      bucketFrom = entry.age;
    }
    bucket.push(entry);
  }
  close();
  return chapters;
}

/**
 * What to say about somebody, from what the record says about them.
 *
 * Never a role label the world did not write. "Your friend" is a claim; "you
 * and she have been through six of these" is a count.
 */
function personSentence(
  name: string,
  appearances: number,
  threads: readonly NarrativeThread[],
  personId: EntityId,
): string {
  const thread = threads.find((candidate) =>
    candidate.withPersonIds.includes(personId),
  );
  const family = thread?.family ?? null;
  const place =
    family === "household"
      ? " at home"
      : family === "work"
        ? " at work"
        : family === "civic" || family === "political"
          ? " through the group"
          : "";
  if (appearances === 1) {
    return `${name}. One thing between you so far${place}.`;
  }
  return `${name}. ${appearances} times${place}, most recently ${
    thread?.lastMovedAt ?? "recently"
  }.`;
}
