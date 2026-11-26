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
import { placeStateKey } from "./place-map";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./reference/government-units";
import {
  pastIdsOf,
  pastRowsNaming,
  pastRowsOf,
  preStartHistory,
  type HistoryRecord,
} from "./pre-start";
import type {
  CoreModule,
  CoreState,
  IsoDate,
  LogRecord,
  PersonId,
  PersonState,
  PlaceId,
} from "./types";

/** Who or what a history is about. */
export type HistoryScope =
  | { readonly person: PersonId }
  | { readonly household: string }
  | { readonly employer: string }
  | { readonly place: PlaceId }
  /** A state by its key (`US-UT`): its own records and its places'. */
  | { readonly state: string }
  /** The nation: its own records and its states' (`whereOf(event).nation` is the nation's own). */
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
  /** Only records that also name this person, or that they saw happen. */
  readonly with?: PersonId;
  /** Only records whose facts name this id (a seat, a law, a bill). */
  readonly about?: string;
  /**
   * Only what came from one source: what a person was made with (`built`:
   * every fact their record was made with, or those of `kinds`, in the order
   * the record holds them), the simulated past (`past`) or play (`played`).
   * A person's `past` or `played` history is every record of that source
   * that names them, of any kind unless `kinds` narrows it. A read of one
   * source keeps its order: the past by day, play as it was recorded.
   */
  readonly from?: "built" | "past" | "played";
}

/** What a person remembers, as their record keeps it (`remembered`, src/core2/person-life.ts). */
export interface RememberedRow {
  readonly id: string;
  readonly date: IsoDate;
  readonly life: string;
  readonly what: string;
  readonly record: string;
  readonly withIds: readonly PersonId[];
  readonly placeId?: PlaceId;
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
  /** The people who saw it happen, where the record keeps them (a record of play). */
  readonly witnessIds?: readonly PersonId[];
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
  dateFacts: readonly string[];
  causeFacts: readonly string[];
  householdFacts: readonly string[];
  employerFacts: readonly string[];
  jurisdictionFacts: readonly string[];
  levelFact: string;
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

/**
 * The day a record of the past is told on: its own date, or the earlier day
 * its facts name (`dateFacts`) when the run began after it happened and
 * dated the record on its first day (a home bought decades before).
 */
export function recordDate(
  row: Pick<HistoryRecord, "date" | "facts">,
): IsoDate {
  for (const key of TABLE.dateFacts) {
    const named = row.facts[key];
    if (typeof named === "string" && /^\d{4}-\d{2}-\d{2}$/.test(named))
      return (named < row.date ? named : row.date) as IsoDate;
  }
  return row.date;
}

function pastRow(row: HistoryRecord): HistoryRow {
  return {
    id: row.id,
    date: recordDate(row),
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
    ...(row.witnessIds?.length ? { witnessIds: row.witnessIds } : {}),
    ...(row.placeId ? { placeId: row.placeId } : {}),
    facts: asText(row.facts),
    publicRecord: isPublicLog(row),
  };
}

/** The place map's state for each place a reader has asked about (`placeStateKey`, read once a place). */
const placeStates = new Map<string, string | null>();

const stateKeyOf = (placeId: string): string | null => {
  let held = placeStates.get(placeId);
  if (held === undefined) {
    held = placeStateKey(placeId);
    placeStates.set(placeId, held);
  }
  return held;
};

/** Where a record happened: its place, the state that place is in, or the nation's own. */
export interface HistoryWhere {
  readonly place: string | null;
  readonly state: string | null;
  readonly nation: boolean;
}

const unitPlaces = new Map<string, HistoryWhere | null>();

/** A government unit's place and state (`gus2025:<id>`, the offices' jurisdictions). */
function unitWhere(id: string): HistoryWhere | null {
  let held = unitPlaces.get(id);
  if (held === undefined) {
    const unit = governmentUnit(id);
    held = unit
      ? {
          place: governmentUnitJurisdictionId(unit),
          state: `US-${unit.stateUsps}`,
          nation: false,
        }
      : null;
    unitPlaces.set(id, held);
  }
  return held;
}

const NATION: HistoryWhere = { place: null, state: null, nation: true };

/**
 * The government an id names: the nation (US), a state (US-UT), or a
 * government unit (its place), alone, after `national:`, or leading an
 * office, seat, chamber or law id (`office:US:president`,
 * `law:US-FL:state:...`, `office:gus2025:161724:council`). The first id of a
 * list is read.
 */
function governmentOf(value: string): HistoryWhere | null {
  const first = value.trim().split(/\s+/)[0] ?? "";
  const named =
    /^(?:national:|(?:law|office|seat):)?(US(?:-[A-Z]{2})?|gus2025:\d+)(?::|$)/.exec(
      first,
    )?.[1];
  if (!named) return null;
  if (named === TABLE.nation) return NATION;
  if (/^US-[A-Z]{2}$/.test(named))
    return { place: null, state: named, nation: false };
  return unitWhere(named);
}

/**
 * Where a record happened, read the same way for every record (an engine
 * writes a national or state record at the player's town, so its own facts
 * come first): its level (federal is the nation's; state is the state's),
 * then the government its facts name, then its place id (`national:US`,
 * `national:US-ND`, `US-DC`, or a place, with that place's state), and the
 * nation's own when it names none (the economy's months).
 */
export function whereOf(
  row: Pick<HistoryEvent, "placeId" | "facts">,
): HistoryWhere {
  const level = row.facts?.[TABLE.levelFact];
  if (level === "federal") return NATION;
  let named: HistoryWhere | null = null;
  for (const key of TABLE.jurisdictionFacts) {
    const value = row.facts?.[key];
    if (value && (named = governmentOf(value))) break;
  }
  const at = row.placeId ? (governmentOf(row.placeId) ?? null) : null;
  const local: HistoryWhere | null = row.placeId
    ? (at ?? {
        place: row.placeId,
        state: stateKeyOf(row.placeId),
        nation: false,
      })
    : null;
  if (level === "state") {
    const state = named?.state ?? local?.state ?? null;
    return state ? { place: null, state, nation: false } : NATION;
  }
  return named ?? local ?? NATION;
}

/**
 * Whether a row belongs to a place, a state or the nation: where it happened
 * (`whereOf`), and, for a history read without kinds or a source, only what
 * anyone may read. A read that names its kinds or its source gets every
 * record of them there
 * (a town's moves away, which name a household's people, are no public
 * record, but they are the town's).
 */
function inPlaceScope(
  row: HistoryRow,
  scope: HistoryScope,
  ask: HistoryAsk,
): boolean {
  if (!ask.kinds && !ask.from && !row.publicRecord) return false;
  const where = whereOf(row);
  if ("place" in scope) return where.place === scope.place;
  if ("state" in scope) return where.state === scope.state;
  // The nation holds its states' records as a state holds its places'
  // (`whereOf(event).nation` is the nation's own).
  if ("nation" in scope) return true;
  return false;
}

/** Whether a scope is a place, a state or the nation. */
const isPlaceScope = (scope: HistoryScope) =>
  "place" in scope || "state" in scope || "nation" in scope;

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
  if (ask.from && row.from !== ask.from) return false;
  if (ask.about && !Object.values(row.facts ?? {}).includes(ask.about))
    return false;
  if (ask.kinds && !ask.kinds.includes(row.record)) return false;
  if (ask.since && row.date < ask.since) return false;
  if (ask.through && row.date > ask.through) return false;
  if (
    ask.with &&
    !row.personIds.includes(ask.with) &&
    !row.witnessIds?.includes(ask.with)
  )
    return false;
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
      if (ask.from !== "played")
        for (const row of preStartHistory(core, { personId }))
          if (
            !seen.has(`p:${row.id}`) &&
            (!kinds || kinds.includes(row.kind))
          ) {
            seen.add(`p:${row.id}`);
            out.push(pastRow(row));
          }
      if (ask.from === "past") continue;
      for (const id of core.logByPerson.get(personId) ?? []) {
        const row = core.durableLog.get(id as never);
        if (!row || seen.has(`l:${row.id}`)) continue;
        if (kinds && !kinds.includes(row.kind)) continue;
        seen.add(`l:${row.id}`);
        out.push(logRow(row));
      }
    }
    if ("household" in scope && ask.from !== "played")
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
      : inPlaceScope(row, scope, ask);
  // A read of play alone never walks the past, and a read of the past alone
  // never walks the log.
  const pastSet =
    ask.from === "played"
      ? []
      : "employer" in scope
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
  const logIds =
    ask.from === "past"
      ? []
      : kinds
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

