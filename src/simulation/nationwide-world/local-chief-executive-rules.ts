import { stableHash } from "../ids";
import { governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { primaryReading } from "../municipal-government";
import type { MunicipalReading } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";

/**
 * Whether a town elects its chief official, and by what title and for how
 * long, for every town with a government of its own.
 *
 * Read where the game has compiled the town's government and its reading says
 * so; otherwise drawn, stable per town, from the national shares in ICMA's
 * 2018 Municipal Form of Government Survey as ChatGPT reported them on
 * 2026-09-22 (answer to `local-executive-and-council-rules`, kept verbatim
 * under docs/research/chatgpt-answers/2026-09-22-nationwide-2235/):
 *
 * - how the chief elected official is chosen: direct election 75.6%, by the
 *   council 21.3%, the top vote-getter for council 0.9%, rotation 1.6%, other
 *   0.7%;
 * - the chief elected official's term: 1 year 13.5%, 2 years 28.6%, 3 years
 *   6.1%, 4 years 49.4%.
 *
 * Only a directly elected chief official is a race anybody can file for. A
 * town whose council chooses its mayor from among its members has no mayoral
 * race; the council's choice is not built yet.
 *
 * What is still not settled stays marked rather than made up. PLACEHOLDER,
 * pending research question `town-mayor-rules-by-town-size`:
 *
 * - shares by town size or state are not published, so every unread town
 *   draws from the same national shares. That includes large cities whose
 *   compiled reading does not say how the mayor is chosen, so a well-known
 *   city can draw a council-chosen mayor until its own rule is read; the
 *   question asks for those cities by name;
 * - the survey's term shares describe every chief elected official, including
 *   council presidents chosen for a year, and are applied to directly elected
 *   mayors as they stand;
 * - a directly elected chief official is titled "Mayor" unless the town's
 *   reading names another title (ICMA's title shares describe every chief
 *   official, including council presidents chosen by their councils);
 * - term limits (8.6% of towns in the same survey) are not applied;
 * - whether a sitting council member who wins the mayoralty gives up the
 *   council seat is not settled, so the council seat is left as it is.
 */

export type ChiefExecutiveBasis = "read" | "typical";

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

interface Share<T> {
  readonly value: T;
  readonly percent: number;
}

/** ICMA 2018, method of selecting the chief elected official. */
const SELECTION_SHARES: readonly Share<boolean>[] = [
  { value: true, percent: 75.6 },
  // Chosen by the council, the top council vote-getter, rotation, or other.
  { value: false, percent: 21.3 + 0.9 + 1.6 + 0.7 },
];

/** ICMA 2018, term of the chief elected official in years. */
const CHIEF_TERM_SHARES: readonly Share<number>[] = [
  { value: 1, percent: 13.5 },
  { value: 2, percent: 28.6 },
  { value: 3, percent: 6.1 },
  { value: 4, percent: 49.4 },
];

function draw<T>(
  table: readonly Share<T>[],
  unitId: string,
  what: string,
): ChiefExecutiveValue<T> {
  const total = table.reduce((sum, share) => sum + share.percent, 0);
  const point =
    Number(
      BigInt(`0x${stableHash(`local-chief-executive:${what}:${unitId}`)}`) %
        1_000_000n,
    ) / 1_000_000;
  let reached = 0;
  for (const share of table) {
    reached += share.percent / total;
    if (point < reached) return { value: share.value, basis: "typical" };
  }
  return { value: table.at(-1)!.value, basis: "typical" };
}

/** A council that picks the mayor from among its own members. */
const CHOSEN_BY_COUNCIL =
  /\b(chosen|selected|selects|elects?) (by the council|one of (its|their|them)|one of its own)|no separately elected executive/i;
/** Voters choose the mayor themselves. */
const CHOSEN_BY_VOTERS =
  /\b(separately|directly|popularly) elected|elected at[- ]large|elected by the (registered )?(qualified )?(electors|voters)/i;

/**
 * Whether the reading says the voters choose the mayor. Null where it does not
 * say, which leaves the town on the national shares for that one fact.
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
  if (
    reading.form === "TOWN_MEETING" ||
    reading.form === "ANNUAL_TOWN_MEETING"
  )
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
): LocalChiefExecutiveRules | null {
  if (unit.unitType !== "municipality" || !unit.functionalActive) return null;
  const government = municipalGovernmentForUnit(unit);
  const reading = government ? primaryReading(government) : null;
  const direct = reading ? readDirectElection(reading) : null;
  const term = reading ? readMayorTerm(reading) : null;
  return {
    unitId: unit.id,
    researchedGovernmentKey: government?.key ?? null,
    directlyElected:
      direct !== null
        ? { value: direct, basis: "read" }
        : draw(SELECTION_SHARES, unit.id, "selection"),
    title: reading?.mayor?.title
      ? { value: reading.mayor.title, basis: "read" }
      : { value: "Mayor", basis: "typical" },
    termYears:
      term !== null
        ? { value: term, basis: "read" }
        : draw(CHIEF_TERM_SHARES, unit.id, "term"),
  };
}

export function localChiefExecutiveRulesForUnitId(
  unitId: string,
): LocalChiefExecutiveRules | null {
  const unit = governmentUnit(unitId);
  return unit ? localChiefExecutiveRules(unit) : null;
}
