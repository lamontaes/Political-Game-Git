/**
 * County GEOID grammar, checked against the publisher's documentation.
 *
 * The vectors below are official identifiers and their official meanings, not
 * outputs of this parser. 13B N2's finding was a test suite that validated an
 * implementation against the grammar it had itself invented; a grammar test
 * that cannot fail when the grammar is wrong is not a test.
 */

/** Two-digit state (or state-equivalent) FIPS, three-digit county FIPS. */
export const COUNTY_GEOID_PATTERN = /^\d{2}\d{3}$/;

/** Census fully qualified geographic identifier prefix for counties. */
export const COUNTY_GEOIDFQ_PREFIX = "0500000US";

export function isCountyGeoid(value: string): boolean {
  return COUNTY_GEOID_PATTERN.test(value);
}

export function countyGeoidFq(geoid: string): string {
  return `${COUNTY_GEOIDFQ_PREFIX}${geoid}`;
}

/**
 * Official vectors, with the edge cases that break naive implementations.
 *
 * Sources: Census Bureau ANSI/FIPS county code lists and the 2025 Gazetteer
 * counties file layout documentation.
 */
export interface CountyIdentityVector {
  readonly geoid: string;
  readonly stateUsps: string;
  readonly sourceName: string;
  readonly note: string;
}

export const OFFICIAL_COUNTY_VECTORS: readonly CountyIdentityVector[] = [
  {
    geoid: "01001",
    stateUsps: "AL",
    sourceName: "Autauga County",
    note: "The first county in the national file; an ordinary county.",
  },
  {
    geoid: "24510",
    stateUsps: "MD",
    sourceName: "Baltimore city",
    note: "Independent city; distinct from Baltimore County 24005 and published in lower case.",
  },
  {
    geoid: "24005",
    stateUsps: "MD",
    sourceName: "Baltimore County",
    note: "The county that shares Baltimore city's name.",
  },
  {
    geoid: "29510",
    stateUsps: "MO",
    sourceName: "St. Louis city",
    note: "Independent city; distinct from St. Louis County 29189.",
  },
  {
    geoid: "51760",
    stateUsps: "VA",
    sourceName: "Richmond city",
    note: "One of Virginia's independent cities, which are county-equivalents.",
  },
  {
    geoid: "02020",
    stateUsps: "AK",
    sourceName: "Anchorage Municipality",
    note: "Alaska municipality county-equivalent.",
  },
  {
    geoid: "02063",
    stateUsps: "AK",
    sourceName: "Chugach Census Area",
    note: "Alaska census area: a county-equivalent with no county government at all.",
  },
  {
    geoid: "22001",
    stateUsps: "LA",
    sourceName: "Acadia Parish",
    note: "Louisiana parish county-equivalent.",
  },
  {
    geoid: "11001",
    stateUsps: "DC",
    sourceName: "District of Columbia",
    note: "The District is its own state-equivalent and county-equivalent.",
  },
  {
    geoid: "72001",
    stateUsps: "PR",
    sourceName: "Adjuntas Municipio",
    note: "Puerto Rico municipio county-equivalent.",
  },
];
