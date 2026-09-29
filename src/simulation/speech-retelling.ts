import { addDays, ageOnDate } from "./dates";
import { recordsByStringField } from "./history-index";
import { personTrait } from "./people-traits";
import { recordEventKnowledge, recordMemory } from "./records";
import {
  SPEECH_OF_TAG,
  SPEECH_RECEPTION_EVENT,
  familyAndFriendsNearby,
  householdmatesOf,
  speechReception,
} from "./speech-reception";
import { speechMovesOf } from "./speech-moves";
import { eventById } from "./event-index";
import type {
  EntityId,
  IsoDate,
  HistoricalEvent,
  MemoryRecord,
  MemoryStrength,
  World,
} from "./types";

/**
 * How a speech is remembered, and how that memory travels (design D-3,
 * steps 6 and 7).
 *
 * A speech is remembered in proportion to what made it matter: the speaker
 * told something from their own life, the room was moved, and the people who
 * heard it were young enough for it to stay with them (Schuman and Scott
 * 1989: people most often name events from their teens and twenties). A
 * person who remembers it well tells the people they live with, children
 * included, and those people remember it second hand, less sharply. A memory
 * nobody retells fades. Nothing here is drawn: every step follows from the
 * record and from each person's own character.
 */

export const MEMORY_STRENGTHS: readonly MemoryStrength[] = [
  "faint",
  "moderate",
  "strong",
  "defining",
];

/**
 * GAME ASSUMPTION, set by hand: a memory nobody has retold for this many
 * days weakens one step. Research 2 found no measured decay rate for a
 * remembered speech; ten years is a placeholder until one is read.
 */
export const SPEECH_MEMORY_FADE_DAYS = 3_652;

/** The ages at which what happens stays with a person (Schuman and Scott 1989). */
export const FORMATIVE_AGES = { from: 10, through: 30 } as const;

export type SpeechSalience = "ordinary" | "notable" | "memorable";

function step(strength: MemoryStrength, by: number): MemoryStrength {
  const index = MEMORY_STRENGTHS.indexOf(strength) + by;
  return MEMORY_STRENGTHS[Math.max(0, Math.min(3, index))]!;
}

/**
 * How much a speech stood out, read from its record: whether the speaker
 * told something from their own life, and whether most of the room was moved
 * to cheer.
 */
export function speechSalience(
  world: World,
  speech: HistoricalEvent,
): SpeechSalience {
  let marks = 0;
  if (speechMovesOf(speech.tags)?.some((move) => move.move === "lost-parent"))
    marks += 1;
  const reception = speechReception(world, speech);
  if (reception) {
    const total =
      reception.counts.cheered +
      reception.counts.applauded +
      reception.counts["stayed-quiet"];
    if (total > 0 && reception.counts.cheered * 2 > total) marks += 1;
  }
  return marks >= 2 ? "memorable" : marks === 1 ? "notable" : "ordinary";
}

function strengthFor(
  world: World,
  personId: EntityId,
  salience: SpeechSalience,
): MemoryStrength {
  const base: MemoryStrength =
    salience === "memorable"
      ? "strong"
      : salience === "notable"
        ? "moderate"
        : "faint";
  const age = ageOnDate(world.people[personId]!.birthDate, world.currentDate);
  return age >= FORMATIVE_AGES.from && age <= FORMATIVE_AGES.through
    ? step(base, 1)
    : base;
}

function latestMemory(
  world: World,
  personId: EntityId,
  eventId: EntityId,
): MemoryRecord | undefined {
  return recordsByStringField(world.history.memories, "eventId", eventId)
    .filter((memory) => memory.personId === personId)
    .at(-1);
}

function knows(world: World, personId: EntityId, eventId: EntityId): boolean {
  return recordsByStringField(world.history.knowledge, "eventId", eventId).some(
    (row) => row.personId === personId,
  );
}

function alive(world: World, personId: EntityId): boolean {
  return (
    world.people[personId] !== undefined &&
    !world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  );
}

/** Each witness keeps a memory of the speech, as strong as it mattered to them. */
export function rememberSpeech(
  world: World,
  speech: HistoricalEvent,
  witnessIds: readonly EntityId[],
): World {
  const salience = speechSalience(world, speech);
  let next = world;
  for (const personId of witnessIds) {
    if (latestMemory(next, personId, speech.id)) continue;
    next = recordMemory(next, {
      stableKey: `${speech.stableKey}:memory:${personId}`,
      personId,
      eventId: speech.id,
      formedAt: next.currentDate,
      rememberedSummary: speech.summary,
      interpretation: `Heard it in person; it was ${salience}.`,
      strength: strengthFor(next, personId, salience),
      relevanceTags: ["speech.heard"],
      supersedesMemoryId: null,
    });
  }
  return next;
}

/**
 * The youngest age at which a child can be told a family story and keep it.
 * GAME ASSUMPTION, set by hand: the game's playable lives begin at five.
 */
export const RETELLING_MIN_AGE = 5;

/**
 * One month of retelling. A person who remembers a speech well enough tells
 * the people they live with, and family and close friends in the same place,
 * who have not heard of it; an outgoing person tells it from a moderate
 * memory, a reserved one only from a strong one.
 * Each listener keeps a weaker, second-hand memory. A memory its holder has
 * not retold in SPEECH_MEMORY_FADE_DAYS weakens one step.
 */
