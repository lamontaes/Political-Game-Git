/**
 * WORLD AGING — how a world with nobody played holds up over decades of Days.
 *
 *   npm run world:aging -- --years 20 --seed aging-1 [--place 3918000] \
 *     [--out docs/reports/world-aging-benchmark.md] [--max-minutes 120] \
 *     [--profile-years 1,20]
 *   npm run world:aging -- --render test-results/world-aging/<run>.json [--out …]
 *
 * The world is opened the way the title screen's "Watch the world" opens one
 * (`openObserverWorld(observerSetup(seed, place))`, then the same read-only
 * hand-off `startPlaying` gives an observed world), except that the place is
 * named on the command line rather than drawn from the seed. Time then moves
 * only by pressing the observer clock's "A day" button: the same
 * `advanceObservedWorld(world, 1)` the button calls, committed through the
 * same stale-world guard the player root uses. Nothing is skipped, batched or
 * shortcut; a Day here costs what a Day costs a person watching.
 *
 * Once a game year, the current world is kept through the real save path
 * (`BrowserSaveStore.save`, which snapshots, hashes and serializes it) and
 * opened again the way Continue opens it (a fresh store: `mostRecent`, then
 * `load`, then the shell's viewpoint). Node has no IndexedDB, so the database
 * underneath is an in-memory stand-in that structured-clones every value in
 * and out as a browser does; the disk write itself is not measured.
 *
 * This is a development measurement. It is never part of play.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { findSourceMap } from "node:module";
import { loadavg } from "node:os";
import { dirname, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import type { EntityId, IsoDate, World } from "../../src/simulation";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import {
  shellReadOnly,
  shellViewpointPersonId,
} from "../../src/presentation/life-continuation-shell";
import { createWorldChangeGuard } from "../../src/presentation/world-change-guard";
import { BrowserSaveStore } from "../../src/presentation/browser-world-repository";

/** Columbus, Ohio: the Census place the aging run opens in by default. */
export const DEFAULT_AGING_PLACE = "3918000";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/* -------------------------------------------------------------------------- */
/* Opening a watched world, and the observer clock's Day button                */
/* -------------------------------------------------------------------------- */

export interface WatchedWorld {
  readonly world: World;
  /** The resident the world was opened around; an ordinary person, unplayed. */
  readonly anchorPersonId: EntityId;
  readonly placeKey: string;
  readonly placeName: string;
}

/**
 * Opens a world with nobody played, exactly as "Watch the world" does, in the
 * named place. Refuses a place the new-game search would not offer.
 */
export function openWatchedWorld(seed: string, placeKey: string): WatchedWorld {
  const place = lifePlaceByKey(placeKey);
  if (!place)
    throw new Error(`No place with the key '${placeKey}' can be opened.`);
  const observed = openObserverWorld(observerSetup(seed, placeKey));
  // `startPlaying` hands an observed world to the shell unchanged: nobody's
  // appearance is chosen and, being read-only, no week is opened for anyone.
  if (!shellReadOnly(observed.world))
    throw new Error("The watched world opened with somebody played in it.");
  return {
    world: observed.world,
    anchorPersonId: observed.anchorPersonId,
    placeKey,
    placeName: place.displayName,
  };
}

export type DayPress =
  | { readonly status: "moved"; readonly world: World }
  | { readonly status: "stopped"; readonly problem: string };

/**
 * The observer clock's "A day" button and the player root's commit behind it.
 *
 * `ObserverClock.step(1)` calls `advanceObservedWorld(base, 1)`, refuses a
 * result whose date did not move, and hands the rest to `onControlChange`,
 * which admits it through the stale-world guard and makes it the session's
 * world. The problem strings are the ones the clock shows.
 */
export function createObserverDayButton(world: World) {
  const guard = createWorldChangeGuard();
  let current = world;
  guard.rendered(current);
  return {
    get world(): World {
      return current;
    },
    press(): DayPress {
      const base = current;
      let next: World;
      try {
        next = advanceObservedWorld(base, 1);
      } catch (error) {
        return {
          status: "stopped",
          problem:
            error instanceof Error ? error.message : "Time could not pass.",
        };
      }
      if (next.currentDate === base.currentDate)
        return {
          status: "stopped",
          problem: "The world could not move on from here.",
        };
      if (!guard.admit(base))
        return {
          status: "stopped",
          problem: "The Day was computed from a world no longer on screen.",
        };
      current = next;
      // The shell renders the new world before the next press can be made.
      guard.rendered(current);
      return { status: "moved", world: current };
    },
  };
}

