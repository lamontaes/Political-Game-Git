/**
 * How a city or town council's members are elected: how many seats are ward
 * seats (each chosen by, and from, one part of the town) and how many are at
 * large. Ported from the old engine's `living-world/town-wards.ts`
 * (`councilWardPlan`); that file now reads this one.
 *
 * Where a compiled charter states its council composition, that is used.
 * Otherwise the method is ESTIMATED FROM AVERAGE: the national shares of
 * councils elected all at large, all by ward and by a combination (ICMA
 * 2018), given to a state's towns by size, the larger towns electing by ward
 * (data/research/local-government/council-election-methods.json). Nothing is
 * rolled: the method follows from the town's rank by population among its
 * state's towns.
 */
import methods from "../../../data/research/local-government/council-election-methods.json" with { type: "json" };
import {
  governmentUnitsForState,
  type GovernmentUnitIdentity,
} from "../reference/government-units";
import { localGoverningBodyRules } from "./local-governing-body-rules";
import {
  municipalGovernmentForUnit,
  primaryReading,
} from "./municipal-government";
import { placeReferencePopulation } from "./place-population";

export interface CouncilElectionMethod {
  readonly seats: number;
  readonly wardSeats: number;
  readonly atLargeSeats: number;
  readonly basis: "charter" | "estimated";
  /**
   * What the place calls a seat's part of town: "ward" only where its own
   * charter says ward seats, else "district" (owner ruling, Oct 15).
   */
  readonly seatTerm: "ward" | "district";
  readonly citation: string;
}

const NATIONAL = methods.national;

/** The population the old engine gave a town it holds no count for. */
const UNKNOWN_TOWN_POPULATION = 1_000;

const ranks = new Map<string, ReadonlyMap<string, number>>();

function population(unit: GovernmentUnitIdentity): number {
  return (
    (unit.placeGeoid
      ? placeReferencePopulation(unit.placeGeoid)?.value
      : undefined) ?? UNKNOWN_TOWN_POPULATION
  );
}

/** A town's place among its state's towns by population, 0 smallest to 1. */
function sizeRank(unit: GovernmentUnitIdentity): number {
  let state = ranks.get(unit.stateUsps);
  if (!state) {
    const towns = governmentUnitsForState(unit.stateUsps)
      .filter((row) => row.unitType === "municipality" && row.functionalActive)
      .map((row) => ({ id: row.id, population: population(row) }))
      .sort(
        (left, right) =>
          left.population - right.population || left.id.localeCompare(right.id),
      );
    state = new Map(
      towns.map((row, index) => [row.id, (index + 0.5) / towns.length]),
    );
    ranks.set(unit.stateUsps, state);
  }
  return state.get(unit.id) ?? 0;
}

/** Ward seats the compiled charter sets, or null where it sets none. */
function charterMethod(
  unit: GovernmentUnitIdentity,
  seats: number,
): CouncilElectionMethod | null {
  const compiled = municipalGovernmentForUnit(unit);
  const composition = compiled ? primaryReading(compiled).composition : null;
  if (!compiled || !composition) return null;
  const read =
    composition.pattern === "AT_LARGE"
      ? 0
      : (composition.districtSeats ?? 0) + (composition.wardSeats ?? 0);
  if (read === 0 && composition.pattern !== "AT_LARGE") return null;
  const wardSeats = Math.min(read, seats);
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "charter",
    seatTerm:
      composition.pattern === "WARD" || (composition.wardSeats ?? 0) > 0
        ? "ward"
        : "district",
    citation: `${compiled.key}: the charter's council composition (${composition.pattern}).`,
  };
}

/** How a town's council is elected: its ward seats and its at-large seats. */
export function councilElectionMethod(
  unit: GovernmentUnitIdentity,
): CouncilElectionMethod | null {
  const seats = localGoverningBodyRules(unit)?.seats?.value ?? null;
  if (seats === null || seats < 1) return null;
  const charter = charterMethod(unit, seats);
  if (charter) return charter;
  const rank = sizeRank(unit);
  // A body too small to split elects at large.
  const wardSeats =
    seats < 3 || rank < NATIONAL.atLarge
      ? 0
      : rank < NATIONAL.atLarge + NATIONAL.wards
        ? seats
        : Math.min(
            seats - 1,
            Math.max(2, Math.round(seats * NATIONAL.combinationWardShare)),
          );
  return {
    seats,
    wardSeats,
    atLargeSeats: seats - wardSeats,
    basis: "estimated",
    seatTerm: "district",
    citation: NATIONAL.citation,
  };
}
