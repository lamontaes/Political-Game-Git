/** Explicit module-owned stop records. Queries invoke no module or numeric callback. */
import { makeIsoDate } from "../simulation/dates";
import { FinanceReadGuard } from "./finance-plan";
import { assertFactoryCoreV1 } from "./state";
import type { CoreState, CoreModule, Source } from "./types";
import type { WorkMomentV1 } from "./work-spans-v1";

export interface ModuleStopInputV1 {
  readonly moduleId: string;
  readonly recordId: string;
  readonly controlledPersonId: string;
  readonly at: WorkMomentV1;
  readonly kind: "interrupt" | "offer-deadline";
  readonly reasonKey: string;
  readonly source: Source;
  /** A held stop is released by its owning module, not by a client acknowledgment. */
  readonly hold: boolean;
}
export interface ModuleStopTokenV1 {
  readonly version: "core2-part1b-v1";
}
export interface ModuleStopV1 extends ModuleStopInputV1 {
  readonly version: "core2-part1b-v1";
}
/** Root-owned cursor capability; it changes no ordinary world field by itself. */
export interface ModuleStopClockV1 {
  setFrontier(at: WorkMomentV1): void;
  retire(): void;
}
interface ClockBinding {
  frontier: WorkMomentV1;
  active: boolean;
  revision: number;
}
interface ClockSnapshot {
  readonly table: Map<string, ClockBinding> | undefined;
  readonly binding: ClockBinding | undefined;
  readonly frontier: WorkMomentV1 | undefined;
  readonly active: boolean | undefined;
  readonly revision: number | undefined;
}
interface Entry {
  readonly row: ModuleStopV1;
  readonly token: ModuleStopTokenV1;
  readonly module: CoreModule;
}
interface Registry {
  revision: number;
  readonly byPerson: Map<string, Entry[]>;
  readonly byOwner: Map<string, Map<string, Entry>>;
  readonly byToken: WeakMap<ModuleStopTokenV1, Entry>;
}
const registries = new WeakMap<CoreState, Registry>();
// At most one current binding/floor per actually controlled person; no session history.
const clockBindings = new WeakMap<CoreState, Map<string, ClockBinding>>();
const version = "core2-part1b-v1" as const;
const shape = Symbol("owned-stop-data-shape");
const freeze = Object.freeze,
  nativeMapGet = Map.prototype.get,
  nativeDescriptor = Object.getOwnPropertyDescriptor,
  nativeMapSet = Map.prototype.set,
  nativeWeakMapGet = WeakMap.prototype.get,
  nativeWeakMapSet = WeakMap.prototype.set;