/**
 * An event as a reader gets it: the row, with its causes and what it led to
 * read the first time a reader asks for them (a lookup by kind that reads
 * only dates and facts never builds the index of what led to what).
 */
function told(core: CoreState, row: HistoryRow): HistoryEvent {
  const { publicRecord: _public, ...event } = row;
  void _public;
  let causes: string[] | undefined;
  let later: string[] | undefined;
  return Object.defineProperties(event, {
    causeIds: {
      enumerable: true,
      get: () => (causes ??= causesOf(core, row.id, row.facts)),
    },
    ledTo: {
      enumerable: true,
      get: () => (later ??= [...(ledToIndex(core).get(row.id) ?? [])].sort()),
    },
  }) as HistoryEvent;
}

/**
 * What already happened in a scope, oldest first, each event once, with the
 * record behind it, its causes and what it led to. A person's history without
 * `kinds` is their life (`lifeOf`); with `kinds`, every record of those kinds
 * that names them. A household's is its members' and its own; an employer's,
 * every record that names it; a place's, a state's and the nation's, the
 * public records there. Reading spends no game time and writes nothing,
 * except that a person's whole past is written before their own life is read
 * (`openWholePast`, once), as their card has always written it, so every
 * reader cites the same records. A read by kind never opens anyone.
 */