/** The same month and day, `years` later; Feb 29 falls back to Feb 28. */
export function anniversary(start: IsoDate, years: number): IsoDate {
  const [year, month, day] = start.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const target = year + years;
  const leap = (target % 4 === 0 && target % 100 !== 0) || target % 400 === 0;
  const safeDay = month === 2 && day === 29 && !leap ? 28 : day;
  return `${String(target).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}` as IsoDate;
}

/* -------------------------------------------------------------------------- */
/* An IndexedDB for Node that behaves like one, for the real save store       */
/* -------------------------------------------------------------------------- */

/**
 * A single in-memory IndexedDB: object stores keyed by `saveId`, values
 * structured-cloned in and out, transactions run one at a time, requests
 * settled in order, each transaction completing after its last request's
 * success handler has had the chance to queue another. That is the part of
 * IndexedDB `BrowserSaveStore` depends on.
 */
export function memoryIndexedDB(): IDBFactory & {
  readonly stores: ReadonlyMap<string, Map<string, unknown>>;
} {
  const stores = new Map<string, Map<string, unknown>>();
  let tail: Promise<void> = Promise.resolve();

  function transaction(names: string | readonly string[]) {
    const scope = typeof names === "string" ? [names] : [...names];
    const queue: (() => void)[] = [];
    let started = false;
    let running = false;
    let finished = false;
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const handle = {
      error: null as DOMException | null,
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onabort: null as (() => void) | null,
      objectStore(name: string) {
        if (!scope.includes(name))
          throw new Error(`${name} is outside this transaction.`);
        const records = stores.get(name);
        if (!records) throw new Error(`${name} does not exist.`);
        return {
          get: (key: IDBValidKey) =>
            request(() => {
              const value = records.get(String(key));
              return value === undefined ? undefined : structuredClone(value);
            }),
          getAll: () =>
            request(() =>
              [...records.values()].map((value) => structuredClone(value)),
            ),
          getAllKeys: () => request(() => [...records.keys()]),
          put: (value: { saveId?: unknown }) =>
            request(() => {
              if (typeof value?.saveId !== "string")
                throw new Error("A record is missing its saveId key.");
              records.set(value.saveId, structuredClone(value));
              return value.saveId;
            }),
          delete: (key: IDBValidKey) =>
            request(() => {
              records.delete(String(key));
              return undefined;
            }),
        };
      },
      abort() {
        if (finished) return;
        finished = true;
        handle.onabort?.();
        release();
      },
    };
    function request<T>(run: () => T) {
      const pending = {
        result: undefined as T | undefined,
        error: null as DOMException | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queue.push(() => {
        try {
          pending.result = run();
        } catch (error) {
          pending.error = new DOMException(
            error instanceof Error ? error.message : "Request failed.",
          );
          pending.onerror?.();
          handle.error = pending.error;
          handle.abort();
          return;
        }
        pending.onsuccess?.();
      });
      pump();
      return pending;
    }
    function pump() {
      if (!started || running || finished) return;
      running = true;
      queueMicrotask(() => {
        while (queue.length > 0 && !finished) queue.shift()!();
        running = false;
        if (finished) return;
        // A success handler may have queued more; only an idle turn ends it.
        queueMicrotask(() => {
          if (finished || running) return;
          if (queue.length > 0) return pump();
          finished = true;
          handle.oncomplete?.();
          release();
        });
      });
    }
    const previous = tail;
    tail = previous.then(() => held);
    void previous.then(() => {
      started = true;
      pump();
    });
    return handle;
  }

  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    onversionchange: null,
    createObjectStore(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      return {};
    },
    transaction,
    close() {},
  };

  const factory = {
    stores,
    open() {
      const opening = {
        result: database,
        error: null,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
      };
      queueMicrotask(() => {
        opening.onupgradeneeded?.();
        opening.onsuccess?.();
      });
      return opening;
    },
  };
  return factory as unknown as IDBFactory & {
    readonly stores: ReadonlyMap<string, Map<string, unknown>>;
  };
}

/**
 * Wall time and this process's CPU time (every thread, garbage collection
 * included) since the clock started. On a busy computer the wall time also
 * counts time spent waiting for a processor; the CPU time does not.
 */
