/**
 * The four slots every place has: laws, budget, offices and election calendar,
 * read from the files that already hold them, by level and form, never by a
 * place's name. A slot the files do not hold is `null`: the caller reports it,
 * and nothing fills it with a national number.
 */
import bodies from "../data/offices/bodies.json" with { type: "json" };
import fiscalYears from "../data/budgets/local-fiscal-years.json" with { type: "json" };
import stateBudgets from "../../../data/research/money/government-budgets-2026.json" with { type: "json" };
import { makeIsoDate } from "../kernel/dates";
import {
  countyGovernmentUnit,
  municipioUnit,
} from "../reference/government-units";
import {
  governingPlace,
  placeChain,
  placeRow,
  placeState,
  type PlaceRow,
} from "../place-map";
import { resolveMunicipalElectionTiming } from "./municipal-ballot-rules";
import { nextCountyElection } from "./county-election-calendar";

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
