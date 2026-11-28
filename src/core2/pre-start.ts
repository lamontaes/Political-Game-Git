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
  PersonState,
  PlaceId,
} from "./types";
import { registerWorldMapPart } from "./snapshot";
import {
  checkedRow,
  histories,
  historyOrder,
  indexes,
  preStartHistory,
  readIndexes,
  wholePasts,
  windows,
} from "./pre-start-history";
import { type HistoryRecord } from "./pre-start-history";
export { type HistoryRecord } from "./pre-start-history";
export {
  coarseSteps,
  grainDate,
  ownWindowOf,
  pastForLater,
  pastIdsOf,
  pastRowsNaming,
  pastRowsOf,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
  wholePastOpened,
} from "./pre-start-history";

export const PRE_START_PHASES = ["economy", "people", "government"] as const;
export type PreStartPhase = (typeof PRE_START_PHASES)[number];

export interface PreStartWindow {
  /** First day of the coarse run. */
  from: IsoDate;
  /** Last day before the start date. */
  through: IsoDate;
  /** "year" is a person's own past before the world's window (src/core2/pre-start.ts `ownWindowOf`). */
  step: "month" | "quarter" | "year";
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

registerWorldMapPart("core2-pre-start-histories", histories);

registerWorldMapPart("core2-pre-start-windows", windows);

registerWorldMapPart("core2-whole-pasts", wholePasts);

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
            readIndexes.delete(rows);
          },
          read: (filter) => preStartHistory(core, filter),
        };
        module.preStart.run(api, window, writer);
        order.push(module.id);
      }
  rows.sort(historyOrder);
  indexes.delete(rows);
  readIndexes.delete(rows);
  return order;
}