export function retellSpeeches(world: World): World {
  let next = world;
  const receptions = recordsByStringField(
    world.history.events,
    "type",
    SPEECH_RECEPTION_EVENT,
  );
  for (const reception of receptions) {
    const speechId = reception.tags
      .find((tag) => tag.startsWith(SPEECH_OF_TAG))
      ?.slice(SPEECH_OF_TAG.length) as EntityId | undefined;
    const speech = speechId ? eventById(next, speechId) : undefined;
    if (speech) next = retellSpeech(next, speech);
  }
  return next;
}

/** One month of retelling for one speech. */
export function retellSpeech(world: World, speech: HistoricalEvent): World {
  let next = world;
  const holders = [
    ...new Set(
      recordsByStringField(next.history.memories, "eventId", speech.id).map(
        (memory) => memory.personId,
      ),
    ),
  ].sort();
  for (const holderId of holders) {
    if (!alive(next, holderId)) continue;
    const memory = latestMemory(next, holderId, speech.id)!;
    const reserved = personTrait(next, holderId, "sociability").value < 0;
    const threshold = reserved ? 2 : 1;
    let told = false;
    if (MEMORY_STRENGTHS.indexOf(memory.strength) >= threshold) {
      // The same circle that fills a room on election night: the people
      // the holder lives with, then family and close friends in the same
      // place. Someone who lives alone still tells a sister across town.
      const listeners = [
        ...new Set([
          ...householdmatesOf(next, holderId),
          ...familyAndFriendsNearby(next, holderId),
        ]),
      ];
      for (const listenerId of listeners) {
        // Nobody is told about a speech they gave or were there to hear.
        if (
          speech.involvedEntityIds.includes(listenerId) ||
          !alive(next, listenerId) ||
          knows(next, listenerId, speech.id)
        )
          continue;
        const age = ageOnDate(
          next.people[listenerId]!.birthDate,
          next.currentDate,
        );
        if (age < RETELLING_MIN_AGE) continue;
        const key = `${speech.stableKey}:told:${holderId}:${listenerId}`;
        next = recordEventKnowledge(next, {
          stableKey: key,
          personId: listenerId,
          eventId: speech.id,
          learnedAt: next.currentDate,
          believedSummary: speech.summary,
          accuracy: "accurate",
          confidence: "medium",
          source: {
            kind: "told-by",
            sourcePersonId: holderId,
            claimId: null,
          },
        });
        // Second hand is one step less sharp than the teller's own memory.
        const heard = step(memory.strength, -1);
        next = recordMemory(next, {
          stableKey: `${key}:memory`,
          personId: listenerId,
          eventId: speech.id,
          formedAt: next.currentDate,
          rememberedSummary: speech.summary,
          interpretation: `Heard about it from ${next.people[holderId]!.givenName}.`,
          strength: heard,
          relevanceTags: ["speech.retold"],
          supersedesMemoryId: null,
        });
        told = true;
      }
    }
    if (told || memory.strength === "faint") continue;
    const lastTold = recordsByStringField(
      next.history.knowledge,
      "eventId",
      speech.id,
    )
      .filter(
        (row) =>
          row.source.kind === "told-by" &&
          row.source.sourcePersonId === holderId,
      )
      .map((row) => row.learnedAt)
      .sort()
      .at(-1);
    const since = [memory.formedAt, lastTold ?? memory.formedAt].sort().at(-1)!;
    if (addDays(since, SPEECH_MEMORY_FADE_DAYS) > next.currentDate) continue;
    next = recordMemory(next, {
      stableKey: `${speech.stableKey}:fade:${holderId}:${next.currentDate}`,
      personId: holderId,
      eventId: speech.id,
      formedAt: next.currentDate,
      rememberedSummary: memory.rememberedSummary,
      interpretation: memory.interpretation,
      strength: step(memory.strength, -1),
      relevanceTags: memory.relevanceTags,
      supersedesMemoryId: memory.id,
    });
  }
  return next;
}

/**
 * Retelling on the world's own clock: each time a day advance crosses the
 * first of a month, one month of retelling happens, in every world, with or
 * without an economy record. A skip across several months gives each month
 * its turn, so a story can pass from teller to listener to the listener's
 * family. Records are dated the day the advance ends.
 */
export function applySpeechRetelling(
  previousDate: IsoDate,
  world: World,
): World {
  const months = monthStartsCrossed(previousDate, world.currentDate);
  if (
    months === 0 ||
    recordsByStringField(world.history.events, "type", SPEECH_RECEPTION_EVENT)
      .length === 0
  )
    return world;
  let next = world;
  for (let month = 0; month < months; month += 1) {
    const before = next;
    next = retellSpeeches(next);
    if (next === before) break;
  }
  return next;
}

function monthStartsCrossed(from: IsoDate, through: IsoDate): number {
  const index = (date: IsoDate) => {
    const [year, month] = date.split("-").map(Number) as [number, number];
    return year * 12 + month;
  };
  return Math.max(0, index(through) - index(from));
}
