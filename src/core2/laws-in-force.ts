/**
 * Which law applies on a date, at every level, for one series.
 *
 * Pure: callers pass the place's chain and its rows for the series. Each level
 * answers with its own phase in force on the date (a phase that hasn't started
 * doesn't apply; it's listed as pending). The levels then combine by the
 * series' doctrine:
 *
 * - floor (minimum wage): the highest floor in force governs. A local floor
 *   counts only where the state lets its places set one, read through the
 *   lifted `lawInForceFromCandidates` over the state's recorded authority
 *   answer, so a later enacted law changes it the same way.
 * - additive (income and sales tax): every level's tax applies together.
 * - single (property tax, benefit amounts): one level sets it.
 */
import type { LawChain, LawLevelName, LawRowInput } from "./laws-starting";
import { governmentUnit } from "./reference/government-units";
import { inTownChain } from "./laws-resolve";
export {
  LAW_SERIES,
  inForceOn,
  inTownChain,
  lawRowIsLater,
  localAuthority,
  resolveLawInForce,
  rowsCarriedToStart,
  startingMinimumHourlyAt,
} from "./laws-resolve";
export { corruptionModule } from "./modules/corruption";
export { countedWeight } from "./law-reach/pay-reach";
export { webLevel } from "./outcome-web-reach";
export { registerPricesWebGaps } from "./modules/prices-web-gaps";
export { publicPayFloorHourly } from "./public-pay-floor";
export {
  mechanicRow,
  putMechanic,
  reachTable,
  tomorrow,
} from "./law-reach/group-a-records";
export type { MechanicRow } from "./law-reach/group-a-records";
/** Group A's parameter reader (the legal reach's table). `reachParameter` below is group B's; the two read different tables. */
export { reachParameter as groupAReachParameter } from "./law-reach/group-a-records";
export { recordHomeRule } from "./policy-authority";
export {
  DEATH_WEB_REFRESH_DAY,
  deathWebFactor,
  markWaitingHealthLinks,
  youthCannabisWeb,
} from "./health-web";
export {
  PAID_LEAVE_KEY,
  paidLeavePremium,
  paidLeaveProgram,
} from "./paid-leave";
export { webDayCache } from "./outcome-web-reach";
export {
  GOVERNMENT_HEIR,
  assessEstateTaxes,
  assessInheritanceTax,
} from "./laws-death-taxes";
export type { DeathTax } from "./laws-death-taxes";
export { startingSocialSecurityAges } from "./social-security-law";
export type { SocialSecurityAges } from "./social-security-law";
export { baseOf } from "./outcome-web-model";
export { crimeChange } from "./modules/crime";
export {
  applyElectionLaws,
  automaticRegistrationInForce,
  barredFromVoting,
  electionLawTurnoutCost,
  lobbyingBarredUntil,
  prisonPartOfBarredShare,
  prisonersBarredHere,
  recordRedistricting,
  revolvingDoorFor,
  sameDayRegistrationInForce,
} from "./law-reach/group-a-voting";
export { groupBPolicy } from "./law-reach/group-b";
export { jobsAt } from "./law-reach/group-b-money";
export { reachParameter } from "./law-reach/group-b-people";
export { scandalsOf, settleBribes } from "./modules/corruption";
export type { Subject, WebPart } from "./outcome-web-reach";
export { wantedFacts } from "./modules/corruption";
export type { CrimeRecord } from "./modules/corruption";
export { CRIME_EVENT, CRIME_MODULE_ID } from "./modules/crime";
export { WIRED_INTO } from "./outcome-web-model";
export { lawChainForPlace } from "./laws-starting";
export type { LawChain } from "./laws-starting";

export type LawDoctrine = "floor" | "additive" | "single";

export interface LevelLaw {
  readonly level: LawLevelName;
  readonly jurisdiction: string;
  readonly row: LawRowInput | null;
  /** Why this level's law does not apply, when it is recorded but set aside. */
  readonly setAside?: string;
}

export interface LawInForceAnswer {
  readonly series: string;
  readonly date: string;
  readonly doctrine: LawDoctrine;
  /** The combined value in force: the governing floor, the sum, or the one level's value. */
  readonly value: number | null;
  readonly unit: string | null;
  readonly governing: LawRowInput | null;
  readonly levels: readonly LevelLaw[];
  /** Phases recorded for a later date, earliest first. */
  readonly pending: readonly LawRowInput[];
  readonly estimate: boolean;
}

/** Authority answers enacted after the start; empty until M3 writes enactments. */
export interface EnactedAuthority {
  readonly series: string;
  readonly jurisdiction: string;
  readonly answer: "yes" | "no";
  readonly measureId: string;
  readonly operativeAt: string;
  readonly sequence: number;
}

/** The law key of the government an office serves, including outside offices. */
export function officeLawJurisdiction(
  chain: Pick<LawChain, "levels">,
  office: {
    readonly level: LawLevelName;
    readonly jurisdiction: string;
    readonly coversTown?: boolean;
  },
): string {
  if (office.level === "federal") return "US";
  if (office.level === "state" || office.level === "township")
    return office.jurisdiction;
  const unit = governmentUnit(office.jurisdiction);
  const city = chain.levels[chain.levels.length - 1]!.jurisdiction;
  if (office.level === "county") {
    const own = unit?.countyGeoid ? `county:${unit.countyGeoid}` : null;
    if (office.coversTown === false) return own ?? office.jurisdiction;
    if (own && inTownChain(chain, own)) return own;
    // Some county-level bodies make city law where the chain has no county.
    return (
      chain.levels.find((level) => level.level === "county")?.jurisdiction ??
      city
    );
  }
  return office.coversTown !== false
    ? city
    : unit?.placeGeoid
      ? `place:${unit.placeGeoid}`
      : office.jurisdiction;
}

// Re-exported so other engine families read the starting rows through this entry, not the file (families guard).
export { startingLawRows, type LawRowInput } from "./laws-starting";
