/**
 * The one registry, writer and reader for output numbers shown on screens or
 * read from engines by the outcome web (`src/core2/data/output-numbers.json`).
 * Every figure lives in `world-metrics`'s `months` and `years` tables, indexed
 * `byPlace`.
 */
import registryData from "./data/output-numbers.json" with { type: "json" };
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, Source } from "./types";

const WORLD_METRICS_MODULE_ID = "world-metrics";

export type OutputNumberLevel = "place" | "county" | "state" | "nation";
export type OutputNumberCadence = "on-change" | "monthly" | "yearly";
export type OutputNumberFold = "december" | "sum" | "mean";
export type MetricsSection =
  | "nation"
  | "state"
  | "city"
  | "housing"
  | "evictions"
  | "benefits"
  | "budget";

export const METRICS_SECTIONS: readonly MetricsSection[] = [
  "nation",
  "state",
  "city",
  "housing",
  "evictions",
  "benefits",
  "budget",
] as const;

export interface OutputNumberEntry {
  readonly id: string;
  readonly owner: string;
  readonly unit: string;
  readonly level: OutputNumberLevel;
  readonly denominator: string;
  readonly cadence: OutputNumberCadence;
  readonly source: {
    readonly tag: "SOURCED" | "ESTIMATED" | "TUNABLE";
    readonly citation: string;
  };
  readonly fold: OutputNumberFold;
  readonly traceInputs: readonly string[];
  readonly field: string;
  readonly metricsSection?: MetricsSection;
  readonly metricsKey?: string;
  readonly webMeasure?: boolean;
  readonly record?: string;
  readonly unitScale?: number;
  readonly module?: string;
  readonly table?: string;
  readonly reader?: string;
  readonly baselineReader?: string;
  readonly ownsOutcome?: boolean;
}

export interface OutputNumberReading {
  readonly now: number;
  readonly before: number | null;
}

export const OUTPUT_NUMBERS = (
  registryData as unknown as {
    numbers: Readonly<Record<string, OutputNumberEntry>>;
  }
).numbers;

/** Look up any registered output number by its id. */
export function outputNumber(id: string): OutputNumberEntry | undefined {
  return OUTPUT_NUMBERS[id];
}

/** Look up an outcome-web engine measure in the unified registry. */
export function engineMeasure(
  measure: string,
): (OutputNumberEntry & { unitScale: number }) | undefined {
  const entry = OUTPUT_NUMBERS[measure];
  return entry?.webMeasure && typeof entry.unitScale === "number"
    ? (entry as OutputNumberEntry & { unitScale: number })
    : undefined;
}

/**
 * True when an outcome's own value is the engine's record (e.g. poverty from
 * household incomes); links into it are carried by the engine that moves its
 * inputs rather than added on top by the web.
 */
export function engineOwned(measure: string): boolean {
  return Boolean(engineMeasure(measure)?.ownsOutcome);
}

/** The registry entries that populate a section of the Metrics screen, in table order. */
export function metricsEntriesForSection(
  section: MetricsSection,
): readonly OutputNumberEntry[] {
  return Object.values(OUTPUT_NUMBERS).filter(
    (entry) => entry.metricsSection === section,
  );
}

/** Resolve the `placeId` key used in `world-metrics` for a given level. */
export function placeIdForOutputLevel(
  placeId: string,
  level: OutputNumberLevel,
): string {
  if (level === "nation") return "US";
  if (level === "state")
    return placeId.startsWith("US-") ? placeId : placeStateKey(placeId);
  return placeId;
}

/**
 * Write a registered output number and its named trace inputs into
 * `world-metrics`'s `months` or `years` table.
 */
export function putOutputNumber(
  api: CoreAPI,
  id: string,
  placeId: string,
  value: number,
  inputs?: Readonly<Record<string, number | string>>,
  options?: {
    table?: "months" | "years";
    date?: string;
    year?: number;
    open?: boolean;
    source?: Source;
  },
): void {
  const entry = outputNumber(id);
  if (!entry) throw new Error(`Unknown output number: ${id}`);
  if (!(api.state as CoreState).modules.has(WORLD_METRICS_MODULE_ID)) return;
  const field = entry.field || entry.id;
  const table = options?.table ?? "months";
  const date = options?.date ?? api.state.date;
  const store = api.moduleState(WORLD_METRICS_MODULE_ID).table(table);
  if (table === "years") {
    const year = options?.year ?? Number(date.slice(0, 4));
    const rowId = `year:${placeId}:${year}`;
    const existing = (store.get(rowId) as Record<string, unknown> | undefined) ?? {
      id: rowId,
      placeId,
      year,
      date,
    };
    const traceInputs = inputs
      ? {
          ...((existing.traceInputs as Record<string, unknown> | undefined) ??
            {}),
          [id]: inputs,
        }
      : existing.traceInputs;
    store.put({
      ...existing,
      id: rowId,
      placeId,
      year,
      date,
      [field]: value,
      ...(options?.open !== undefined ? { open: options.open } : {}),
      ...(options?.source ? { source: options.source } : {}),
      ...(traceInputs ? { traceInputs } : {}),
    });
    return;
  }
  const rowId = `metrics:${placeId}:${date}`;
  const existing = (store.get(rowId) as Record<string, unknown> | undefined) ?? {
    id: rowId,
    placeId,
    date,
  };
  const traceInputs = inputs
    ? {
        ...((existing.traceInputs as Record<string, unknown> | undefined) ??
          {}),
        [id]: inputs,
      }
    : existing.traceInputs;
  store.put({
    ...existing,
    id: rowId,
    placeId,
    date,
    [field]: value,
    ...(options?.source ? { source: options.source } : {}),
    ...(traceInputs ? { traceInputs } : {}),
  });
}

/**
 * Read a registered output number (`now` and `before`, last year's figure)
 * from `world-metrics`'s `months` and `years` tables.
 */
export function readOutputNumber(
  core: CoreState,
  id: string,
  placeId: string,
): OutputNumberReading | null {
  const entry = outputNumber(id);
  if (!entry || !core.modules.has(WORLD_METRICS_MODULE_ID)) return null;
  const field = entry.field || entry.id;
  const targetPlaceId = placeIdForOutputLevel(placeId, entry.level);
  const state = coreAPI(core).moduleState(WORLD_METRICS_MODULE_ID);
  const months = (
    state.table("months").query("byPlace", [targetPlaceId]) as unknown as (Record<
      string,
      unknown
    > & { date: string })[]
  )
    .filter((row) => row.date <= core.date && typeof row[field] === "number")
    .sort((a, b) => a.date.localeCompare(b.date));
  const years = (
    state.table("years").query("byPlace", [targetPlaceId]) as unknown as (Record<
      string,
      unknown
    > & { year: number; open?: boolean })[]
  )
    .filter((row) => typeof row[field] === "number")
    .sort((a, b) => Number(a.year) - Number(b.year));
  const currentYear = Number(core.date.slice(0, 4));
  const latestMonth = months.at(-1);
  const openYear = years.find((row) => Number(row.year) === currentYear);
  const now = latestMonth
    ? Number(latestMonth[field])
    : openYear
      ? Number(openYear[field])
      : null;
  if (now === null || !Number.isFinite(now)) return null;
  const priorYearRow =
    years.find((row) => Number(row.year) === currentYear - 1) ??
    years.filter((row) => !row.open && Number(row.year) < currentYear).at(-1);
  const before =
    priorYearRow && typeof priorYearRow[field] === "number"
      ? Number(priorYearRow[field])
      : null;
  return { now, before };
}
