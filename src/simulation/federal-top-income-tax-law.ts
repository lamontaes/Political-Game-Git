/** The adopted top-bracket rate reaches the existing federal withholding table.
 * The tax-year boundary and other brackets retain their starting law. A missing
 * or conflicting adopted rate is unsupported, never the old 39.6% example. */
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import {
  FEDERAL_INCOME_TAX_2026,
  type FilingStatus,
  type IncomeTaxSchedule,
} from "./income-tax-withholding";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";

export const RAISE_TOP_FEDERAL_RATE_QUESTION =
  "us-federal-positions:tax.raise-top-income-tax-rate";

export interface FederalIncomeTaxUnderLaw {
  readonly schedule: IncomeTaxSchedule | null;
  /** Exact law used to assess this paycheck; absent when the starting schedule applies. */
  readonly governingLaw: LawInForce | null;
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
  if (!begun || !proposition)
    return { schedule: begun, governingLaw: null, lawMeasureIds: [] };
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    `${paidAt.slice(0, 4)}-01-01` as IsoDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted")
    return { schedule: begun, governingLaw: null, lawMeasureIds: [] };
  const rate =
    law.answer === "yes"
      ? readFinalEnactedLawTerm(world, law, {
          questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
          termKey: "rate",
          unit: "ratio",
          onDate: `${paidAt.slice(0, 4)}-01-01` as IsoDate,
        })
      : null;
  const supported =
    rate &&
    rate.value >= 0 &&
    rate.value <= 1 &&
    Number.isSafeInteger(Math.round(rate.value * 10_000)) &&
    Math.round(rate.value * 10_000) / 10_000 === rate.value;
  return {
    schedule:
      law.answer === "yes"
        ? supported
          ? withTopRate(begun, Math.round(rate.value * 10_000))
          : null
        : begun,
    lawMeasureIds: [law.measureId],
    governingLaw: law,
  };
}
