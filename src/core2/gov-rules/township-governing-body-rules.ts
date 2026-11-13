/**
 * Ported from the old engine's `nationwide-world/township-governing-body-rules.ts`.
 */
import readings from "../../../data/research/local-government/township-governing-bodies.json" with { type: "json" };
import charters from "../../../data/research/local-government/town-charters.json" with { type: "json" };
import placeTowns from "../../../data/research/money/place-towns-acs-2024.json" with { type: "json" };
import {
  governmentUnitStates,
  governmentUnitsForState,
} from "../reference/government-units";
import type { GovernmentUnitIdentity } from "../reference/government-units";
import {
  countyGoverningBodyRules,
  type CountyGoverningBodyRules,
} from "./county-governing-body-rules";

/**
 * TOWN AND TOWNSHIP GOVERNING BODIES (Build 25, CTO ruling of September 29,
 * 7:55 a.m.: local councils pass local law in small towns too).
 *
 * A census-designated place inside a New England town, a New York town, or a
 * New Jersey, Pennsylvania or Midwest township has no government of its own.
 * Its local government is the town or township it lies in, which the Census
 * Bureau's 2025 Government Units listing carries as a township whose place
 * code is the town's county subdivision code. Which town holds most of a
 * place's residents is read from the ACS 2020-2024 county subdivision parts
 * (scripts/research/export-acs-place-towns.py).
 *
 * The board's size is read the way a county board's is: the state statute
 * where it has been read (data/research/local-government/
 * township-governing-bodies.json, each with its citation), and otherwise the
 * most common size among the states read, ESTIMATED FROM AVERAGE. A town that
 * enlarged its board by its own vote or charter is not read yet.
 */

interface StateReading {
  readonly seats?: number;
  readonly bands?: readonly {
    readonly atLeast: number;
    readonly seats: number;
  }[];
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly citation: string;
  readonly url: string;
  /** How long a member serves and whether the seats take turns, from statute. */
  readonly term?: TownshipBoardTerm;
}

/**
 * A town or township board member's term: its years, and whether the seats
 * are staggered (a share of the board up at each regular election, as in
 * Vermont's one selectboard member a year) or all elected together (a "vote
 * for N" race, as in Wisconsin's town board).
 */
export interface TownshipBoardTerm {
  readonly years: number;
  readonly staggered: boolean;
  readonly basis: "read" | "estimated";
  readonly citation: string;
  readonly url: string;
}

interface TownCharter {
  readonly seats: number;
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly chiefTitle: string | null;
  readonly chiefPresidesOverBody: boolean;
  /** How sure the reading is: a charter or town page (high), a summary of one (medium). */
  readonly confidence?: string;
  readonly citation: string;
  readonly url: string;
}

/** Towns whose own charter sets their body, by county subdivision code. */
const CHARTERS = charters.towns as Readonly<Record<string, TownCharter>>;

const STATES = readings.states as Readonly<Record<string, StateReading>>;
const AVERAGE = readings.nationalAverage as StateReading & {
  readonly seats: number;
  readonly term: TownshipBoardTerm;
};

/** Each place's residents by county subdivision, largest first. */
const PLACE_TOWNS = placeTowns.placeTowns as unknown as Readonly<
  Record<string, readonly (readonly [string, number])[]>
>;
/** Each county subdivision's residents, by its ten-digit code. */
const TOWN_POPULATION = placeTowns.townPopulation as Readonly<
  Record<string, number>
>;

/** The county subdivision code a township's listing entry names. */
function subdivisionCode(unit: GovernmentUnitIdentity): string | null {
  return unit.unitType === "township" &&
    unit.countyGeoid &&
    unit.publisherPlaceCode
    ? `${unit.countyGeoid}${unit.publisherPlaceCode}`
    : null;
}

let bySubdivision: ReadonlyMap<string, GovernmentUnitIdentity> | null = null;

