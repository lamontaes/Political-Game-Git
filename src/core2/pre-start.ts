/**
 * History before the start (M1-14). A module may register a pre-start pass
 * that steps its own records through the coarse years before day one
 * (monthly or quarterly, never daily people), writing records dated as if they
 * had happened. Passes run in a stated order, economy, then people, then
 * governments, so each sees the results of the ones before it. Nothing here
 * runs during play.
 */
import { bookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  PlaceId,
  Source,
} from "./types";
import { registerWorldMapPart } from "./snapshot";

export const PRE_START_PHASES = ["economy", "people", "government"] as const;
export type PreStartPhase = (typeof PRE_START_PHASES)[number];

export interface PreStartWindow {
  /** First day of the coarse run. */
  from: IsoDate;
  /** Last day before the start date. */
  through: IsoDate;
  step: "month" | "quarter";
}

/** One dated record of something that happened before the start. */
export interface HistoryRecord {
  id: string;
  date: IsoDate;
  /** e.g. economy.conditions, law.phase, person.job-start, budget.adopted */
  kind: string;
  placeId?: PlaceId;
  personIds?: readonly PersonId[];
  facts: Readonly<Record<string, string | number>>;
  /** Public records can be read by anyone (news, "in force since"). */
  publicRecord: boolean;
  source: Source;
  /** The module that wrote it. */
  moduleId: string;
}

export interface HistoryWriter {
  record(row: Omit<HistoryRecord, "moduleId">): void;
  /** Records written so far, by earlier passes included. */
  read(filter?: { kind?: string; placeId?: PlaceId }): readonly HistoryRecord[];
}

export interface PreStartPass {
  phase: PreStartPhase;
  /** Runs once; step through `coarseSteps(window)` and date every record. */
  run(api: CoreAPI, window: PreStartWindow, history: HistoryWriter): void;
  /** The same run for people filled in after it, written with `recordPreStartLater`. */
  later?(core: CoreState, people: readonly PersonState[]): void;
}

export interface PreStartModule extends CoreModule {
  preStart?: PreStartPass;
}

/** The first day of each month (or quarter) in the window. */
export function coarseSteps(window: PreStartWindow): IsoDate[] {
  const months = window.step === "quarter" ? 3 : 1;
  const first = new Date(`${window.from}T00:00:00.000Z`);
  first.setUTCDate(1);
  const steps: IsoDate[] = [];
  for (
    const at = first;
    at.toISOString().slice(0, 10) <= window.through;
    at.setUTCMonth(at.getUTCMonth() + months)
  ) {
    const date = makeIsoDate(at.toISOString().slice(0, 10));
    steps.push(date < window.from ? makeIsoDate(window.from) : date);
  }
  return steps;
}

/** The coarse run from `from` through the day before the core's start date. */
export function preStartWindow(
  core: CoreState,
  from: string,
  step: PreStartWindow["step"] = "month",
): PreStartWindow {
  const start = makeIsoDate(core.date);
  const through = addDays(start, -1);
  const first = makeIsoDate(from);
  if (first > through)
    throw new Error(`A pre-start run must begin before ${start}.`);
  return { from: first, through, step };
}

const ran = new WeakSet<CoreState>();
const histories = new WeakMap<CoreState, HistoryRecord[]>();
registerWorldMapPart("core2-pre-start-histories", histories);
const windows = new WeakMap<CoreState, PreStartWindow>();
registerWorldMapPart("core2-pre-start-windows", windows);

/** The window the world's pre-start run covered, if it had one. */
export function preStartWindowOf(core: CoreState): PreStartWindow | undefined {
  return windows.get(core);
}

/** The history's order: by date, then by id (ids are unique). */
function historyOrder(a: HistoryRecord, b: HistoryRecord): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

/**
 * Kept beside a sorted history and never saved: its ids, and each person's
 * rows in history order, so someone filled in after the run costs time that
 * grows with their own rows, not with everyone filled in before them. A
 * history without one (fresh from the run, restored from a save, or left
 * unsorted by a refused row) is written the old way once, which sorts it.
 */
interface HistoryIndex {
  ids: Set<string>;
  byPerson: Map<PersonId, HistoryRecord[]>;
}
const indexes = new WeakMap<readonly HistoryRecord[], HistoryIndex>();

/** The people a row names, each once. */
function namedIn(row: HistoryRecord): readonly PersonId[] {
  const ids = row.personIds ?? [];
  return ids.length < 2 ? ids : [...new Set(ids)];
}

