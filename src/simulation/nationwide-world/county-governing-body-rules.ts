import readings from "../../../data/research/local-government/county-governing-bodies.json" with { type: "json" };
import acsPlaces from "../../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import type { GovernmentUnitIdentity } from "../government-units";
import { municipioUnit } from "../government-units";

export { municipioUnit } from "../government-units";

/**
 * COUNTY GOVERNING BODIES (Build 25, CTO ruling of September 29, 1:54 a.m.):
 * how many members sit on a county's board, and on a Puerto Rico
 * municipio's municipal legislature, from the law that sets it.
 *
 * Three kinds of answer, each labeled wherever it is shown:
 *
 * - **state-law**: the state's own statute sets the size of every county
 *   board without a charter of its own (data/research/local-government/
 *   county-governing-bodies.json, each with its citation).
 * - **municipal-code**: Puerto Rico's Municipal Code, Law 107 of 2020, sets
 *   each municipal legislature by the municipio's population.
 * - **estimated**: the state's law has not been read. The board takes the
 *   national average, ESTIMATED FROM AVERAGE from the National Association
 *   of Counties' count of county board members.
 *
 * A county whose own charter sets a different size (a charter county in
 * California, Ohio, Missouri or Washington) is not read yet, so it takes its
 * state's size: a known gap, not a rule.
 */

export type CountyBodyBasis = "state-law" | "municipal-code" | "estimated";

/**
 * Whether a county elects an executive, and what the answer rests on:
 * - `elected`: the county's own reading (a Louisiana council-president
 *   parish) or the state's, where it says every county (or nearly every
 *   county) elects one;
 * - `none`: the state's counties choose no executive;
 * - `unread`: the state has some counties with an elected executive and the
 *   record does not yet say which, so none is asserted here.
 */
export interface CountyExecutiveReading {
  readonly kind: "elected" | "none" | "unread";
  readonly title: string | null;
  /** The executive chairs the body (a county judge, a county mayor). */
  readonly presidesOverBody: boolean;
  readonly basis:
    | "named-county"
    | "state-all"
    | "state-most"
    | "state-some"
    | "state-none"
    | "municipal-code";
  readonly status: "SOURCED" | "ESTIMATED FROM AVERAGE";
}

export interface CountyGoverningBodyRules {
  readonly seats: number;
  readonly basis: CountyBodyBasis;
  readonly bodyName: string;
  readonly memberTitle: string;
  /** The elected chief executive seated beside the body, where the law has one. */
  readonly chiefTitle: string | null;
  /** The form of county government and whether it has an elected executive. */
  readonly structure: CountyStructureReading | null;
  readonly executive: CountyExecutiveReading;
  readonly citation: string;
  readonly url: string;
  /** The day the law that sets the body took effect, where it is read. */
  readonly inForceSince: string | null;
}

interface StateReading {
  /** The size the law sets for every county, or null where it goes by population. */
  readonly seats?: number;
  /** The size by population, largest first, where the law sets it that way. */
  readonly bands?: readonly {
    readonly atLeast: number;
    readonly seats: number;
  }[];
  /** Counties the law names with a size of their own, by GEOID. */
  readonly exceptions?: Readonly<Record<string, number>>;
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly citation: string;
  readonly url: string;
}

const STATES = readings.states as Readonly<Record<string, StateReading>>;
const AVERAGE = readings.nationalAverage as StateReading & {
  readonly seats: number;
};

/**
 * Counties whose governing body's own name is read (Louisiana's police
 * juries, parish councils and Caddo's commission), by GEOID, with the elected
 * chief executive a council-president parish has. The name and the chief
 * only: the size still comes from the state's law or the national average.
 */
const NAMED_BODIES = readings.namedBodies.counties as Readonly<
  Record<
    string,
    {
      readonly bodyName: string;
      readonly memberTitle: string;
      readonly chiefTitle?: string;
    }
  >
>;

/** Each county's residents: the Bureau of Economic Analysis 2024 count. */
const COUNTY_POPULATION = budgetBases.countyPopulation2024 as Readonly<
  Record<string, number>
>;

/** The size a state's law sets for one county, or null where unreadable. */
function stateSeats(
  reading: StateReading,
  countyGeoid: string | null,
): number | null {
  const named = countyGeoid ? reading.exceptions?.[countyGeoid] : undefined;
  if (named !== undefined) return named;
  if (reading.seats !== undefined) return reading.seats;
  const population = countyGeoid ? COUNTY_POPULATION[countyGeoid] : undefined;
  if (population === undefined || !reading.bands) return null;
  return (
    reading.bands.find((band) => population >= band.atLeast)?.seats ?? null
  );
}

interface MunicipalCode {
  readonly stateFips: string;
  /** The day the code that makes each municipio a government took effect. */
  readonly inForceSince: string;
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly chiefTitle: string;
  readonly termYears: number;
  readonly bands: readonly {
    readonly atLeast: number;
    readonly seats: number;
    readonly partyMayNominate: number;
  }[];
  readonly exceptions: Readonly<
    Record<
      string,
      { readonly seats: number; readonly partyMayNominate: number }
    >
  >;
  readonly citation: string;
  readonly url: string;
}

/**
 * Places whose county-equivalents are each a municipality under the place's
 * own municipal code (Puerto Rico's municipios), keyed by postal code.
 */
const MUNICIPAL_CODES = readings.municipalCodes as Readonly<
  Record<string, MunicipalCode>
>;

