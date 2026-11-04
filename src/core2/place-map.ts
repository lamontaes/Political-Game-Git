/**
 * The one place map and its one reader. Every place (the country, a state,
 * D.C. or territory, a county area, a town) is one row of
 * `data/places/place-map.json`: its level, what it sits under, its name and
 * its form of government. Every system reads where a place is, what it sits
 * under and which laws, budget, offices and election calendar it has through
 * this module, never a lookup of its own.
 *
 * The slots are read from the files that already hold them, by level and
 * form, never by a place's name. A slot the files do not hold is `null`: the
 * caller reports it, and nothing fills it with a national number.
 */
import mapData from "./data/places/place-map.json" with { type: "json" };
import bodies from "./data/offices/bodies.json" with { type: "json" };
import fiscalYears from "./data/budgets/local-fiscal-years.json" with { type: "json" };
import stateBudgets from "../../data/research/money/government-budgets-2026.json" with { type: "json" };
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";
import { nextCountyElection } from "./gov-rules/county-election-calendar";
import { makeIsoDate } from "./kernel/dates";
import {
  coreStateKeyOfJurisdictionId,
  corePlaceByJurisdictionId,
} from "./place-lookup";
import {
  countyGovernmentUnit,
  municipioUnit,
} from "./reference/government-units";

export type PlaceLevel = "country" | "state" | "county" | "town";

export interface PlaceRow {
  readonly id: string;
  readonly level: PlaceLevel;
  readonly parentId: string | null;
  readonly name: string;
  /** The government the place has: nation, state, district, territory, county, municipality, township or none. */
  readonly form: string;
}

export interface PlaceSlots {
  /** The laws that bind the place, nearest first: itself, what it sits under, up to the country. */
  readonly laws: readonly string[];
  /** The fiscal year start (MM-DD) of the place's own government (a town's or county's is its state's most common for the type), or null where the files hold none. */
  readonly budget: { readonly fiscalYearStart: string } | null;
  /** The kind of lawmaking body row the place's offices are read from, or null. */
  readonly offices: { readonly bodyLevel: string } | null;
  /** How the place's elections are timed, or null where the files hold none. */
  readonly calendar: { readonly timing: string } | null;
}

let byId: ReadonlyMap<string, PlaceRow> | null = null;
let childrenOf: ReadonlyMap<string, readonly string[]> | null = null;

function load(): ReadonlyMap<string, PlaceRow> {
  if (byId) return byId;
  const rows = new Map<string, PlaceRow>();
  const kids = new Map<string, string[]>();
  for (const [id, level, parentId, name, form] of mapData.rows as [
    string,
    PlaceLevel,
    string | null,
    string,
    string,
  ][]) {
    rows.set(id, { id, level, parentId, name, form });
    if (parentId !== null) {
      const list = kids.get(parentId);
      if (list) list.push(id);
      else kids.set(parentId, [id]);
    }
  }
  childrenOf = kids;
  byId = rows;
  return rows;
}

/** Every place, country first, then states, counties and towns. */
export function allPlaces(): readonly PlaceRow[] {
  return [...load().values()];
}

/** One place by its id (a town's key, `county:<geoid>`, `US-<usps>` or `US`). */
export function placeRow(id: string): PlaceRow | null {
  return load().get(id) ?? null;
}

/** The places that sit directly under one place. */
export function placesUnder(id: string): readonly PlaceRow[] {
  load();
  return (childrenOf!.get(id) ?? []).map((child) => load().get(child)!);
}

/** What a place sits under, or null for the country. */
export function placeParent(id: string): PlaceRow | null {
  const parent = placeRow(id)?.parentId;
  return parent ? placeRow(parent) : null;
}

/** The place itself, then each place above it, up to the country. */
export function placeChain(id: string): readonly PlaceRow[] {
  const chain: PlaceRow[] = [];
  for (let row = placeRow(id); row; row = placeParent(row.id)) chain.push(row);
  return chain;
}

/** The state (or D.C. or territory) a place is in, as its row. */
export function placeState(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.level === "state") ?? null;
}

