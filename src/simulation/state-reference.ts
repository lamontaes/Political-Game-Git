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
> = {
  PR: "Resident Commissioner",
  DC: "Delegate",
  GU: "Delegate",
  VI: "Delegate",
  AS: "Delegate",
  MP: "Delegate",
};

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
> = {
  PR: "citizen",
  VI: "citizen",
  GU: "citizen",
  MP: "citizen",
  AS: "national",
};

/**
 * Whether a birth in this state or territory, keyed `US-KY`, makes a person a
 * citizen. A key the table cannot read answers false rather than guessing.
 */
export function birthConfersCitizenship(stateJurisdictionKey: string): boolean {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1];
  if (usps === undefined) return false;
  if (isTerritoryUsps(usps)) return TERRITORY_BIRTH_STATUS[usps] === "citizen";
  return true;
}

export const EASTERN = { timeZone: "America/New_York", utcOffsetMinutes: -300 };
const CENTRAL = { timeZone: "America/Chicago", utcOffsetMinutes: -360 };
const MOUNTAIN = { timeZone: "America/Denver", utcOffsetMinutes: -420 };
const PACIFIC = { timeZone: "America/Los_Angeles", utcOffsetMinutes: -480 };

export const STATES: Readonly<Record<string, StateReference>> = {
  AL: {
    name: "Alabama",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  AK: {
    name: "Alaska",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    timeZone: "America/Anchorage",
    utcOffsetMinutes: -540,
  },
  AZ: {
    name: "Arizona",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    timeZone: "America/Phoenix",
    utcOffsetMinutes: -420,
  },
  AR: {
    name: "Arkansas",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  CA: {
    name: "California",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...PACIFIC,
  },
  CO: {
    name: "Colorado",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  CT: {
    name: "Connecticut",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  DE: {
    name: "Delaware",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  DC: {
    name: "District of Columbia",
    jurisdictionKind: "federal-district",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  FL: {
    name: "Florida",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  GA: {
    name: "Georgia",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  HI: {
    name: "Hawaii",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    timeZone: "Pacific/Honolulu",
    utcOffsetMinutes: -600,
  },
  ID: {
    name: "Idaho",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  IL: {
    name: "Illinois",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  IN: {
    name: "Indiana",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  IA: {
    name: "Iowa",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  KS: {
    name: "Kansas",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  KY: {
    name: "Kentucky",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  LA: {
    name: "Louisiana",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  ME: {
    name: "Maine",
    jurisdictionKind: "state",
    electorAllocation: "congressional-district",
    ...EASTERN,
  },
  MD: {
    name: "Maryland",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  MA: {
    name: "Massachusetts",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  MI: {
    name: "Michigan",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  MN: {
    name: "Minnesota",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  MS: {
    name: "Mississippi",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  MO: {
    name: "Missouri",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  MT: {
    name: "Montana",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  NE: {
    name: "Nebraska",
    jurisdictionKind: "state",
    electorAllocation: "congressional-district",
    ...CENTRAL,
  },
  NV: {
    name: "Nevada",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...PACIFIC,
  },
  NH: {
    name: "New Hampshire",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  NJ: {
    name: "New Jersey",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  NM: {
    name: "New Mexico",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  NY: {
    name: "New York",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  NC: {
    name: "North Carolina",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  ND: {
    name: "North Dakota",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  OH: {
    name: "Ohio",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  OK: {
    name: "Oklahoma",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  OR: {
    name: "Oregon",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...PACIFIC,
  },
  PA: {
    name: "Pennsylvania",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  RI: {
    name: "Rhode Island",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  SC: {
    name: "South Carolina",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  SD: {
    name: "South Dakota",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  TN: {
    name: "Tennessee",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  TX: {
    name: "Texas",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  UT: {
    name: "Utah",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  VT: {
    name: "Vermont",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  VA: {
    name: "Virginia",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  WA: {
    name: "Washington",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...PACIFIC,
  },
  WV: {
    name: "West Virginia",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...EASTERN,
  },
  WI: {
    name: "Wisconsin",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...CENTRAL,
  },
  WY: {
    name: "Wyoming",
    jurisdictionKind: "state",
    electorAllocation: "winner-take-all",
    ...MOUNTAIN,
  },
  PR: {
    name: "Puerto Rico",
    jurisdictionKind: "territory",
    electorAllocation: "none",
    timeZone: "America/Puerto_Rico",
    utcOffsetMinutes: -240,
  },
  // The four other inhabited territories. Each is its own government and
  // electorate, never a state; listing one here gives it a name and a clock
  // and nothing else. Their places come from `territory-places.ts`, because
  // the Census Gazetteer behind the national place list does not cover them.
  GU: {
    name: "Guam",
    jurisdictionKind: "territory",
    electorAllocation: "none",
    timeZone: "Pacific/Guam",
    utcOffsetMinutes: 600,
  },
  VI: {
    name: "U.S. Virgin Islands",
    jurisdictionKind: "territory",
    electorAllocation: "none",
    timeZone: "America/St_Thomas",
    utcOffsetMinutes: -240,
  },
  AS: {
    name: "American Samoa",
    jurisdictionKind: "territory",
    electorAllocation: "none",
    timeZone: "Pacific/Pago_Pago",
    utcOffsetMinutes: -660,
  },
  MP: {
    name: "Northern Mariana Islands",
    jurisdictionKind: "territory",
    electorAllocation: "none",
    timeZone: "Pacific/Saipan",
    utcOffsetMinutes: 600,
  },
};

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
