/**
 * The life record (docs/design/life-record.md): what a person went through, as one list every
 * screen reads. Three sources make it: the facts a person is built with, the records of the
 * simulated past that name them, and what the engines recorded about them in play. The last is
 * kept on the person (`remembered`), because the log keeps a private event only for the player's
 * circle and a stranger met later would have nothing to tell.
 *
 * Nothing here words anything and nothing here decides anything: the table
 * (data/life/remembered.json) says which records a person remembers and as what, and the reader
 * returns them in order with the ids of the records behind them.
 */
import parameterRows from "./data/life/parameters.json" with { type: "json" };
import table from "./data/life/remembered.json" with { type: "json" };
import { preStartHistory } from "./past";
import { stopgap } from "./stopgaps";
import type {
  CoreEventInput,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  PlaceId,
} from "./types";

/** One thing that happened to a person, as their own list keeps it. */
export interface RememberedEvent {
  /** The record that caused it. */
  readonly id: string;
  readonly date: IsoDate;
  /** The kind of event: work, school, move, partner, child, loss, health, law, home, business or politics. */
  readonly life: string;
  /** The event within its kind: job-lost, married, convicted. */
  readonly what: string;
  /** The causing record's own kind. */
  readonly record: string;
  /** The other people the record names. */
  readonly withIds: readonly PersonId[];
  readonly placeId?: PlaceId;
  /** What it changed, in the record's own fields. */
  readonly facts?: Readonly<Record<string, string>>;
}

/** An event of a life as a reader gets it, with where it came from. */
export interface LifeEvent extends RememberedEvent {
  /** `built`: a fact the person was made with; `past`: the simulated past; `played`: recorded in play. */
  readonly from: "built" | "past" | "played";
}

/** What a person no longer holds one by one: a count by kind and decade. */
export type RememberedSummary = Record<string, number>;

interface EventRow {
  readonly record: string;
  readonly life: string;
  readonly what: string;
  readonly who: "named" | "not" | "kin-of-named";
  readonly notFact?: string;
  /** Only the named person this fact of the record names remembers it (a vote names every candidate; the fact names the winner). */
  readonly onlyFact?: string;
  readonly facts: readonly string[];
  readonly topicAs?: string;
}
interface PastRow {
  readonly kindPrefix: string;
  readonly life: string;
  readonly what: string;
  readonly withFact?: string;
}
interface HistoryRow {
  readonly kind: string;
  readonly life: string;
  readonly what: string;
}
const TABLE = table as unknown as {
  keeps: readonly string[];
  events: readonly EventRow[];
  past: readonly PastRow[];
  history: readonly HistoryRow[];
};
const EVENT_ROWS = new Map(TABLE.events.map((row) => [row.record, row]));
const HISTORY_ROWS = new Map(TABLE.history.map((row) => [row.kind, row]));
const PARAMETERS = parameterRows as unknown as Record<
  string,
  { value: number; stopgapId?: string }
>;

/** The record kinds a person remembers: what the people module listens for. */
export const REMEMBERED_RECORD_KINDS: readonly string[] = TABLE.events.map(
  (row) => row.record,
);

function lifeParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
  if (row.stopgapId) stopgap(row.stopgapId);
  return row.value;
}

type Rememberer = PersonState & {
  remembered?: RememberedEvent[];
  rememberedSummary?: RememberedSummary;
};

const decadeOf = (date: string) => `${date.slice(0, 3)}0s`;

/**
 * A list over its cap lets go of one event at a time: of the kind a person
 * lets go of first (the table's `keeps`, read from its end), the oldest. What
 * is let go is still counted, by kind and decade.
 */
function fold(person: Rememberer): void {
  const most = lifeParameter("lifeRememberedMost");
  const list = person.remembered!;
  while (list.length > most) {
    let at = -1,
      rank = -1;
    list.forEach((row, index) => {
      const kept = TABLE.keeps.indexOf(row.life);
      const own = kept < 0 ? TABLE.keeps.length : kept;
      if (own > rank || (own === rank && row.date < list[at]!.date)) {
        rank = own;
        at = index;
      }
    });
    const [gone] = list.splice(at, 1);
    const key = `${gone!.life}:${decadeOf(gone!.date)}`;
    person.rememberedSummary = {
      ...person.rememberedSummary,
      [key]: (person.rememberedSummary?.[key] ?? 0) + 1,
    };
  }
}

/** Who remembers a record: the people it names, or their family for a death. */
function rememberers(
  core: CoreState,
  event: Readonly<CoreEventInput>,
  row: EventRow,
): PersonId[] {
  if (row.who === "kin-of-named") {
    const kin = new Set<PersonId>();
    for (const id of event.personIds)
      for (const other of core.people.get(id)?.familyIds ?? [])
        if (!event.personIds.includes(other)) kin.add(other);
    return [...kin];
  }
  if (row.onlyFact) {
    const only = event.facts?.[row.onlyFact];
    return event.personIds.filter((id) => id === only);
  }
  const left = row.who === "not" ? event.facts?.[row.notFact ?? ""] : undefined;
  return event.personIds.filter((id) => id !== left);
}

