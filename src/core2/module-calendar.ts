import { makeIsoDate } from "../simulation/dates";
import {
  moduleData,
  moduleKey,
  moduleSource,
  type ModuleValue,
} from "./module-data";
import { registerModuleStopV1, releaseModuleStopV1 } from "./player-stops-v1";
import type { ModuleStopInputV1, ModuleStopTokenV1 } from "./player-stops-v1";
import type { CoreAPI, CoreModule, CoreState, Source } from "./types";
import { registerSnapshotPart } from "./snapshot";

export interface ModuleCalendarInput {
  key: string;
  date: string;
  kind: string;
  source: Source;
  sourceRecordIds: readonly string[];
  payload?: ModuleValue;
}
export interface ModuleCalendarWork extends ModuleCalendarInput {
  moduleId: string;
  status: "pending" | "running" | "completed" | "failed";
}
export interface ModuleCalendar {
  schedule(input: ModuleCalendarInput): ModuleCalendarWork;
  get(key: string): ModuleCalendarWork | undefined;
  cancel(key: string): boolean;
  /** Forget completed/failed records explicitly; pending records must be canceled. */
  forget(key: string): boolean;
  registerStop(input: Omit<ModuleStopInputV1, "moduleId">): ModuleStopTokenV1;
  releaseStop(token: ModuleStopTokenV1): void;
}
interface Entry {
  module: CoreModule;
  row: ModuleCalendarWork;
}
interface Calendar {
  byOwner: Map<string, Map<string, Entry>>;
  byDate: Map<string, Set<Entry>>;
  dispatching: boolean;
  faulted: boolean;
}
const calendars = new WeakMap<CoreState, Calendar>();
// Saved without the engine objects; restored entries point at the installed engines.
registerSnapshotPart("core2-module-calendars", {
  save(core) {
    const c = calendars.get(core);
    if (!c) return undefined;
    const rows = new Map<Entry, { row: ModuleCalendarWork }>();
    const plain = (entry: Entry) => {
      let row = rows.get(entry);
      if (!row) rows.set(entry, (row = { row: entry.row }));
      return row;
    };
    return {
      byOwner: new Map(
        [...c.byOwner].map(([owner, entries]) => [
          owner,
          new Map([...entries].map(([key, entry]) => [key, plain(entry)])),
        ]),
      ),
      byDate: new Map(
        [...c.byDate].map(([date, entries]) => [
          date,
          new Set([...entries].map(plain)),
        ]),
      ),
      dispatching: c.dispatching,
      faulted: c.faulted,
    };
  },
  restore(core, data) {
    if (!data) return void calendars.delete(core);
    const c = data as Calendar;
    const attach = (entry: Entry) => {
      const module = core.modules.get(entry.row.moduleId);
      if (!module)
        throw new Error(
          `Calendar work for a missing engine: ${entry.row.moduleId}`,
        );
      entry.module = module;
    };
    for (const entries of c.byOwner.values()) entries.forEach(attach);
    for (const entries of c.byDate.values()) entries.forEach(attach);
    calendars.set(core, c);
  },
});
const stopOwners = new WeakMap<
  ModuleStopTokenV1,
  { core: CoreState; module: CoreModule }
