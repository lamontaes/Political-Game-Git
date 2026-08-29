/**
 * Geographic FIPS and Jurisdiction Standards for Economic Data
 *
 * Handles 5-digit County FIPS, 2-digit State FIPS, and US National identifiers.
 */

import type { GeographicLevel } from "./types.js";

export const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "00": "US",
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
  "72": "PR",
};

export const STANDARD_ANCHOR_JURISDICTIONS: Record<
  string,
  { fips: string; name: string; level: GeographicLevel; state: string }
> = {
  "21067": {
    fips: "21067",
    name: "Fayette County, KY",
    level: "county",
    state: "KY",
  },
  "21159": {
    fips: "21159",
    name: "Martin County, KY",
    level: "county",
    state: "KY",
  },
  "26163": {
    fips: "26163",
    name: "Wayne County, MI",
    level: "county",
    state: "MI",
  },
  "06085": {
    fips: "06085",
    name: "Santa Clara County, CA",
    level: "county",
    state: "CA",
  },
  "48329": {
    fips: "48329",
    name: "Midland County, TX",
    level: "county",
    state: "TX",
  },
  "12086": {
    fips: "12086",
    name: "Miami-Dade County, FL",
    level: "county",
    state: "FL",
  },
  "21000": { fips: "21000", name: "Kentucky", level: "state", state: "KY" },
  "06000": { fips: "06000", name: "California", level: "state", state: "CA" },
  "26000": { fips: "26000", name: "Michigan", level: "state", state: "MI" },
  "48000": { fips: "48000", name: "Texas", level: "state", state: "TX" },
  "00000": {
    fips: "00000",
    name: "United States",
    level: "national",
    state: "US",
  },
};

/**
 * Normalizes a raw FIPS string (e.g. "21067", 21067, "21", "0", "00000") to standard length.
 */
export function normalizeFips(rawFips: string | number): string {
  const str = String(rawFips).trim();
  if (str === "0" || str === "00" || str === "00000" || str === "US") {
    return "00000";
  }

  // If 1 or 2 digits, treat as state FIPS zero-padded to 5 digits (e.g. "21" -> "21000" or "21")
  // In standard BLS/BEA county tables, state totals are either "21000" or "21".
  if (str.length <= 2) {
    const paddedState = str.padStart(2, "0");
    return `${paddedState}000`;
  }

  // 5-digit county FIPS
  return str.padStart(5, "0");
}

/**
 * Determines the GeographicLevel from normalized FIPS.
 */
export function determineGeoLevel(fips: string): GeographicLevel {
  const normalized = normalizeFips(fips);
  if (normalized === "00000") return "national";
  if (normalized.endsWith("000")) return "state";
  return "county";
}

/**
 * Extracts 2-letter state postal abbreviation from FIPS.
 */
export function getStateAbbrFromFips(fips: string): string {
  const normalized = normalizeFips(fips);
  if (normalized === "00000") return "US";
  const stateCode = normalized.slice(0, 2);
  return STATE_FIPS_TO_ABBR[stateCode] || "US";
}

/**
 * Validates FIPS syntax and state code validity.
 */
export function validateFips(fips: string): {
  valid: boolean;
  reason?: string;
} {
  if (!fips || typeof fips !== "string") {
    return { valid: false, reason: "FIPS must be a non-empty string" };
  }

  const normalized = normalizeFips(fips);
  if (!/^[0-9]{5}$/.test(normalized)) {
    return {
      valid: false,
      reason: `FIPS must normalize to exactly 5 digits, got '${fips}' -> '${normalized}'`,
    };
  }

  const stateCode = normalized.slice(0, 2);
  if (stateCode !== "00" && !STATE_FIPS_TO_ABBR[stateCode]) {
    return {
      valid: false,
      reason: `Unknown state FIPS prefix '${stateCode}' in '${fips}'`,
    };
  }

  return { valid: true };
}
