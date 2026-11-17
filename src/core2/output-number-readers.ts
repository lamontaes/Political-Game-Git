/**
 * Reading a registered output number (src/core2/output-numbers.ts) for a
 * place: the kept year row where world-metrics keeps the figure, or the
 * owning engine's own dated record where that engine keeps the rows itself
 * (the nation's months, the country tier's state months, the budgets' fiscal
 * years, the jobs engine's live records). One read
 * per figure, each a lookup; a screen words what comes back and counts
 * nothing. A figure the owner holds no value for reads null, and so does a
 * last year no record holds.
 */
import {
  historyMonths,
  monthKey,
  shiftMonth,
  type MacroMonth,
} from "./macro-model";
import { budgetsOf, governments, type GovernmentRow } from "./modules/budgets";
import {
  countryStateMonth,
  openingStateMonth,
  type CountryStateMonth,
} from "./modules/macro";
import { LATEST_MONTH_LAG, regionOfPlace } from "./modules/regional";
import {
  keptOutputHistory,
  keptOutputNumber,
  outputNumber,
  type OutputHistoryPoint,
  type OutputReading,
} from "./output-numbers";
import { REGIONS } from "./regional-model";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

type Reading = OutputReading | null;

/** What one screen's reads share, so an engine's record is read once for all its figures. */
export interface OutputReads {
  readonly core: CoreState;
  readonly api: CoreAPI;
  readonly placeId: string;
  readonly memo: Map<string, unknown>;
}

export function outputReads(core: CoreState, placeId: string): OutputReads {
  return { core, api: coreAPI(core), placeId, memo: new Map() };
}

function once<T>(reads: OutputReads, key: string, make: () => T): T {
  if (!reads.memo.has(key)) reads.memo.set(key, make());
  return reads.memo.get(key) as T;
}

const reading = (
  now: number,
  before: number | null | undefined,
  recordId: string,
  beforeRecordId: string | null | undefined,
  inputs: Readonly<Record<string, number | string>> = {},
): OutputReading => ({
  now,
  before: before ?? null,
  recordId,
  beforeRecordId: before == null ? null : (beforeRecordId ?? null),
  inputs,
});

/** How many months back the latest recorded month can sit (the macro engine records a month once it has ended). */
const MONTHS_BACK = LATEST_MONTH_LAG;

/**
 * The nation's latest month and the same month a year before: the macro
 * engine's recorded rows, each fetched by its id. Before the engine's first
 * day it has recorded nothing, and the months are the ones it opens from
 * (`historyMonths`, the rows its first day writes), so the opening day reads
 * what day two will.
 */
function nationMonths(reads: OutputReads) {
  return once(reads, "macro", () => {
    const { core, api } = reads;
    const p = (key: string) => api.parameter(key);
    const yearBack = (month: string) =>
      shiftMonth(month, -p("macroMonthsPerYear"), p);
    const table = core.modules.has("macro")
      ? api.moduleState("macro").table("months")
      : undefined;
    const recorded = (month: string) =>
      table?.get(`macro-month:${month}`) as unknown as MacroMonth | undefined;
    for (let back = 0; back <= MONTHS_BACK; back += 1) {
      const now = recorded(shiftMonth(monthKey(core.date), -back, p));
      if (now) return { now, before: recorded(yearBack(now.month)) };
    }
    if (table?.rows().length) return null;
    const opening = historyMonths(core.startedAt, core.seed, p);
    const now = opening
      .filter((row) => row.month <= monthKey(core.date))
      .sort((a, b) => a.month.localeCompare(b.month))
      .at(-1);
    return now
      ? {
          now,
          before: opening.find((row) => row.month === yearBack(now.month)),
        }
      : null;
  });
}

/**
 * The state the town is in, this month and a year before, from the country
 * tier's kept months for that state (the tier holds every state's people,
 * jobs, pay and prices once; the town's regions are its place inside the
 * state, never the state). Before the tier's first day it reads the tier's opening.
 */
function stateMonths(reads: OutputReads) {
  return once(reads, "country-state", () => {
    const { core, api, placeId } = reads;
    const months = nationMonths(reads);
    if (!months || !core.modules.has("macro")) return null;
    const regionId = regionOfPlace(placeId);
    const fips = REGIONS.find((region) => region.id === regionId)?.stateFips;
    if (!fips) return null;
    // Before the tier's first day it has kept nothing, and the state reads from the tier's own opening.
    const now =
      countryStateMonth(api, fips, months.now.month) ??
      (api.moduleState("macro").table("months").rows().length
        ? null
        : openingStateMonth(api, months.now, fips));
    if (!now) return null;
    const before = months.before
      ? countryStateMonth(api, fips, months.before.month)
      : null;
    return { now, before, fips };
  });
}

/**
 * The played town's own government: the city, township or county whose
 * jurisdiction is the place. A county beside a city carries the county's own
 * jurisdiction, so it is never picked for a town that has a city; a town with
 * no city government is run by its county, which then carries the town's
 * jurisdiction, and a screen names that government as the county it is.
 * Never another town's.
 */
export function townGovernment(
  api: CoreAPI,
  placeId: string,
): GovernmentRow | undefined {
  if (!(api.state as CoreState).modules.has("core2-budgets-v1"))
    return undefined;
  const local = governments(api).filter(
    (row) => row.jurisdictionId === placeId,
  );
  return (
    local.find((row) => row.level === "city") ??
    local.find((row) => row.level === "county")
  );
}

