/**
 * BLS Local Area Unemployment Statistics.
 *
 * One record is one published observation: a series, a period, and either a
 * value or the Bureau's own reason there is none. LAUS is a model-based
 * estimate rather than a count, and the fields that say so travel with it —
 * whether the series is seasonally adjusted, whether the value is preliminary,
 * and which footnote the Bureau attached.
 *
 * An unemployment rate is a rate for an area, not a statement about any person
 * in it, and nothing here supports an individual's employment status.
 */

import type { Evidence, Sourced } from "../../core/index";

/** The measure a series reports, from BLS's own la.measure table. */
export interface LausMeasure {
  readonly code: string;
  readonly text: string;
}

/** The area a series covers, from BLS's own la.area and la.area_type tables. */
export interface LausArea {
  readonly areaCode: string;
  readonly areaText: string;
  readonly areaTypeCode: string;
  readonly areaTypeText: string;
}

export interface LausObservationRecord {
  readonly recordId: string;
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly area: LausArea;
  readonly measure: LausMeasure;
  /**
   * `S` seasonally adjusted or `U` not adjusted, as published.
   *
   * A seasonally adjusted series and an unadjusted one for the same area and
   * measure are different series with different values, and comparing them is
   * a mistake the code cannot make if the flag is on every record.
   */
  readonly seasonalAdjustmentCode: string;
  readonly year: string;
  /** BLS period code: `M01`-`M12` for months, `M13` for an annual average. */
  readonly period: string;
  /** True for `M13`, which is an annual average rather than a month. */
  readonly isAnnualAverage: boolean;
  /** Footnote codes the Bureau attached to this observation, as published. */
  readonly footnoteCodes: readonly string[];
  /** The Bureau's own text for each of those codes. */
  readonly footnoteTexts: readonly string[];
  /** The estimate, or the state the Bureau's footnote puts it in. */
  readonly value: Sourced<number>;
  readonly evidence: Evidence;
}