export function historyOf(
  core: CoreState,
  scope: HistoryScope,
  ask: HistoryAsk = {},
): HistoryEvent[] {
  const out: HistoryEvent[] = [];
  const ids = new Set<string>();
  // Where each life row came in its source: rows of one day and kind keep
  // their source's order (the life's own, or the order a record holds the
  // facts it was made with); every other row is ordered by its id.
  const place = new Map<HistoryEvent, number>();
  const take = (row: HistoryRow, at?: number) => {
    if (!asked(row, ask)) return;
    const event = told(core, row);
    out.push(event);
    if (at !== undefined) place.set(event, at);
    ids.add(row.id);
  };
  // A person's life comes first, in its own words (a vote won by one and lost
  // by the rest): every other source's copy of the same record is skipped.
  // Only a read of a person's own life opens them (their whole past written
  // once, as their card always wrote it); a read by kind is a lookup and
  // writes nothing, and a household's, employer's or place's opens nobody.
  const people = peopleOf(core, scope);
  const { life, others } = sourcesOf(core);
  // A read of one source of records (`past`, `played`) reads the records
  // themselves: no life is built and no one is opened.
  const records = ask.from === "past" || ask.from === "played";
  if (life && "person" in scope && !ask.kinds && !ask.from)
    life.open?.(core, scope.person);
  if (life && people.length && !records)
    for (const personId of people) {
      let at = 0;
      for (const row of life.rows(core, { person: personId }, ask))
        take(row, at++);
    }
  const fromLife = new Set(ids);
  const wider =
    ask.from !== "built" && (!("person" in scope) || !!ask.kinds || records);
  if (wider) {
    for (const row of recordRows(core, scope, ask))
      if (!fromLife.has(row.id)) take(row);
    for (const source of others)
      for (const row of source.rows(core, scope, ask))
        if (
          !fromLife.has(row.id) &&
          (!isPlaceScope(scope) || inPlaceScope(row, scope, ask))
        )
          take(row);
  }
  // A household's members can share a record: it is told once.
  const once =
    "household" in scope
      ? out.filter(
          (event, at) => out.findIndex((other) => other.id === event.id) === at,
        )
      : out;
  // A read of one source keeps that source's order: what a person was made
  // with as their record holds it, the past by day, play as it was recorded.
  if (ask.from) return [...once];
  return [...once].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.life.localeCompare(b.life) ||
      (place.has(a) && place.has(b)
        ? place.get(a)! - place.get(b)!
        : place.has(a) !== place.has(b)
          ? Number(place.has(b)) - Number(place.has(a))
          : a.id.localeCompare(b.id)),
  );
}

/** One record as every scope tells it, by id: what a trace, a cause or a scene's lead opens. */
export function historyEvent(
  core: CoreState,
  id: string,
): HistoryEvent | undefined {
  const row = recordById(core, id);
  return row ? told(core, row) : undefined;
}

/**
 * The stored record behind an event, by its id, as the store that holds it
 * keeps it: a record of the simulated past, a record of play, or an engine
 * table's row (what dev mode's Trace opens, with its source and module).
 */
export function recordOf(
  core: CoreState,
  id: string,
  /** The person a fact they were made with would be kept on, where the caller knows them. */
  personId?: PersonId,
):
  | { readonly from: "past"; readonly record: HistoryRecord }
  | { readonly from: "played"; readonly record: LogRecord }
  | { readonly from: "source"; readonly record: HistoryRow }
  | {
      readonly from: "built";
      readonly record: NonNullable<PersonState["pastFacts"]>[number];
      readonly personId: PersonId;
    }
  | {
      readonly from: "remembered";
      readonly record: RememberedRow;
      readonly personId: PersonId;
    }
  | undefined {
  // A fact a person was made with: on the person named, or (an id that names
  // no one, a hash) on whoever holds it.
  const owners = personId
    ? [core.people.get(personId)]
    : id.startsWith("fact_")
      ? [...core.people.values()]
      : [];
  for (const person of owners) {
    const fact = person?.pastFacts?.find((row) => row.id === id);
    if (fact && person)
      return { from: "built", record: fact, personId: person.id };
  }
  const logged = core.durableLog.get(id as never);
  if (logged) return { from: "played", record: logged };
  const past = pastIdsOf(core).get(id);
  if (past) return { from: "past", record: past };
  for (const source of sourcesOf(core).others) {
    const row = source.row?.(core, id);
    if (row) return { from: "source", record: row };
  }
  // What the person named remembers that no other store keeps (an event the
  // log keeps only for the player's circle; src/core2/person-life.ts).
  const remembered = personId
    ? (
        core.people.get(personId) as
          { remembered?: readonly RememberedRow[] } | undefined
      )?.remembered?.find((row) => row.id === id)
    : undefined;
  if (remembered)
    return { from: "remembered", record: remembered, personId: personId! };
  return undefined;
}

/**
 * Writes a person's whole past (or an official's earlier terms) before it is
 * read, once, as reading their own life does: what a card opened for someone
 * the history holds no life for yet calls.
 */
export function openHistory(core: CoreState, personId: PersonId): void {
  sourcesOf(core).life?.open?.(core, personId);
}
