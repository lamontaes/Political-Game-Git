/**
 * The one history reader (owner, Nov 25, 2026: "THE JOURNAL, DIRECTOR, PERSON
 * CARDS, ETC ALL PULL FROM THE SAME HISTORY. STOP MAKING NEW SYSTEMS FOR NEW
 * THINGS WHEN THEY ALL USE THE SAME THING"; "make the history reader work
 * game wide. so ALL systems are reading the same thing").
 *
 * It keeps nothing. What already happened is in the records the engines
 * wrote: the pre-start history (src/core2/pre-start.ts), the durable log, a
 * person's own life (`lifeOf`, src/core2/person-life.ts) and the tables an
 * engine keeps of what it did (a job change, a term, the century's races).
 * Each engine that keeps such a table hands it here as its module's
 * `history` source, so this family imports none of them. Any reader,
 * for a person, a household, an employer, a place, a state or the nation,
 * gets the same events from the same records, each with its record id, its
 * date, the records that caused it and the records it led to. A screen or a
 * scene words them differently; none of them builds its own past.
 */
import table from "./data/history/reader.json" with { type: "json" };
import {
  corePlaceByJurisdictionId,
  coreStateKeyOfJurisdictionId,
} from "./places";
import {
  pastIdsOf,
  pastRowsNaming,
  pastRowsOf,
  preStartHistory,
  type HistoryRecord,
} from "./pre-start";
import type { CoreState, IsoDate, LogRecord, PersonId, PlaceId } from "./types";

/** Who or what a history is about. */
export type HistoryScope =
  | { readonly person: PersonId }
  | { readonly household: string }
  | { readonly employer: string }
  | { readonly place: PlaceId }
  /** A state by its key (`US-UT`): its own records and its places'. */
  | { readonly state: string }
  | { readonly nation: true };

/** What part of a history a reader wants. */
export interface HistoryAsk {
  /**
   * Only these record kinds. With kinds, a person's history is every record
   * of those kinds that names them, told in their life or not; without, it is
   * the life they went through (`lifeOf`'s table).
   */
  readonly kinds?: readonly string[];
  /** On or after this day. */
  readonly since?: string;
  /** On or before this day. */
  readonly through?: string;
  /** Only records that also name this person. */
  readonly with?: PersonId;
}

/** One thing that happened, as every reader gets it. */
export interface HistoryEvent {
  /** The record that says so. */
  readonly id: string;
  readonly date: IsoDate;
  /** The kind of event (work, school, move, politics, law, budget...). */
  readonly life: string;
  /** The event within its kind. */
  readonly what: string;
  /** The record's own kind. */
  readonly record: string;
  /** `built`: a fact a person was made with; `past`: the simulated past; `played`: recorded in play. */
  readonly from: "built" | "past" | "played";
  /** Everyone the record names. */
  readonly personIds: readonly PersonId[];
  /** In a person's history, the others the record names; else everyone. */
  readonly withIds: readonly PersonId[];
  readonly placeId?: PlaceId;
  readonly facts?: Readonly<Record<string, string>>;
  /** The records that caused it, by id, each one a record that exists. */
  readonly causeIds: readonly string[];
  /** The records it led to: those that name it as their cause. */
  readonly ledTo: readonly string[];
}

/** A source's row, before the reader adds its cause and what it led to. */
export type HistoryRow = Omit<HistoryEvent, "causeIds" | "ledTo"> & {
  /** Anyone may read it (news, a public record, the archive). */
  readonly publicRecord?: boolean;
};

/** An engine's table of what it did, read as history. */
export interface HistorySource {
  readonly id: string;
  /** Its rows in a scope; `kinds`, when given, are the only kinds asked for. */
  rows(
    core: CoreState,
    scope: HistoryScope,
    ask: HistoryAsk,
  ): Iterable<HistoryRow>;
  /** One of its rows by id, for a cause another record names. */
  row?(core: CoreState, id: string): HistoryRow | undefined;
  /** The source is a person's life (the people engine's `lifeOf`): told first, in its own words. */
  life?: boolean;
  /** Writes a person's whole past before their own history is read (the life source only). */
  open?(core: CoreState, personId: PersonId): void;
}

