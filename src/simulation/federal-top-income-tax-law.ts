/**
 * The federal income tax a paycheck withholds under the law in force, where
 * a law enacted in play answered "should the top federal income tax rate go
 * up?".
 *
 * A yes raises the top bracket from 37% to 39.6%, the top rate in law for tax
 * years 2013 through 2017 (Revenue Procedure 2016-55 for 2017) before the Tax
 * Cuts and Jobs Act lowered it, and the rate the Treasury's fiscal year 2025
 * revenue proposals asked to restore. The law answers the rate, so the
 * bracket's 2026 threshold stays where it is. A later no puts the 37% rate
 * back. A rate change applies to a whole tax year, so a paycheck reads the
 * law in force on January 1 of the year it is paid, as the state income tax
 * laws are read (`state-income-tax-law.ts`).
 */
import { lawInForce } from "./governing/law-in-force";
import {
  FEDERAL_INCOME_TAX_2026,
  type FilingStatus,
  type IncomeTaxSchedule,
} from "./income-tax-withholding";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";

export const RAISE_TOP_FEDERAL_RATE_QUESTION =
  "us-federal-positions:tax.raise-top-income-tax-rate";

/** The raised top rate, 39.6%, in basis points. */
export const RAISED_TOP_RATE_BASIS_POINTS = 3960;

export const RAISED_TOP_RATE_SOURCE =
  "https://www.irs.gov/pub/irs-drop/rp-16-55.pdf";

export interface FederalIncomeTaxUnderLaw {
  readonly schedule: IncomeTaxSchedule | null;
  /** The enacted law that set the top rate; empty where none has. */
  readonly lawMeasureIds: readonly EntityId[];
}

/** The 2026 schedule with its top bracket taxed at `rateBasisPoints`. */
export function withTopRate(
  schedule: IncomeTaxSchedule,
  rateBasisPoints: number,
): IncomeTaxSchedule {
  return {
    ...schedule,
    brackets: schedule.brackets.map((bracket, index) =>
      index === schedule.brackets.length - 1
        ? { ...bracket, rateBasisPoints }
        : bracket,
    ),
  };
}

/**
 * The federal schedule for a paycheck paid on `paidAt` to a filer of
 * `status`, and the law that set its top rate.
 */
export function federalIncomeTaxUnderLaw(
  world: World,
  status: FilingStatus,
  paidAt: IsoDate,
): FederalIncomeTaxUnderLaw {
  const begun = FEDERAL_INCOME_TAX_2026[status];
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === RAISE_TOP_FEDERAL_RATE_QUESTION,
  );
  if (!begun || !proposition) return { schedule: begun, lawMeasureIds: [] };
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    `${paidAt.slice(0, 4)}-01-01` as IsoDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted")
    return { schedule: begun, lawMeasureIds: [] };
  return {
    schedule:
      law.answer === "yes"
        ? {
            ...withTopRate(begun, RAISED_TOP_RATE_BASIS_POINTS),
            sourceUrl: RAISED_TOP_RATE_SOURCE,
          }
        : begun,
    lawMeasureIds: [law.measureId],
  };
}