export function startClock(): () => {
  readonly wallMs: number;
  readonly cpuMs: number;
} {
  const wallAt = performance.now();
  const cpuAt = process.cpuUsage();
  return () => {
    const cpu = process.cpuUsage(cpuAt);
    return {
      wallMs: performance.now() - wallAt,
      cpuMs: (cpu.user + cpu.system) / 1000,
    };
  };
}

export interface SaveRoundTrip {
  readonly saveMs: number;
  readonly saveCpuMs: number;
  readonly reopenMs: number;
  readonly reopenCpuMs: number;
  /** UTF-8 bytes of the stored world payload. */
  readonly saveBytes: number;
  /** Whether the reopened world is the same date with the same record counts. */
  readonly reopenedMatches: boolean;
}

/**
 * Keeps a world the way "Keep this life" does and opens it again the way
 * Continue does, in a fresh database.
 */
export async function saveAndReopen(world: World): Promise<SaveRoundTrip> {
  const factory = memoryIndexedDB();
  const store = new BrowserSaveStore({ indexedDB: factory });
  const saveId = store.newSaveId(world);
  const saveClock = startClock();
  const outcome = await store.save(world, saveId);
  const saved = saveClock();
  if (outcome.status !== "saved")
    throw new Error(`The world was not saved: ${outcome.reason}`);
  const stored = factory.stores.get("worlds")?.get(saveId) as
    { payload?: string } | undefined;
  const saveBytes = Buffer.byteLength(stored?.payload ?? "", "utf8");

  // Continue in a new tab: a store that has never seen this slot.
  const reopening = new BrowserSaveStore({ indexedDB: factory });
  const reopenClock = startClock();
  const recent = await reopening.mostRecent();
  const reopened = recent ? await reopening.load(recent.saveId) : null;
  const viewpoint = reopened ? shellViewpointPersonId(reopened) : null;
  const reopenedIn = reopenClock();
  if (!reopened || viewpoint === null)
    throw new Error("The saved world could not be opened again.");
  const before = historyCounts(world);
  const after = historyCounts(reopened);
  const reopenedMatches =
    reopened.currentDate === world.currentDate &&
    Object.keys(before).length === Object.keys(after).length &&
    Object.entries(before).every(([key, count]) => after[key] === count);
  return {
    saveMs: saved.wallMs,
    saveCpuMs: saved.cpuMs,
    reopenMs: reopenedIn.wallMs,
    reopenCpuMs: reopenedIn.cpuMs,
    saveBytes,
    reopenedMatches,
  };
}

/** The length of every array the world's history keeps, by name. */
export function historyCounts(world: World): Record<string, number> {
  const history = world.history as unknown as Record<string, unknown>;
  const counts: Record<string, number> = {};
  for (const key of Object.keys(history).sort())
    if (Array.isArray(history[key]))
      counts[key] = (history[key] as unknown[]).length;
  return counts;
}

/* -------------------------------------------------------------------------- */
/* CPU profile: where a Day's cost goes, and what grew                          */
/* -------------------------------------------------------------------------- */

interface ProfileNode {
  readonly id: number;
  readonly callFrame: {
    readonly functionName: string;
    readonly url: string;
    readonly lineNumber: number;
    readonly columnNumber?: number;
  };
  readonly children?: readonly number[];
}

interface CpuProfile {
  readonly nodes: readonly ProfileNode[];
  readonly samples?: readonly number[];
  readonly timeDeltas?: readonly number[];
}

export interface FunctionCost {
  /** `name (path:line)`, repository-relative. */
  readonly key: string;
  /** Milliseconds sampled with this function on top of the stack. */
  readonly selfMs: number;
  /** Milliseconds sampled with this function anywhere on the stack. */
  readonly totalMs: number;
}

function frameKey(frame: ProfileNode["callFrame"]): string {
  const name = frame.functionName || "(anonymous)";
  if (!frame.url) return name;
  // tsx hands V8 transpiled code; its inline source map gives the TypeScript
  // line, when Node was started with --enable-source-maps.
  let url = frame.url;
  let line: number | null = null;
  const entry = (
    frame.url.startsWith("file://")
      ? findSourceMap(frame.url)?.findEntry(
          frame.lineNumber,
          frame.columnNumber ?? 0,
        )
      : undefined
  ) as { originalSource?: string; originalLine?: number } | undefined;
  if (entry?.originalSource !== undefined && entry.originalLine !== undefined) {
    url = entry.originalSource;
    line = entry.originalLine + 1;
  }
  const file = url.startsWith("file://")
    ? relative(REPOSITORY_ROOT, fileURLToPath(url))
    : url;
  return `${name} (${file}:${line ?? "?"})`;
}

