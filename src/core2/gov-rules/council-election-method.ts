/**
 * How a city or town council's members are elected: how many seats are ward
 * seats (each chosen by, and from, one part of the town) and how many are at
 * large. Ported from the old engine's `living-world/town-wards.ts`
 * (`councilWardPlan`); that file now reads this one.
 *
 * Where a compiled charter states its council composition, that is used.
 * Otherwise the council is estimated at large (owner rulings, Oct 15), with
 * the national shares of the ICMA 2018 survey as the source
 * (data/research/local-government/council-election-methods.json).
 */
import methods from "../../../data/research/local-government/council-election-methods.json" with { type: "json" };
import type { GovernmentUnitIdentity } from "../reference/government-units";
import { localGoverningBodyRules } from "./local-governing-body-rules";
import {
  municipalGovernmentForUnit,
  primaryReading,
} from "./municipal-government";

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
  // No record of how this council is elected: it is estimated at large, the
  // way most councils are (owner rulings, Oct 15, OWNER-DECISIONS.md "Town
  // council seats"), and marked as an estimate with its source.
  return {
    seats,
    wardSeats: 0,
    atLargeSeats: seats,
    basis: "estimated",
    seatTerm: "district",
    citation: `${NATIONAL.citation} No record of this council's method, so it is estimated at large.`,
  };
}
