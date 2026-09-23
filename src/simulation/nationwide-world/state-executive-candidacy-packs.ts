import { executiveRulePackForJurisdiction } from "../executive-authority-rule-packs";
import { knownRule, unknownRule } from "../legislature-rules";
import type { RuleSourceRef } from "../legislature-rules";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";
import {
  DISTRICT_OF_COLUMBIA_JURISDICTION_KEY,
  DISTRICT_OF_COLUMBIA_OFFICE_DISPLAY_NAME,
  DISTRICT_OF_COLUMBIA_OFFICE_KEY,
  DISTRICT_OF_COLUMBIA_OFFICE_TITLE,
  DISTRICT_OF_COLUMBIA_STRUCTURE_SOURCE,
  DISTRICT_OF_COLUMBIA_USPS,
  isDistrictOfColumbia,
} from "./district-of-columbia-identity";

/**
 * Chief executive offices as candidacy packs: the fifty states, and the
 * District of Columbia and the five territories separately.
 *
 * A leaf, like `candidacy-packs.ts` it composes into: no places, no World. It
 * says only that each state has one chief executive office a person can stand
 * for through the existing campaign and contest route. Every qualification,
 * term and filing value stays UNKNOWN here on purpose; candidacy eligibility
 * reads them from RULES at filing time, so admitting a state's facts changes
 * behavior with no edit to this file.
 */

/**
 * The fifty states, and only those. The District of Columbia has a chief
 * executive — a Mayor, not a governor — and is carried separately below, so
 * that everything counting states (congressional seats, electors, statewide
 * contests) keeps counting fifty. The territories, Puerto Rico among them,
 * are carried separately too.
 */
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
 * The five inhabited territories, each of which elects its own Governor.
 *
 * PLACEHOLDER. That each territory has one elected Governor is well known, but
 * the organic acts and territorial constitutions that establish the office
 * were not retrieved here, so no qualification, term or filing value is taken
 * from them: every one stays UNKNOWN below, and the game's own national-range
 * profile fills the gap exactly as it does for an unread state, disclosed as
 * the game's own. The territory research request (`territory-place-identities`)
 * asks for the real rules. A territory is its own government and electorate;
 * nothing here lends it a state's law.
 */
export const US_TERRITORY_GOVERNED_NAMES = {
  PR: "Puerto Rico",
  GU: "Guam",
  VI: "the U.S. Virgin Islands",
  AS: "American Samoa",
  MP: "the Northern Mariana Islands",
} as const;

export type UsTerritoryUsps = keyof typeof US_TERRITORY_GOVERNED_NAMES;

export function isUsTerritoryWithGovernor(key: string): key is UsTerritoryUsps {
  return Object.prototype.hasOwnProperty.call(US_TERRITORY_GOVERNED_NAMES, key);
}

/**
 * Every jurisdiction with a chief executive of its own: the fifty states, the
 * District and the five territories. Producers that mean "each government's
 * own executive" read this; producers that mean "the states" keep reading
 * `US_STATE_USPS`.
 */
export const CHIEF_EXECUTIVE_JURISDICTIONS: readonly string[] = [
  ...US_STATE_USPS,
  DISTRICT_OF_COLUMBIA_USPS,
  ...(Object.keys(US_TERRITORY_GOVERNED_NAMES) as UsTerritoryUsps[]),
];

export function isChiefExecutiveJurisdiction(key: string): boolean {
  return (
    isUsState(key) ||
    isDistrictOfColumbia(key) ||
    isUsTerritoryWithGovernor(key)
  );
}

/** The jurisdiction's own name, for a state, the District or a territory. */
export function chiefExecutiveJurisdictionName(key: string): string {
  if (isDistrictOfColumbia(key)) return "District of Columbia";
  if (isUsTerritoryWithGovernor(key)) {
    return US_TERRITORY_GOVERNED_NAMES[key].replace(/^the /, "");
  }
  return isUsState(key) ? US_STATE_NAMES[key] : key;
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
  /** A state's USPS code, or `DC` for the District. */
  readonly stateUsps: string;
  readonly jurisdictionKey: string;
  /** The accepted executive pack's own key where one exists; else `us-xx-governor`. */
  readonly officeKey: string;
  readonly title: string;
  /** "Governor of Kentucky" — the civic office display name readers match. */
  readonly displayName: string;
  readonly executivePackId: string | null;
  readonly candidacyPackId: string;
}

