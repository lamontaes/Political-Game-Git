import type { BoundaryChamberType, StateIdentifier } from "./types.js";

/**
 * State lookup table including all 50 states, District of Columbia, and Puerto Rico.
 * Contains 2-digit FIPS, 2-letter Postal abbreviation, Full Name, and Census ANSI code.
 */
export const STATE_MASTER_TABLE: Record<string, StateIdentifier> = {
  AL: {
    stateFips: "01",
    statePostal: "AL",
    stateName: "Alabama",
    ansiCode: "01779775",
  },
  AK: {
    stateFips: "02",
    statePostal: "AK",
    stateName: "Alaska",
    ansiCode: "01785533",
  },
  AZ: {
    stateFips: "04",
    statePostal: "AZ",
    stateName: "Arizona",
    ansiCode: "01779777",
  },
  AR: {
    stateFips: "05",
    statePostal: "AR",
    stateName: "Arkansas",
    ansiCode: "00068085",
  },
  CA: {
    stateFips: "06",
    statePostal: "CA",
    stateName: "California",
    ansiCode: "01779778",
  },
  CO: {
    stateFips: "08",
    statePostal: "CO",
    stateName: "Colorado",
    ansiCode: "01779779",
  },
  CT: {
    stateFips: "09",
    statePostal: "CT",
    stateName: "Connecticut",
    ansiCode: "01779780",
  },
  DE: {
    stateFips: "10",
    statePostal: "DE",
    stateName: "Delaware",
    ansiCode: "01779781",
  },
  DC: {
    stateFips: "11",
    statePostal: "DC",
    stateName: "District of Columbia",
    ansiCode: "01702382",
  },
  FL: {
    stateFips: "12",
    statePostal: "FL",
    stateName: "Florida",
    ansiCode: "00294478",
  },
  GA: {
    stateFips: "13",
    statePostal: "GA",
    stateName: "Georgia",
    ansiCode: "01705317",
  },
  HI: {
    stateFips: "15",
    statePostal: "HI",
    stateName: "Hawaii",
    ansiCode: "01779782",
  },
  ID: {
    stateFips: "16",
    statePostal: "ID",
    stateName: "Idaho",
    ansiCode: "01779783",
  },
  IL: {
    stateFips: "17",
    statePostal: "IL",
    stateName: "Illinois",
    ansiCode: "01779784",
  },
  IN: {
    stateFips: "18",
    statePostal: "IN",
    stateName: "Indiana",
    ansiCode: "00448508",
  },
  IA: {
    stateFips: "19",
    statePostal: "IA",
    stateName: "Iowa",
    ansiCode: "01779785",
  },
  KS: {
    stateFips: "20",
    statePostal: "KS",
    stateName: "Kansas",
    ansiCode: "00481813",
  },
  KY: {
    stateFips: "21",
    statePostal: "KY",
    stateName: "Kentucky",
    ansiCode: "00257404",
  },
  LA: {
    stateFips: "22",
    statePostal: "LA",
    stateName: "Louisiana",
    ansiCode: "01629543",
  },
  ME: {
    stateFips: "23",
    statePostal: "ME",
    stateName: "Maine",
    ansiCode: "01779787",
  },
  MD: {
    stateFips: "24",
    statePostal: "MD",
    stateName: "Maryland",
    ansiCode: "01714934",
  },
  MA: {
    stateFips: "25",
    statePostal: "MA",
    stateName: "Massachusetts",
    ansiCode: "00606926",
  },
  MI: {
    stateFips: "26",
    statePostal: "MI",
    stateName: "Michigan",
    ansiCode: "01779789",
  },
  MN: {
    stateFips: "27",
    statePostal: "MN",
    stateName: "Minnesota",
    ansiCode: "00662849",
  },
  MS: {
    stateFips: "28",
    statePostal: "MS",
    stateName: "Mississippi",
    ansiCode: "01779790",
  },
  MO: {
    stateFips: "29",
    statePostal: "MO",
    stateName: "Missouri",
    ansiCode: "01779791",
  },
  MT: {
    stateFips: "30",
    statePostal: "MT",
    stateName: "Montana",
    ansiCode: "00767982",
  },
  NE: {
    stateFips: "31",
    statePostal: "NE",
    stateName: "Nebraska",
    ansiCode: "01779792",
  },
  NV: {
    stateFips: "32",
    statePostal: "NV",
    stateName: "Nevada",
    ansiCode: "01779793",
  },
  NH: {
    stateFips: "33",
    statePostal: "NH",
    stateName: "New Hampshire",
    ansiCode: "01779794",
  },
  NJ: {
    stateFips: "34",
    statePostal: "NJ",
    stateName: "New Jersey",
    ansiCode: "01779795",
  },
  NM: {
    stateFips: "35",
    statePostal: "NM",
    stateName: "New Mexico",
    ansiCode: "00892540",
  },
  NY: {
    stateFips: "36",
    statePostal: "NY",
    stateName: "New York",
    ansiCode: "01779796",
  },
  NC: {
    stateFips: "37",
    statePostal: "NC",
    stateName: "North Carolina",
    ansiCode: "01027616",
  },
  ND: {
    stateFips: "38",
    statePostal: "ND",
    stateName: "North Dakota",
    ansiCode: "01779797",
  },
  OH: {
    stateFips: "39",
    statePostal: "OH",
    stateName: "Ohio",
    ansiCode: "01085497",
  },
  OK: {
    stateFips: "40",
    statePostal: "OK",
    stateName: "Oklahoma",
    ansiCode: "01102857",
  },
  OR: {
    stateFips: "41",
    statePostal: "OR",
    stateName: "Oregon",
    ansiCode: "01155107",
  },
  PA: {
    stateFips: "42",
    statePostal: "PA",
    stateName: "Pennsylvania",
    ansiCode: "01779798",
  },
  RI: {
    stateFips: "44",
    statePostal: "RI",
    stateName: "Rhode Island",
    ansiCode: "01219835",
  },
  SC: {
    stateFips: "45",
    statePostal: "SC",
    stateName: "South Carolina",
    ansiCode: "01779799",
  },
  SD: {
    stateFips: "46",
    statePostal: "SD",
    stateName: "South Dakota",
    ansiCode: "01785534",
  },
  TN: {
    stateFips: "47",
    statePostal: "TN",
    stateName: "Tennessee",
    ansiCode: "01325873",
  },
  TX: {
    stateFips: "48",
    statePostal: "TX",
    stateName: "Texas",
    ansiCode: "01779801",
  },
  UT: {
    stateFips: "49",
    statePostal: "UT",
    stateName: "Utah",
    ansiCode: "01455989",
  },
  VT: {
    stateFips: "50",
    statePostal: "VT",
    stateName: "Vermont",
    ansiCode: "01779802",
  },
  VA: {
    stateFips: "51",
    statePostal: "VA",
    stateName: "Virginia",
    ansiCode: "01779803",
  },
  WA: {
    stateFips: "53",
    statePostal: "WA",
    stateName: "Washington",
    ansiCode: "01779804",
  },
  WV: {
    stateFips: "54",
    statePostal: "WV",
    stateName: "West Virginia",
    ansiCode: "01779805",
  },
  WI: {
    stateFips: "55",
    statePostal: "WI",
    stateName: "Wisconsin",
    ansiCode: "01779806",
  },
  WY: {
    stateFips: "56",
    statePostal: "WY",
    stateName: "Wyoming",
    ansiCode: "01779807",
  },
  PR: {
    stateFips: "72",
    statePostal: "PR",
    stateName: "Puerto Rico",
    ansiCode: "01779808",
  },
};