>();
function calendar(core: CoreState): Calendar {
  let result = calendars.get(core);
  if (!result)
    calendars.set(
      core,
      (result = {
        byOwner: new Map(),
        byDate: new Map(),
        dispatching: false,
        faulted: false,
      }),
    );
  return result;
}
function owner(core: CoreState, moduleId: string): CoreModule {
  const module = core.modules.get(moduleKey(moduleId));
  if (!module || module.id !== moduleId)
    throw new Error("Calendar owner is not a registered module.");
  return module;
}
function unindex(c: Calendar, entry: Entry): void {
  const bucket = c.byDate.get(entry.row.date);
  bucket?.delete(entry);
  if (!bucket?.size) c.byDate.delete(entry.row.date);
}
export function moduleCalendar(
  core: CoreState,
  moduleId: string,
): ModuleCalendar {
  const module = owner(core, moduleId);
  const check = (allowFault = false) => {
    if (owner(core, moduleId) !== module)
      throw new Error("Calendar module owner is stale.");
    if (!allowFault && calendars.get(core)?.faulted)
      throw new Error(
        "Institution calendar is faulted after a handler failure.",
      );
  };
  return Object.freeze({
    schedule(input: ModuleCalendarInput) {
      check();
      if (!module.onCalendarWork)
        throw new Error("Institutional work requires its module handler.");
      const raw = moduleData(input),
        key = moduleKey(raw.key),
        date = makeIsoDate(raw.date);
      moduleKey(raw.kind);
      if (date <= core.date)
        throw new Error(
          "Institutional work must be placed on an unprocessed future date.",
        );
      if (!Array.isArray(raw.sourceRecordIds) || !raw.sourceRecordIds.length)
        throw new Error("Institutional work requires source record keys.");
      raw.sourceRecordIds.forEach(moduleKey);
      moduleSource(raw.source, core.date);
      const c = calendar(core),
        rows = c.byOwner.get(moduleId) ?? new Map<string, Entry>();
      if (rows.has(key))
        throw new Error("Duplicate institutional calendar key.");
      const row = Object.freeze({
        ...raw,
        key,
        date,
        moduleId,
        status: "pending" as const,
      });
      const entry = { module, row };
      rows.set(key, entry);
      c.byOwner.set(moduleId, rows);
      let bucket = c.byDate.get(date);
      if (!bucket) c.byDate.set(date, (bucket = new Set()));
      bucket.add(entry);
      return row;
    },
    get(key: string) {
      check(true);
      return calendars.get(core)?.byOwner.get(moduleId)?.get(moduleKey(key))
        ?.row;
    },
    cancel(key: string) {
      check();
      const c = calendars.get(core),
        rows = c?.byOwner.get(moduleId),
        entry = rows?.get(moduleKey(key));
      if (!c || !entry) return false;
      if (entry.row.status !== "pending")
        throw new Error("Only pending institutional work can be canceled.");
      unindex(c, entry);
      rows!.delete(key);
      if (!rows!.size) c.byOwner.delete(moduleId);
      return true;
    },
    forget(key: string) {
      check(true);
      const rows = calendars.get(core)?.byOwner.get(moduleId),
        entry = rows?.get(moduleKey(key));
      if (!entry) return false;
      if (entry.row.status === "pending" || entry.row.status === "running")
        throw new Error("Cannot forget unresolved institutional work.");
      rows!.delete(key);
      return true;
    },
    registerStop(input: Omit<ModuleStopInputV1, "moduleId">) {
      check();
      const token = registerModuleStopV1(core, {
        ...moduleData(input),
        moduleId,
      });
      stopOwners.set(token, { core, module });
      return token;
    },
    releaseStop(token: ModuleStopTokenV1) {
      check();
      const actual = stopOwners.get(token);
      if (actual?.core !== core || actual.module !== module)
        throw new Error("Calendar cannot release another owner's stop.");
      releaseModuleStopV1(core, token);
      stopOwners.delete(token);
    },
  });
}
/** O(current-date work), with no calendar scan on quiet days. Both clocks call this before module day hooks. */
export function runModuleCalendar(core: CoreState, api: CoreAPI): void {
  const c = calendars.get(core);
  if (!c) return;
  if (c.faulted)
    throw new Error("Institution calendar is faulted after a handler failure.");
  if (c.dispatching)
    throw new Error("Institution calendar cannot dispatch recursively.");
  const bucket = c.byDate.get(core.date);
  if (!bucket) return;
  // Insertion order is the explicit producer order for same-day institutional dependencies.
  c.dispatching = true;
  try {
    for (const entry of [...bucket]) {
      if (!bucket.has(entry)) continue; // An earlier handler may cancel later work.
      if (
        owner(core, entry.row.moduleId) !== entry.module ||
        !entry.module.onCalendarWork
      )
        throw new Error("Institutional work lost its actual module handler.");
      unindex(c, entry);
      entry.row = Object.freeze({ ...entry.row, status: "running" });
      try {
        entry.module.onCalendarWork(api, entry.row);
        entry.row = Object.freeze({ ...entry.row, status: "completed" });
      } catch (error) {
        entry.row = Object.freeze({ ...entry.row, status: "failed" });
        throw error;
      }
    }
  } catch (error) {
    c.faulted = true;
    throw error;
  } finally {
    c.dispatching = false;
  }
}