/**
 * The chief executive office of a state or of the District.
 *
 * The District's row is written out rather than derived from the governor
 * template: a different title, a different display name and its own Home Rule
 * Act citation, so nothing downstream renders a Governor of the District.
 */
export function stateExecutiveIdentity(
  stateUsps: string,
): StateExecutiveIdentity | null {
  if (isDistrictOfColumbia(stateUsps)) return DISTRICT_OF_COLUMBIA_IDENTITY;
  if (isUsTerritoryWithGovernor(stateUsps)) {
    const officeKey = `us-${stateUsps.toLowerCase()}-governor`;
    return {
      stateUsps,
      jurisdictionKey: `US-${stateUsps}`,
      officeKey,
      title: "Governor",
      displayName: `Governor of ${US_TERRITORY_GOVERNED_NAMES[stateUsps]}`,
      executivePackId: null,
      candidacyPackId: `${officeKey}:candidacy`,
    };
  }
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

const DISTRICT_OF_COLUMBIA_IDENTITY: StateExecutiveIdentity = {
  stateUsps: DISTRICT_OF_COLUMBIA_USPS,
  jurisdictionKey: DISTRICT_OF_COLUMBIA_JURISDICTION_KEY,
  officeKey: DISTRICT_OF_COLUMBIA_OFFICE_KEY,
  title: DISTRICT_OF_COLUMBIA_OFFICE_TITLE,
  displayName: DISTRICT_OF_COLUMBIA_OFFICE_DISPLAY_NAME,
  executivePackId: null,
  candidacyPackId: `${DISTRICT_OF_COLUMBIA_OFFICE_KEY}:candidacy`,
};

/** The jurisdiction whose executive office this key names, or null. */
export function stateExecutiveIdentityForOfficeKey(
  officeKey: string,
): StateExecutiveIdentity | null {
  for (const usps of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const identity = stateExecutiveIdentity(usps);
    if (identity?.officeKey === officeKey) return identity;
  }
  return null;
}

const QUALIFICATION_AT_FILING =
  "Read from RULES at filing time for this state's executive office; not recorded in this pack.";
const NO_FILING_PROCEDURE =
  "No filing deadline, filing officer, primary, nomination, or ballot-access procedure has been read for this office.";

const DISTRICT_STRUCTURE_SOURCE: RuleSourceRef = {
  authority: "research-reference",
  citation: "D.C. Code § 1-204.01",
  sourceTitle:
    "District of Columbia Home Rule Act, as the official Code carries it",
  sourceUrl: DISTRICT_OF_COLUMBIA_STRUCTURE_SOURCE,
  retrievedAt: null,
  verification: "partial",
  note: "Cited for the existence of a single elected Mayor and a Council. The section was not retrieved word for word here, and nothing about selection, term or powers is taken from it.",
};

/**
 * PLACEHOLDER. Establishes only that the territory elects one Governor; the
 * organic act or territorial constitution itself was not retrieved.
 */
const TERRITORY_STRUCTURE_SOURCE: RuleSourceRef = {
  authority: "research-reference",
  citation: "Territory research request territory-place-identities",
  sourceTitle: "U.S. territory governments (placeholder until researched)",
  sourceUrl: null,
  retrievedAt: null,
  verification: "unresolved",
  note: "Each inhabited territory elects one Governor. Nothing about who may hold the office, how long a term runs or how a candidate files is taken from this placeholder.",
};

function candidacyPackFor(identity: StateExecutiveIdentity): CandidacyPack {
  const structure = isDistrictOfColumbia(identity.stateUsps)
    ? DISTRICT_STRUCTURE_SOURCE
    : isUsTerritoryWithGovernor(identity.stateUsps)
      ? TERRITORY_STRUCTURE_SOURCE
      : STRUCTURE_SOURCE;
  const option: ElectiveOfficeOption = {
    officeKey: identity.officeKey,
    chamberName: identity.displayName,
    office: {
      officeKey: identity.officeKey,
      title: identity.title,
      seatKey: null,
      occupationClassification: `service:${identity.officeKey}`,
    },
    seats: knownRule(1, structure),
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
  packs ??= CHIEF_EXECUTIVE_JURISDICTIONS.map((usps) =>
    candidacyPackFor(stateExecutiveIdentity(usps)!),
  );
  return packs;
}
