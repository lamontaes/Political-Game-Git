/** The national economy's front door for reads: the months the country has kept, the latest of them, each state's tier row and the central bank's seats. Each function answers one question; none returns a table. */
import type { CountryState } from "./country-model";
import type { MacroMonth } from "./macro-model";
import type { CoreAPI, CoreState } from "./types";
import { default as macroParameters } from "./data/macro/parameters.json";
import { default as countryParameters } from "./data/country/parameters.json";
import type { Parameter } from "./parameters";
import {
  type NationFigures,
  type MacroParameter,
  checkBands,
} from "./macro-model";

/** The module's id, written here (the engine's own file names the same string) so a door reads the table without loading the engine. A door that named the wrong table fails `economy-reads.test.ts`, which reads each door in a played world. */
const MACRO_MODULE_ID = "macro";

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

/** The national economy's numbers: the central bank's and the published past's, and the country tier's (data/country). */
export const MACRO_PARAMETERS = {
  ...macroParameters,
  ...countryParameters,
} as unknown as Readonly<Record<string, Parameter>>;

export const STATE_ID = "macro:state";

export interface MacroStateRow {
  id: string;
  openedAt: string;
  openingMonth: string;
  latestMonth: string;
  /** Target-range midpoint in force. */
  policyRatePct: number;
  placeIds: string[];
  /** The states' sums at the opening: the national figures since are the opening month's times how far these have moved. */
  countryBase: NationFigures;
}

export function params(api: CoreAPI): MacroParameter {
  return (key) => api.parameter(key);
}

export function readState(api: CoreAPI): MacroStateRow | undefined {
  return store(api).table("state").get(STATE_ID) as MacroStateRow | undefined;
}

/**
 * The country some years on if nothing else changes: a copy of every state's counts, stepped by
 * the same month the game steps (`stepCountry`, `countryMacroMonth`) under the law in force
 * today, with today's board meeting on its own calendar and each member voting by the rule they
 * vote by in play. Read-only: it writes no record and moves no date, so it is what the tier
 * would do, not what the town will (the town and county held in full stay as they are today).
 */
/** Whether the national economy has opened: it opens on the game's first day, and there is no outlook before it. */
export function countryOpened(api: CoreAPI): boolean {
  // A world built without the economy (the law-reach tests' small worlds) has no tier: the same
  // test the outside-money reader makes. The game's worlds always install it (modules/world.ts).
  return (
    (api.state as CoreState).modules.has(MACRO_MODULE_ID) &&
    readState(api) !== undefined
  );
}

/** What the bench's national panel shows: each month against its band, each meeting with every vote's reasons. Read-only. */
export function nationalPanel(api: CoreAPI) {
  const snap = store(api).snapshot();
  const months = snap.tables.months as unknown as MacroMonth[];
  const votes = snap.tables.votes as unknown as { meetingId: string }[];
  return {
    months,
    bands: checkBands(months, params(api)),
    meetings: (snap.tables.meetings as unknown as { id: string }[]).map(
      (meeting) => ({
        ...meeting,
        votes: votes.filter((vote) => vote.meetingId === meeting.id),
      }),
    ),
    members: snap.tables.members,
    repricings: snap.tables.repricings,
  };
}