function indexOf(
  history: readonly HistoryRecord[],
  ids: Set<string>,
): HistoryIndex {
  const byPerson = new Map<PersonId, HistoryRecord[]>();
  for (const row of history)
    for (const id of namedIn(row)) {
      const rows = byPerson.get(id);
      if (rows) rows.push(row);
      else byPerson.set(id, [row]);
    }
  return { ids, byPerson };
}

/** Where a stable sort would put `row` after the rows of a sorted list. */
function placeAfter(
  list: readonly HistoryRecord[],
  row: HistoryRecord,
): number {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (historyOrder(list[mid]!, row) <= 0) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** One row checked as every writer of the history checks it, and the copy kept. */
function checkedRow(
  core: CoreState,
  window: PreStartWindow,
  ids: Set<string>,
  row: Omit<HistoryRecord, "moduleId">,
  moduleId: string,
): HistoryRecord {
  const date = makeIsoDate(row.date);
  if (date < window.from || date > window.through)
    throw new Error(
      `History must be dated inside the pre-start run: ${row.id} on ${date}`,
    );
  if (!row.id.trim() || ids.has(row.id))
    throw new Error(`History record id missing or reused: ${row.id}`);
  for (const id of row.personIds ?? [])
    if (!core.people.has(id))
      throw new Error(`History names an absent person: ${id}`);
  ids.add(row.id);
  return { ...row, date, moduleId };
}

/** The old write: each row checked and appended, then the whole history sorted. */
function appendAndSort(
  core: CoreState,
  window: PreStartWindow,
  history: HistoryRecord[],
  moduleId: string,
  rows: readonly Omit<HistoryRecord, "moduleId">[],
): Set<string> {
  const ids = new Set(history.map((row) => row.id));
  for (const row of rows)
    history.push(checkedRow(core, window, ids, row, moduleId));
  history.sort(historyOrder);
  return ids;
}

/**
 * The same write into an indexed history: every row is checked first, then
 * each goes where the old sort would put it, the history's rows moving once.
 * A refused row leaves the history as the old write did, the rows before it
 * appended unsorted, and drops the index.
 */
function insertInOrder(
  core: CoreState,
  window: PreStartWindow,
  history: HistoryRecord[],
  index: HistoryIndex,
  moduleId: string,
  rows: readonly Omit<HistoryRecord, "moduleId">[],
): void {
  const added: HistoryRecord[] = [];
  try {
    for (const row of rows)
      added.push(checkedRow(core, window, index.ids, row, moduleId));
  } catch (error) {
    for (const row of added) history.push(row);
    indexes.delete(history);
    throw error;
  }
  // Equal rows keep their write order, after the history's own, as in a
  // stable sort of the history with the new rows appended.
  added.sort(historyOrder);
  const at = added.map((row) => placeAfter(history, row));
  let from = history.length - 1;
  for (const row of added) history.push(row);
  let to = history.length - 1;
  // From the end: each row of the history moves down by the new rows that
  // go before it, and each new row lands at its place plus those before it.
  for (let i = added.length - 1; i >= 0; i--) {
    while (to > at[i]! + i) history[to--] = history[from--]!;
    history[to--] = added[i]!;
  }
  for (const row of added)
    for (const id of namedIn(row)) {
      const own = index.byPerson.get(id);
      if (own) own.splice(placeAfter(own, row), 0, row);
      else index.byPerson.set(id, [row]);
    }
}

/** Bookkeeping's check: the old write, run on a copy, ends the same way. */
function sameAsOldWrite(
  core: CoreState,
  window: PreStartWindow,
  before: HistoryRecord[],
  history: readonly HistoryRecord[],
  moduleId: string,
  rows: readonly Omit<HistoryRecord, "moduleId">[],
  refused: { error: unknown } | undefined,
): void {
  let old: { error: unknown } | undefined;
  try {
    appendAndSort(core, window, before, moduleId, rows);
  } catch (error) {
    old = { error };
  }
  const message = (thrown: { error: unknown } | undefined) =>
    thrown &&
    (thrown.error instanceof Error ? thrown.error.message : thrown.error);
  if (!!old !== !!refused || message(old) !== message(refused))
    throw new Error(
      `The pre-start history's write ended unlike the old write: ${String(message(refused))} against ${String(message(old))}`,
    );
  const same = (a: HistoryRecord, b: HistoryRecord | undefined) =>
    a === b ||
    (!!b &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(
        ([key, value]) => b[key as keyof HistoryRecord] === value,
      ));
  if (
    before.length !== history.length ||
    before.some((row, i) => !same(row, history[i]))
  )
    throw new Error(
      "The pre-start history's rows differ from the old write's sort.",
    );
  // The run's own writer does not see ids written for people filled in
  // during it, so the history may name an id twice: compare the sets.
  const index = indexes.get(history);
  if (
    index &&
    (index.ids.size !== new Set(history.map((row) => row.id)).size ||
      history.some((row) => !index.ids.has(row.id)))
  )
    throw new Error("The pre-start history's ids differ from its rows.");
}

/**
 * The past of someone filled in from the counts after the run: their own
 * records, dated inside the same window, written by the module that would
 * have written them had they been full on day one.
 */
export function recordPreStartLater(
  core: CoreState,
  moduleId: string,
  rows: readonly Omit<HistoryRecord, "moduleId">[],
): void {
  const window = windows.get(core);
  const history = histories.get(core);
  if (!window || !history || !rows.length) return;
  const index = indexes.get(history);
  if (!index) {
    const ids = appendAndSort(core, window, history, moduleId, rows);
    indexes.set(history, indexOf(history, ids));
    return;
  }
  if (!bookkeeping()) {
    insertInOrder(core, window, history, index, moduleId, rows);
    return;
  }
  // Bookkeeping runs the old write beside it, on a copy.
  const before = [...history];
  let refused: { error: unknown } | undefined;
  try {
    insertInOrder(core, window, history, index, moduleId, rows);
  } catch (error) {
    refused = { error };
  }
  sameAsOldWrite(core, window, before, history, moduleId, rows, refused);
  if (refused) throw refused.error;
}

/** Every installed engine's pre-start history for people filled in after the run (a named person met in play). */
export function pastForLater(
  core: CoreState,
  people: readonly PersonState[],
): void {
  if (!windows.has(core) || !people.length) return;
  for (const module of core.modules.values())
    (module as PreStartModule).preStart?.later?.(core, people);
}

/** What happened before the start, oldest first. */
export function preStartHistory(
  core: CoreState,
  filter: { kind?: string; placeId?: PlaceId; personId?: PersonId } = {},
): readonly HistoryRecord[] {
  const history = histories.get(core) ?? [];
  const kept = (row: HistoryRecord) =>
    (!filter.kind || row.kind === filter.kind) &&
    (!filter.placeId || row.placeId === filter.placeId) &&
    (!filter.personId || row.personIds?.includes(filter.personId));
  const index = filter.personId ? indexes.get(history) : undefined;
  if (!index) return history.filter(kept);
  const rows = (index.byPerson.get(filter.personId!) ?? []).filter(kept);
  // Bookkeeping reads the whole history beside the person's rows.
  if (bookkeeping()) {
    const scanned = history.filter(kept);
    if (
      scanned.length !== rows.length ||
      scanned.some((row, i) => row !== rows[i])
    )
      throw new Error(
        `The pre-start history's rows for ${filter.personId} differ from a scan.`,
      );
  }
  return rows;
}

/**
 * Run every installed module's pre-start pass, in phase order (modules in
 * installation order within a phase). Once per world, before day one.
 * Returns the module ids in the order they ran.
 */
export function runPreStart(core: CoreState, window: PreStartWindow): string[] {
  if (ran.has(core)) throw new Error("The pre-start run already happened.");
  if (window.through >= core.date)
    throw new Error("The pre-start run must end before the start date.");
  ran.add(core);
  windows.set(core, window);
  const api = coreAPI(core);
  const rows: HistoryRecord[] = [];
  const ids = new Set<string>();
  histories.set(core, rows);
  const order: string[] = [];
  const modules = [...core.modules.values()] as PreStartModule[];
  for (const phase of PRE_START_PHASES)
    for (const module of modules)
      if (module.preStart?.phase === phase) {
        const writer: HistoryWriter = {
          record(row) {
            rows.push(checkedRow(core, window, ids, row, module.id));
            // Unsorted again: a later write sorts it the old way first.
            indexes.delete(rows);
          },
          read: (filter) => preStartHistory(core, filter),
        };
        module.preStart.run(api, window, writer);
        order.push(module.id);
      }
  rows.sort(historyOrder);
  indexes.delete(rows);
  return order;
}