// Build reverse lookup by FIPS and lowercase name
const FIPS_MAP: Record<string, StateIdentifier> = {};
const NAME_MAP: Record<string, StateIdentifier> = {};

for (const state of Object.values(STATE_MASTER_TABLE)) {
  FIPS_MAP[state.stateFips] = state;
  NAME_MAP[state.stateName.toLowerCase()] = state;
  NAME_MAP[state.statePostal.toLowerCase()] = state;
}

/**
 * Normalizes any state string (postal "KY", FIPS "21", name "Kentucky", or jurisdiction key "us_ky")
 * into a canonical StateIdentifier object.
 */
export function normalizeStateIdentifier(input: string): StateIdentifier {
  const cleaned = input.trim().toLowerCase().replace(/^us_/, "");

  // Try direct postal match
  const uppercase = cleaned.toUpperCase();
  if (STATE_MASTER_TABLE[uppercase]) {
    return STATE_MASTER_TABLE[uppercase];
  }

  // Try 2-digit FIPS with leading zero padding if needed
  const paddedFips = cleaned.padStart(2, "0");
  if (FIPS_MAP[paddedFips]) {
    return FIPS_MAP[paddedFips];
  }

  // Try state name match
  if (NAME_MAP[cleaned]) {
    return NAME_MAP[cleaned];
  }

  // Fallback for custom or synthetic territories
  const syntheticPostal = cleaned.substring(0, 2).toUpperCase();
  return {
    stateFips: "00",
    statePostal: syntheticPostal,
    stateName: input.trim(),
    ansiCode: "00000000",
  };
}

