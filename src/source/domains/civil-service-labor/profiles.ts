import { unknown } from "../../core/index";
import type { Sourced } from "../../core/index";
import type { CivilServiceLaborRecord, JurisdictionLevel } from "./types";

const STATE_NAMES = {
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

export const JURISDICTIONS: readonly {
  readonly key: string;
  readonly name: string;
  readonly level: JurisdictionLevel;
}[] = [
  {
    key: "US-FEDERAL",
    name: "United States federal government",
    level: "federal",
  },
  ...Object.entries(STATE_NAMES).map(([usps, name]) => ({
    key: `US-${usps}`,
    name,
    level: "state" as const,
  })),
];

function emptyRecord(
  jurisdictionKey: string,
  jurisdictionName: string,
  jurisdictionLevel: JurisdictionLevel,
): CivilServiceLaborRecord {
  const reason =
    "No operative official authority for this field was acquired and verified in the bounded 92P first wave.";
  const makeUnknown = <T>(): Sourced<T> => unknown<T>(reason, []);
  return {
    recordId: jurisdictionKey,
    jurisdictionKey,
    jurisdictionName,
    jurisdictionLevel,
    civilService: {
      recordId: `${jurisdictionKey}:civil-service`,
      jurisdictionKey,
      jurisdictionName,
      jurisdictionLevel,
      classificationDistinction: makeUnknown(),
      appointmentProtection: makeUnknown(),
      removalProtection: makeUnknown(),
      appealBody: makeUnknown(),
      localCivilServiceMandate: makeUnknown(),
    },
    laborBargaining: {
      recordId: `${jurisdictionKey}:labor-bargaining`,
      jurisdictionKey,
      jurisdictionName,
      jurisdictionLevel,
      bargainingCoverage: makeUnknown(),
      bargainingScope: makeUnknown(),
      managementRights: makeUnknown(),
      impasseRule: makeUnknown(),
      strikeRestriction: makeUnknown(),
    },
  };
}

export function compileProfiles(): readonly CivilServiceLaborRecord[] {
  return JURISDICTIONS.map(({ key, name, level }) =>
    emptyRecord(key, name, level),
  );
}