/** Each place's residents by county area, largest first: ACS 2020-2024. */
const PLACE_COUNTIES = acsPlaces.placeCounties as unknown as Readonly<
  Record<string, readonly (readonly [string, number])[]>
>;

/** Puerto Rico's municipios by GEOID: ACS 2020-2024 residents. */
const MUNICIPIO_POPULATION = acsPlaces.puertoRicoMunicipios as Readonly<
  Record<string, number>
>;

/** The body that governs one county, at the size its law sets. */
export function countyGoverningBodyRules(
  unit: GovernmentUnitIdentity,
): CountyGoverningBodyRules | null {
  if (unit.unitType !== "county" || !unit.functionalActive) return null;
  const code = MUNICIPAL_CODES[unit.stateUsps];
  if (code) return municipioRules(code, unit.countyGeoid);
  const state = STATES[unit.stateUsps];
  const read = state ? stateSeats(state, unit.countyGeoid) : null;
  const reading = read === null ? AVERAGE : state!;
  // A body whose own name is read (a Louisiana police jury) keeps it, though
  // its size may still be the estimate.
  const named = unit.countyGeoid ? NAMED_BODIES[unit.countyGeoid] : undefined;
  const structure = countyStructureForState(unit.stateUsps);
  const executive = countyExecutive(structure, named?.chiefTitle ?? null);
  return {
    seats: read ?? AVERAGE.seats,
    basis: read === null ? "estimated" : "state-law",
    bodyName: named?.bodyName ?? reading.bodyName,
    memberTitle: named?.memberTitle ?? reading.memberTitle,
    chiefTitle: executive.kind === "elected" ? executive.title : null,
    structure,
    executive,
    citation: reading.citation,
    url: reading.url,
    inForceSince: null,
  };
}

/**
 * What the record says about a county's executive: its own reading where a
 * county is named, else its state's structure row. A state where only some
 * counties elect one is `unread` until a county or charter row says which,
 * and a county in it is given none rather than a guess.
 */
function countyExecutive(
  structure: CountyStructureReading | null,
  namedChiefTitle: string | null,
): CountyExecutiveReading {
  if (namedChiefTitle !== null)
    return {
      kind: "elected",
      title: namedChiefTitle,
      presidesOverBody: false,
      basis: "named-county",
      status: "SOURCED",
    };
  if (!structure)
    return {
      kind: "unread",
      title: null,
      presidesOverBody: false,
      basis: "state-some",
      status: "ESTIMATED FROM AVERAGE",
    };
  const elected = structure.electedExecutive;
  return {
    kind:
      elected === "all" || elected === "most"
        ? "elected"
        : elected === "none"
          ? "none"
          : "unread",
    title:
      elected === "all" || elected === "most" ? structure.executiveTitle : null,
    presidesOverBody: structure.executivePresidesOverBody,
    basis: `state-${elected}` as CountyExecutiveReading["basis"],
    status: structure.status,
  };
}

/**
 * A municipio's legislature by Article 1.020 of the Municipal Code. The
 * article counts residents at the last decennial census; the game holds the
 * ACS 2020-2024 count, so a municipio within a few hundred residents of
 * 20,000 or 40,000 may sit in the neighboring band (a known gap).
 */
function municipioRules(
  code: MunicipalCode,
  countyGeoid: string | null,
): CountyGoverningBodyRules | null {
  if (!countyGeoid) return null;
  const population = MUNICIPIO_POPULATION[countyGeoid];
  const seats =
    code.exceptions[countyGeoid]?.seats ??
    (population === undefined
      ? null
      : (code.bands.find((band) => population >= band.atLeast)?.seats ?? null));
  if (seats === null) return null;
  return {
    seats,
    basis: "municipal-code",
    bodyName: code.bodyName,
    memberTitle: code.memberTitle,
    chiefTitle: code.chiefTitle,
    structure: null,
    executive: {
      kind: "elected",
      title: code.chiefTitle,
      presidesOverBody: false,
      basis: "municipal-code",
      status: "SOURCED",
    },
    citation: code.citation,
    url: code.url,
    inForceSince: code.inForceSince,
  };
}

/**
 * The municipios a place lies in, the one holding most of its residents
 * first (ACS 2020-2024; the 2020 place-within-county files hold no Puerto
 * Rico place). Empty outside a place governed by municipios.
 */
export function municipiosForPlace(
  placeGeoid: string,
): readonly GovernmentUnitIdentity[] {
  return (PLACE_COUNTIES[placeGeoid] ?? []).flatMap(
    ([countyGeoid]) => municipioUnit(countyGeoid) ?? [],
  );
}

/** The citation a county body's size rests on, for a record's provenance. */
export function countyGoverningBodySource(
  rules: CountyGoverningBodyRules,
): string {
  return `${rules.citation} (${rules.url})`;
}

export interface CountyStructureReading {
  readonly structure: string;
  readonly electedExecutive: "all" | "most" | "some" | "none";
  readonly executiveTitle: string | null;
  readonly executivePresidesOverBody: boolean;
  readonly status: "SOURCED" | "ESTIMATED FROM AVERAGE";
  readonly note: string;
  readonly sourceUrls: readonly string[];
}

/** The form of county government a state's counties take unless a charter says otherwise. */
export function countyStructureForState(
  stateUsps: string,
): CountyStructureReading | null {
  const row = (
    readings.structure.states as Readonly<
      Record<string, CountyStructureReading>
    >
  )[stateUsps];
  return row ?? null;
}
