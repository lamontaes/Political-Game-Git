/**
 * The country's opinion of its president (Nation, Nov 8, 2026). On the third
 * of each month one row says what share of adults approve of the sitting
 * president and why: a slow base that follows the economy the Money engine
 * runs (the year's change in unemployment and inflation, read from the
 * macro months) and a fast part that is the sum of the decaying pushes other
 * engines write (a disaster handled, a scandal, a crisis). Nothing is
 * rolled and nothing flips at a threshold. The race engine reads the latest
 * row for the president's party (electorate-inputs.ts); a row cites the macro
 * months and the pushes it was built from.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import data from "../data/electorate/national-opinion.json";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";

export const NATIONAL_OPINION_MODULE_ID = "national-opinion";
const RUN_KIND = "national-opinion";

const PARAMS = (
  data as unknown as { parameters: Record<string, { value: number }> }
).parameters;

/** One number from the opinion table. */
export function opinionParameter(key: string): number {
  const row = PARAMS[key];
  if (!row) throw new Error(`Unknown opinion parameter: ${key}`);
  return row.value;
}

export interface ApprovalRow {
  readonly id: string;
  readonly month: string;
  /** Percent of adults who approve. */
  readonly pct: number;
  readonly basePct: number;
  readonly pushPct: number;
  /** What the economy alone pulls the base toward, in points from the mean. */
  readonly economyPull: number;
  readonly unemploymentChange: number;
  readonly inflationChange: number;
  /** The macro month rows and pushes this row was built from. */
  readonly sourceRecordIds: readonly string[];
}

/** An outside engine's push on opinion: points at its month, fading by half-life. */
export interface OpinionPush {
  readonly id: string;
  readonly month: string;
  readonly points: number;
  readonly halfLifeMonths: number;
  readonly kind: string;
  readonly sourceId: string;
}

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(NATIONAL_OPINION_MODULE_ID).table(name);

/** Record an engine's push on national opinion (disaster, scandal, crisis). */
export function pushOpinion(
  api: CoreAPI,
  push: Omit<OpinionPush, "id" | "month"> & { month?: string },
): void {
  if (!(api.state as CoreState).modules.has(NATIONAL_OPINION_MODULE_ID)) return;
  const month = push.month ?? monthOf(api.state.date);
  table(api, "pushes").put({
    ...push,
    month,
    id: `opinion-push:${push.kind}:${push.sourceId}`,
  } as unknown as { id: string });
}

/** The latest approval row, or undefined where the module is not installed or has not run. */
export function latestApproval(api: CoreAPI): ApprovalRow | undefined {
  if (!(api.state as CoreState).modules.has(NATIONAL_OPINION_MODULE_ID))
    return undefined;
  const rows = table(api, "approval").rows() as unknown as ApprovalRow[];
  let best: ApprovalRow | undefined;
  for (const row of rows) if (!best || row.month > best.month) best = row;
  return best;
}

/** The latest approval against the long-run mean, in points (0 before any row). */
export function approvalGapPoints(api: CoreAPI): number {
  const row = latestApproval(api);
  return row ? row.pct - opinionParameter("longRunMeanPct") : 0;
}

function macroRow(api: CoreAPI, month: string) {
  return api.moduleState("macro").table("months").get(`macro-month:${month}`) as
    | { unemploymentPct: number; inflationPct: number }
    | undefined;
}

function monthlyRun(api: CoreAPI): void {
  const month = monthOf(api.state.date);
  const rows = table(api, "approval");
  const previous = latestApproval(api);
  const mean = opinionParameter("longRunMeanPct");
  const macro = (api.state as CoreState).modules.has("macro");
  const macroState = macro
    ? (api
        .moduleState("macro")
        .table("state")
        .get("macro:state") as unknown as { latestMonth: string } | undefined)
    : undefined;
  const now = macroState ? macroRow(api, macroState.latestMonth) : undefined;
  const year = macroState
    ? macroRow(api, shiftMonth(macroState.latestMonth, -12))
    : undefined;
  const sources: string[] = [];
  let unemploymentChange = 0;
  let inflationChange = 0;
  if (now && year && macroState) {
    unemploymentChange = now.unemploymentPct - year.unemploymentPct;
    inflationChange = now.inflationPct - year.inflationPct;
    sources.push(
      `macro-month:${macroState.latestMonth}`,
      `macro-month:${shiftMonth(macroState.latestMonth, -12)}`,
    );
  }
  const economyPull =
    -(
      opinionParameter("pointsPerUnemploymentPoint") * unemploymentChange +
      opinionParameter("pointsPerInflationPoint") * inflationChange
    );
  const persistence = opinionParameter("monthlyPersistence");
  const lastBase = previous?.basePct ?? opinionParameter("openingPct");
  const basePct =
    mean + persistence * (lastBase - mean) + (1 - persistence) * economyPull;
  let pushPct = 0;
  for (const push of table(api, "pushes").rows() as unknown as OpinionPush[]) {
    const age = monthIndex(month) - monthIndex(push.month);
    if (age < 0) continue;
    pushPct += push.points * 0.5 ** (age / push.halfLifeMonths);
    sources.push(push.id);
  }
  const row: ApprovalRow = {
    id: `approval:${month}`,
    month,
    pct: Math.max(0, Math.min(100, basePct + pushPct)),
    basePct,
    pushPct,
    economyPull,
    unemploymentChange,
    inflationChange,
    sourceRecordIds: sources,
  };
  rows.put(row as unknown as { id: string });
}

const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return y * 12 + (m - 1);
};

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-03";
  api.moduleCalendar(NATIONAL_OPINION_MODULE_ID).schedule({
    key: `${RUN_KIND}:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "The macro months and the pushes other engines wrote.",
    },
    sourceRecordIds: ["national-opinion:state"],
  });
}

export const NATIONAL_OPINION_MODULE: CoreModule = {
  id: NATIONAL_OPINION_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { state: {}, approval: {}, pushes: {} },
  },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    monthlyRun(api);
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (state.get("national-opinion:state")) return;
    state.put({ id: "national-opinion:state", openedAt: api.state.date });
    monthlyRun(api);
    schedule(api);
  },
};

/** Install the engine in a world (after the macro module). */
export function openNationalOpinion(core: CoreState): void {
  if (!core.modules.has(NATIONAL_OPINION_MODULE_ID))
    registerModule(core, NATIONAL_OPINION_MODULE);
}
