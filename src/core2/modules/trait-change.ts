/**
 * Slow change in a full person's traits, from age and from what happens to
 * them. Nothing rolls: each birthday moves a person's hidden standard scores
 * along the same sourced age curves the opening placed them with
 * (`opening-personality.ts`: Terracciano and others 2005; the direction,
 * rising conscientiousness and emotional stability through adulthood, is
 * Roberts, Walton and Viechtbauer 2006), and a recorded hardship moves the
 * emotional-stability traits a small sourced step (Specht 2017: emotional
 * stability falls after adverse events). The -2..2 trait a person carries is
 * the level their score sits in, so a trait changes only when its score
 * crosses a cut; the score is kept per person so change can be gradual.
 *
 * Work is indexed: birthdays by month and day, events when they are heard.
 * A day with no birthday and no event reads one map entry. When a trait
 * changes, the person's traits object is replaced (never edited in place) so
 * the chooser's cached lean for the old one is dropped (`updatePerson`).
 */
import changeData from "../data/trait-change.json" with { type: "json" };
import {
  PERSONALITY_ANCHORED,
  PERSONALITY_DIMENSIONS,
  personalityLevel,
  personalityLevelScore,
  yearlyPersonalityShift,
} from "../opening-personality";
import { stableHash } from "../kernel/ids";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { declareSnapshotCovered, registerWorldMapPart } from "../snapshot";
import type { ModuleRow } from "../module-data";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
} from "../types";

export const TRAIT_CHANGE_MODULE_ID = "core2-trait-change-v1";
export const TRAIT_CHANGES_TABLE = "changes";

interface EventRow {
  kind: string;
  /** Who it happens to: the event's people, or the family and household of the person it names. */
  who: "subjects" | "bereaved";
  /** Trait id to direction (+1 raises it, -1 lowers it). */
  shifts: Readonly<Record<string, number>>;
}
interface ChangeData {
  stopgapId: string;
  eventShiftParameter: string;
  events: readonly EventRow[];
}
export const DEFAULT_TRAIT_CHANGE_DATA = changeData as unknown as ChangeData;

interface Runtime {
  /** Birthdays by "MM-DD" of the people the module has seen. */
  birthdays: Map<string, PersonId[]>;
  seen: Set<PersonId>;
  seenPeople: number;
  /** Each person's hidden standard score per trait that can change. */
  scores: Map<PersonId, Map<string, number>>;
}
const runtimes = new WeakMap<object, Runtime>();
registerWorldMapPart("trait-change-runtime", runtimes);

function runtime(state: Readonly<CoreState>): Runtime {
  let row = runtimes.get(state);
  if (!row) {
    row = {
      birthdays: new Map(),
      seen: new Set(),
      seenPeople: 0,
      scores: new Map(),
    };
    runtimes.set(state, row);
  }
  return row;
}

/** The person's score on a trait: kept, or the middle of the level they carry. */
function scoreOf(
  api: CoreAPI,
  row: Runtime,
  person: Readonly<PersonState>,
  traitId: string,
): number {
  let own = row.scores.get(person.id);
  if (!own) row.scores.set(person.id, (own = new Map()));
  let score = own.get(traitId);
  if (score === undefined) {
    // Where in its level's band they started: a generation fact keyed to
    // the person and trait (the opening kept only the level).
    const hash = stableHash(
      `${api.state.seed}:trait-score:${person.id}:${traitId}`,
    );
    score = personalityLevelScore(
      person.traits[traitId] ?? 0,
      Number.parseInt(hash.slice(0, 8), 16) / 16 ** 8,
    );
    own.set(traitId, score);
  }
  return score;
}

/**
 * Moves scores by `deltas` (trait id to standard-score change) and, where a
 * score crosses into another level, replaces the person's traits and writes
 * one record of what changed and why.
 */
function applyShifts(
  api: CoreAPI,
  row: Runtime,
  person: Readonly<PersonState>,
  deltas: ReadonlyMap<string, number>,
  cause: string,
): void {
  const next: Record<string, number> = { ...person.traits };
  const moved: { traitId: string; from: number; to: number }[] = [];
  for (const [traitId, delta] of deltas) {
    // Only traits on the opening's -2..2 levels change here; a person
    // generated on another scale (an appointed official's) keeps theirs.
    if (!Number.isInteger(person.traits[traitId])) continue;
    const score = scoreOf(api, row, person, traitId) + delta;
    row.scores.get(person.id)!.set(traitId, score);
    const level = personalityLevel(score);
    if (level !== next[traitId]) {
      moved.push({ traitId, from: next[traitId]!, to: level });
      next[traitId] = level;
    }
  }
  if (!moved.length) return;
  api.updatePerson(person.id, { traits: next });
  api
    .moduleState(TRAIT_CHANGE_MODULE_ID)
    .table(TRAIT_CHANGES_TABLE)
    .put({
      id: `trait-change:${person.id}:${api.state.date}:${cause}`,
      personId: person.id,
      date: api.state.date,
      cause,
      moved,
    } as unknown as ModuleRow);
}

