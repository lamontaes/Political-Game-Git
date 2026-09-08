/**
 * The Census government identifier, as a shape only.
 *
 * Three domains now key on this code — government-units, which establishes that
 * a government exists under it; government-finances, which reports what one
 * fiscal line of its ledger read; and public-employment, which reports how many
 * people staffed one of its functions. All three must agree on what a
 * well-formed identifier *is*, and none of them may join on a government's name.
 *
 * The substrate forbids one domain importing another (A17), and rightly: a
 * finance record must not inherit a government-unit's semantics by the back
 * door. But the alternative — each domain carrying its own `/^\d{14}$/` — is how
 * two copies of a grammar drift apart. So the grammar lives here, in the core
 * every domain already imports, and `government-units/identity.ts` re-exports it
 * under its own established names.
 *
 * What lives here is deliberately only the shape. Decomposing the code into its
 * state, type, county, unit, supplement and sub components is a claim about what
 * a government *is*, and that belongs to the government-units domain that owns
 * government identity. A finance or employment record has no business making it:
 * those domains carry the identifier whole, as an opaque join key, and a later
 * crosswalk pass resolves it against the registry by code.
 */

/**
 * A Census government identifier is exactly fourteen digits.
 *
 * It is not a FIPS code and not a GEOID; it locates a unit within the Bureau's
 * own numbering. Leading zeros are significant, which is why it is a string
 * everywhere and never a number.
 */
export const CENSUS_GOVERNMENT_ID_PATTERN = /^\d{14}$/;

/** True when a string is a well-formed 14-digit Census government identifier. */
export function isCensusGovernmentId(value: string): boolean {
  return CENSUS_GOVERNMENT_ID_PATTERN.test(value);
}