/**
 * Sanitizes a district number or identifier string into a normalized canonical key fragment.
 * Examples: "06" -> "6", "00" -> "00", "AL" -> "al", "District 13" -> "13"
 */
export function sanitizeDistrictIdentifier(rawIdentifier: string): string {
  const trimmed = rawIdentifier.trim().toLowerCase();

  // Handle At-Large / Delegate variants
  if (
    trimmed === "al" ||
    trimmed === "at-large" ||
    trimmed === "at_large" ||
    trimmed === "00" ||
    trimmed === "98"
  ) {
    if (trimmed === "98") return "98";
    if (trimmed === "00") return "00";
    return "al";
  }

  // Extract numeric part if formatted like "District 6" or "HD-77"
  const numMatch = trimmed.match(/\d+/);
  if (numMatch) {
    // Strip leading zeros unless it's just "0"
    const parsed = parseInt(numMatch[0], 10);
    return isNaN(parsed) ? numMatch[0] : parsed.toString();
  }

  return trimmed.replace(/[^a-z0-9_]+/g, "_");
}

/**
 * Generates a globally unique, deterministic, stable composite district ID.
 * Format: `geo:district:<vintage>:<statePostal>:<chamberType>:<districtIdentifier>`
 * Example: `geo:district:2026:ky:congressional:6`
 */
export function buildDistrictId(
  vintage: string,
  stateInput: string,
  chamberType: BoundaryChamberType,
  districtIdentifier: string,
): string {
  const state = normalizeStateIdentifier(stateInput);
  const normVintage = vintage.trim().toLowerCase();
  const normState = state.statePostal.toLowerCase();
  const normChamber = chamberType.trim().toLowerCase();
  const normDistrict = sanitizeDistrictIdentifier(districtIdentifier);

  return `geo:district:${normVintage}:${normState}:${normChamber}:${normDistrict}`;
}

/**
 * Generates Census GEOID according to standard Census specifications.
 * - Congressional (CD): 2-digit state FIPS + 2-digit CD code (e.g. "2106", "5600", "1198")
 * - State Senate (SLDU): 2-digit state FIPS + 3-digit SLDU code (e.g. "21013", "31046")
 * - State House (SLDL): 2-digit state FIPS + 3-digit SLDL code (e.g. "21077", "48049")
 */
export function buildDistrictGeoid(
  stateInput: string,
  chamberType: BoundaryChamberType,
  districtIdentifier: string,
): string {
  const state = normalizeStateIdentifier(stateInput);
  const sanitized = sanitizeDistrictIdentifier(districtIdentifier);

  if (
    chamberType === "congressional" ||
    chamberType === "non_voting_delegate"
  ) {
    if (sanitized === "al" || sanitized === "00") {
      return `${state.stateFips}00`;
    }
    if (sanitized === "98") {
      return `${state.stateFips}98`;
    }
    const num = parseInt(sanitized, 10);
    const code = isNaN(num)
      ? sanitized.padStart(2, "0")
      : num.toString().padStart(2, "0");
    return `${state.stateFips}${code}`;
  }

  // SLDU / SLDL / Unicameral / Council Ward standard is 3 digits
  const num = parseInt(sanitized, 10);
  const code = isNaN(num)
    ? sanitized.padStart(3, "0")
    : num.toString().padStart(3, "0");
  return `${state.stateFips}${code}`;
}

/**
 * Parses a canonical district ID back into its structured components.
 */
export function parseDistrictId(districtId: string): {
  vintage: string;
  statePostal: string;
  chamberType: BoundaryChamberType;
  districtIdentifier: string;
} | null {
  const match = districtId.match(
    /^geo:district:([^:]+):([a-z]{2}):([a-z_]+):([^:]+)$/,
  );
  if (!match) {
    return null;
  }

  return {
    vintage: match[1],
    statePostal: match[2].toUpperCase(),
    chamberType: match[3] as BoundaryChamberType,
    districtIdentifier: match[4],
  };
}

/**
 * Derives the parent simulation jurisdiction key (e.g. "us_ky", "us_ne", "us_tx", "us_dc").
 */
export function parentJurisdictionKey(stateInput: string): string {
  const state = normalizeStateIdentifier(stateInput);
  return `us_${state.statePostal.toLowerCase()}`;
}
