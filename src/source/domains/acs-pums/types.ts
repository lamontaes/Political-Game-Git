/**
 * American Community Survey Public Use Microdata Sample records.
 *
 * A PUMS record is one sampled housing unit or one sampled person, carrying the
 * survey weight that makes it stand for many. It is a *sample observation*, and
 * that is the whole difficulty with it: a record describes a real respondent's
 * answers, and it supports population estimates for a public use microdata
 * area, but it supports no statement at all about any particular household in
 * the game world, and no behavioural rate, biography or household-formation
 * probability may be derived from it.
 *
 * Every variable is `Sourced<T>` because the dictionary says so. PUMS uses a
 * blank cell for "not applicable", declares legitimate negative values for
 * income losses, and declares an explicit suppression code on at least one
 * variable. Reading a blank as zero, or a loss as missing, is exactly the
 * conflation the algebra exists to make impossible.
 */

import type { Evidence, Sourced } from "../../core/index";

/** One PUMS variable's value, in whichever state the dictionary implies. */
export type PumsValue = Sourced<string | number>;

export interface PumsPersonRecord {
  /** Housing unit / group quarters serial number. Links a person to a unit. */
  readonly serialNumber: string;
  /** Person sequence number within the unit. */
  readonly personNumber: number;
  /**
   * The person weight.
   *
   * PWGTP, kept distinct from the housing unit weight WGTP. They count
   * different universes and are not interchangeable.
   */
  readonly personWeight: PumsValue;
  readonly variables: Readonly<Record<string, PumsValue>>;
  readonly evidence: Evidence;
}

export interface PumsHousingRecord {
  readonly serialNumber: string;
  /**
   * The housing unit weight.
   *
   * WGTP, which is zero on a group-quarters placeholder record by the
   * dictionary's own definition rather than by anything missing.
   */
  readonly housingWeight: PumsValue;
  readonly variables: Readonly<Record<string, PumsValue>>;
  /** The persons enumerated in this unit, in published SPORDER order. */
  readonly persons: readonly PumsPersonRecord[];
  readonly evidence: Evidence;
}
