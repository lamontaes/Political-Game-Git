/**
 * Reading a registered output number (src/core2/output-numbers.ts) for a
 * place: the kept year row where world-metrics keeps the figure, or the
 * owning engine's own dated record where that engine keeps the rows itself
 * (the nation's months, the state's regional months, the budgets' fiscal
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
import { regionOfPlace } from "./modules/regional";
import { townJobsPanel } from "./modules/world-panels";
import {
  keptOutputNumber,
  outputNumber,
  type OutputReading,
} from "./output-numbers";
import {
  openingRegionMonths,
  stateFigures,
  type RegionMonth,
} from "./regional-model";
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
const MONTHS_BACK = 3;

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
 * The state the town is in, this month and a year before, from the regional
 * engine's kept months (the last twelve and each December; for a month of
 * the world's history before its first step, the engine's own opening
 * function): jobs summed, unemployment and pay weighted by population, the
 * one function the engine uses. SG-SCREENS-metrics-no-prior-year: a month
 * the engine kept no row for has no figure. Build order
 * metrics-state-figures-one-owner moves these to the country tier.
 */
function stateMonths(reads: OutputReads) {
  return once(reads, "regional", () => {
    const { core, api, placeId } = reads;
    const months = nationMonths(reads);
    if (!months || !core.modules.has("regional")) return null;
    const regional = api.moduleState("regional");
    const at = (row: Readonly<MacroMonth>): RegionMonth[] => {
      const stored = regional
        .table("months")
        .query("byMonth", [row.month]) as unknown as RegionMonth[];
      if (stored.length) return stored;
      return row.kind === "history"
        ? openingRegionMonths(row, core.startedAt, core.seed, (key) =>
            api.parameter(key),
          )
        : [];
    };
    const now = at(months.now);
    const regionId = regionOfPlace(placeId);
    const fips = now.find((row) => row.regionId === regionId)?.stateFips;
    if (!fips) return null;
    const before = months.before ? at(months.before) : [];
    const figures = (rows: readonly RegionMonth[]) => {
      const state = stateFigures(rows, fips);
      return { ...state, jobs: state.jobsThousands * 1000 };
    };
    return {
      now: figures(now),
      before: before.some((row) => row.stateFips === fips)
        ? figures(before)
        : null,
      recordId: `${regionId}:${months.now.month}`,
      beforeRecordId: months.before
        ? `${regionId}:${months.before.month}`
        : null,
    };
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

/** The town's labor market today as the jobs engine counts it (build order metrics-town-jobs-one-rule keeps it monthly). */
const townJobs = (reads: OutputReads) =>
  once(reads, "jobs", () =>
    reads.core.modules.has("jobs")
      ? townJobsPanel(reads.api, reads.placeId)
      : null,
  );

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
  "regional-state": (reads, field) => {
    const state = stateMonths(reads);
    const key = field as "unemploymentPct" | "hourlyEarnings" | "jobs";
    return state
      ? reading(
          state.now[key],
          state.before?.[key],
          state.recordId,
          state.beforeRecordId,
        )
      : null;
  },
  "town-jobs": (reads, field) => {
    const jobs = townJobs(reads);
    return jobs
      ? reading(
          jobs[field as "employed" | "seekers" | "openPositions"],
          null,
          `jobs:${reads.placeId}`,
          null,
          {
            employed: jobs.employed,
            seekers: jobs.seekers,
            laborForce: jobs.employed + jobs.seekers,
          },
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

/** A registered figure for the place, this year beside last, or null where its owner holds none. */
export function readOutputNumber(reads: OutputReads, id: string): Reading {
  const number = outputNumber(id);
  if (!number) throw new Error(`No output number "${id}".`);
  if (number.kept)
    return keptOutputNumber(reads.core, reads.api, id, reads.placeId);
  const [name, field] = (number.reader ?? "").split(":") as [string, string];
  return READERS[name]?.(reads, field) ?? null;
}
