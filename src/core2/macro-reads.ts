/** The national economy's front door for reads: the months the country has kept, the latest of them, each state's tier row and the central bank's seats. Each function answers one question; none returns a table. */
import type { CountryState } from "./country-model";
import type { MacroMonth } from "./macro-model";
import { MACRO_MODULE_ID } from "./modules/macro";
import type { CoreAPI, CoreState } from "./types";

function store(api: CoreAPI) {
  return api.moduleState(MACRO_MODULE_ID);
}

/** Whether this world keeps a national economy. */
export function macroKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(MACRO_MODULE_ID);
}

/** The latest month the economy has kept (`YYYY-MM`), or none before it has one. */
export function latestMacroMonthId(api: CoreAPI): string | undefined {
  if (!macroKept(api)) return undefined;
  return (
    store(api).table("state").get("macro:state") as
      { latestMonth?: string } | undefined
  )?.latestMonth;
}

/** The economy's month (`YYYY-MM`), from real history before the opening and the simulation since. */
export function macroMonthAt(
  api: CoreAPI,
  month: string,
): MacroMonth | undefined {
  if (!macroKept(api)) return undefined;
  return store(api).table("months").get(`macro-month:${month}`) as unknown as
    MacroMonth | undefined;
}

/** The economy's latest kept month. */
export function latestMacroMonth(api: CoreAPI): MacroMonth | undefined {
  const latest = latestMacroMonthId(api);
  return latest === undefined ? undefined : macroMonthAt(api, latest);
}

/** Every month the economy has kept, history and simulated. */
export function allMacroMonths(api: CoreAPI): readonly MacroMonth[] {
  if (!macroKept(api)) return [];
  return store(api).table("months").rows() as unknown as MacroMonth[];
}

/** How many months the economy has kept. */
export function macroMonthCount(api: CoreAPI): number {
  return macroKept(api) ? store(api).table("months").size : 0;
}

/** One state's tier row by its key (for example `US-MO`). */
export function countryStateByKey(
  api: CoreAPI,
  key: string,
): CountryState | undefined {
  if (!macroKept(api)) return undefined;
  return store(api).table("countryStates").get(`country-state:${key}`) as
    CountryState | undefined;
}

/** Every state's tier row. */
export function allCountryStates(api: CoreAPI): readonly CountryState[] {
  if (!macroKept(api)) return [];
  return store(api).table("countryStates").rows() as unknown as CountryState[];
}

/** A seat on the central bank's board, as far as other engines read it (the board's own rows hold more). */
export interface BoardSeatRead {
  readonly personId: string;
  readonly seatKind: "governor" | "president";
}

/** The central bank's seat held by a person, if they hold one. */
export function boardSeatOf(
  api: CoreAPI,
  personId: string,
): BoardSeatRead | undefined {
  if (!macroKept(api)) return undefined;
  return (
    store(api)
      .table("members")
      .query("all", [true]) as unknown as BoardSeatRead[]
  ).find((row) => row.personId === personId);
}

/** One rate meeting by its record id. */
export function rateMeetingOf(
  api: CoreAPI,
  meetingId: string,
): { fromRatePct: number; toRatePct: number } | undefined {
  if (!macroKept(api)) return undefined;
  return store(api).table("meetings").get(meetingId) as unknown as
    { fromRatePct: number; toRatePct: number } | undefined;
}
