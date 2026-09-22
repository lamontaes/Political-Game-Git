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
}

export const EASTERN = { timeZone: "America/New_York", utcOffsetMinutes: -300 };
const CENTRAL = { timeZone: "America/Chicago", utcOffsetMinutes: -360 };
const MOUNTAIN = { timeZone: "America/Denver", utcOffsetMinutes: -420 };
const PACIFIC = { timeZone: "America/Los_Angeles", utcOffsetMinutes: -480 };

export const STATES: Readonly<Record<string, StateReference>> = {
  AL: { name: "Alabama", ...CENTRAL },
  AK: { name: "Alaska", timeZone: "America/Anchorage", utcOffsetMinutes: -540 },
  AZ: { name: "Arizona", timeZone: "America/Phoenix", utcOffsetMinutes: -420 },
  AR: { name: "Arkansas", ...CENTRAL },
  CA: { name: "California", ...PACIFIC },
  CO: { name: "Colorado", ...MOUNTAIN },
  CT: { name: "Connecticut", ...EASTERN },
  DE: { name: "Delaware", ...EASTERN },
  DC: { name: "District of Columbia", ...EASTERN },
  FL: { name: "Florida", ...EASTERN },
  GA: { name: "Georgia", ...EASTERN },
  HI: { name: "Hawaii", timeZone: "Pacific/Honolulu", utcOffsetMinutes: -600 },
  ID: { name: "Idaho", ...MOUNTAIN },
  IL: { name: "Illinois", ...CENTRAL },
  IN: { name: "Indiana", ...EASTERN },
  IA: { name: "Iowa", ...CENTRAL },
  KS: { name: "Kansas", ...CENTRAL },
  KY: { name: "Kentucky", ...EASTERN },
  LA: { name: "Louisiana", ...CENTRAL },
  ME: { name: "Maine", ...EASTERN },
  MD: { name: "Maryland", ...EASTERN },
  MA: { name: "Massachusetts", ...EASTERN },
  MI: { name: "Michigan", ...EASTERN },
  MN: { name: "Minnesota", ...CENTRAL },
  MS: { name: "Mississippi", ...CENTRAL },
  MO: { name: "Missouri", ...CENTRAL },
  MT: { name: "Montana", ...MOUNTAIN },
  NE: { name: "Nebraska", ...CENTRAL },
  NV: { name: "Nevada", ...PACIFIC },
  NH: { name: "New Hampshire", ...EASTERN },
  NJ: { name: "New Jersey", ...EASTERN },
  NM: { name: "New Mexico", ...MOUNTAIN },
  NY: { name: "New York", ...EASTERN },
  NC: { name: "North Carolina", ...EASTERN },
  ND: { name: "North Dakota", ...CENTRAL },
  OH: { name: "Ohio", ...EASTERN },
  OK: { name: "Oklahoma", ...CENTRAL },
  OR: { name: "Oregon", ...PACIFIC },
  PA: { name: "Pennsylvania", ...EASTERN },
  RI: { name: "Rhode Island", ...EASTERN },
  SC: { name: "South Carolina", ...EASTERN },
  SD: { name: "South Dakota", ...CENTRAL },
  TN: { name: "Tennessee", ...CENTRAL },
  TX: { name: "Texas", ...CENTRAL },
  UT: { name: "Utah", ...MOUNTAIN },
  VT: { name: "Vermont", ...EASTERN },
  VA: { name: "Virginia", ...EASTERN },
  WA: { name: "Washington", ...PACIFIC },
  WV: { name: "West Virginia", ...EASTERN },
  WI: { name: "Wisconsin", ...CENTRAL },
  WY: { name: "Wyoming", ...MOUNTAIN },
  PR: {
    name: "Puerto Rico",
    timeZone: "America/Puerto_Rico",
    utcOffsetMinutes: -240,
  },
};
