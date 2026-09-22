import { personName } from "../people";
import type { HistoricalEvent, IsoDate, World } from "../types";
import type { MediaOutletRecord } from "./records";

/**
 * What a reporter adds to a recorded fact: when and where it happened, what
 * came before it and how it compares. All of it is read from the World.
 *
 * A story used to print its basis event's summary as the body, word for word,
 * under a headline made from the same sentence, so most stories said one
 * thing twice. This module writes the parts a newsroom actually adds, and it
 * adds only what the record already holds:
 *
 * - a dateline, for an outlet whose readers are not in the place;
 * - the earlier recorded steps of the same development, with their dates;
 * - for an economic release, the previous reading of the same measure;
 * - for a flood or storm, how many the place has recorded this year.
 *
 * No quote, reaction, cause, motive or forecast is written here. Where the
 * World holds nothing more about an event, its story is its own sentence,
 * as before.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
] as const;

/** "November 8", or "November 8, 2029" when the year differs from `asOf`. */
export function readableDate(date: IsoDate, asOf: IsoDate): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const base = `${MONTHS[month - 1]} ${day}`;
  return date.slice(0, 4) === asOf.slice(0, 4) ? base : `${base}, ${year}`;
}

function monthLabel(date: IsoDate): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

function quarterLabel(start: IsoDate): string {
  const quarter = Math.floor((Number(start.slice(5, 7)) - 1) / 3);
  return `the ${ORDINALS[quarter]} quarter of ${start.slice(0, 4)}`;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/**
 * A dateline names the place a story comes from, for readers who are not
 * there. A community outlet's readers are, so it has none; a place that is a
 * whole state has no city to name, so it has none either.
 */
export function dateline(
  world: World,
  event: HistoricalEvent,
  outlet: MediaOutletRecord,
): string | null {
  if (outlet.scope === "local" || event.jurisdictionId === null) return null;
  const place = world.jurisdictions[event.jurisdictionId];
  if (!place || place.kind.startsWith("state")) return null;
  const [city, ...rest] = place.name.split(",").map((part) => part.trim());
  const region = rest.join(", ") || place.parentName;
  if (!city) return null;
  return region ? `${city.toUpperCase()}, ${region}` : city.toUpperCase();
}

/** The same development's earlier public steps, oldest first. */
function earlierSteps(
  world: World,
  event: HistoricalEvent,
): readonly HistoricalEvent[] {
  const matter = tagValue(event, "matter:");
  if (matter === null) return [];
  const tag = `matter:${matter}`;
  return world.history.events.filter(
    (candidate) =>
      candidate.sequence < event.sequence &&
      candidate.visibility === "public" &&
      candidate.tags.includes(tag),
  );
}

const MAX_EARLIER_STEPS = 3;

function developmentContext(
  world: World,
  event: HistoricalEvent,
): string | null {
  const steps = earlierSteps(world, event);
  if (steps.length === 0) return null;
  const shown = steps.slice(-MAX_EARLIER_STEPS);
  const lines = shown.map(
    (step) =>
      `${readableDate(step.occurredAt, event.occurredAt)}: ${step.summary}`,
  );
  const lead =
    steps.length > shown.length
      ? `Earlier in this story (the ${shown.length} most recent of ${steps.length} steps):`
      : "Earlier in this story:";
  return [lead, ...lines].join("\n");
}

interface ReleaseReading {
  readonly indicator: string;
  readonly value: number | null;
  readonly referencePeriodStart: IsoDate;
  readonly releasedAt: IsoDate;
  readonly eventId: string;
}

function releases(world: World): readonly ReleaseReading[] {
  return (world.macroEconomy?.releases ?? []) as readonly ReleaseReading[];
}

function periodLabel(reading: ReleaseReading): string {
  return reading.indicator === "real-output-growth-annualized-quarterly"
    ? quarterLabel(reading.referencePeriodStart)
    : monthLabel(reading.referencePeriodStart);
}

function percent(value: number): string {
  return `${value.toFixed(1)} percent`;
}

function releaseComparison(
  world: World,
  event: HistoricalEvent,
): {
  readonly current: ReleaseReading;
  readonly previous: ReleaseReading;
} | null {
  const all = releases(world);
  const current = all.find((reading) => reading.eventId === event.id);
  if (!current || current.value === null) return null;
  const previous = all
    .filter(
      (reading) =>
        reading.indicator === current.indicator &&
        reading.value !== null &&
        reading.referencePeriodStart < current.referencePeriodStart,
    )
    .at(-1);
  return previous ? { current, previous } : null;
}

function economyContext(world: World, event: HistoricalEvent): string | null {
  const pair = releaseComparison(world, event);
  if (!pair) return null;
  const { current, previous } = pair;
  // Compared as printed: two readings that print the same are the same.
  const was = Number(previous.value!.toFixed(1));
  const now = Number(current.value!.toFixed(1));
  const change =
    now === was ? "unchanged from" : now > was ? "up from" : "down from";
  return `That is ${change} ${percent(was)} for ${periodLabel(previous)}.`;
}

const RELEASE_HEADLINE_NOUNS: Readonly<Record<string, string>> = {
  "unemployment-rate": "Unemployment rate",
  "consumer-price-inflation-12m": "Inflation",
  "real-output-growth-annualized-quarterly": "Economic growth rate",
};

function economyHeadline(world: World, event: HistoricalEvent): string | null {
  const pair = releaseComparison(world, event);
  if (!pair) return null;
  const noun = RELEASE_HEADLINE_NOUNS[pair.current.indicator];
  if (!noun) return null;
  const was = Number(pair.previous.value!.toFixed(1));
  const now = Number(pair.current.value!.toFixed(1));
  const verb = now === was ? "holds at" : now > was ? "rises to" : "falls to";
  return `${noun} ${verb} ${percent(now)}`;
}

// A count names the kind of hazard, not its size: a minor storm is still
// the third storm.
const HAZARD_NOUNS: Readonly<Record<string, string>> = {
  flood: "flood",
  "severe-storm": "storm",
};

function hazardContext(world: World, event: HistoricalEvent): string | null {
  const family = tagValue(event, "hazard:");
  const noun = family ? HAZARD_NOUNS[family] : undefined;
  if (!noun || event.jurisdictionId === null) return null;
  const place = world.jurisdictions[event.jurisdictionId];
  if (!place) return null;
  const year = event.occurredAt.slice(0, 4);
  const count = world.history.events.filter(
    (candidate) =>
      candidate.type === "crisis.hazard-occurred" &&
      candidate.sequence <= event.sequence &&
      candidate.jurisdictionId === event.jurisdictionId &&
      candidate.occurredAt.slice(0, 4) === year &&
      candidate.tags.includes(`hazard:${family}`),
  ).length;
  if (count < 2 || count > ORDINALS.length) return null;
  const where = place.name.split(",")[0]!.trim();
  return `It is the ${ORDINALS[count - 1]} ${noun} recorded in ${where} this year.`;
}

const MAGNITUDE_WORDS: Readonly<Record<string, string>> = {
  minor: "Minor",
  moderate: "Moderate",
  major: "Major",
  catastrophic: "Catastrophic",
};

function hazardHeadline(world: World, event: HistoricalEvent): string | null {
  const family = tagValue(event, "hazard:");
  const magnitude = MAGNITUDE_WORDS[tagValue(event, "magnitude:") ?? ""];
  if (!magnitude || event.jurisdictionId === null) return null;
  const place = world.jurisdictions[event.jurisdictionId];
  if (!place) return null;
  const where = place.name.split(",")[0]!.trim();
  if (family === "flood") return `${magnitude} flooding strikes ${where}`;
  if (family === "severe-storm") {
    return `${magnitude} storm strikes ${where}`;
  }
  return null;
}

/**
 * "Flooding struck the area (major)." names neither the place nor the day,
 * and prints its size as a bracketed field. Both are on the record.
 */
function hazardLede(world: World, event: HistoricalEvent): string | null {
  const family = tagValue(event, "hazard:");
  const magnitude = tagValue(event, "magnitude:");
  if (
    !magnitude ||
    !MAGNITUDE_WORDS[magnitude] ||
    event.jurisdictionId === null
  )
    return null;
  const place = world.jurisdictions[event.jurisdictionId];
  if (!place) return null;
  const where = place.name.split(",")[0]!.trim();
  const when = readableDate(event.occurredAt, event.occurredAt);
  const what =
    family === "flood"
      ? `${MAGNITUDE_WORDS[magnitude]} flooding`
      : family === "severe-storm"
        ? `A ${magnitude} storm`
        : null;
  return what ? `${what} struck ${where} on ${when}.` : null;
}

/*
 * A change in who can hold an office. The record's own summary for these
 * events is written for the simulation — it names the rule that was applied,
 * including which rules the game has not compiled — and must not be printed
 * as news. What a newspaper can say is on the record in structured form: who,
 * which offices, what happened to them, and what happens to each seat.
 */
const CONTINUITY_PREFIXES: Readonly<Record<string, string>> = {
  "crisis.officeholder-died": "Died while holding office: ",
  "crisis.officeholder-incapacitated":
    "Became unable to carry out the duties of office: ",
  "crisis.officeholder-capacity-restored":
    "Became able again to carry out the duties of office: ",
};

const CONTINUITY_KIND_OF_TYPE: Readonly<Record<string, string>> = {
  "crisis.officeholder-died": "death",
  "crisis.officeholder-incapacitated": "incapacity-began",
  "crisis.officeholder-capacity-restored": "incapacity-ended",
};

function continuityPerson(world: World, event: HistoricalEvent) {
  for (const id of event.involvedEntityIds) {
    const person = world.people[id];
    if (person) return person;
  }
  return null;
}

/** Titles from the crisis notice's own list, when it is the known shape. */
function continuityTitles(
  world: World,
  event: HistoricalEvent,
): readonly string[] {
  const source =
    event.type === "governing.office-continuity"
      ? world.history.events.find(
          (candidate) => candidate.id === tagValue(event, "crisis-origin:"),
        )
      : event;
  const prefix = source ? CONTINUITY_PREFIXES[source.type] : undefined;
  if (!source || !prefix || !source.summary.startsWith(prefix)) return [];
  return source.summary
    .slice(prefix.length)
    .replace(/\.$/, "")
    .split("; ")
    .filter((title) => title.length > 0);
}

function continuityKind(event: HistoricalEvent): string | null {
  return (
    CONTINUITY_KIND_OF_TYPE[event.type] ?? tagValue(event, "continuity-change:")
  );
}

function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function continuityOpening(
  world: World,
  event: HistoricalEvent,
): string | null {
  const person = continuityPerson(world, event);
  const kind = continuityKind(event);
  if (!person || !kind) return null;
  const titles = continuityTitles(world, event);
  const who =
    titles.length > 0
      ? `${personName(person)}, ${joinAnd(titles)},`
      : personName(person);
  // The ruling can be recorded later than the change it rules on; the date a
  // reader wants is the change's own, on the crisis notice it came from.
  const origin =
    event.type === "governing.office-continuity"
      ? world.history.events.find(
          (candidate) => candidate.id === tagValue(event, "crisis-origin:"),
        )
      : event;
  const when = readableDate((origin ?? event).occurredAt, event.occurredAt);
  if (kind === "death") return `${who} died on ${when}.`;
  if (kind === "incapacity-began") {
    return `${who} became unable to carry out the duties of office on ${when}.`;
  }
  if (kind === "incapacity-ended") {
    return `${who} was able to resume the duties of office on ${when}.`;
  }
  return null;
}

/** What happens to each seat, from the recorded outcome of each ruling. */
function continuityOutcomes(event: HistoricalEvent): readonly string[] {
  const sentences: string[] = [];
  for (const tag of event.tags) {
    if (!tag.startsWith("outcome:")) continue;
    const body = tag.slice("outcome:".length);
    const cut = body.lastIndexOf(":");
    if (cut < 0) continue;
    const office = body.slice(0, cut);
    const outcome = body.slice(cut + 1);
    const sentence =
      outcome === "special-election"
        ? "A special election will be held to fill the seat."
        : outcome === "vacant"
          ? "The seat will stay vacant until the next regular election."
          : outcome === "blocked" && office.startsWith("us-senate")
            ? "The seat is vacant, and no temporary senator has been appointed."
            : outcome === "blocked" && office.startsWith("president")
              ? "The presidency is vacant."
              : outcome === "succeeded" && office.startsWith("president")
                ? "The vice president has succeeded to the presidency."
                : null;
    if (sentence && !sentences.includes(sentence)) sentences.push(sentence);
  }
  return sentences;
}

function continuityLede(world: World, event: HistoricalEvent): string | null {
  const opening = continuityOpening(world, event);
  if (!opening) return null;
  return [opening, ...continuityOutcomes(event)].join(" ");
}

function continuityHeadline(
  world: World,
  event: HistoricalEvent,
): string | null {
  const person = continuityPerson(world, event);
  const kind = continuityKind(event);
  if (!person || !kind) return null;
  const name = personName(person);
  if (kind === "death") return `${name} dies in office`;
  if (kind === "incapacity-began") return `${name} unable to serve`;
  if (kind === "incapacity-ended") return `${name} returns to duty`;
  return null;
}

function isContinuity(event: HistoricalEvent): boolean {
  return (
    event.type === "governing.office-continuity" ||
    event.type in CONTINUITY_PREFIXES
  );
}

/**
 * A headline written for the reader, where the record holds enough to write
 * one: a measure and its previous reading, or a hazard's kind, size and
 * place. Null means the caller keeps the recorded sentence.
 */
export function editorialHeadline(
  world: World,
  event: HistoricalEvent,
): string | null {
  if (event.type === "economy.release-published") {
    return economyHeadline(world, event);
  }
  if (event.type === "crisis.hazard-occurred") {
    return hazardHeadline(world, event);
  }
  if (isContinuity(event)) return continuityHeadline(world, event);
  return null;
}

/**
 * The body paragraphs a story prints for one recorded event: the event's own
 * sentence under a dateline where one belongs, then whatever the World holds
 * that puts it in context.
 */
export function editorialParagraphs(
  world: World,
  event: HistoricalEvent,
  outlet: MediaOutletRecord,
): readonly string[] {
  const line = dateline(world, event, outlet);
  const sentence =
    (event.type === "crisis.hazard-occurred" && hazardLede(world, event)) ||
    (isContinuity(event) && continuityLede(world, event)) ||
    event.summary;
  const lede = line ? `${line} — ${sentence}` : sentence;
  const context =
    event.type === "economy.release-published"
      ? economyContext(world, event)
      : event.type === "crisis.hazard-occurred"
        ? hazardContext(world, event)
        : developmentContext(world, event);
  return context ? [lede, context] : [lede];
}