/**
 * An engine module that keeps a table of what it did hands it to the reader
 * as `history`, the way a module hands the pre-start run its `preStart`
 * pass (src/core2/pre-start.ts): the reader reads the installed modules, so
 * no engine registers anything and this family imports none of them.
 */
export interface HistoryModule extends CoreModule {
  history?: HistorySource;
}

/** The installed engines' history sources: the person's life (`life`) and the rest. */
function sourcesOf(core: CoreState): {
  life?: HistorySource;
  others: HistorySource[];
} {
  let life: HistorySource | undefined;
  const others: HistorySource[] = [];
  for (const module of core.modules.values()) {
    const source = (module as HistoryModule).history;
    if (!source) continue;
    if (source.life) life = source;
    else others.push(source);
  }
  return { life, others };
}

const TABLE = table as unknown as {
  causeFacts: readonly string[];
  householdFacts: readonly string[];
  employerFacts: readonly string[];
  jurisdictionFacts: readonly string[];
  nation: string;
};

const asText = (facts: Readonly<Record<string, unknown>> | undefined) => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(facts ?? {}))
    if (value !== undefined && value !== null) out[key] = String(value);
  return out;
};

/** Whether anyone may read a record of the log. */
function isPublicLog(row: Readonly<LogRecord>): boolean {
  return (
    !!row.publicRecord ||
    !!row.news ||
    row.visibility === "public" ||
    row.visibility === "news"
  );
}

/** A record's kind as the reader says it, where no source words it: its kind's own parts. */
function wordsOf(kind: string): { life: string; what: string } {
  const at = kind.search(/[.:]/);
  return at < 0
    ? { life: kind, what: kind }
    : { life: kind.slice(0, at), what: kind.slice(at + 1) };
}

function pastRow(row: HistoryRecord): HistoryRow {
  return {
    id: row.id,
    date: row.date,
    ...wordsOf(row.kind),
    record: row.kind,
    from: "past",
    personIds: row.personIds ?? [],
    withIds: row.personIds ?? [],
    ...(row.placeId ? { placeId: row.placeId } : {}),
    facts: asText(row.facts),
    publicRecord: row.publicRecord,
  };
}

function logRow(row: Readonly<LogRecord>): HistoryRow {
  return {
    id: row.id,
    date: row.date,
    ...wordsOf(row.kind),
    record: row.kind,
    from: "played",
    personIds: row.personIds,
    withIds: row.personIds,
    ...(row.placeId ? { placeId: row.placeId } : {}),
    facts: asText(row.facts),
    publicRecord: isPublicLog(row),
  };
}

const statesOfPlaces = new Map<string, string | null>();

/** The state (`US-UT`) a place id is in: the state's own id, or a place inside it. */
export function stateOfPlace(placeId: string | undefined): string | null {
  if (!placeId) return null;
  let held = statesOfPlaces.get(placeId);
  if (held === undefined) {
    held =
      coreStateKeyOfJurisdictionId(placeId) ??
      corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey ??
      null;
    statesOfPlaces.set(placeId, held);
  }
  return held;
}

/** The government a row with no place names in its facts: a state's key, or the nation's. */
function jurisdictionOf(row: HistoryRow): string | null {
  for (const key of TABLE.jurisdictionFacts) {
    const value = row.facts?.[key];
    if (value) return value;
  }
  return null;
}

/** Whether a public row belongs to a place, a state or the nation. */
function inPublicScope(row: HistoryRow, scope: HistoryScope): boolean {
  if (!row.publicRecord) return false;
  const named = row.placeId ? null : jurisdictionOf(row);
  if ("place" in scope) return row.placeId === scope.place;
  if ("state" in scope)
    return row.placeId
      ? stateOfPlace(row.placeId) === scope.state
      : named === scope.state;
  if ("nation" in scope)
    return row.placeId ? false : !named || named === TABLE.nation;
  return false;
}

/** Whether a row names a household or an employer through the table's facts. */
function namesFact(
  row: HistoryRow,
  keys: readonly string[],
  value: string,
): boolean {
  return keys.some((key) => row.facts?.[key] === value);
}

/** The scope's people, for the rows that name one of them. */
function peopleOf(core: CoreState, scope: HistoryScope): readonly PersonId[] {
  if ("person" in scope) return [scope.person];
  if ("household" in scope)
    return core.households.get(scope.household)?.memberIds ?? [];
  return [];
}

