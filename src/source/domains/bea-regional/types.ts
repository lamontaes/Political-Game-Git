/**
 * Bureau of Economic Analysis regional statistics.
 *
 * One record is one published estimate: a table, a line code, a geography, a
 * year, a unit and a value — or, where the Bureau withheld it, the reason it is
 * absent. The unit and the valuation basis travel with the number because
 * without them it is not a number: "Thousands of dollars" of personal income
 * and an index where the national average is 100 are not comparable, and a
 * substrate that lets them add is worse than one with no data at all.
 *
 * A regional price parity is a price level relative to the national average. It
 * is not a cost-of-living score, it does not rank places, and nothing here may
 * be turned into one.
 */

import type { Evidence, Sourced } from "../../core/index";

/**
 * Which geography a row describes.
 *
 * Derived from the product the row came from rather than guessed from the
 * shape of its identifier: BEA's MSA tables contain MSA codes and its county
 * tables contain county codes, and a five-digit code alone cannot tell you
 * which — the bug the audit found classified Austin's MSA as a county because
 * every five-digit code matched the county branch first.
 */
export type BeaGeographyLevel =
  "nation" | "state" | "county" | "msa" | "region-or-aggregate";

/** What kind of quantity a value is. Never mixed across kinds. */
export type BeaValuationKind =
  "currency-amount" | "currency-per-person" | "headcount" | "index";

export interface BeaObservationRecord {
  readonly recordId: string;
  /** BEA table name, e.g. CAINC1, SARPP, MARPP. */
  readonly tableName: string;
  /** BEA line code within the table. */
  readonly lineCode: string;
  /** The Bureau's own description of the line, from the table definition. */
  readonly lineDescription: string;
  /** The row's own description, which can differ from the line definition. */
  readonly rowDescription: string;
  readonly geoFips: string;
  readonly geoName: string;
  readonly geographyLevel: BeaGeographyLevel;
  /** BEA region number, where the product states one. */
  readonly beaRegion: string | null;
  readonly unit: string;
  readonly valuationKind: BeaValuationKind;
  /** The year this observation is for. */
  readonly year: string;
  /** The estimate, or the state the Bureau's own code puts it in. */
  readonly value: Sourced<number>;
  readonly evidence: Evidence;
}
