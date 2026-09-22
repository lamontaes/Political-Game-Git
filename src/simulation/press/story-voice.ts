import { personName } from "../people";
import type { HistoricalEvent, World } from "../types";
import type { MediaOutletRecord } from "./records";

/**
 * How a recorded fact becomes a headline, and why three papers on one story
 * must not print the same sentence.
 *
 * A story's copy is assembled only from recorded words — that rule is not
 * relaxed here and nothing below invents a fact. What it does is stop printing
 * the simulation's note to itself as though a person had written it, and let
 * the differences the outlets already have do some work.
 *
 * Two defects, one cause. The headline was the basis event's `summary` field,
 * verbatim, so a party founding printed as "2 organizers publicly decided to
 * form The Commons Party." A numeral where a person writes a word, a count
 * where the record holds names, and "publicly", which is the visibility flag
 * describing itself. And because every outlet rendered that same field, three
 * papers ran one sentence word for word.
 *
 * Every repair here is a fact-preserving one:
 *
 * - A numeral a newspaper would spell out is spelled out. Typography, not fact.
 * - "publicly" is dropped where the event's own visibility is already public,
 *   because the word is the record labeling itself and carries nothing a
 *   reader does not get from reading it in a newspaper.
 * - A subject given as a count is replaced by the names the event holds, when
 *   it holds exactly that many. Two people become both names; more than two
 *   keep the count, because "and others" would be vaguer than the record.
 * - Which facts a headline selects varies by the outlet's own scope, product
 *   and resources — all recorded properties of that outlet — so a community
 *   paper and a national broadcaster lead differently on the same story.
 *
 * What is deliberately absent: no adjective, no characterization, no verb the
 * record does not already use. Where the summary does not fit a shape this
 * file knows, it is repaired for register and returned unchanged otherwise.
 * A plain sentence is a worse headline than an authored one and a far better
 * one than an invented fact.
 */

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
] as const;

/**
 * A count as a newspaper writes it: words up to twelve, numerals above.
 *
 * This is the oldest style rule in the business and it is the single most
 * visible thing separating copy from machine output.
 */
export function spelledCount(value: number, capitalized: boolean): string {
  const word =
    Number.isInteger(value) && value >= 0 && value <= 12
      ? NUMBER_WORDS[value]!
      : String(value);
  return capitalized ? word : word.toLowerCase();
}

/** The people an event names, in the order it names them. */
function namedPeople(world: World, event: HistoricalEvent): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const id of [
    ...event.participants.map((participant) => participant.personId),
    ...event.involvedEntityIds,
  ]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const person = world.people[id];
    if (person) names.push(personName(person));
  }
  return names;
}

/**
 * The recorded sentence, read for a headline rather than for a log.
 *
 * Returns the subject as the record states it and the predicate untouched, so
 * a caller can choose a subject without ever choosing a verb.
 */
interface HeadlineParts {
  /** The subject as written, e.g. "2 organizers". */
  readonly subject: string | null;
  /** How many the subject counts, when it counts. */
  readonly count: number | null;
  /** Everything after the subject, the record's own words. */
  readonly predicate: string;
}

// One noun after the count, not two. A second optional word swallowed the
// verb — "2 organizers decided" parsed as a three-word subject — and a
// headline whose subject contains the verb cannot have either replaced.
const COUNTED_SUBJECT = /^(\d+)\s+([a-z][a-z-]*)\s+(.*)$/;

export function readHeadlineParts(summary: string): HeadlineParts {
  const trimmed = summary.trim();
  const counted = COUNTED_SUBJECT.exec(trimmed);
  if (!counted) return { subject: null, count: null, predicate: trimmed };
  const count = Number(counted[1]);
  if (!Number.isInteger(count) || count < 0) {
    return { subject: null, count: null, predicate: trimmed };
  }
  return {
    subject: `${counted[1]} ${counted[2]}`,
    count,
    predicate: counted[3]!,
  };
}

