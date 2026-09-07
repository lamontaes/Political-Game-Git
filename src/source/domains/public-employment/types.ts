/**
 * State and local public employment and payroll.
 *
 * The source is the Census Bureau's Annual Survey of Public Employment & Payroll
 * (ASPEP) and, in Census-of-Governments years, its employment phase. It
 * publishes, for individual state and local governments by government function,
 * full-time and part-time employee counts, full-time-equivalent employment, and
 * full-time and part-time payroll. The 42A Part 1 backbone names it the
 * staffing-capacity backbone: it calibrates staffing intensity, payroll
 * pressure and service-delivery constraints.
 *
 * What it is not is a productivity judgement. A record here is the staffing and
 * payroll the Bureau published for one government's one function in one
 * reference period, in the units it published them in. Nothing in this domain
 * turns headcount into "agency efficiency", "competence" or a capacity score,
 * and the validator rejects any record that tries.
 *
 * The five measures ride on one record as five independent `Sourced` values
 * precisely so they can be summed *honestly*: a full-time count and a missing
 * part-time count do not add to a total — they make an INCOMPLETE aggregate
 * that names the gap. That is the 13B failure this shape exists to prevent, and
 * the reason the domain never stores a pre-summed "total employment" number.
 */

import type { Evidence, Sourced } from "../../core/index";

/** Whether the counts are a universe observation or a sample estimate. */
export type EstimateBasis = "CENSUS_UNIVERSE" | "SAMPLE_ESTIMATE";

/**
 * One government function's staffing and payroll in one reference period.
 *
 * Each measure is `Sourced`: a withheld figure is SUPPRESSED, a measure that
 * does not apply to a function is NOT_APPLICABLE, and a measure the product does
 * not carry is UNKNOWN — none of which is a zero. A genuine reported zero is
 * KNOWN(0) and stays distinct from every one of them.
 */
export interface EmploymentRecord {
  readonly recordId: string;
  /** The Census government identifier, retained for registry crosswalk. */
  readonly censusGovId: string;
  readonly stateFips: string;
  readonly stateUsps: string;
  readonly govTypeCode: string;
  /** The government's name as supplied. Never used as a join key. */
  readonly govName: string;
  /** The survey/reference year, carried on every record so years never merge. */
  readonly referenceYear: number;
  /**
   * The reference date, as the source defines it.
   *
   * ASPEP's reference is the pay period including March 12 of the survey year,
   * so this is that date. It is carried, not assumed, and it is what places each
   * KNOWN measure in time.
   */
  readonly referenceDate: string;
  /** The Census government-function code as published. */
  readonly functionCode: string;
  /** The government-function label as published (e.g. "Police protection"). */
  readonly functionLabel: string;
  readonly estimateBasis: EstimateBasis;
  /** Units for the employee/FTE measures, verbatim (e.g. "employees"). */
  readonly employmentUnits: string;
  /** Units for the payroll measures, verbatim (e.g. "USD (March payroll)"). */
  readonly payrollUnits: string;
  readonly fullTimeEmployees: Sourced<number>;
  readonly partTimeEmployees: Sourced<number>;
  readonly fullTimeEquivalent: Sourced<number>;
  readonly fullTimePayroll: Sourced<number>;
  readonly partTimePayroll: Sourced<number>;
  /** Production-only publisher details; flags are FT count/payroll then PT count/payroll. */
  readonly publisher?: {
    readonly pid6: string;
    readonly identityEvidence: Evidence;
    readonly dataFlags: readonly string[];
    readonly payrollPeriod: { readonly start: string; readonly end: string };
  };
  readonly evidence: Evidence;
}