function clockSnapshot(core: CoreState, personId: string): ClockSnapshot {
  const table = nativeWeakMapGet.call(clockBindings, core) as
      Map<string, ClockBinding> | undefined,
    binding = table
      ? (nativeMapGet.call(table, personId) as ClockBinding | undefined)
      : undefined;
  return {
    table,
    binding,
    frontier: binding?.frontier,
    active: binding?.active,
    revision: binding?.revision,
  };
}
function verifyClockSnapshot(
  core: CoreState,
  personId: string,
  before: ClockSnapshot,
  operation: string,
): void {
  const current = clockSnapshot(core, personId);
  if (
    current.table !== before.table ||
    current.binding !== before.binding ||
    current.revision !== before.revision
  )
    throw new Error("Player stop clock changed during " + operation + ".");
}
function verifyActualModulePointers(
  core: CoreState,
  modules: CoreState["modules"],
  owners: readonly Readonly<{ moduleId: string; module: CoreModule }>[],
): void {
  const descriptor = nativeDescriptor(core, "modules");
  if (!descriptor || !("value" in descriptor) || descriptor.value !== modules)
    throw new Error("Player stop module table changed after final reflection.");
  for (const owner of owners)
    if (nativeMapGet.call(modules, owner.moduleId) !== owner.module)
      throw new Error(
        "Player stop actual module owner changed after final reflection.",
      );
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value || value !== value.trim())
    throw new Error("Player stop requires a direct recorded identity.");
  return value;
}
/** Only the supplied record graph, never the core. Accessors and executable values reject. */
function detach<T>(r: FinanceReadGuard, raw: T, active = new Set<object>()): T {
  if (
    typeof raw === "function" ||
    typeof raw === "symbol" ||
    typeof raw === "bigint" ||
    (typeof raw === "number" && !Number.isFinite(raw))
  )
    throw new Error("Player stop requires finite ordinary saved data.");
  if (raw === null || typeof raw !== "object") return raw;
  if (active.has(raw)) throw new Error("Player stop evidence has a cycle.");
  const array = Array.isArray(raw),
    proto = Object.getPrototypeOf(raw);
  if (
    proto !== (array ? Array.prototype : Object.prototype) &&
    !(proto === null && !array)
  )
    throw new Error("Player stop requires ordinary saved rows.");
  r.field(raw as Record<PropertyKey, unknown>, shape);
  const keys = r.keys(raw),
    length = array ? r.field(raw as unknown[], "length") : 0;
  if (
    array &&
    (!Number.isSafeInteger(length) ||
      length < 0 ||
      keys.filter(
        (key) =>
          typeof key === "string" &&
          String(Number(key)) === key &&
          Number.isSafeInteger(Number(key)) &&
          Number(key) >= 0 &&
          Number(key) < length,
      ).length !== length)
  )
    throw new Error("Player stop evidence requires dense arrays.");
  const result = array ? [] : Object.create(null);
  active.add(raw);
  try {
    for (const key of keys) {
      if (typeof key === "symbol")
        throw new Error("Player stop evidence has a symbol field.");
      if (array && key === "length") continue;
      const value = r.field(raw as Record<PropertyKey, unknown>, key),
        d = Object.getOwnPropertyDescriptor(raw, key);
      if (!d || !("value" in d) || !Object.is(d.value, value))
        throw new Error("Player stop data changed while copied.");
      Object.defineProperty(result, key, {
        value: detach(r, value, active),
        enumerable: d.enumerable,
        writable: false,
        configurable: false,
      });
    }
    if (array) Object.defineProperty(result, "length", { value: length });
    return freeze(result) as T;
  } finally {
    active.delete(raw);
  }
}
export function comparePlayerMomentsV1(
  a: WorkMomentV1,
  b: WorkMomentV1,
): number {
  return a.date < b.date
    ? -1
    : a.date > b.date
      ? 1
      : a.minuteOfDay - b.minuteOfDay;
}
function admittedMoment(
  r: FinanceReadGuard,
  core: CoreState,
  raw: WorkMomentV1,
): WorkMomentV1 {
  const at = detach(r, raw),
    date = makeIsoDate(text(at.date)),
    data = r.field(core, "data"),
    params = r.field(data, "parameters"),
    hours = r.field(r.field(params, "hoursPerDay"), "value"),
    minutes = r.field(r.field(params, "minutesPerHour"), "value"),
    day = hours * minutes;
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours <= 0 ||
    minutes <= 0 ||
    !Number.isFinite(day) ||
    !Number.isFinite(at.minuteOfDay) ||
    at.minuteOfDay < 0 ||
    at.minuteOfDay >= day
  )
    throw new Error("Player stop has an invalid exact civil minute.");
  return freeze({ date, minuteOfDay: at.minuteOfDay });
}
function entryOrder(a: Entry, b: Entry): number {
  return (
    comparePlayerMomentsV1(a.row.at, b.row.at) ||
    (a.row.moduleId < b.row.moduleId
      ? -1
      : a.row.moduleId > b.row.moduleId
        ? 1
        : 0) ||
    (a.row.recordId < b.row.recordId
      ? -1
      : a.row.recordId > b.row.recordId
        ? 1
        : 0)
  );
}
function lowerBound(rows: readonly Entry[], at: WorkMomentV1): number {
  let lo = 0,
    hi = rows.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (comparePlayerMomentsV1(rows[mid]!.row.at, at) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
/** Producer admission creates the actual stop record; it grants no money or act authority. */
export function registerModuleStopV1(
  core: CoreState,
  input: ModuleStopInputV1,
): ModuleStopTokenV1 {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard(),
    raw = detach(r, input),
    moduleId = text(raw.moduleId),
    recordId = text(raw.recordId),
    controlledPersonId = text(raw.controlledPersonId),
    at = admittedMoment(r, core, raw.at),
    date = makeIsoDate(text(r.field(core, "date"))),
    modules = r.field(core, "modules"),
    module = r.mapGet(modules, moduleId),
    actor = r.mapGet(r.field(core, "people"), controlledPersonId);
  if (
    !module ||
    r.field(module, "id") !== moduleId ||
    !actor ||
    r.field(actor, "id") !== controlledPersonId ||
    !r.field(actor, "alive")
  )
    throw new Error(
      "Player stop has no actual registered module and living owner.",
    );
  if (
    at.date < date ||
    !["interrupt", "offer-deadline"].includes(raw.kind) ||
    typeof raw.hold !== "boolean" ||
    (raw.kind === "offer-deadline" && !raw.hold)
  )
    throw new Error("Player stop has invalid dated ownership or kind.");
  text(raw.reasonKey);
  const source = raw.source;
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !text(source.citation) ||
    makeIsoDate(text(source.asOf)) > date ||
    (source.tag === "ESTIMATED" && !text(source.estimatedFrom))
  )
    throw new Error("Player stop Source is unavailable.");
  const old = registries.get(core),
    revision = old?.revision,
    clock = clockSnapshot(core, controlledPersonId);
  if (clock.frontier && comparePlayerMomentsV1(at, clock.frontier) < 0)
    throw new Error("Player stop precedes its owned clock frontier.");
  if (old?.byOwner.get(moduleId)?.has(recordId))
    throw new Error("Duplicate actual module stop record.");
  const row = freeze({
      ...raw,
      moduleId,
      recordId,
      controlledPersonId,
      at,
      version,
    }),
    token = freeze({ version }),
    entry = freeze({ row, token, module }),
    registry = old ?? {
      revision: 0,
      byPerson: new Map(),
      byOwner: new Map(),
      byToken: new WeakMap(),
    },
    people = registry.byPerson.get(controlledPersonId) ?? [],
    owner = registry.byOwner.get(moduleId) ?? new Map(),
    next = people.slice();
  // Binary insertion plus tied owner ordering: writes happen only on explicit producer admission.
  let index = lowerBound(next, at);
  while (index < next.length && entryOrder(next[index]!, entry) < 0) index++;
  next.splice(index, 0, entry);
  r.verify();
  if (registries.get(core) !== old || old?.revision !== revision)
    throw new Error("Player stop registry changed during admission.");
  verifyActualModulePointers(core, modules, [{ moduleId, module }]);
  if (registries.get(core) !== old || old?.revision !== revision)
    throw new Error("Player stop registry changed during admission.");
  verifyClockSnapshot(core, controlledPersonId, clock, "admission");
  registry.revision++;
  registry.byPerson.set(controlledPersonId, next);
  owner.set(recordId, entry);
  registry.byOwner.set(moduleId, owner);
  registry.byToken.set(token, entry);
  if (!old) registries.set(core, registry);
  return token;
}
/** Owner-issued exact token; foreign/lookalike tokens cannot release another record. */
export function releaseModuleStopV1(
  core: CoreState,
  token: ModuleStopTokenV1,
): void {
  assertFactoryCoreV1(core);
  const registry = registries.get(core),
    entry = registry?.byToken.get(token);
  if (!registry || !entry)
    throw new Error("Player stop token is stale or belongs to another core.");
  const rows = registry.byPerson.get(entry.row.controlledPersonId)!;
  const index = rows.indexOf(entry);
  if (
    index < 0 ||
    registry.byOwner.get(entry.row.moduleId)?.get(entry.row.recordId) !== entry
  )
    throw new Error("Actual player stop indexes disagree.");
  rows.splice(index, 1);
  if (!rows.length) registry.byPerson.delete(entry.row.controlledPersonId);
  const owner = registry.byOwner.get(entry.row.moduleId)!;
  owner.delete(entry.row.recordId);
  if (!owner.size) registry.byOwner.delete(entry.row.moduleId);
  registry.byToken.delete(token);
  registry.revision++;
}
/** Internal cursor acknowledgment consumes one-shot interrupts only; held deadlines remain. */
export function acknowledgeModuleStopsV1(
  core: CoreState,
  records: readonly ModuleStopV1[],
): boolean {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard();
  if (
    !Array.isArray(records) ||
    Object.getPrototypeOf(records) !== Array.prototype
  )
    throw new Error(
      "Player stop acknowledgment requires its actual record array.",
    );
  const length = r.field(records, "length"),
    registry = registries.get(core),
    revision = registry?.revision,
    entries: Entry[] = [],
    seen = new Set<Entry>();
  if (!Number.isSafeInteger(length) || length < 0)
    throw new Error("Invalid player stop acknowledgment array.");
  for (let i = 0; i < length; i++) {
    const row = r.field(records, i),
      entry =
        row &&
        registry?.byOwner
          .get(r.field(row, "moduleId"))
          ?.get(r.field(row, "recordId"));
    if (!entry || entry.row !== row || seen.has(entry))
      throw new Error("Player stop acknowledgment is stale or duplicated.");
    entries.push(entry);
    seen.add(entry);
  }
  r.verify();
  if (registries.get(core) !== registry || registry?.revision !== revision)
    throw new Error("Player stop registry changed during acknowledgment.");
  for (const entry of entries)
    if (!entry!.row.hold) releaseModuleStopV1(core, entry!.token);
  return entries.some((entry) => entry!.row.hold);
}
/** Native private sorted person index; O(log N + tied records), no whole calendar/world scan. */
export function earliestModuleStopsV1(
  core: CoreState,
  input: Readonly<{
    controlledPersonId: string;
    from: WorkMomentV1;
    through: WorkMomentV1;
  }>,
): readonly ModuleStopV1[] {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard(),
    query = detach(r, input),
    personId = text(query.controlledPersonId),
    from = admittedMoment(r, core, query.from),
    through = admittedMoment(r, core, query.through),
    actor = r.mapGet(r.field(core, "people"), personId),
    modules = r.field(core, "modules");
  if (
    !actor ||
    r.field(actor, "id") !== personId ||
    !r.field(actor, "alive") ||
    comparePlayerMomentsV1(from, through) > 0 ||
    from.date < r.field(core, "date")
  )
    throw new Error("Player stop query has invalid actual owner or window.");
  const registry = registries.get(core),
    revision = registry?.revision,
    rows = registry?.byPerson.get(personId) ?? [],
    start = lowerBound(rows, from),
    first = rows[start],
    result: ModuleStopV1[] = [];
  if (first && comparePlayerMomentsV1(first.row.at, through) <= 0)
    for (
      let i = start;
      i < rows.length &&
      comparePlayerMomentsV1(rows[i]!.row.at, first.row.at) === 0;
      i++
    ) {
      const entry = rows[i]!;
      if (
        r.mapGet(modules, entry.row.moduleId) !== entry.module ||
        r.field(entry.module, "id") !== entry.row.moduleId
      )
        throw new Error(
          "Player stop no longer has its actual registered module owner.",
        );
      result.push(entry.row);
    }
  const output = freeze(result);
  r.verify();
  if (registries.get(core) !== registry || registry?.revision !== revision)
    throw new Error("Player stop registry changed during query.");
  verifyActualModulePointers(
    core,
    modules,
    result.map((row) => ({
      moduleId: row.moduleId,
      module: registry!.byOwner.get(row.moduleId)!.get(row.recordId)!.module,
    })),
  );
  if (registries.get(core) !== registry || registry?.revision !== revision)
    throw new Error("Player stop registry changed during query.");
  return output;
}

/** One active clock per actual controlled person. Root owns session/cursor admission. */
export function bindModuleStopClockV1(
  core: CoreState,
  input: Readonly<{
    controlledPersonId: string;
    at: WorkMomentV1;
  }>,
): Readonly<ModuleStopClockV1> {
  assertFactoryCoreV1(core);
  const r = new FinanceReadGuard(),
    raw = detach(r, input),
    personId = text(raw.controlledPersonId),
    before = clockSnapshot(core, personId),
    registry = registries.get(core),
    revision = registry?.revision,
    at = admittedMoment(r, core, raw.at),
    actor = r.mapGet(r.field(core, "people"), personId);
  if (
    !actor ||
    r.field(actor, "id") !== personId ||
    !r.field(actor, "alive") ||
    at.date < r.field(core, "date")
  )
    throw new Error(
      "Player stop clock has no actual living owner or current date.",
    );
  if (before.active)
    throw new Error("Player stop clock already has an active binding.");
  if (before.frontier && comparePlayerMomentsV1(at, before.frontier) < 0)
    throw new Error("Player stop clock cannot bind behind its prior frontier.");
  const earliest = registry?.byPerson.get(personId)?.[0];
  if (earliest && comparePlayerMomentsV1(earliest.row.at, at) < 0)
    throw new Error("Player stop clock cannot cross an unresolved stop.");
  const binding: ClockBinding = { frontier: at, active: true, revision: 0 },
    table = before.table ?? new Map<string, ClockBinding>();
  r.verify();
  if (registries.get(core) !== registry || registry?.revision !== revision)
    throw new Error("Player stop registry changed during clock binding.");
  verifyClockSnapshot(core, personId, before, "binding");
  nativeMapSet.call(table, personId, binding);
  if (!before.table) nativeWeakMapSet.call(clockBindings, core, table);
  return freeze({
    setFrontier(next: WorkMomentV1): void {
      assertFactoryCoreV1(core);
      const current = clockSnapshot(core, personId);
      if (current.binding !== binding || !current.active)
        throw new Error("Player stop clock capability is stale.");
      const reads = new FinanceReadGuard(),
        currentRegistry = registries.get(core),
        currentRevision = currentRegistry?.revision,
        proposed = admittedMoment(reads, core, next),
        person = reads.mapGet(reads.field(core, "people"), personId);
      if (
        !person ||
        reads.field(person, "id") !== personId ||
        !reads.field(person, "alive") ||
        proposed.date < reads.field(core, "date")
      )
        throw new Error(
          "Player stop clock has no actual living owner or current date.",
        );
      if (comparePlayerMomentsV1(proposed, current.frontier!) < 0)
        throw new Error("Player stop clock frontier must be monotonic.");
      const pending = currentRegistry?.byPerson.get(personId)?.[0];
      if (pending && comparePlayerMomentsV1(pending.row.at, proposed) < 0)
        throw new Error("Player stop clock cannot cross an unresolved stop.");
      reads.verify();
      if (
        registries.get(core) !== currentRegistry ||
        currentRegistry?.revision !== currentRevision
      )
        throw new Error("Player stop registry changed during clock advance.");
      verifyClockSnapshot(core, personId, current, "advance");
      binding.frontier = proposed;
      binding.revision++;
    },
    retire(): void {
      assertFactoryCoreV1(core);
      const current = clockSnapshot(core, personId);
      if (current.binding !== binding)
        throw new Error("Player stop clock capability is stale.");
      if (!current.active) return;
      // Keep the last floor so a later session cannot silently rewind this person.
      binding.active = false;
      binding.revision++;
    },
  });
}
