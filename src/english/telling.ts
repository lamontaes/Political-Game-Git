/**
 * The telling: what a text knows before a word is picked (words composer,
 * part 1; docs/design/words-composer.md). One plain record every composer is
 * handed — a talk, a scene, a speech, a Journal page, a news story — so the
 * rules about who is in the room, what hour it is, what the listener knows
 * and what was already said hold the same way for every kind of text.
 *
 * Pure data and small pure helpers. No DOM, no engine reads: the caller (the
 * director, the bench) fills it from the records, and the said-as reader
 * (`./said-as`) and the composers read it. The one thing that changes while a
 * text is put together is `text`, what this text has said so far; the helpers
 * below record a mention there.
 */
import data from "../../data/english/said-as.json" with { type: "json" };

/** The part of the day a text is told in, from the clock's minute. */
export type DayPart = "morning" | "afternoon" | "evening";

/**
 * What is left of the day, for a line that looks ahead: "later" while the
 * evening is still ahead, "tomorrow" once it is the evening (a closer at 8:30
 * p.m. never says "again tonight").
 */
export type DayLeft = "later" | "tomorrow";

/** What the listener already knows, read through one question. */
export interface ListenerKnows {
  /** Whether the listener holds this knowledge key (a fact told, a record of their own). */
  knows(key: string): boolean;
}

/** What has been said in this text so far (the one part a composer writes). */
export interface TextMemory {
  /** How many times each person has been said in this text, by id. */
  readonly mentions: Map<string, number>;
  /** The people whose full name this text has already printed. */
  readonly fullNamed: Set<string>;
  /** The person said last, the one a pronoun refers back to. */
  lastPersonId?: string;
  /** The subjects and pieces this text has already said (keys). */
  readonly said: Set<string>;
}

/** What was said before this text, read by key: today in the household, this week to this listener. */
export interface SaidBefore {
  /** Whether anyone in the speaker's household said this key today. */
  today(key: string): boolean;
  /** Whether the speaker raised this key with the listener this week. */
  thisWeek(key: string): boolean;
}

/** How many times one text may say a thing. */
export interface TellingBudgets {
  /** A person's full name, on one screen. */
  readonly fullName: number;
  /** One subject's word, in one text. */
  readonly subject: number;
}

export interface Telling {
  readonly speakerId: string;
  /** Who is spoken to; the reader for a text with no one listener (a speech, a page) is the player. */
  readonly listenerId: string;
  /** The tie between them, by its record's relation ("sibling", "household", "coworker"), when one is held. */
  readonly tie: string | null;
  /** Whether speaker and listener share a household. */
  readonly sameHousehold: boolean;
  /** Who else is present and hears it (never the speaker or the listener). */
  readonly presentIds: readonly string[];
  /** The clock's minute of the day, when a clock keeps the text's hour. */
  readonly minuteOfDay?: number;
  readonly dayPart?: DayPart;
  readonly dayLeft?: DayLeft;
  readonly listener: ListenerKnows;
  readonly before: SaidBefore;
  readonly text: TextMemory;
  readonly budgets: TellingBudgets;
}

const NOTHING_KNOWN: ListenerKnows = { knows: () => false };
const NOTHING_SAID: SaidBefore = { today: () => false, thisWeek: () => false };

/** The day part and what is left of it, from the minute (thresholds in the data, TUNABLE). */
export function clockOf(minuteOfDay: number | undefined): {
  dayPart?: DayPart;
  dayLeft?: DayLeft;
} {
  if (minuteOfDay === undefined) return {};
  const { afternoonFromMinute, eveningFromMinute } = data.clock;
  if (minuteOfDay >= eveningFromMinute.value)
    return { dayPart: "evening", dayLeft: "tomorrow" };
  return {
    dayPart: minuteOfDay >= afternoonFromMinute.value ? "afternoon" : "morning",
    dayLeft: "later",
  };
}

/** A fresh memory for one text. */
export function freshText(): TextMemory {
  return { mentions: new Map(), fullNamed: new Set(), said: new Set() };
}

/** A telling from what the caller holds; what it leaves out is known to nobody and said by no one. */
export function tellingOf(input: {
  speakerId: string;
  listenerId: string;
  tie?: string | null;
  sameHousehold?: boolean;
  presentIds?: readonly string[];
  minuteOfDay?: number;
  listener?: ListenerKnows;
  before?: SaidBefore;
  text?: TextMemory;
  budgets?: Partial<TellingBudgets>;
}): Telling {
  const others = (input.presentIds ?? []).filter(
    (id) => id !== input.speakerId && id !== input.listenerId,
  );
  return {
    speakerId: input.speakerId,
    listenerId: input.listenerId,
    tie: input.tie ?? null,
    sameHousehold: input.sameHousehold ?? false,
    presentIds: [...new Set(others)],
    ...(input.minuteOfDay !== undefined
      ? { minuteOfDay: input.minuteOfDay }
      : {}),
    ...clockOf(input.minuteOfDay),
    listener: input.listener ?? NOTHING_KNOWN,
    before: input.before ?? NOTHING_SAID,
    text: input.text ?? freshText(),
    budgets: {
      fullName: input.budgets?.fullName ?? data.budgets.fullName.value,
      subject: input.budgets?.subject ?? data.budgets.subject.value,
    },
  };
}

/** Whether someone is in the room (the speaker, the listener or one present). */
export function isPresent(telling: Telling, personId: string): boolean {
  return (
    personId === telling.speakerId ||
    personId === telling.listenerId ||
    telling.presentIds.includes(personId)
  );
}

/** Whether this text already said this key (a subject, a piece). */
export function saidInText(telling: Telling, key: string): boolean {
  return telling.text.said.has(key);
}

/** Records that this text said a key. */
export function noteSaid(telling: Telling, key: string): void {
  telling.text.said.add(key);
}

/** Whether a key was said already: in this text, in the household today, or to this listener this week. */
export function heardBefore(telling: Telling, key: string): boolean {
  return (
    saidInText(telling, key) ||
    telling.before.today(key) ||
    telling.before.thisWeek(key)
  );
}

/** How many times this text has said a person. */
export function mentionsOf(telling: Telling, personId: string): number {
  return telling.text.mentions.get(personId) ?? 0;
}

/** Records that this text said a person, and whether by full name. */
export function noteMention(
  telling: Telling,
  personId: string,
  fullName: boolean,
): void {
  telling.text.mentions.set(personId, mentionsOf(telling, personId) + 1);
  if (fullName) telling.text.fullNamed.add(personId);
  telling.text.lastPersonId = personId;
}
