import type { EntityId, IsoDate, World } from "./types";

/**
 * A county board's yearly budget hearing, as the books record it (CO-5).
 *
 * A leaf: the types and the reads, nothing that writes. The hearing is held on
 * a sitting day of the county's board before its fiscal year opens; the board
 * votes on the levy the proposed budget needs; a levy that passes is the
 * property tax households are assessed, and the year's adopted budget expects
 * exactly that. Amounts are whole dollars a year.
 */

/** Where one number in the proposal came from. */
export type CountyBudgetProposalBasis =
  "books-projection" | "books-projection-plus-gap";

export interface CountyBudgetProposal {
  /** What the books project the county spends next year, all programs. */
  readonly appropriations: number;
  /** What the books project it collects next year at the rates in force. */
  readonly expectedRevenue: number;
  /** The property tax the budget needs, in whole dollars a year. */
  readonly propertyTaxLevy: number;
  /** The property tax the current year's adopted budget expects. */
  readonly priorPropertyTaxLevy: number;
  /** Spending the projected revenue would not cover; zero where it balances. */
  readonly gap: number;
  readonly basis: CountyBudgetProposalBasis;
  /** The levy as a share of the assessed value of the county's homes. */
  readonly rateNumerator: number;
  readonly rateDenominator: number;
  /** The county's homes at the assessed value the rate was worked from. */
  readonly assessedBase: number;
  /** The estimates the rate rests on, each marked and cited. */
  readonly estimates: readonly string[];
}

export type CountyBudgetStage = "heard" | "adopted" | "rejected" | "lapsed";

export interface CountyBudgetHearing {
  /** `county-budget:<governmentKey>:<fiscal year>`. */
  readonly key: string;
  /** The county's books key, `county:<GEOID>`. */
  readonly governmentKey: string;
  /** The county's government unit, `gus2025:<id>`. */
  readonly unitId: string;
  readonly fiscalYear: number;
  readonly startsOn: IsoDate;
  /** The recorded day on the board's calendar. */
  readonly hearingOn: IsoDate;
  readonly stage: CountyBudgetStage;
  readonly proposal: CountyBudgetProposal;
  /** The board's measure, its filed tax terms and its sponsor. */
  readonly measureId: EntityId;
  readonly taxProposalId: EntityId;
  readonly sponsorPersonId: EntityId;
  /** The day the board's vote was recorded, once it was. */
  readonly decidedOn: IsoDate | null;
  /** The levy the board adopted; null until it did. */
  readonly adoptedPropertyTaxLevy: number | null;
}

/** Every hearing the books hold, oldest first. */
export function countyBudgetHearings(
  world: World,
): readonly CountyBudgetHearing[] {
  return world.publicBudgets?.countyBudgetHearings ?? [];
}

/** The hearing whose measure this is, or null for any other measure. */
export function countyBudgetHearingForMeasure(
  world: World,
  measureId: EntityId,
): CountyBudgetHearing | null {
  return (
    countyBudgetHearings(world).find((row) => row.measureId === measureId) ??
    null
  );
}

/** Whether a measure is a county board's budget levy. */
export function isCountyBudgetMeasure(
  world: World,
  measureId: EntityId,
): boolean {
  return countyBudgetHearingForMeasure(world, measureId) !== null;
}

/** The levy a board adopted for one fiscal year, or null where it adopted none. */
export function adoptedCountyLevy(
  world: World,
  governmentKey: string,
  fiscalYear: number,
): CountyBudgetHearing | null {
  const found = countyBudgetHearings(world).find(
    (row) =>
      row.governmentKey === governmentKey &&
      row.fiscalYear === fiscalYear &&
      row.stage === "adopted" &&
      row.adoptedPropertyTaxLevy !== null,
  );
  return found ?? null;
}