/** The town government's budget in force and the fiscal year before it, each line summed. */
function townBudget(reads: OutputReads) {
  return once(reads, "budget", () => {
    const gov = townGovernment(reads.api, reads.placeId);
    if (!gov) return null;
    const years = [...budgetsOf(reads.api, gov.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    );
    const latest = years[0];
    if (!latest) return null;
    // Last year is the fiscal year just before, and only that one.
    const prior =
      years[1]?.fiscalYear === latest.fiscalYear - 1 ? years[1] : undefined;
    const sum = (lines: Readonly<Record<string, number>>) =>
      Object.values(lines).reduce((total, minor) => total + minor, 0);
    const figures = (row: typeof latest) => ({
      revenueMinor: sum(row.revenueMinor),
      spendingMinor: sum(row.spendingMinor),
    });
    return {
      now: figures(latest),
      before: prior ? figures(prior) : null,
      recordId: latest.id,
      beforeRecordId: prior?.id ?? null,
      fiscalYear: latest.fiscalYear,
      government: gov.name,
      governmentId: gov.id,
    };
  });
}

const READERS: Readonly<
  Record<string, (reads: OutputReads, field: string) => Reading>
> = {
  "macro-month": (reads, field) => {
    const months = nationMonths(reads);
    const now = months?.now[field as keyof MacroMonth];
    const before = months?.before?.[field as keyof MacroMonth];
    return typeof now === "number"
      ? reading(
          now,
          typeof before === "number" ? before : null,
          months!.now.id,
          months!.before?.id,
        )
      : null;
  },
  "country-state": (reads, field) => {
    const state = stateMonths(reads);
    const key = field as "unemploymentPct" | "hourlyPay" | "jobs";
    return state
      ? reading(
          state.now[key],
          state.before?.[key],
          state.now.id,
          state.before?.id,
          stateInputs(state.now, key),
        )
      : null;
  },
  "town-budget": (reads, field) => {
    const budget = townBudget(reads);
    const key = field as "revenueMinor" | "spendingMinor";
    return budget
      ? reading(
          budget.now[key],
          budget.before?.[key],
          budget.recordId,
          budget.beforeRecordId,
          {
            fiscalYear: budget.fiscalYear,
            government: budget.government,
            governmentId: budget.governmentId,
          },
        )
      : null;
  },
};

/** What a state's month figure is out of, as the month row keeps it (the rate's people at work and looking). */
function stateInputs(
  row: CountryStateMonth,
  key: "unemploymentPct" | "hourlyPay" | "jobs",
): Record<string, number> {
  if (key !== "unemploymentPct") return {};
  return typeof row.workers === "number" && typeof row.seekers === "number"
    ? { workers: row.workers, seekers: row.seekers }
    : {};
}

/**
 * A registered figure's history for the place, oldest first, at most `limit`
 * points, each with the record it was read from: the kept months or years
 * world-metrics holds, or the owning engine's own dated rows (the nation's
 * months, the state's months in the country tier, the town's budgets by
 * fiscal year). Each point is a lookup by id; nothing is scanned. Dev mode's
 * figure trace reads it; no screen counts from it.
 */
export function outputNumberHistory(
  reads: OutputReads,
  id: string,
  limit = 24,
): OutputHistoryPoint[] {
  const number = outputNumber(id);
  if (!number) throw new Error(`No output number "${id}".`);
  if (number.kept)
    return keptOutputHistory(reads.core, reads.api, id, reads.placeId, limit);
  const [name, field] = (number.reader ?? "").split(":") as [string, string];
  const { core, api } = reads;
  const p = (key: string) => api.parameter(key);
  const latest = nationMonths(reads)?.now.month;
  const monthsBack = (count: number) =>
    latest
      ? Array.from({ length: count }, (_, i) =>
          shiftMonth(latest, -(count - 1 - i), p),
        )
      : [];
  if (name === "macro-month") {
    if (!core.modules.has("macro")) return [];
    const table = api.moduleState("macro").table("months");
    return monthsBack(limit).flatMap((month) => {
      const row = table.get(`macro-month:${month}`) as unknown as
        MacroMonth | undefined;
      const value = row?.[field as keyof MacroMonth];
      return row && typeof value === "number"
        ? [{ date: month, value, recordId: row.id }]
        : [];
    });
  }
  if (name === "country-state") {
    const state = stateMonths(reads);
    if (!state) return [];
    const key = field as "unemploymentPct" | "hourlyPay" | "jobs";
    return monthsBack(limit).flatMap((month) => {
      const row = countryStateMonth(api, state.fips, month);
      if (!row) return [];
      const inputs = stateInputs(row, key);
      return [
        {
          date: month,
          value: row[key],
          recordId: row.id,
          ...(Object.keys(inputs).length ? { inputs } : {}),
        },
      ];
    });
  }
  if (name === "town-budget") {
    const gov = townGovernment(api, reads.placeId);
    if (!gov) return [];
    const key = field as "revenueMinor" | "spendingMinor";
    return [...budgetsOf(api, gov.id)]
      .sort((a, b) => a.fiscalYear - b.fiscalYear)
      .slice(-limit)
      .map((row) => ({
        date: String(row.fiscalYear),
        value: Object.values(row[key]).reduce((n, v) => n + v, 0),
        recordId: row.id,
        inputs: { fiscalYear: row.fiscalYear },
      }));
  }
  return [];
}

/** A registered figure for the place, this year beside last, or null where its owner holds none. */
export function readOutputNumber(reads: OutputReads, id: string): Reading {
  const number = outputNumber(id);
  if (!number) throw new Error(`No output number "${id}".`);
  if (number.kept)
    return keptOutputNumber(reads.core, reads.api, id, reads.placeId);
  const [name, field] = (number.reader ?? "").split(":") as [string, string];
  return READERS[name]?.(reads, field) ?? null;
}