/**
 * The jurisdiction key ("US-GA") of the state a place is in, for any way the
 * game names a place: a town's key, a county id, a state's own key, or a
 * recorded jurisdiction id. Null where the place is in no state.
 */
export function placeStateKey(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const row = placeRow(ref);
  if (row) return placeState(ref)?.id ?? null;
  return (
    corePlaceByJurisdictionId(ref as never)?.stateJurisdictionKey ??
    coreStateKeyOfJurisdictionId(ref)
  );
}

/** The county area a place sits in, or null where the map holds none. */
export function placeCounty(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.level === "county") ?? null;
}

/**
 * The nearest row (the place itself or one above it) that has a government.
 * A place with no government of its own is governed by the row it sits under.
 */
export function governingPlace(id: string): PlaceRow | null {
  return placeChain(id).find((row) => row.form !== "none") ?? null;
}

const LOCAL_TYPE: Readonly<Record<string, string>> = {
  county: "county",
  municipality: "municipal",
  township: "township",
};
const BODY_LEVEL: Readonly<Record<string, string>> = {
  nation: "federal",
  county: "county",
  municipality: "city",
  township: "city",
};
const TIMING_DATE = makeIsoDate("2026-01-05");

function fiscalYearStart(row: PlaceRow, state: PlaceRow | null): string | null {
  if (row.level === "country") return "10-01";
  if (row.level === "state") {
    const own = (
      stateBudgets.places as Record<
        string,
        { fiscalYear?: { startsOn: string } }
      >
    )[row.id];
    return own?.fiscalYear?.startsOn ?? null;
  }
  const type = LOCAL_TYPE[row.form];
  const units = state
    ? ((
        fiscalYears.states as unknown as Record<
          string,
          Record<string, { end: string }[]>
        >
      )[state.id]?.[type ?? ""] ?? [])
    : [];
  if (units.length === 0) return null;
  // The state's most common year end for the type; the budget engine picks the
  // sampled unit nearest a place's population from the same rows.
  const counts = new Map<string, number>();
  for (const unit of units)
    counts.set(unit.end, (counts.get(unit.end) ?? 0) + 1);
  const end = [...counts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]![0];
  const next = new Date(
    Date.UTC(2023, Number(end.slice(0, 2)) - 1, Number(end.slice(2, 4)) + 1),
  );
  return next.toISOString().slice(5, 10);
}

function electionTiming(row: PlaceRow, state: PlaceRow | null): string | null {
  if (row.level === "country" || row.level === "state")
    return "november-general";
  if (row.level === "county") {
    const unit =
      countyGovernmentUnit(row.id.slice("county:".length)) ??
      municipioUnit(row.id.slice("county:".length));
    if (!unit) return null;
    const read = nextCountyElection(unit, TIMING_DATE);
    return read.status === "read" ? "county-calendar" : null;
  }
  if (!state) return null;
  return (
    resolveMunicipalElectionTiming(state.id.slice("US-".length), row.id)
      ?.timing ?? null
  );
}

/**
 * The four slots every place has: laws, budget, offices and election calendar.
 * A place with no government of its own reads the budget, offices and calendar
 * of the row that governs it. A slot the files do not hold is null.
 */
export function placeSlots(id: string): PlaceSlots | null {
  const row = placeRow(id);
  if (!row) return null;
  const governing = governingPlace(id);
  const state = placeState(id);
  const own = governing ?? row;
  const bodyLevel =
    own.level === "state" ? "state" : (BODY_LEVEL[own.form] ?? null);
  return {
    laws: placeChain(id).map((link) => link.id),
    budget: (() => {
      const start = fiscalYearStart(own, state);
      return start ? { fiscalYearStart: start } : null;
    })(),
    offices:
      bodyLevel &&
      (bodies.bodies as { level: string }[]).some((b) => b.level === bodyLevel)
        ? { bodyLevel }
        : null,
    calendar: (() => {
      const timing = governing ? electionTiming(own, state) : null;
      return timing ? { timing } : null;
    })(),
  };
}