/** Self and inclusive time per function, from a V8 sampling profile. */
export function summarizeProfile(
  profile: CpuProfile,
): Map<string, FunctionCost> {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const parent = new Map<number, number>();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parent.set(child, node.id);
  const self = new Map<string, number>();
  const total = new Map<string, number>();
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  for (let index = 0; index < samples.length; index += 1) {
    // A delta is the time before this sample; the interval it ends is
    // attributed to the stack sampled at its end, as DevTools does.
    const ms = Math.max(0, deltas[index] ?? 0) / 1000;
    let id: number | undefined = samples[index];
    const leaf = id === undefined ? undefined : byId.get(id);
    if (!leaf) continue;
    const leafKey = frameKey(leaf.callFrame);
    self.set(leafKey, (self.get(leafKey) ?? 0) + ms);
    const seen = new Set<string>();
    while (id !== undefined) {
      const node = byId.get(id);
      if (!node) break;
      const key = frameKey(node.callFrame);
      if (!seen.has(key)) {
        seen.add(key);
        total.set(key, (total.get(key) ?? 0) + ms);
      }
      id = parent.get(id);
    }
  }
  const costs = new Map<string, FunctionCost>();
  for (const [key, totalMs] of total)
    costs.set(key, { key, selfMs: self.get(key) ?? 0, totalMs });
  return costs;
}

/** Profiles `run` with V8's sampling profiler and summarizes it. */
export async function profiled<T>(
  run: () => T,
): Promise<{ readonly value: T; readonly costs: Map<string, FunctionCost> }> {
  const session = new Session();
  session.connect();
  try {
    await session.post("Profiler.enable");
    await session.post("Profiler.setSamplingInterval", { interval: 1000 });
    await session.post("Profiler.start");
    const value = run();
    const { profile } = (await session.post("Profiler.stop")) as {
      profile: CpuProfile;
    };
    return { value, costs: summarizeProfile(profile) };
  } finally {
    session.disconnect();
  }
}

export interface CostGrowth {
  readonly key: string;
  readonly firstMsPerDay: number;
  readonly lastMsPerDay: number;
  readonly growthMsPerDay: number;
}

const V8_BOOKKEEPING = new Set(["(root)", "(program)", "(idle)"]);

/**
 * The functions whose cost per Day grew most between two profiled years.
 * Per Day, so a leap year's extra press does not count as growth.
 */
export function costGrowth(
  first: { readonly costs: Map<string, FunctionCost>; readonly days: number },
  last: { readonly costs: Map<string, FunctionCost>; readonly days: number },
  measure: "selfMs" | "totalMs",
  limit = 15,
): CostGrowth[] {
  const keys = new Set([...first.costs.keys(), ...last.costs.keys()]);
  const rows: CostGrowth[] = [];
  for (const key of keys) {
    if (V8_BOOKKEEPING.has(key)) continue;
    const firstMsPerDay = (first.costs.get(key)?.[measure] ?? 0) / first.days;
    const lastMsPerDay = (last.costs.get(key)?.[measure] ?? 0) / last.days;
    rows.push({
      key,
      firstMsPerDay,
      lastMsPerDay,
      growthMsPerDay: lastMsPerDay - firstMsPerDay,
    });
  }
  return rows
    .sort((left, right) => right.growthMsPerDay - left.growthMsPerDay)
    .slice(0, limit);
}

/** The functions with the most own time in a profiled year, per Day. */
export function topCosts(
  year: { readonly costs: Map<string, FunctionCost>; readonly days: number },
  limit = 15,
): FunctionCost[] {
  return [...year.costs.values()]
    .filter((cost) => !V8_BOOKKEEPING.has(cost.key))
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, limit)
    .map((cost) => ({
      key: cost.key,
      selfMs: cost.selfMs / year.days,
      totalMs: cost.totalMs / year.days,
    }));
}

/* -------------------------------------------------------------------------- */
/* The benchmark                                                               */
/* -------------------------------------------------------------------------- */

export interface AgingOptions {
  readonly seed: string;
  readonly placeKey: string;
  readonly years: number;
  /** Stop after the year that passes this much wall time. */
  readonly maxMinutes: number;
  /** Game years (1-based) whose Days run under the CPU profiler. */
  readonly profileYears: readonly number[];
}