/** The yearly shift of every dimension and the traits anchored to it, at an age. */
function agingDeltas(age: number): Map<string, number> {
  const deltas = new Map<string, number>();
  PERSONALITY_DIMENSIONS.forEach((dimension, index) => {
    const shift = yearlyPersonalityShift(index, age);
    if (shift === 0) return;
    deltas.set(dimension.traitId, shift);
    for (const anchored of PERSONALITY_ANCHORED)
      if (anchored.dimensionIndex === index)
        deltas.set(
          anchored.traitId,
          (deltas.get(anchored.traitId) ?? 0) + anchored.loading * shift,
        );
  });
  return deltas;
}

function admit(api: CoreAPI, row: Runtime): void {
  if (api.state.people.size === row.seenPeople) return;
  row.seenPeople = api.state.people.size;
  for (const person of api.state.people.values()) {
    if (row.seen.has(person.id)) continue;
    row.seen.add(person.id);
    const key = person.birthDate.slice(5);
    const list = row.birthdays.get(key);
    if (list) list.push(person.id);
    else row.birthdays.set(key, [person.id]);
  }
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function shiftSize(api: CoreAPI, data: ChangeData): number {
  return api.parameter(data.eventShiftParameter);
}

function onEvent(api: CoreAPI, data: ChangeData, event: CoreEventInput) {
  const rows = data.events.filter((row) => row.kind === event.kind);
  if (!rows.length) return;
  const row = runtime(api.state);
  for (const rule of rows) {
    const affected = new Set<PersonId>();
    if (rule.who === "subjects")
      for (const id of event.personIds) affected.add(id);
    else
      for (const id of event.personIds) {
        const gone = api.state.people.get(id);
        if (!gone) continue;
        for (const kin of gone.familyIds) affected.add(kin);
        for (const mate of api.state.households.get(gone.householdId)
          ?.memberIds ?? [])
          affected.add(mate);
        affected.delete(id);
      }
    const deltas = new Map(
      Object.entries(rule.shifts).map(([traitId, direction]) => [
        traitId,
        direction * shiftSize(api, data),
      ]),
    );
    for (const id of [...affected].sort()) {
      const person = api.state.people.get(id);
      if (!person?.alive) continue;
      api.stopgap(data.stopgapId);
      applyShifts(api, row, person, deltas, event.id);
    }
  }
}

export function createTraitChangeModule(
  data: ChangeData = DEFAULT_TRAIT_CHANGE_DATA,
): CoreModule {
  return {
    id: TRAIT_CHANGE_MODULE_ID,
    state: { schemaVersion: 1, tables: { [TRAIT_CHANGES_TABLE]: {} } },
    eventKinds: [...new Set(data.events.map((row) => row.kind))],
    onEvent(api, event) {
      onEvent(api, data, event);
    },
    onFillIn(api, info) {
      // A counted person's traits sat at the opening while counted; bring
      // them to the age they are now, in one step, as the years would have.
      const row = runtime(api.state);
      const start = makeIsoDate(api.state.startedAt);
      for (const id of info.memberIds) {
        const person = api.state.people.get(id);
        if (!person) continue;
        const from = Math.floor(
          ageOnDate(makeIsoDate(person.birthDate), start),
        );
        const to = Math.floor(
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(api.state.date)),
        );
        const total = new Map<string, number>();
        for (let age = from; age < to; age += 1)
          for (const [traitId, delta] of agingDeltas(age))
            total.set(traitId, (total.get(traitId) ?? 0) + delta);
        if (total.size) applyShifts(api, row, person, total, "filled-in");
      }
    },
    onDay(api) {
      const row = runtime(api.state);
      admit(api, row);
      const date: IsoDate = api.state.date;
      const today = date.slice(5);
      const due = row.birthdays.get(today) ?? [];
      const leapDay =
        today === "03-01" && !isLeap(Number(date.slice(0, 4)))
          ? (row.birthdays.get("02-29") ?? [])
          : [];
      for (const id of [...due, ...leapDay].sort()) {
        const person = api.state.people.get(id);
        if (!person?.alive) continue;
        const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(date));
        if (age < 1) continue;
        applyShifts(
          api,
          row,
          person,
          agingDeltas(Math.floor(age) - 1),
          `birthday:${Math.floor(age)}`,
        );
      }
      return undefined;
    },
  };
}

export const TRAIT_CHANGE_MODULE = createTraitChangeModule();
declareSnapshotCovered(TRAIT_CHANGE_MODULE.id);
