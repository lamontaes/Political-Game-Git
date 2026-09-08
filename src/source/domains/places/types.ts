/**
 * Incorporated place and census designated place identity.
 *
 * A row establishes that the Census Bureau lists this place under this
 * identifier with this published name, legal/statistical class, functional
 * status, area and interior point. It establishes no municipal power: whether a
 * place has home rule, what its government may do and who holds office are
 * separate facts with separate first-party evidence.
 *
 * `LSAD` and `FUNCSTAT` are carried as the publisher's own codes rather than
 * translated into a category of this substrate's invention, so a reader can
 * check them against the Census code list rather than against this compiler.
 */

import type { Evidence } from "../../core/index";

export interface PlaceInteriorPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface PlaceRecord {
  /** Two state digits followed by the five-digit place code, as published. */
  readonly geoid: string;
  /** The fully qualified Census identifier, `1600000US{geoid}`. */
  readonly geoidFq: string;
  readonly stateFips: string;
  readonly placeFips: string;
  readonly stateUsps: string;
  readonly ansiCode: string;
  /** The Census NAME field verbatim, e.g. "Abanda CDP", "Abbeville city". */
  readonly sourceName: string;
  /**
   * The name with its legal/statistical description removed.
   *
   * A derivation, not a published field. It exists because the Gazetteer
   * appends the class to the name ("Abbeville city"), and a place's name is not
   * its class. The suffix that was removed stays recoverable from `sourceName`
   * and `legalStatisticalAreaDescriptionCode`.
   */
  readonly displayName: string;
  /** Census LSAD code, verbatim. Not translated. */
  readonly legalStatisticalAreaDescriptionCode: string;
  /** Census FUNCSTAT code, verbatim. Not translated, and not a power. */
  readonly functionalStatusCode: string;
  readonly landAreaSquareMeters: number;
  readonly waterAreaSquareMeters: number;
  readonly landAreaSquareMiles: number;
  readonly waterAreaSquareMiles: number;
  readonly interiorPoint: PlaceInteriorPoint;
  readonly evidence: Evidence;
}