export interface AgingYear {
  readonly year: number;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly days: number;
  /** Wall time per press. */
  readonly medianDayMs: number;
  readonly p95DayMs: number;
  readonly maxDayMs: number;
  /** CPU time per press. */
  readonly medianDayCpuMs: number;
  readonly p95DayCpuMs: number;
  readonly maxDayCpuMs: number;
  readonly yearSeconds: number;
  readonly yearCpuSeconds: number;
  readonly profiled: boolean;
  readonly people: number;
  readonly saveBytes: number;
  readonly saveMs: number;
  readonly saveCpuMs: number;
  readonly reopenMs: number;
  readonly reopenCpuMs: number;
  readonly reopenedMatches: boolean;
  readonly heapMiB: number;
  /** One-minute load average on this machine when the year ended. */
  readonly loadAverage: number;
  readonly historyCounts: Record<string, number>;
}

export interface AgingResult {
  readonly options: AgingOptions;
  readonly placeName: string;
  readonly openingMs: number;
  readonly startedOn: IsoDate;
  readonly opening: {
    readonly saveBytes: number;
    readonly saveMs: number;
    readonly saveCpuMs: number;
    readonly reopenMs: number;
    readonly reopenCpuMs: number;
    readonly historyCounts: Record<string, number>;
  };
  readonly years: readonly AgingYear[];
  /** Why the run ended before its last year, if it did. */
  readonly stoppedEarly: string | null;
  readonly profiles: {
    readonly first: { readonly year: number; readonly days: number };
    readonly last: { readonly year: number; readonly days: number };
    readonly self: readonly CostGrowth[];
    readonly total: readonly CostGrowth[];
    /** Where a Day's own time went in the last profiled year, ms per Day. */
    readonly lastYearTop: readonly FunctionCost[];
  } | null;
  readonly wallMinutes: number;
  readonly node: string;
}

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(q * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))]!;
}

function round(value: number, places = 1): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