function townshipBySubdivision(code: string): GovernmentUnitIdentity | null {
  if (!bySubdivision) {
    const map = new Map<string, GovernmentUnitIdentity>();
    for (const state of governmentUnitStates())
      for (const unit of governmentUnitsForState(state)) {
        const key = subdivisionCode(unit);
        if (key && unit.functionalActive) map.set(key, unit);
      }
    bySubdivision = map;
  }
  return bySubdivision.get(code) ?? null;
}

/**
 * The town or township governments a place with no government of its own
 * lies in, the one holding most of its residents first. Empty where the
 * place lies in no town the listing files as a government.
 */
export function townshipGovernmentUnitsForPlace(
  placeGeoid: string,
): readonly GovernmentUnitIdentity[] {
  const seen = new Set<string>();
  const out: GovernmentUnitIdentity[] = [];
  for (const [code] of PLACE_TOWNS[placeGeoid] ?? []) {
    const unit = townshipBySubdivision(code);
    if (unit && !seen.has(unit.id)) {
      seen.add(unit.id);
      out.push(unit);
    }
  }
  return out;
}

/** The board that governs one town or township, at the size its law sets. */
export function townshipGoverningBodyRules(
  unit: GovernmentUnitIdentity,
): CountyGoverningBodyRules | null {
  if (unit.unitType !== "township" || !unit.functionalActive) return null;
  const state = STATES[unit.stateUsps];
  const code = subdivisionCode(unit);
  // A town with a charter of its own sets its body by it, not by its state's
  // default: its size, name and an elected chief executive who presides.
  const charter = code ? CHARTERS[code] : undefined;
  if (charter)
    return {
      seats: charter.seats,
      basis: "state-law",
      bodyName: charter.bodyName,
      memberTitle: charter.memberTitle,
      chiefTitle: charter.chiefTitle,
      structure: null,
      executive: charter.chiefTitle
        ? {
            kind: "elected",
            title: charter.chiefTitle,
            presidesOverBody: charter.chiefPresidesOverBody,
            basis: "named-county",
            status:
              charter.confidence === "medium"
                ? "ESTIMATED FROM AVERAGE"
                : "SOURCED",
          }
        : {
            kind: "none",
            title: null,
            presidesOverBody: false,
            basis: "state-none",
            status: "SOURCED",
          },
      citation: charter.citation,
      url: charter.url,
      inForceSince: null,
    };
  const population = code ? TOWN_POPULATION[code] : undefined;
  const read = state
    ? (state.seats ??
      (population === undefined
        ? null
        : (state.bands?.find((band) => population >= band.atLeast)?.seats ??
          null)))
    : null;
  const reading = read === null ? AVERAGE : state!;
  return {
    seats: read ?? AVERAGE.seats,
    basis: read === null ? "estimated" : "state-law",
    bodyName: reading.bodyName,
    memberTitle: reading.memberTitle,
    chiefTitle: null,
    // A town or township board seats no separate chief; its supervisor or
    // trustee chair sits as a member.
    structure: null,
    executive: {
      kind: "none",
      title: null,
      presidesOverBody: false,
      basis: "state-none",
      status: "ESTIMATED FROM AVERAGE",
    },
    citation: reading.citation,
    url: reading.url,
    inForceSince: null,
  };
}

/**
 * A town or township board member's term, from its state's statute where
 * read, else the median of the states read (ESTIMATED FROM AVERAGE). A town
 * whose own charter or vote set another term is not read yet and takes its
 * state's. Null for any government that is not a township.
 */
export function townshipBoardTerm(
  unit: GovernmentUnitIdentity,
): TownshipBoardTerm | null {
  if (unit.unitType !== "township") return null;
  return STATES[unit.stateUsps]?.term ?? AVERAGE.term;
}

/**
 * The board of a government that is not a city: a county's board, a Puerto
 * Rico municipio's legislature, or a town's or township's board. Null for a
 * city, whose council is read elsewhere.
 */
export function boardGoverningBodyRules(
  unit: GovernmentUnitIdentity,
): CountyGoverningBodyRules | null {
  return countyGoverningBodyRules(unit) ?? townshipGoverningBodyRules(unit);
}