/** Whether a row is in the window and kinds asked for. */
function asked(row: HistoryRow, ask: HistoryAsk): boolean {
  if (ask.kinds && !ask.kinds.includes(row.record)) return false;
  if (ask.since && row.date < ask.since) return false;
  if (ask.through && row.date > ask.through) return false;
  if (ask.with && !row.personIds.includes(ask.with)) return false;
  return true;
}

/** The pre-start history and the durable log: the rows of a scope. */
function recordRows(
  core: CoreState,
  scope: HistoryScope,
  ask: HistoryAsk,
): HistoryRow[] {
  const out: HistoryRow[] = [];
  const people = peopleOf(core, scope);
  const kinds = ask.kinds;
  if (people.length) {
    // A person's or household's records: the indexes by person.
    const seen = new Set<string>();
    for (const personId of people) {
      for (const row of preStartHistory(core, { personId }))
        if (!seen.has(`p:${row.id}`) && (!kinds || kinds.includes(row.kind))) {
          seen.add(`p:${row.id}`);
          out.push(pastRow(row));
        }
      for (const id of core.logByPerson.get(personId) ?? []) {
        const row = core.durableLog.get(id as never);
        if (!row || seen.has(`l:${row.id}`)) continue;
        if (kinds && !kinds.includes(row.kind)) continue;
        seen.add(`l:${row.id}`);
        out.push(logRow(row));
      }
    }
    if ("household" in scope)
      for (const key of TABLE.householdFacts)
        for (const row of pastRowsNaming(core, key, scope.household))
          if (
            !seen.has(`p:${row.id}`) &&
            (!kinds || kinds.includes(row.kind))
          ) {
            seen.add(`p:${row.id}`);
            out.push(pastRow(row));
          }
    return out;
  }
  const keep = (row: HistoryRow) =>
    "employer" in scope
      ? namesFact(row, TABLE.employerFacts, scope.employer)
      : inPublicScope(row, scope);
  const pastSet =
    "employer" in scope
      ? TABLE.employerFacts.flatMap((key) =>
          pastRowsNaming(core, key, scope.employer),
        )
      : kinds
        ? kinds.flatMap((kind) => preStartHistory(core, { kind }))
        : pastRowsOf(core);
  for (const row of pastSet) {
    const told = pastRow(row);
    if (keep(told)) out.push(told);
  }
  const logIds = kinds
    ? kinds.flatMap((kind) => [...(core.logByKind.get(kind) ?? [])])
    : [...core.durableLog.keys()];
  for (const id of logIds) {
    const row = core.durableLog.get(id as never);
    if (!row) continue;
    const told = logRow(row);
    if (keep(told)) out.push(told);
  }
  return out;
}

/** The order every history is told in: by day, then kind of event, then id (lifeOf's own). */
export function historyOrder(
  a: Pick<HistoryEvent, "date" | "life" | "id">,
  b: Pick<HistoryEvent, "date" | "life" | "id">,
): number {
  return (
    a.date.localeCompare(b.date) ||
    a.life.localeCompare(b.life) ||
    a.id.localeCompare(b.id)
  );
}

/** A record by id, from any source: what a cause names. */
function recordById(core: CoreState, id: string): HistoryRow | undefined {
  const logged = core.durableLog.get(id as never);
  if (logged) return logRow(logged);
  const past = pastIdsOf(core).get(id);
  if (past) return pastRow(past);
  for (const source of sourcesOf(core).others) {
    const row = source.row?.(core, id);
    if (row) return row;
  }
  return undefined;
}

/** The ids a record's facts name as its cause, each one a record that exists. */
function causesOf(
  core: CoreState,
  id: string,
  facts: Readonly<Record<string, string>> | undefined,
): string[] {
  // The whole record's facts: a person's own copy keeps only some of them.
  const whole =
    core.durableLog.get(id as never)?.facts ??
    pastIdsOf(core).get(id)?.facts ??
    facts ??
    {};
  const out: string[] = [];
  for (const key of TABLE.causeFacts) {
    const value = whole[key];
    if (value === undefined || value === null || value === "") continue;
    const named = String(value);
    if (named !== id && !out.includes(named) && recordById(core, named))
      out.push(named);
  }
  return out;
}