/**
 * An engine recorded something a person remembers: it goes on the list of each
 * person the table says remembers it. Called for every such record as it is
 * made (the people module's event hook), whoever the person is to the player.
 */
export function rememberEvent(
  core: CoreState,
  event: Readonly<CoreEventInput>,
): void {
  const row = EVENT_ROWS.get(event.kind);
  if (!row) return;
  const kept: Record<string, string> = {};
  for (const key of row.facts) {
    // Some writers key a fact by its event (`event:<id>:causeOfDeath`).
    const value =
      event.facts?.[key] ?? event.facts?.[`event:${event.id}:${key}`];
    if (value !== undefined && value !== "") kept[key] = String(value);
  }
  if (row.topicAs && event.topic && kept[row.topicAs] === undefined)
    kept[row.topicAs] = event.topic;
  for (const id of rememberers(core, event, row)) {
    const person = core.people.get(id) as Rememberer | undefined;
    if (!person?.alive) continue;
    if (person.remembered?.some((held) => held.id === event.id)) continue;
    const withIds =
      row.who === "kin-of-named"
        ? [...event.personIds]
        : event.personIds.filter((other) => other !== id);
    (person.remembered ??= []).push({
      id: event.id,
      date: event.date as IsoDate,
      life: row.life,
      what: row.what,
      record: event.kind,
      withIds,
      ...(event.placeId ? { placeId: event.placeId as PlaceId } : {}),
      ...(Object.keys(kept).length ? { facts: kept } : {}),
    });
    fold(person);
  }
}

/** What a person keeps only as a count: by kind and decade, as `work:1990s`. */
export function lifeSummary(
  core: Readonly<CoreState>,
  personId: PersonId,
): RememberedSummary {
  return {
    ...((core.people.get(personId) as Rememberer | undefined)
      ?.rememberedSummary ?? {}),
  };
}

/**
 * A person's life in order: what they were built with, what the simulated past
 * recorded of them and what happened to them in play, each once, each with the
 * record behind it. The one reader the journal, the person card and the You
 * screen share.
 */
export function lifeOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): LifeEvent[] {
  const person = core.people.get(personId) as Rememberer | undefined;
  if (!person) return [];
  const out: LifeEvent[] = [];
  for (const fact of person.pastFacts ?? []) {
    const row = TABLE.past.find((entry) =>
      fact.kind.startsWith(entry.kindPrefix),
    );
    if (!row) continue;
    const other = row.withFact ? fact.facts?.[row.withFact] : undefined;
    out.push({
      id: fact.id,
      date: fact.date,
      life: row.life,
      what: row.what,
      record: fact.kind,
      withIds: other ? [other as PersonId] : [],
      ...(fact.facts?.placeId
        ? { placeId: fact.facts.placeId as PlaceId }
        : {}),
      ...(fact.facts ? { facts: fact.facts } : {}),
      from: "built",
    });
  }
  for (const record of preStartHistory(core as CoreState, { personId })) {
    const row = HISTORY_ROWS.get(record.kind);
    if (!row) continue;
    const facts: Record<string, string> = {};
    for (const [key, value] of Object.entries(record.facts))
      facts[key] = String(value);
    out.push({
      id: record.id,
      date: record.date,
      life: row.life,
      what: row.what,
      record: record.kind,
      withIds: (record.personIds ?? []).filter((id) => id !== personId),
      ...(record.placeId ? { placeId: record.placeId } : {}),
      ...(Object.keys(facts).length ? { facts } : {}),
      from: "past",
    });
  }
  for (const held of person.remembered ?? [])
    out.push({ ...held, from: "played" });
  // The same event told by two sources (a partner as a built fact and as a
  // record of the past) is told once, from the first source in the order above.
  // A built fact carries the day the person was made, so it is matched to its
  // twin in the past by what it says and who it names, not by its date, and the
  // record of the past (which holds the true day) is the one told.
  const withKey = (event: LifeEvent) =>
    `${event.life}|${event.what}|${[...event.withIds].sort().join(",")}`;
  const inThePast = new Set(
    out.filter((event) => event.from === "past").map(withKey),
  );
  const told = new Set<string>();
  const once: LifeEvent[] = [];
  for (const event of out) {
    if (event.from === "built" && inThePast.has(withKey(event))) continue;
    const key = `${event.date}|${withKey(event)}`;
    if (told.has(key)) continue;
    told.add(key);
    once.push(event);
  }
  return once.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.life.localeCompare(b.life) ||
      a.id.localeCompare(b.id),
  );
}
