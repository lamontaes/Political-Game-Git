/**
 * What a state calls its counties. Ported from the old engine's
 * `nationwide-world/government-unit-names.ts`.
 */

/** What a state calls its counties, in the singular and the plural. */
export interface CountyEquivalentTerm {
  readonly singular: string;
  readonly plural: string;
}

const COUNTY_TERM: CountyEquivalentTerm = {
  singular: "county",
  plural: "counties",
};

/**
 * Louisiana divides into parishes and Alaska into boroughs; every other state
 * and the District of Columbia say county. A screen naming the unit a place
 * lies in uses this word, so "Calcasieu Parish" is never followed by a
 * sentence about counties.
 */
const COUNTY_EQUIVALENT_TERMS: ReadonlyMap<string, CountyEquivalentTerm> =
  new Map([
    ["US-LA", { singular: "parish", plural: "parishes" }],
    ["US-AK", { singular: "borough", plural: "boroughs" }],
  ]);

export function countyEquivalentTerm(
  stateJurisdictionKey: string | null,
): CountyEquivalentTerm {
  return (
    (stateJurisdictionKey
      ? COUNTY_EQUIVALENT_TERMS.get(stateJurisdictionKey)
      : undefined) ?? COUNTY_TERM
  );
}