interface LedToIndex {
  readonly pastLength: number;
  readonly logSize: number;
  readonly sequence: number;
  readonly byCause: Map<string, string[]>;
}
const ledToIndexes = new WeakMap<CoreState, LedToIndex>();

/**
 * Which records name each record as their cause, over the pre-start history
 * and the log: built when a reader first asks after the records changed, and
 * kept beside the world (never saved; it is the records' own facts, turned
 * around).
 */
function ledToIndex(core: CoreState): Map<string, string[]> {
  const past = pastRowsOf(core);
  const held = ledToIndexes.get(core);
  if (
    held &&
    held.pastLength === past.length &&
    held.logSize === core.durableLog.size &&
    held.sequence === core.sequence
  )
    return held.byCause;
  const byCause = new Map<string, string[]>();
  const add = (cause: unknown, id: string) => {
    if (cause === undefined || cause === null || cause === "") return;
    const key = String(cause);
    if (key === id) return;
    const list = byCause.get(key);
    if (!list) byCause.set(key, [id]);
    else if (!list.includes(id)) list.push(id);
  };
  for (const row of past)
    for (const key of TABLE.causeFacts) add(row.facts[key], row.id);
  for (const row of core.durableLog.values())
    for (const key of TABLE.causeFacts) add(row.facts?.[key], row.id);
  ledToIndexes.set(core, {
    pastLength: past.length,
    logSize: core.durableLog.size,
    sequence: core.sequence,
    byCause,
  });
  return byCause;
}

function told(
  core: CoreState,
  row: HistoryRow,
  ledTo: Map<string, string[]>,
): HistoryEvent {
  const { publicRecord: _public, ...event } = row;
  void _public;
  return {
    ...event,
    causeIds: causesOf(core, row.id, row.facts),
    ledTo: [...(ledTo.get(row.id) ?? [])].sort(),
  };
}

/**
 * What already happened in a scope, oldest first, each event once, with the
 * record behind it, its causes and what it led to. A person's history without
 * `kinds` is their life (`lifeOf`); with `kinds`, every record of those kinds
 * that names them. A household's is its members' and its own; an employer's,
 * every record that names it; a place's, a state's and the nation's, the
 * public records there. Reading spends no game time and writes nothing,
 * except that a person's whole past is written before it is read, as their
 * card has always written it (`openWholePast`), so every reader cites the same
 * records.
 */
export function historyOf(
  core: CoreState,
  scope: HistoryScope,
  ask: HistoryAsk = {},
): HistoryEvent[] {
  const ledTo = ledToIndex(core);
  const out: HistoryEvent[] = [];
  const ids = new Set<string>();
  const take = (row: HistoryRow) => {
    if (!asked(row, ask)) return;
    out.push(told(core, row, ledTo));
    ids.add(row.id);
  };
  // A person's life comes first, in its own words (a vote won by one and lost
  // by the rest): every other source's copy of the same record is skipped.
  const people = peopleOf(core, scope);
  const { life, others } = sourcesOf(core);
  // Only a person's own history opens them: a household's, an employer's or
  // a place's reads the rows already written and opens nobody.
  if (life && "person" in scope) life.open?.(core, scope.person);
  if (life && people.length)
    for (const personId of people)
      for (const row of life.rows(core, { person: personId }, ask)) take(row);
  const fromLife = new Set(ids);
  const wider = !("person" in scope) || !!ask.kinds;
  if (wider) {
    for (const row of recordRows(core, scope, ask))
      if (!fromLife.has(row.id)) take(row);
    for (const source of others)
      for (const row of source.rows(core, scope, ask))
        if (!fromLife.has(row.id)) take(row);
  }
  // A household's members can share a record: it is told once.
  const once =
    "household" in scope
      ? out.filter(
          (event, at) => out.findIndex((other) => other.id === event.id) === at,
        )
      : out;
  return [...once].sort(historyOrder);
}

/** One record as every scope tells it, by id: what a trace, a cause or a scene's lead opens. */
export function historyEvent(
  core: CoreState,
  id: string,
): HistoryEvent | undefined {
  const row = recordById(core, id);
  return row ? told(core, row, ledToIndex(core)) : undefined;
}
