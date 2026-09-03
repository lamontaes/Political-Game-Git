/**
 * HUD Fair Market Rents and Income Limits.
 *
 * These are two different statutory products. Fair Market Rents are the rent
 * standard HUD publishes for a rental market area, used to set payment
 * standards; Income Limits are the thresholds that determine programme
 * eligibility. They are calculated differently, they are published on different
 * annual calendars, and their area definitions do not have to agree. The audit
 * found them bundled into one record under one vintage, so here they are
 * separate record kinds that no code path merges.
 *
 * What neither of them is: a statement about any household. An FMR is not a
 * rent anybody pays — it is the 40th percentile of a market, and most tenants
 * pay something else. An income limit is not a finding that any person
 * qualifies for anything; eligibility is a determination made by a programme
 * administrator on facts this substrate does not hold.
 */

import type { Evidence } from "../../core/index";

export type HudProduct = "fair-market-rent" | "income-limit";

/** Fields both products publish about the area a row describes. */
export interface HudArea {
  /** HUD's ten-character area/county identifier. */
  readonly hudFipsCode: string;
  /** HUD's own area code, e.g. METRO33860M33860. */
  readonly hudAreaCode: string;
  readonly hudAreaName: string;
  readonly stateUsps: string;
  readonly stateFips: string;
  readonly countyName: string;
  /**
   * The town or sub-county area, where the row describes one.
   *
   * Null on the majority of rows, which describe a whole county. It is null
   * rather than an empty string because "this row is not about a town" is a
   * fact, and an empty name is not.
   */
  readonly countyTownName: string | null;
  /** HUD's metropolitan indicator, as published. */
  readonly metropolitanIndicator: string;
}

export interface HudFairMarketRentRecord {
  readonly recordKind: "fair-market-rent";
  readonly recordId: string;
  readonly product: HudProduct;
  /** The fiscal year of this FMR publication. */
  readonly productVintage: string;
  readonly area: HudArea;
  /** 2022 population as published in the FY2025 FMR file. */
  readonly publishedPopulation: number | null;
  /**
   * The published Fair Market Rent by bedroom count, in whole dollars.
   *
   * Indexed by bedroom count as HUD publishes it: 0 is an efficiency.
   */
  readonly rentByBedrooms: Readonly<Record<"0" | "1" | "2" | "3" | "4", number>>;
  readonly evidence: Evidence;
}

export interface HudIncomeLimitRecord {
  readonly recordKind: "income-limit";
  readonly recordId: string;
  readonly product: HudProduct;
  readonly productVintage: string;
  readonly area: HudArea;
  /** HUD's area median family income for the vintage. */
  readonly areaMedianFamilyIncome: number;
  /** Very low income (50% of AMFI) by family size 1-8. */
  readonly veryLowIncomeLimitByFamilySize: Readonly<Record<string, number>>;
  /** Extremely low income limit by family size 1-8. */
  readonly extremelyLowIncomeLimitByFamilySize: Readonly<Record<string, number>>;
  /** Low income (80% of AMFI) by family size 1-8. */
  readonly lowIncomeLimitByFamilySize: Readonly<Record<string, number>>;
  readonly evidence: Evidence;
}

export type HudRecord = HudFairMarketRentRecord | HudIncomeLimitRecord;
