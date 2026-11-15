/**
 * The one registry of output numbers (docs/design/output-numbers.md): the
 * list of figures (src/core2/data/output-numbers.json), the thin writer an owning
 * engine puts its figure through, and the reader of what `world-metrics`
 * keeps. Nothing here schedules, scans or decides: a figure is written by the
 * engine that already holds it, on the day it changes or at month's end, into
 * the place's year row (`world-metrics.years`, `year:<place>:<year>`), and a
 * read is a lookup of that row by its id.
 */
import registry from "./data/output-numbers.json" with { type: "json" };
import type { CoreAPI, CoreState } from "./types";

/** The module that keeps the rows (src/core2/modules/world-metrics.ts). */
export const OUTPUT_NUMBERS_MODULE_ID = "world-metrics";

export type OutputNumberFold = "december" | "sum" | "mean";

export interface OutputNumber {
  readonly id: string;
  /** The module that writes it. */
  readonly owner: string;
  readonly unit: string;
  readonly level: "place" | "county" | "state" | "nation";
  /** What the figure is out of, in words ("none" for a plain count). */
  readonly denominator: string;
  readonly cadence: "on-change" | "monthly" | "yearly";
  readonly source: {
    readonly tag: "SOURCED" | "ESTIMATED" | "TUNABLE";
    readonly citation: string;
  };
  /** How a year's months become the year's figure. */
  readonly fold: OutputNumberFold;
  /** The named inputs kept beside the value (fields of the same kept row, or of `inputs`). */
  readonly traceInputs: readonly string[];
  /** Where world-metrics keeps it: a field of its monthly row (folded into the year row), or of the year row. */
  readonly kept?: {
    readonly table: "months" | "years";
    readonly field: string;
  };
  /** The owning engine's own dated record, by a named reader (output-number-readers.ts). */
  readonly reader?: string;
  /** What the outcome web needs to read the figure as a cause. */
  readonly web?: {
    readonly lead: string;
    readonly record: string;
    readonly field: string;
    readonly reader?: string;
    readonly baselineReader?: string;
    readonly unitScale: number;
    readonly module?: string;
    readonly table?: string;
    readonly ownsOutcome?: boolean;
  };
  /** Where the Metrics screen shows it. */
  readonly metrics?: {
    readonly section: string;
    readonly key: string;
    readonly unit: "percent" | "dollars" | "money" | "count";
    /** The named input the count is out of ("13 of 86"). */
    readonly of?: string;
    /** A figure of zero means the engine holds none: the row is left out. */
    readonly absentWhenZero?: boolean;
    /** The build order that gives the figure one writer and its year rows. */
    readonly waitsOn?: string;
  };
}

const NUMBERS = registry.numbers as unknown as Readonly<
  Record<string, OutputNumber>
>;

export const OUTPUT_NUMBERS: readonly OutputNumber[] = Object.values(NUMBERS);

/** The Metrics screen's sections, in the order it shows them. */
export const METRICS_SECTIONS: readonly string[] = registry.sections;

export function outputNumber(id: string): OutputNumber | undefined {
  return NUMBERS[id];
}

/** The figures the monthly town row holds, folded into the place's year row each month. */
const MONTHLY: readonly (OutputNumber & {
  kept: NonNullable<OutputNumber["kept"]>;
})[] = OUTPUT_NUMBERS.filter(
  (row): row is (typeof MONTHLY)[number] => row.kept?.table === "months",
);

/** A place's year row: one per place per year, the latest or folded value of each kept figure. */
export interface OutputYearRow {
  readonly id: string;
  readonly placeId: string;
  readonly year: number;
  /** The first day the row was written; a year opened after January 2 is a part year. */
  readonly openedAt: string;
  readonly updatedAt: string;
  /** Set by the first monthly step of the next year: nothing adds to the row after it. */
  readonly closedAt?: string;
  /** The monthly row the December-fold figures were last read from. */
  readonly monthRowId?: string;
  /** The figures a pre-start pass wrote into the row (`putPastYear`). */
  readonly pastFields?: readonly string[];
  /** How many months a mean has folded, by field. */
  readonly months?: Readonly<Record<string, number>>;
  /** The named inputs kept beside a figure, by figure id. */
  readonly inputs?: Readonly<
    Record<string, Readonly<Record<string, number | string>>>
  >;
  readonly [field: string]: unknown;
}