export async function runAgingBenchmark(
  options: AgingOptions,
  onYear: (partial: AgingResult) => void = () => {},
): Promise<AgingResult> {
  const began = performance.now();
  const openedAt = performance.now();
  const watched = openWatchedWorld(options.seed, options.placeKey);
  const openingMs = performance.now() - openedAt;
  const button = createObserverDayButton(watched.world);
  const startedOn = watched.world.currentDate;
  const openingTrip = await saveAndReopen(watched.world);
  const opening = {
    saveBytes: openingTrip.saveBytes,
    saveMs: round(openingTrip.saveMs),
    saveCpuMs: round(openingTrip.saveCpuMs),
    reopenMs: round(openingTrip.reopenMs),
    reopenCpuMs: round(openingTrip.reopenCpuMs),
    historyCounts: historyCounts(watched.world),
  };
  const years: AgingYear[] = [];
  const profiles = new Map<
    number,
    { costs: Map<string, FunctionCost>; days: number }
  >();
  let stoppedEarly: string | null = null;

  const snapshot = (): AgingResult => {
    const profiledYears = [...profiles.keys()].sort((a, b) => a - b);
    const firstYear = profiledYears[0];
    const lastYear = profiledYears.at(-1);
    const first = firstYear === undefined ? null : profiles.get(firstYear)!;
    const last = lastYear === undefined ? null : profiles.get(lastYear)!;
    return {
      options,
      placeName: watched.placeName,
      openingMs: round(openingMs),
      startedOn,
      opening,
      years: [...years],
      stoppedEarly,
      profiles:
        first && last && firstYear !== lastYear
          ? {
              first: { year: firstYear!, days: first.days },
              last: { year: lastYear!, days: last.days },
              self: costGrowth(first, last, "selfMs"),
              total: costGrowth(first, last, "totalMs"),
              lastYearTop: topCosts(last),
            }
          : null,
      wallMinutes: round((performance.now() - began) / 60000, 1),
      node: process.version,
    };
  };

  for (let year = 1; year <= options.years; year += 1) {
    const from = button.world.currentDate;
    const until = anniversary(startedOn, year);
    const dayMs: number[] = [];
    const dayCpuMs: number[] = [];
    const yearClock = startClock();
    const pressYear = (): string | null => {
      while (button.world.currentDate < until) {
        const dayClock = startClock();
        const pressed = button.press();
        const spent = dayClock();
        dayMs.push(spent.wallMs);
        dayCpuMs.push(spent.cpuMs);
        if (pressed.status === "stopped") return pressed.problem;
      }
      return null;
    };
    let problem: string | null;
    const profiling = options.profileYears.includes(year);
    if (profiling) {
      const run = await profiled(pressYear);
      problem = run.value;
      profiles.set(year, { costs: run.costs, days: dayMs.length });
    } else {
      problem = pressYear();
    }
    const yearSpent = yearClock();
    const trip = await saveAndReopen(button.world);
    const sorted = [...dayMs].sort((a, b) => a - b);
    const sortedCpu = [...dayCpuMs].sort((a, b) => a - b);
    years.push({
      year,
      from,
      to: button.world.currentDate,
      days: dayMs.length,
      medianDayMs: round(quantile(sorted, 0.5)),
      p95DayMs: round(quantile(sorted, 0.95)),
      maxDayMs: round(sorted.at(-1) ?? 0),
      medianDayCpuMs: round(quantile(sortedCpu, 0.5)),
      p95DayCpuMs: round(quantile(sortedCpu, 0.95)),
      maxDayCpuMs: round(sortedCpu.at(-1) ?? 0),
      yearSeconds: round(yearSpent.wallMs / 1000),
      yearCpuSeconds: round(yearSpent.cpuMs / 1000),
      profiled: profiling,
      people: Object.keys(button.world.people).length,
      saveBytes: trip.saveBytes,
      saveMs: round(trip.saveMs),
      saveCpuMs: round(trip.saveCpuMs),
      reopenMs: round(trip.reopenMs),
      reopenCpuMs: round(trip.reopenCpuMs),
      reopenedMatches: trip.reopenedMatches,
      heapMiB: Math.round(process.memoryUsage().heapUsed / 2 ** 20),
      loadAverage: round(loadavg()[0] ?? 0),
      historyCounts: historyCounts(button.world),
    });
    if (problem) {
      stoppedEarly = `The Day button stopped on ${button.world.currentDate}: ${problem}`;
      onYear(snapshot());
      break;
    }
    const minutes = (performance.now() - began) / 60000;
    if (year < options.years && minutes >= options.maxMinutes) {
      stoppedEarly = `Stopped after year ${year}: ${round(minutes, 1)} minutes of wall time passed the ${options.maxMinutes}-minute limit.`;
      onYear(snapshot());
      break;
    }
    onYear(snapshot());
  }
  return snapshot();
}

/* -------------------------------------------------------------------------- */
/* The report                                                                  */
/* -------------------------------------------------------------------------- */

function bytes(value: number): string {
  if (value >= 2 ** 20) return `${round(value / 2 ** 20, 1)} MiB`;
  return `${round(value / 1024, 1)} KiB`;
}

function ms(value: number): string {
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1);
}

