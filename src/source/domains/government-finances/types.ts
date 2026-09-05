/**
 * State and local government finances.
 *
 * The source is the Census Bureau's Annual Survey of State and Local Government
 * Finances and, in Census-of-Governments years, the Census of Governments
 * finance phase. It publishes, for individual state and local governments,
 * revenue by source, expenditure by function, debt outstanding, and cash and
 * securities holdings. The 42A Part 1 backbone names it the fiscal-scale
 * backbone: it calibrates actual fiscal capacity, tax structure, debt stress
 * and spending priorities.
 *
 * What it is not is a verdict. A record here is one published fiscal amount for
 * one government in one reference year, in the units the Bureau published it in,
 * with the estimate basis it was collected under. Nothing in this domain rolls
 * those amounts into a "fiscal health", "capacity" or "efficiency" score —
 * doing so would invent policy meaning the source does not carry, and the
 * validator rejects any record that tries.
 *
 * Every record keeps the Census government identifier so a later pass can join
 * it to the government-unit registry by a stable code rather than by matching
 * names. A finance record never asserts what a government *is*; it asserts what
 * one fiscal line of one government's ledger read, and cites where it read it.
 */

import type { Evidence, Sourced } from "../../core/index";

/**
 * The four published fiscal dimensions this domain preserves.
 *
 * These are the categories the backbone names — revenue by source, expenditure
 * by function, debt, and cash and securities. The enum is closed: a category
 * outside it is a parse defect, not a new column, because the source does not
 * publish one and inventing one would be inventing meaning.
 */
export type FinanceCategory =
  "REVENUE" | "EXPENDITURE" | "DEBT" | "CASH_AND_SECURITIES";

/**
 * Whether the amount is a universe observation or a sample estimate.
 *
 * The Annual Survey is a sample in most years; the Census of Governments finance
 * phase (years ending in 2 and 7) is a universe. The two are not the same kind
 * of fact and must never be silently merged, so the basis rides on every record
 * rather than being assumed from the year.
 */
export type EstimateBasis = "CENSUS_UNIVERSE" | "SAMPLE_ESTIMATE";

/**
 * One published fiscal amount for one government in one reference year.
 *
 * `amount` is `Sourced` so that a value the Bureau withheld is SUPPRESSED, a
 * line that does not apply to this government type is NOT_APPLICABLE, and a line
 * the product simply does not carry for this unit is UNKNOWN — none of which is
 * a zero. A genuine reported zero is KNOWN(0), and stays distinguishable from
 * all of them.
 */
export interface FinanceRecord {
  readonly recordId: string;
  /** The Census government identifier, retained for registry crosswalk. */
  readonly censusGovId: string;
  /** State FIPS as published; identity, not a value. */
  readonly stateFips: string;
  readonly stateUsps: string;
  /** Census government-type code as published (e.g. state, county, municipal). */
  readonly govTypeCode: string;
  /** The government's name as supplied. Never used as a join key. */
  readonly govName: string;
  /** The survey/reference year, carried on every record so years never merge. */
  readonly fiscalYear: number;
  /** The government's fiscal-year-ending date, as supplied by the source. */
  readonly fiscalYearEnding: string;
  readonly category: FinanceCategory;
  /** The Census item/line code (e.g. a revenue or expenditure item code). */
  readonly itemCode: string;
  /** The functional/line description as published. */
  readonly itemDescription: string;
  /** The units the amount is published in, verbatim (e.g. "USD thousands"). */
  readonly units: string;
  readonly estimateBasis: EstimateBasis;
  readonly amount: Sourced<number>;
  readonly evidence: Evidence;
}