export const yearRowId = (placeId: string, year: number) =>
  `year:${placeId}:${year}`;

const yearOf = (date: string) => Number(date.slice(0, "YYYY".length));

function years(api: CoreAPI) {
  return api.moduleState(OUTPUT_NUMBERS_MODULE_ID).table("years");
}

function folded(
  row: Readonly<Record<string, unknown>>,
  number: OutputNumber,
  field: string,
  value: number,
  months: Record<string, number>,
): number {
  const before = row[field];
  if (number.fold === "december" || typeof before !== "number") {
    if (number.fold === "mean") months[field] = 1;
    return value;
  }
  if (number.fold === "sum") return before + value;
  const n = months[field] ?? 1;
  months[field] = n + 1;
  return (before * n + value) / (n + 1);
}

/**
 * The owning engine writes its figure: one observation of a registered
 * number for a place, folded into the place's row for the year of today by
 * the registry's rule (the latest value, the year's sum or the year's mean),
 * with its named inputs kept beside it. A world without the metrics module
 * keeps nothing.
 */
export function putOutputNumber(
  api: CoreAPI,
  id: string,
  placeId: string,
  value: number,
  inputs?: Readonly<Record<string, number | string>>,
): void {
  const number = NUMBERS[id];
  if (!number?.kept) throw new Error(`No kept output number "${id}".`);
  if (!(api.state as CoreState).modules.has(OUTPUT_NUMBERS_MODULE_ID)) return;
  if (!Number.isFinite(value)) return;
  const date = api.state.date;
  const rowId = yearRowId(placeId, yearOf(date));
  const table = years(api);
  const row = (table.get(rowId) as OutputYearRow | undefined) ?? {
    id: rowId,
    placeId,
    year: yearOf(date),
    openedAt: date,
    updatedAt: date,
  };
  const months = { ...row.months };
  const field = number.kept.field;
  table.put({
    ...row,
    updatedAt: date,
    [field]: folded(row, number, field, value, months),
    ...(Object.keys(months).length ? { months } : {}),
    ...(inputs ? { inputs: { ...row.inputs, [id]: inputs } } : {}),
  });
}

/**
 * A year of the place's past, written by an engine's pre-start pass from its
 * own history (owner, Nov 13, 2026: the past is simulated so the present
 * makes sense): the figures it read on `date`, by registered number id, into
 * the place's year row, with the history record kept beside each figure for
 * dev mode's Trace. A year before the world's start is closed; the start
 * year's row is the one play folds its months into. Other engines' figures
 * already on the row are kept. The row names the figures the passes wrote
 * (`pastFields`, on a closed past year only): there any other figure is
 * unknown, never zero, because no pass ran it (eviction notices are not
 * simulated before the start).
 */
export function putPastYear(
  api: CoreAPI,
  past: {
    readonly placeId: string;
    readonly year: number;
    /** The day the figures were read. */
    readonly date: string;
    /** True for a year before the start: nothing adds to it after. */
    readonly closed: boolean;
    /** The history record the figures were read from. */
    readonly recordId: string;
    readonly values: Readonly<Record<string, number>>;
  },
): void {
  if (!(api.state as CoreState).modules.has(OUTPUT_NUMBERS_MODULE_ID)) return;
  const table = years(api);
  const rowId = yearRowId(past.placeId, past.year);
  const row = (table.get(rowId) as OutputYearRow | undefined) ?? {
    id: rowId,
    placeId: past.placeId,
    year: past.year,
    openedAt: past.closed ? `${past.year}-01-01` : past.date,
    updatedAt: past.date,
  };
  const written: Record<string, unknown> = {
    ...row,
    updatedAt: past.date,
    ...(past.closed ? { closedAt: `${past.year + 1}-01-01` } : {}),
  };
  const inputs = { ...row.inputs };
  const fields = new Set(row.pastFields);
  for (const [id, value] of Object.entries(past.values)) {
    const number = NUMBERS[id];
    if (!number?.kept) throw new Error(`No kept output number "${id}".`);
    if (!Number.isFinite(value)) continue;
    written[number.kept.field] = value;
    fields.add(number.kept.field);
    inputs[id] = { historyRecordId: past.recordId };
  }
  // Only a year that closed before the start is a past year; the start
  // year's row is a played year's once play folds into it.
  table.put({
    ...written,
    inputs,
    ...(past.closed ? { pastFields: [...fields] } : {}),
  } as never);
}

