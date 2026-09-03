/**
 * Federal court identity and judicial geography, from the statutes themselves.
 *
 * A record establishes that a statute creates this court, gives it this
 * territory and directs that court be held in these places. It establishes
 * nothing about the judges who sit on it, how they were appointed, how they
 * rule, or whether any person may bring an action there. Court identity is not
 * judicial ideology, case outcome, or anybody's eligibility.
 *
 * The corpus deliberately does *not* assert a constitutional basis for each
 * court. "Article III court" and "Article I legislative court" are legal
 * characterisations that the sections establishing these courts do not state,
 * and this substrate records what its artifacts say. What it does record is
 * which title and section established the court, which is the fact a reader
 * needs in order to reach that conclusion themselves.
 */

import type { Evidence } from "../../core/index";

export type FederalCourtKind =
  | "court-of-appeals"
  | "district-court"
  | "bankruptcy-court";

/** A statutory division of a judicial district. */
export interface JudicialDivision {
  readonly divisionName: string;
  /** The counties the statute assigns to the division, in published order. */
  readonly comprisesCounties: readonly string[];
  /** The places the statute directs that court be held, in published order. */
  readonly courtHeldAt: readonly string[];
  readonly evidence: Evidence;
}

export interface FederalCourtRecord {
  readonly courtId: string;
  readonly courtKind: FederalCourtKind;
  /** The court's name as this substrate composes it from the statutory text. */
  readonly courtName: string;
  /** The U.S. Code citation that establishes the court. */
  readonly establishedByCitation: string;
  /** 28 or 48 — which title's artifact the record was read from. */
  readonly statutoryTitle: 28 | 48;

  /** Courts of appeals only: the circuit's published designation. */
  readonly circuitDesignation: string | null;
  /**
   * Courts of appeals only: the jurisdictions 28 U.S.C. § 41 assigns to the
   * circuit, verbatim and in published order.
   *
   * Preserved exactly as the statute reads, including entries Congress has
   * never repealed — the Fifth Circuit's composition still names the District
   * of the Canal Zone. Silently modernising the list would be this substrate
   * asserting a statutory amendment that has not happened.
   */
  readonly composition: readonly string[] | null;

  /** District and bankruptcy courts only: the circuit the court sits in. */
  readonly circuitId: string | null;
  /** District and bankruptcy courts only: the state or territory. */
  readonly jurisdictionName: string | null;
  /** District courts only: the statutory divisions, in published order. */
  readonly divisions: readonly JudicialDivision[] | null;
  /** District courts only: places named for the district as a whole. */
  readonly courtHeldAt: readonly string[] | null;
  /** Bankruptcy courts only: the district court this court is a unit of. */
  readonly parentDistrictCourtId: string | null;

  readonly evidence: Evidence;
}
