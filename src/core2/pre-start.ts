/**
 * History before the start (M1-14). A module may register a pre-start pass
 * that steps its own records through the coarse years before day one
 * (monthly or quarterly, never daily people), writing records dated as if they
 * had happened. Passes run in a stated order, economy, then people, then
 * governments, so each sees the results of the ones before it. Nothing here
 * runs during play.
 */
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
  const ids = new Set(history.map((row) => row.id));
  for (const row of rows) {
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
    history.push({ ...row, date, moduleId });
  }
  history.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
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
  return (histories.get(core) ?? []).filter(
    (row) =>
      (!filter.kind || row.kind === filter.kind) &&
      (!filter.placeId || row.placeId === filter.placeId) &&
      (!filter.personId || row.personIds?.includes(filter.personId)),
  );
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
            rows.push({ ...row, date, moduleId: module.id });
          },
          read: (filter) => preStartHistory(core, filter),
        };
        module.preStart.run(api, window, writer);
        order.push(module.id);
      }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return order;
}