/**
 * World-metrics' monthly step folds the town's month row into its year row:
 * every registered figure the month row holds, in one write. The first step
 * of a new year closes the year before.
 */
export function foldMonthIntoYear(
  api: CoreAPI,
  month: Readonly<Record<string, unknown>> & {
    readonly placeId: string;
    readonly date: string;
  },
  monthRowId?: string,
): void {
  const year = yearOf(month.date);
  const table = years(api);
  const rowId = yearRowId(month.placeId, year);
  const existing = table.get(rowId) as OutputYearRow | undefined;
  if (!existing) {
    const last = table.get(yearRowId(month.placeId, year - 1)) as
      OutputYearRow | undefined;
    if (last && !last.closedAt) table.put({ ...last, closedAt: month.date });
  }
  const row: Record<string, unknown> = {
    ...(existing ?? {
      id: rowId,
      placeId: month.placeId,
      year,
      openedAt: month.date,
    }),
    updatedAt: month.date,
    ...(monthRowId ? { monthRowId } : {}),
  };
  const months = { ...existing?.months };
  for (const number of MONTHLY) {
    const value = month[number.kept.field];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    row[number.kept.field] = folded(
      existing ?? {},
      number,
      number.kept.field,
      value,
      months,
    );
  }
  if (Object.keys(months).length) row.months = months;
  table.put(row as never);
}

export interface OutputReading {
  readonly now: number;
  /** Last year's figure, or null where no year row holds one. */
  readonly before: number | null;
  /** The kept row the figure was read from, for dev mode's Trace. */
  readonly recordId: string;
  readonly beforeRecordId: string | null;
  /** The named inputs kept beside the figure. */
  readonly inputs: Readonly<Record<string, number | string>>;
}

/**
 * A year's sum or mean stands as "last year" only when the row was kept from
 * January: the world's first year opens on the game's start day in January,
 * and a row first written later in a year holds part of that year.
 */
const wholeYear = (row: OutputYearRow) => row.openedAt <= `${row.year}-01-31`;

function valueIn(
  row: OutputYearRow | undefined,
  number: OutputNumber,
): number | null {
  if (!row) return null;
  const value = row[number.kept!.field];
  if (typeof value === "number") return value;
  // A year the pre-start passes wrote holds only the figures they ran: an
  // event they did not run (notices served) is not known to have been none.
  if (row.closedAt && row.pastFields) return null;
  // A place whose year row is kept and saw no such event has had none.
  return number.fold === "sum" && number.cadence === "on-change" ? 0 : null;
}

/**
 * A kept figure for a place: this year's value (the latest month, or the
 * year so far) beside last year's, each a lookup of the place's year row by
 * its id. Last year is null unless that very year's row holds the figure.
 */
export function keptOutputNumber(
  core: CoreState,
  api: CoreAPI,
  id: string,
  placeId: string,
): OutputReading | null {
  const number = NUMBERS[id];
  if (!number?.kept || !core.modules.has(OUTPUT_NUMBERS_MODULE_ID)) return null;
  const table = years(api);
  const thisYear = yearOf(core.date);
  // Before a new year's first monthly step, the latest row is last year's.
  const row = (table.get(yearRowId(placeId, thisYear)) ??
    table.get(yearRowId(placeId, thisYear - 1))) as OutputYearRow | undefined;
  const now = valueIn(row, number);
  if (!row || now === null) return null;
  const last = table.get(yearRowId(placeId, row.year - 1)) as
    OutputYearRow | undefined;
  const before =
    last && (number.fold === "december" || wholeYear(last))
      ? valueIn(last, number)
      : null;
  const month =
    number.kept.table === "months" && row.monthRowId
      ? (api
          .moduleState(OUTPUT_NUMBERS_MODULE_ID)
          .table("months")
          .get(row.monthRowId) as Record<string, unknown> | undefined)
      : undefined;
  const inputs: Record<string, number | string> = { ...row.inputs?.[id] };
  for (const name of number.traceInputs) {
    const value = month?.[name];
    if (typeof value === "number" || typeof value === "string")
      inputs[name] = value;
  }
  return {
    now,
    before,
    recordId: row.id,
    beforeRecordId: before === null ? null : last!.id,
    inputs,
  };
}