export function agingBenchmarkMarkdown(result: AgingResult): string {
  const { options } = result;
  const lines: string[] = [];
  const last = result.years.at(-1);
  lines.push(
    "# World aging benchmark",
    "",
    `A world with nobody played, opened in ${result.placeName} (place ${options.placeKey}) from seed \`${options.seed}\` on ${result.startedOn}, moved forward one Day at a time by the observer clock's "A day" button for ${result.years.length} game year${result.years.length === 1 ? "" : "s"}${last ? `, to ${last.to}` : ""}.`,
    "",
    "```",
    `npm run world:aging -- --years ${options.years} --seed ${options.seed} --place ${options.placeKey} --max-minutes ${options.maxMinutes} --profile-years ${options.profileYears.join(",")}`,
    "```",
    "",
    `Node ${result.node}. Opening the world took ${ms(result.openingMs)} ms. The whole run took ${result.wallMinutes} minutes of wall time.`,
    "",
  );
  if (result.stoppedEarly)
    lines.push(`**The run ended early.** ${result.stoppedEarly}`, "");
  lines.push(
    "How to read this:",
    "",
    "- A Day is one press of the button: `advanceObservedWorld(world, 1)` committed through the player root's stale-world guard. Median and p95 are over every press in that game year.",
    "- CPU time is this process's processor time for the press (all its threads, garbage collection included). Wall time also counts time spent waiting for a processor. Other work was running on this computer during the run, so read the CPU columns for cost and the wall columns for what a person at a busy computer would wait.",
    "- Save is `BrowserSaveStore.save` on the world at the end of the year (snapshot, content hash, serialization, the conditional write). Reopen is what Continue does in a new tab: `mostRecent`, `load` and the shell's viewpoint. The IndexedDB under both is an in-memory stand-in that structured-clones values like a browser; no disk time is included.",
    "- Save size is the UTF-8 bytes of the stored world payload. Heap is V8's used heap after the year's save and reopen. Load average is this machine's one-minute load when the year ended.",
    `- Profiled years (${options.profileYears.join(", ")}, marked *) ran under V8's sampling profiler at 1 ms, which adds a little to their Day times.`,
    "",
    "## Day time, per game year",
    "",
    "| Year | Dates | Days | Median Day CPU (ms) | p95 Day CPU (ms) | Slowest Day CPU (ms) | Median Day wall (ms) | p95 Day wall (ms) | Year CPU (s) | Year wall (s) | Load avg |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const year of result.years)
    lines.push(
      `| ${year.year}${year.profiled ? "*" : ""} | ${year.from} to ${year.to} | ${year.days} | ${ms(year.medianDayCpuMs)} | ${ms(year.p95DayCpuMs)} | ${ms(year.maxDayCpuMs)} | ${ms(year.medianDayMs)} | ${ms(year.p95DayMs)} | ${year.yearCpuSeconds} | ${year.yearSeconds} | ${year.loadAverage} |`,
    );
  lines.push(
    "",
    "## Save size, save and reopen, per game year",
    "",
    "| Year | Date | People | Save size | Save CPU (ms) | Save wall (ms) | Reopen CPU (ms) | Reopen wall (ms) | Heap (MiB) |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| 0 | ${result.startedOn} (opening) | – | ${bytes(result.opening.saveBytes)} | ${ms(result.opening.saveCpuMs)} | ${ms(result.opening.saveMs)} | ${ms(result.opening.reopenCpuMs)} | ${ms(result.opening.reopenMs)} | – |`,
  );
  for (const year of result.years)
    lines.push(
      `| ${year.year} | ${year.to} | ${year.people} | ${bytes(year.saveBytes)} | ${ms(year.saveCpuMs)} | ${ms(year.saveMs)} | ${ms(year.reopenCpuMs)} | ${ms(year.reopenMs)} | ${year.heapMiB} |`,
    );
  lines.push("");

  const mismatched = result.years.filter((year) => !year.reopenedMatches);
  lines.push(
    mismatched.length === 0
      ? "Every reopened save came back on the same date with the same number of records in every history array."
      : `**Reopened saves that did not match the world kept:** years ${mismatched.map((year) => year.year).join(", ")}.`,
    "",
  );

  lines.push("## What the CPU profile says grew", "");
  if (!result.profiles) {
    lines.push(
      "Fewer than two years were profiled, so there is no comparison.",
      "",
    );
  } else {
    const { first, last: final } = result.profiles;
    lines.push(
      `Year ${first.year} (${first.days} Days) against year ${final.year} (${final.days} Days), in milliseconds per Day of sampled time (the sampler counts wall time on the main thread, so a busy computer inflates both years). "Self" is time with the function itself on top of the stack; that is where a repeated scan of a growing array shows up, usually as the small callback passed to \`filter\`, \`find\` or \`some\`. "Inclusive" also counts everything it called.`,
      "",
      "### The 15 functions whose own time grew most",
      "",
      "| # | Function (file:line) | Year " +
        first.year +
        " ms/Day | Year " +
        final.year +
        " ms/Day | Growth ms/Day |",
      "| ---: | --- | ---: | ---: | ---: |",
    );
    result.profiles.self.forEach((row, index) =>
      lines.push(
        `| ${index + 1} | \`${row.key}\` | ${row.firstMsPerDay.toFixed(2)} | ${row.lastMsPerDay.toFixed(2)} | ${row.growthMsPerDay.toFixed(2)} |`,
      ),
    );
    lines.push(
      "",
      "### The 15 functions whose inclusive time grew most",
      "",
      "| # | Function (file:line) | Year " +
        first.year +
        " ms/Day | Year " +
        final.year +
        " ms/Day | Growth ms/Day |",
      "| ---: | --- | ---: | ---: | ---: |",
    );
    result.profiles.total.forEach((row, index) =>
      lines.push(
        `| ${index + 1} | \`${row.key}\` | ${row.firstMsPerDay.toFixed(2)} | ${row.lastMsPerDay.toFixed(2)} | ${row.growthMsPerDay.toFixed(2)} |`,
      ),
    );
    lines.push(
      "",
      `### Where a Day's own time went in year ${final.year}`,
      "",
      "| # | Function (file:line) | Own ms/Day | Inclusive ms/Day |",
      "| ---: | --- | ---: | ---: |",
    );
    result.profiles.lastYearTop.forEach((row, index) =>
      lines.push(
        `| ${index + 1} | \`${row.key}\` | ${row.selfMs.toFixed(2)} | ${row.totalMs.toFixed(2)} |`,
      ),
    );
    lines.push("");
  }

  lines.push(
    "## How many records each history array holds",
    "",
    "At the opening and at the end of each game year. Arrays that stayed empty the whole run are listed after the table.",
    "",
  );
  const keys = Object.keys(result.opening.historyCounts);
  for (const year of result.years)
    for (const key of Object.keys(year.historyCounts))
      if (!keys.includes(key)) keys.push(key);
  keys.sort();
  const everEmpty = keys.filter(
    (key) =>
      (result.opening.historyCounts[key] ?? 0) === 0 &&
      result.years.every((year) => (year.historyCounts[key] ?? 0) === 0),
  );
  const shown = keys.filter((key) => !everEmpty.includes(key));
  const finalCounts = last?.historyCounts ?? result.opening.historyCounts;
  shown.sort(
    (left, right) => (finalCounts[right] ?? 0) - (finalCounts[left] ?? 0),
  );
  lines.push(
    `| Array | Opening | ${result.years.map((year) => `Y${year.year}`).join(" | ")} |`,
    `| --- | ---: | ${result.years.map(() => "---:").join(" | ")} |`,
  );
  for (const key of shown)
    lines.push(
      `| ${key} | ${result.opening.historyCounts[key] ?? 0} | ${result.years.map((year) => year.historyCounts[key] ?? 0).join(" | ")} |`,
    );
  lines.push(
    "",
    everEmpty.length === 0
      ? "No history array stayed empty."
      : `Empty from the opening to the last year (${everEmpty.length}): ${everEmpty.map((key) => `\`${key}\``).join(", ")}.`,
    "",
  );
  return `${lines.join("\n")}\n`;
}

/* -------------------------------------------------------------------------- */
/* Command line                                                                */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1]! : fallback;
  };
  const rendering = args.indexOf("--render");
  if (rendering >= 0) {
    // Re-render a finished or interrupted run from its saved progress file.
    const saved = JSON.parse(
      readFileSync(args[rendering + 1]!, "utf8"),
    ) as AgingResult;
    const out = opt("out", "docs/reports/world-aging-benchmark.md");
    writeFileSync(out, agingBenchmarkMarkdown(saved));
    console.log(`Wrote ${out} from ${args[rendering + 1]}.`);
    return;
  }
  const years = Number(opt("years", "20"));
  const options: AgingOptions = {
    seed: opt("seed", "aging-1"),
    placeKey: opt("place", DEFAULT_AGING_PLACE),
    years,
    maxMinutes: Number(opt("max-minutes", "120")),
    profileYears: opt("profile-years", `1,${years}`)
      .split(",")
      .map(Number)
      .filter((year) => Number.isInteger(year) && year >= 1),
  };
  if (!Number.isInteger(options.years) || options.years < 1)
    throw new Error("Use --years N (1 or more).");
  const out = opt("out", "docs/reports/world-aging-benchmark.md");
  const progress = opt(
    "progress",
    `test-results/world-aging/${options.seed}-${options.placeKey}.json`,
  );
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(dirname(progress), { recursive: true });
  const write = (result: AgingResult) => {
    writeFileSync(out, agingBenchmarkMarkdown(result));
    writeFileSync(progress, `${JSON.stringify(result, null, 2)}\n`);
    const year = result.years.at(-1);
    if (year)
      console.log(
        `year ${year.year} (${year.to}): Day CPU median ${year.medianDayCpuMs} ms, p95 ${year.p95DayCpuMs} ms (wall ${year.medianDayMs}/${year.p95DayMs}); save ${bytes(year.saveBytes)} in ${year.saveCpuMs} ms CPU, reopen ${year.reopenCpuMs} ms CPU; load ${year.loadAverage}; ${result.wallMinutes} min so far`,
      );
  };
  const result = await runAgingBenchmark(options, write);
  write(result);
  console.log(`Wrote ${out} and ${progress}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
