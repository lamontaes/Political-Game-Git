/**
 * 2020 Census place-within-county parts.
 *
 * A record says that some of a Census place's 2020 land and water lies in one
 * county area, and how much. A place in one county has one record; a place
 * across several counties has one per county. Shares come from the
 * publisher's measured areas, never from a name, a centroid or an interior
 * point, and nothing here says which government serves anyone.
 */

import type { Evidence } from "../../core/index";

/**
 * The publisher's PARTFLAG on the place-within-county row, verbatim.
 *
 * The 2020 Redistricting Data technical documentation defines "W" as "Not a
 * part" and "P" as "Part". On these rows it describes the county component,
 * not whether the place is split: a Virginia independent city, whose county
 * equivalent is the city, is "W". Whether a place spans counties is read from
 * how many county parts it has, never from this flag.
 */
export type PublisherPartFlag = "W" | "P";

export interface PlaceCountyPartRecord {
  /** `${placeGeoid}:${countyGeoid}` */
  readonly recordId: string;
  /** 2020 Census place GEOID (state FIPS + place FIPS). */
  readonly placeGeoid: string;
  /** 2020 county or county-equivalent GEOID (state FIPS + county FIPS). */
  readonly countyGeoid: string;
  readonly stateFips: string;
  readonly partLandAreaSquareMeters: number;
  readonly partWaterAreaSquareMeters: number;
  /** The place's land area: the sum of its county parts' land. */
  readonly placeLandAreaSquareMeters: number;
  /** How many county parts the place has in the file. */
  readonly placeCountyPartCount: number;
  readonly publisherPartFlag: PublisherPartFlag;
  readonly evidence: Evidence;
}
