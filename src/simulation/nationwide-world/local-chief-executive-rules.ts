import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { primaryReading } from "../municipal-government";
import type { MunicipalReading } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { placePopulation } from "./place-population";

/**
 * Whether a town elects its chief official, and by what title and for how
 * long, for every town with a government of its own.
 *
 * Read where the game has compiled the town's government and its reading says
 * so. Otherwise ESTIMATED FROM AVERAGE: every unread town takes the most
 * common real rule in ICMA's 2018 Municipal Form of Government Survey, as
 * ChatGPT reported it on 2026-09-22 (answer to
 * `local-executive-and-council-rules`, kept verbatim under
 * docs/research/chatgpt-answers/2026-09-22-nationwide-2235/), the same rule
 * for every place (CTO rulings of September 28, 10:32 p.m., and September 29,
 * 1:54 a.m.: no draw where a rule is unread):
 *
 * - the chief elected official is elected directly, as in 75.6% of towns
 *   (by the council 21.3%, the top vote-getter for council 0.9%, rotation
 *   1.6%, other 0.7%);
 * - the term is four years, as in 49.4% of towns (1 year 13.5%, 2 years
 *   28.6%, 3 years 6.1%).
 *
 * Until September 29, 2026, each unread town drew both from those shares.
 *
 * The owner's interim rule, not research (lamontae, 2026-09-23 9:07 p.m. ET,
 * "yes to the democratically elected mayor"): until a city's own rule is read,
 * a city of more than `OWNER_LARGE_CITY_POPULATION` people elects its mayor
 * directly, since nearly every large American city does.
 * A read rule overrides it. It applies only where the town's population is
 * known, and `place-population.ts` holds none yet, so today it changes no
 * town; it takes effect the day that table is filled.
 *
 * Only a directly elected chief official is a race anybody can file for. A
 * town whose council chooses its mayor from among its members has no mayoral
 * race; the council's choice is not built yet.
 *
 * ESTIMATED FROM AVERAGE for unread towns, using all municipalities in the
 * 2018 ICMA survey as the comparison set:
 *
 * - shares by town size or state are not published, so every unread town
 *   takes the same national rule, and a town whose council in fact chooses
 *   its mayor has an elected one until its own rule is read;
 * - the survey's term shares describe every chief elected official, including
 *   council presidents chosen for a year;
 * - a directly elected chief official is titled "Mayor" unless the town's
 *   reading names another title (ICMA's title shares describe every chief
 *   official, including council presidents chosen by their councils);
 * - term limits (8.6% of towns in the same survey) are not applied;
 * - whether a sitting council member who wins the mayoralty gives up the
 *   council seat is not settled, so the council seat is left as it is.
 */

export type ChiefExecutiveBasis =
  | "read"
  | "typical"
  /** The owner's interim rule for large cities, until the city is read. */
  | "owner-interim";

/** The owner's interim rule: above this many people, a mayor is elected. */
export const OWNER_LARGE_CITY_POPULATION = 100_000;

export interface ChiefExecutiveValue<T> {
  readonly value: T;
  readonly basis: ChiefExecutiveBasis;
}

export interface LocalChiefExecutiveRules {
  readonly unitId: string;
  readonly researchedGovernmentKey: string | null;
  /** True when the town's voters choose the chief official directly. */
  readonly directlyElected: ChiefExecutiveValue<boolean>;
  readonly title: ChiefExecutiveValue<string>;
  readonly termYears: ChiefExecutiveValue<number>;
}

/**
 * ESTIMATED FROM AVERAGE: the most common real rule where a town's own is
 * unread (ICMA 2018; see the note above): a directly elected chief official
 * serving four years.
 */
const MOST_COMMON_DIRECT_ELECTION: ChiefExecutiveValue<boolean> = {
  value: true,
  basis: "typical",
};
const MOST_COMMON_TERM: ChiefExecutiveValue<number> = {
  value: 4,
  basis: "typical",
};

/** A council that picks the mayor from among its own members. */
const CHOSEN_BY_COUNCIL =
  /\b(chosen|selected|selects|elects?) (by the council|one of (its|their|them)|one of its own)|no separately elected executive/i;
/** Voters choose the mayor themselves. */
const CHOSEN_BY_VOTERS =
  /\b(separately|directly|popularly) elected|elected at[- ]large|elected by the (registered )?(qualified )?(electors|voters)/i;

/**
 * Whether the reading says the voters choose the mayor. Null where it does not
 * say, which leaves the town on the most common rule for that one fact.
 *
 * The form of government settles it where the selection itself was not read:
 * a mayor-council government has a separately elected mayor by definition,
 * and a town meeting's voters select a board, not a mayor (ChatGPT's answer,
 * "a game locality generated as one of these should not automatically expose
 * a directly elected mayoral contest").
 */
export function readDirectElection(reading: MunicipalReading): boolean | null {
  const selection = reading.executiveSelection ?? "";
  if (CHOSEN_BY_COUNCIL.test(selection)) return false;
  if (CHOSEN_BY_VOTERS.test(selection)) return true;
  if (reading.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE")
    return true;
  if (reading.form === "MAYOR_COUNCIL") return true;
  if (reading.form === "TOWN_MEETING" || reading.form === "ANNUAL_TOWN_MEETING")
    return false;
  return null;
}

/** A seat class that is the mayor's alone, not a council seat. */
export function isMayorSeatClass(seatClass: string): boolean {
  return (
    /\bmayor\b/i.test(seatClass) && !/\bvice\b|\bcouncil\b/i.test(seatClass)
  );
}

/** The mayor's own term where the reading states it apart from the council's. */
export function readMayorTerm(reading: MunicipalReading): number | null {
  const years = new Set(
    reading.terms
      .filter((term) => isMayorSeatClass(term.seatClass))
      .map((term) => term.years)
      .filter((value): value is number => value !== null && value > 0),
  );
  return years.size === 1 ? [...years][0]! : null;
}

export function localChiefExecutiveRules(
  unit: GovernmentUnitIdentity,
  populationOf: (placeGeoid: string) => number | null = placePopulation,
): LocalChiefExecutiveRules | null {
  if (unit.unitType !== "municipality" || !unit.functionalActive) return null;
  const government = municipalGovernmentForUnit(unit);
  const reading = government ? primaryReading(government) : null;
  const direct = reading ? readDirectElection(reading) : null;
  const population = unit.placeGeoid ? populationOf(unit.placeGeoid) : null;
  const largeCity =
    population !== null && population > OWNER_LARGE_CITY_POPULATION;
  const term = reading ? readMayorTerm(reading) : null;
  return {
    unitId: unit.id,
    researchedGovernmentKey: government?.key ?? null,
    directlyElected:
      direct !== null
        ? { value: direct, basis: "read" }
        : largeCity
          ? { value: true, basis: "owner-interim" }
          : MOST_COMMON_DIRECT_ELECTION,
    title: reading?.mayor?.title
      ? { value: reading.mayor.title, basis: "read" }
      : { value: "Mayor", basis: "typical" },
    termYears:
      term !== null ? { value: term, basis: "read" } : MOST_COMMON_TERM,
  };
}

export function localChiefExecutiveRulesForUnitId(
  unitId: string,
): LocalChiefExecutiveRules | null {
  const unit = governmentUnit(unitId);
  return unit ? localChiefExecutiveRules(unit) : null;
}
