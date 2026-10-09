import { researchRuleTable } from "./research-rule-tables";

const reference = researchRuleTable("stateReference");

/**
 * Postal state reference, standing alone so anything may read it.
 *
 * This lived inside `life-places.ts`, which is a heavy module: it reaches the
 * place corpus, the legislative scenarios and the rule packs. Anything wanting
 * only a state's name had to drag all of that in, and the generated legislature
 * profile could not — importing it closed a cycle through the rule packs and
 * left `KENTUCKY_RULE_PACK` undefined at module initialization.
 *
 * So the table sits here, importing nothing.
 */

/**
 * State reference: the resident-facing name and a default game-clock timezone.
 *
 * This is standard postal and timezone reference, not a claim the place corpus
 * makes. The corpus establishes which state a place is in (its USPS code); this
 * names that state for a player and gives the simulation clock a sensible
 * standard-time default where a place is played as an ordinary life. A state
 * that spans zones is given its primary one; nothing here is presented to the
 * player as the exact civil time of a specific town.
 */
export interface StateReference {
  readonly name: string;
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
  readonly jurisdictionKind: "state" | "federal-district" | "territory";
  readonly electorAllocation:
    "winner-take-all" | "congressional-district" | "none";
}

/**
 * The five inhabited territories. Each is its own government and electorate:
 * not a state, with no state's rules, and with a Delegate or (Puerto Rico) a
 * Resident Commissioner in the House and nobody in the Senate.
 */

export function isTerritoryUsps(usps: string | null | undefined): boolean {
  return usps != null && TERRITORY_USPS.has(usps);
}

/**
 * The seat of the national government (U.S. Const. art. I, § 8, cl. 17): no
 * state and no territory. One government, its Mayor and Council, is both its
 * local and its state-level government, so its home is that government.
 */

export function isFederalDistrictUsps(
  usps: string | null | undefined,
): boolean {
  return usps != null && FEDERAL_DISTRICT_USPS.has(usps);
}

export function isFederalDistrictJurisdictionKey(
  jurisdictionKey: string,
): boolean {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  return isFederalDistrictUsps(usps);
}

/**
 * What each territory and the District call the member they send to the U.S.
 * House, who sits on committees but casts no final vote: Puerto Rico's
 * Resident Commissioner (48 U.S.C. § 891), and a Delegate from the District
 * (2 U.S.C. § 25a), Guam and the Virgin Islands (48 U.S.C. § 1711), American
 * Samoa (48 U.S.C. § 1731) and the Northern Mariana Islands (48 U.S.C.
 * § 1751).
 */
export const NONVOTING_HOUSE_MEMBER_TITLE: Readonly<
  Record<string, "Resident Commissioner" | "Delegate">
> = reference.nonvotingHouseMemberTitles as Readonly<
  Record<string, "Resident Commissioner" | "Delegate">
>;

/** The nonvoting House member's title for a place that sends one, else null. */
export function nonvotingHouseMemberTitle(
  usps: string,
): "Resident Commissioner" | "Delegate" | null {
  return Object.hasOwn(NONVOTING_HOUSE_MEMBER_TITLE, usps)
    ? NONVOTING_HOUSE_MEMBER_TITLE[usps]!
    : null;
}

/**
 * What a birth in each territory confers. Every state and the District confer
 * citizenship (Fourteenth Amendment; 8 U.S.C. § 1401). Four territories do by
 * statute: Puerto Rico (§ 1402), the Virgin Islands (§ 1406), Guam (§ 1407)
 * and the Northern Mariana Islands (Covenant § 303, 48 U.S.C. § 1801 note).
 * American Samoa confers nationality, not citizenship (§ 1408).
 */
export const TERRITORY_BIRTH_STATUS: Readonly<
  Record<string, "citizen" | "national">
> = reference.territoryBirthStatus as Readonly<
  Record<string, "citizen" | "national">
>;

/**
 * Whether a birth in this state or territory, keyed `US-KY`, makes a person a
 * citizen. A key the table cannot read answers false rather than guessing.
 */
export function birthConfersCitizenship(stateJurisdictionKey: string): boolean {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1];
  if (usps === undefined) return false;
  if (isTerritoryUsps(usps)) return TERRITORY_BIRTH_STATUS[usps] === "citizen";
  return Object.hasOwn(STATES, usps);
}

export const EASTERN = reference.defaultClockZone as {
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
};

export const STATES: Readonly<Record<string, StateReference>> =
  reference.places as Readonly<Record<string, StateReference>>;

/** Postal code to reference name, shared by simulation and presentation readers. */
export const US_POSTAL_NAMES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(STATES).map(([usps, state]) => [usps, state.name]),
  ),
);

export function stateNameForUsps(usps: string): string | null {
  return US_POSTAL_NAMES[usps] ?? null;
}

/** Existing public classification sets, derived from the one place column. */
export const TERRITORY_USPS: ReadonlySet<string> = new Set(
  Object.entries(STATES)
    .filter(([, place]) => place.jurisdictionKind === "territory")
    .map(([usps]) => usps),
);
export const FEDERAL_DISTRICT_USPS: ReadonlySet<string> = new Set(
  Object.entries(STATES)
    .filter(([, place]) => place.jurisdictionKind === "federal-district")
    .map(([usps]) => usps),
);