/**
 * Words the record uses to describe its own bookkeeping.
 *
 * "publicly" states the event's `visibility` field. A newspaper does not tell
 * a reader that what it is printing is public; printing it is what public
 * means. Removed only where the event actually is public, so a record that
 * says it for a different reason keeps it.
 */
function withoutSelfDescription(
  predicate: string,
  event: HistoricalEvent,
): string {
  if (event.visibility !== "public") return predicate;
  return predicate.replace(/\bpublicly\s+/g, "");
}

/** A jurisdiction's own name, never a guessed one. */
function placeName(world: World, event: HistoricalEvent): string | null {
  if (event.jurisdictionId === null) return null;
  return world.jurisdictions[event.jurisdictionId]?.name ?? null;
}

/**
 * How much a given outlet puts in a headline.
 *
 * Read off properties every outlet already declares. A community paper writes
 * for people who know where they live and leads with who; a broadcaster writes
 * a line to be read aloud and keeps it short; a national publication with the
 * staff to cover more than one state has to say which one.
 */
export interface HeadlineRegister {
  /** Whether a headline has room to name the people the record names. */
  readonly namesPeople: boolean;
  /** Whether this outlet's readers need telling where it happened. */
  readonly namesPlace: boolean;
}

/**
 * These are two separate questions, and running them together was wrong.
 *
 * How much room a headline has comes from the product: a line to be read
 * aloud, or written by a newsroom of one, carries a count where a broadsheet
 * carries names. Whether the place belongs in it comes from scope, and from
 * nothing else: a national broadcaster is short AND has to say which state,
 * because its listeners are not standing in it.
 */
export function registerFor(outlet: MediaOutletRecord): HeadlineRegister {
  const short =
    outlet.product === "public-affairs-broadcaster" ||
    outlet.mediums.includes("broadcast") ||
    outlet.resourceTier === "small";
  return {
    namesPeople: !short,
    namesPlace: outlet.scope === "national" || outlet.scope === "state",
  };
}

function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

function joinNames(names: readonly string[]): string {
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A headline for this outlet, from this event, inventing nothing.
 *
 * The predicate is always the record's own words. What changes between outlets
 * is the subject and whether the place is named — both facts the event already
 * holds, selected rather than written.
 */
export function headlineFor(
  world: World,
  event: HistoricalEvent,
  outlet: MediaOutletRecord,
): string {
  // Self-description is stripped before the sentence is parsed, not after:
  // "publicly" sits between the subject and the verb, so a parse that runs
  // first reads it as part of one or the other and it survives either way.
  const parts = readHeadlineParts(withoutSelfDescription(event.summary, event));
  const predicate = parts.predicate;
  const register = registerFor(outlet);

  const headline =
    parts.subject === null || parts.count === null
      ? predicate
      : `${subjectFor(world, event, parts, register)} ${predicate}`;

  // The place goes where a newspaper puts it, after the sentence rather than
  // as a label in front of it, and only for an outlet whose own scope means
  // its readers cannot assume where this happened. A community paper writes
  // for people who already know; saying the town in every headline is how a
  // local paper stops sounding like one.
  const place = register.namesPlace ? placeName(world, event) : null;
  if (place === null || headline.includes(place)) {
    return capitalizeFirst(headline);
  }
  return capitalizeFirst(headline.replace(/\.?$/, ` in ${place}.`));
}

function subjectFor(
  world: World,
  event: HistoricalEvent,
  parts: HeadlineParts,
  register: HeadlineRegister,
): string {
  const count = parts.count!;
  const names = namedPeople(world, event);
  const noun = parts.subject!.replace(/^\d+\s+/, "");
  // Names beat a count, and only where the record holds exactly that many:
  // naming two of three would be a claim about which two mattered. A short
  // register keeps the count because a line read aloud has no room for both.
  if (register.namesPeople && names.length === count && count <= 2) {
    return joinNames(names);
  }
  return `${spelledCount(count, true)} ${noun}`;
}
