import { executiveRulePackForJurisdiction } from "../executive-authority-rule-packs";
import { knownRule, unknownRule } from "../legislature-rules";
import type { RuleSourceRef } from "../legislature-rules";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";

/**
 * State executive offices as candidacy packs, for all fifty states.
 *
 * A leaf, like `candidacy-packs.ts` it composes into: no places, no World. It
 * says only that each state has one chief executive office a person can stand
 * for through the existing campaign and contest route. Every qualification,
 * term and filing value stays UNKNOWN here on purpose; candidacy eligibility
 * reads them from RULES at filing time, so admitting a state's facts changes
 * behavior with no edit to this file.
 */

/** The fifty states. DC and Puerto Rico are places, not states with governors. */
export const US_STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
} as const;

export type UsStateUsps = keyof typeof US_STATE_NAMES;

export const US_STATE_USPS = Object.keys(
  US_STATE_NAMES,
) as readonly UsStateUsps[];

export function isUsState(stateUsps: string): stateUsps is UsStateUsps {
  return Object.prototype.hasOwnProperty.call(US_STATE_NAMES, stateUsps);
}

/**
 * Structural index for "every state government has a governor as its chief
 * executive": an index to each state's constitution, not a term, power,
 * qualification or selection rule.
 */
export const STATE_GOVERNMENT_STRUCTURE_SOURCE =
  "https://www.census.gov/library/publications/2024/econ/2022isd.html";

const STRUCTURE_SOURCE: RuleSourceRef = {
  authority: "research-reference",
  citation: "U.S. Census Bureau, 2022 Individual State Descriptions",
  sourceTitle: "Individual State Descriptions: 2022",
  sourceUrl: STATE_GOVERNMENT_STRUCTURE_SOURCE,
  retrievedAt: null,
  verification: "partial",
  note: "Indexes each state constitution's single chief executive office. Establishes the office exists, nothing about who may hold it or for how long.",
};

export interface StateExecutiveIdentity {
  readonly stateUsps: UsStateUsps;
  readonly jurisdictionKey: string;
  /** The accepted executive pack's own key where one exists; else `us-xx-governor`. */
  readonly officeKey: string;
  readonly title: string;
  /** "Governor of Kentucky" — the civic office display name readers match. */
  readonly displayName: string;
  readonly executivePackId: string | null;
  readonly candidacyPackId: string;
}

export function stateExecutiveIdentity(
  stateUsps: string,
): StateExecutiveIdentity | null {
  if (!isUsState(stateUsps)) return null;
  const jurisdictionKey = `US-${stateUsps}`;
  const pack = executiveRulePackForJurisdiction(jurisdictionKey);
  const officeKey =
    pack?.office.officeKey ?? `us-${stateUsps.toLowerCase()}-governor`;
  return {
    stateUsps,
    jurisdictionKey,
    officeKey,
    title: pack?.office.title ?? "Governor",
    displayName:
      pack?.displayName ?? `Governor of ${US_STATE_NAMES[stateUsps]}`,
    executivePackId: pack?.packId ?? null,
    candidacyPackId: `${officeKey}:candidacy`,
  };
}

/** The state whose executive office this key names, or null. */
export function stateExecutiveIdentityForOfficeKey(
  officeKey: string,
): StateExecutiveIdentity | null {
  for (const usps of US_STATE_USPS) {
    const identity = stateExecutiveIdentity(usps);
    if (identity?.officeKey === officeKey) return identity;
  }
  return null;
}

const QUALIFICATION_AT_FILING =
  "Read from RULES at filing time for this state's executive office; not recorded in this pack.";
const NO_FILING_PROCEDURE =
  "No filing deadline, filing officer, primary, nomination, or ballot-access procedure has been read for this office.";

function candidacyPackFor(identity: StateExecutiveIdentity): CandidacyPack {
  const option: ElectiveOfficeOption = {
    officeKey: identity.officeKey,
    chamberName: identity.displayName,
    office: {
      officeKey: identity.officeKey,
      title: identity.title,
      seatKey: null,
      occupationClassification: `service:${identity.officeKey}`,
    },
    seats: knownRule(1, STRUCTURE_SOURCE),
    recordedBy: {
      packId: identity.candidacyPackId,
      packName: identity.displayName,
    },
    qualification: {
      minimumAge: unknownRule(QUALIFICATION_AT_FILING),
      residency: unknownRule(QUALIFICATION_AT_FILING),
      termYears: unknownRule(QUALIFICATION_AT_FILING),
      filing: unknownRule(NO_FILING_PROCEDURE),
    },
    unresolvedGaps: [NO_FILING_PROCEDURE],
  };
  return {
    packId: identity.candidacyPackId,
    jurisdictionKey: identity.jurisdictionKey,
    displayName: identity.displayName,
    legislativeRulePackId: identity.executivePackId ?? identity.officeKey,
    offices: [option],
    unresolvedGaps: [
      NO_FILING_PROCEDURE,
      "No primary, party nomination or ballot-access rule is sourced, so a filing here is a general-election candidacy and nothing more.",
    ],
  };
}

let packs: readonly CandidacyPack[] | null = null;

export function stateExecutiveCandidacyPacks(): readonly CandidacyPack[] {
  packs ??= US_STATE_USPS.map((usps) =>
    candidacyPackFor(stateExecutiveIdentity(usps)!),
  );
  return packs;
}
