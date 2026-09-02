/**
 * Census Government Identification Code (Census Gov ID) Parser, Validator & Stable Identifier Generator
 *
 * 14-digit format:
 * - Digits 1-2: Census State Code (01-51)
 * - Digit 3: Government Type Code (1=State, 2=County, 3=Municipal, 4=Township, 5=Special District, 6=School District, 0=Federal/US)
 * - Digits 4-6: County Area Code (001-999)
 * - Digits 7-9: Unit Identifier (001-999)
 * - Digits 10-12: Function Code (e.g. 000=General, 024=Fire, 044=Education, 091=Water)
 * - Digits 13-14: Supplemental/Subunit Code (00=Primary)
 */

import type { CensusGovId, GovernmentClass, GovernmentLevel } from "./types.js";

export interface StateMapping {
  readonly censusCode: string;
  readonly postal: string;
  readonly fips: string;
  readonly name: string;
}

export const CENSUS_STATE_TABLE: readonly StateMapping[] = [
  {
    censusCode: "00",
    postal: "US",
    fips: "00",
    name: "United States (National Summary)",
  },
  { censusCode: "01", postal: "AL", fips: "01", name: "Alabama" },
  { censusCode: "02", postal: "AK", fips: "02", name: "Alaska" },
  { censusCode: "03", postal: "AZ", fips: "04", name: "Arizona" },
  { censusCode: "04", postal: "AR", fips: "05", name: "Arkansas" },
  { censusCode: "05", postal: "CA", fips: "06", name: "California" },
  { censusCode: "06", postal: "CO", fips: "08", name: "Colorado" },
  { censusCode: "07", postal: "CT", fips: "09", name: "Connecticut" },
  { censusCode: "08", postal: "DE", fips: "10", name: "Delaware" },
  { censusCode: "09", postal: "DC", fips: "11", name: "District of Columbia" },
  { censusCode: "10", postal: "FL", fips: "12", name: "Florida" },
  { censusCode: "11", postal: "GA", fips: "13", name: "Georgia" },
  { censusCode: "12", postal: "HI", fips: "15", name: "Hawaii" },
  { censusCode: "13", postal: "ID", fips: "16", name: "Idaho" },
  { censusCode: "14", postal: "IL", fips: "17", name: "Illinois" },
  { censusCode: "15", postal: "IN", fips: "18", name: "Indiana" },
  { censusCode: "16", postal: "IA", fips: "19", name: "Iowa" },
  { censusCode: "17", postal: "KS", fips: "20", name: "Kansas" },
  { censusCode: "18", postal: "KY", fips: "21", name: "Kentucky" },
  { censusCode: "19", postal: "LA", fips: "22", name: "Louisiana" },
  { censusCode: "20", postal: "ME", fips: "23", name: "Maine" },
  { censusCode: "21", postal: "MD", fips: "24", name: "Maryland" },
  { censusCode: "22", postal: "MA", fips: "25", name: "Massachusetts" },
  { censusCode: "23", postal: "MI", fips: "26", name: "Michigan" },
  { censusCode: "24", postal: "MN", fips: "27", name: "Minnesota" },
  { censusCode: "25", postal: "MS", fips: "28", name: "Mississippi" },
  { censusCode: "26", postal: "MO", fips: "29", name: "Missouri" },
  { censusCode: "27", postal: "MT", fips: "30", name: "Montana" },
  { censusCode: "28", postal: "NE", fips: "31", name: "Nebraska" },
  { censusCode: "29", postal: "NV", fips: "32", name: "Nevada" },
  { censusCode: "30", postal: "NH", fips: "33", name: "New Hampshire" },
  { censusCode: "31", postal: "NJ", fips: "34", name: "New Jersey" },
  { censusCode: "32", postal: "NM", fips: "35", name: "New Mexico" },
  { censusCode: "33", postal: "NY", fips: "36", name: "New York" },
  { censusCode: "34", postal: "NC", fips: "37", name: "North Carolina" },
  { censusCode: "35", postal: "ND", fips: "38", name: "North Dakota" },
  { censusCode: "36", postal: "OH", fips: "39", name: "Ohio" },
  { censusCode: "37", postal: "OK", fips: "40", name: "Oklahoma" },
  { censusCode: "38", postal: "OR", fips: "41", name: "Oregon" },
  { censusCode: "39", postal: "PA", fips: "42", name: "Pennsylvania" },
  { censusCode: "40", postal: "RI", fips: "44", name: "Rhode Island" },
  { censusCode: "41", postal: "SC", fips: "45", name: "South Carolina" },
  { censusCode: "42", postal: "SD", fips: "46", name: "South Dakota" },
  { censusCode: "43", postal: "TN", fips: "47", name: "Tennessee" },
  { censusCode: "44", postal: "TX", fips: "48", name: "Texas" },
  { censusCode: "45", postal: "UT", fips: "49", name: "Utah" },
  { censusCode: "46", postal: "VT", fips: "50", name: "Vermont" },
  { censusCode: "47", postal: "VA", fips: "51", name: "Virginia" },
  { censusCode: "48", postal: "WA", fips: "53", name: "Washington" },
  { censusCode: "49", postal: "WV", fips: "54", name: "West Virginia" },
  { censusCode: "50", postal: "WI", fips: "55", name: "Wisconsin" },
  { censusCode: "51", postal: "WY", fips: "56", name: "Wyoming" },
  { censusCode: "52", postal: "PR", fips: "72", name: "Puerto Rico" },
];

const BY_CENSUS_CODE = new Map<string, StateMapping>(
  CENSUS_STATE_TABLE.map((s) => [s.censusCode, s]),
);
const BY_POSTAL = new Map<string, StateMapping>(
  CENSUS_STATE_TABLE.map((s) => [s.postal.toUpperCase(), s]),
);
const BY_FIPS = new Map<string, StateMapping>(
  CENSUS_STATE_TABLE.map((s) => [s.fips, s]),
);

export function getStateByCensusCode(code: string): StateMapping | undefined {
  return BY_CENSUS_CODE.get(code.padStart(2, "0"));
}

export function getStateByPostal(postal: string): StateMapping | undefined {
  return BY_POSTAL.get(postal.trim().toUpperCase());
}

export function getStateByFips(fips: string): StateMapping | undefined {
  return BY_FIPS.get(fips.padStart(2, "0"));
}

export function mapCensusTypeCodeToClass(typeCode: string): GovernmentClass {
  switch (typeCode) {
    case "0":
      return "federal";
    case "1":
      return "state";
    case "2":
      return "county";
    case "3":
      return "municipal";
    case "4":
      return "township";
    case "5":
      return "special_district";
    case "6":
      return "school_district";
    default:
      return "special_district";
  }
}

export function mapClassToCensusTypeCode(govClass: GovernmentClass): string {
  switch (govClass) {
    case "federal":
      return "0";
    case "state":
      return "1";
    case "county":
      return "2";
    case "municipal":
      return "3";
    case "township":
      return "4";
    case "special_district":
      return "5";
    case "school_district":
      return "6";
  }
}

export function mapClassToLevel(govClass: GovernmentClass): GovernmentLevel {
  switch (govClass) {
    case "federal":
      return "federal";
    case "state":
      return "state";
    default:
      return "local";
  }
}

export interface ParsedCensusGovId {
  readonly rawId: string;
  readonly censusStateCode: string;
  readonly statePostal: string;
  readonly stateFips: string;
  readonly stateName: string;
  readonly typeCode: string;
  readonly governmentClass: GovernmentClass;
  readonly governmentLevel: GovernmentLevel;
  readonly countyAreaCode: string;
  readonly unitId: string;
  readonly functionCode: string;
  readonly subunitCode: string;
  readonly isIndependentEntity: boolean;
}

/**
 * Validates whether a string is a valid 14-digit Census Government ID.
 */
export function isValidCensusGovId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  const clean = id.trim();
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) return false;

  const stateCode = clean.substring(0, 2);
  return BY_CENSUS_CODE.has(stateCode);
}

/**
 * Parses a 14-digit Census Government ID into its structured components.
 */
export function parseCensusGovId(id: string): ParsedCensusGovId {
  const clean = id.trim();
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) {
    throw new Error(
      `Invalid Census Government ID: "${id}". Must be exactly 14 numeric digits.`,
    );
  }

  const censusStateCode = clean.substring(0, 2);
  const stateMapping = getStateByCensusCode(censusStateCode);
  if (!stateMapping) {
    throw new Error(
      `Unrecognized Census state code: "${censusStateCode}" in ID: ${id}`,
    );
  }

  const typeCode = clean.charAt(2);
  const countyAreaCode = clean.substring(3, 6);
  const unitId = clean.substring(6, 9);
  const functionCode = clean.substring(9, 12);
  const subunitCode = clean.substring(12, 14);

  const governmentClass = mapCensusTypeCodeToClass(typeCode);
  const governmentLevel = mapClassToLevel(governmentClass);
  const isIndependentEntity = subunitCode === "00";

  return {
    rawId: clean,
    censusStateCode,
    statePostal: stateMapping.postal,
    stateFips: stateMapping.fips,
    stateName: stateMapping.name,
    typeCode,
    governmentClass,
    governmentLevel,
    countyAreaCode,
    unitId,
    functionCode,
    subunitCode,
    isIndependentEntity,
  };
}

/**
 * Builds a 14-digit Census Gov ID from constituent components.
 */
export function buildCensusGovId(params: {
  censusStateCode: string;
  typeCode: string;
  countyAreaCode?: string;
  unitId?: string;
  functionCode?: string;
  subunitCode?: string;
}): CensusGovId {
  const state = params.censusStateCode.padStart(2, "0");
  const type = params.typeCode.charAt(0);
  const county = (params.countyAreaCode ?? "000").padStart(3, "0");
  const unit = (params.unitId ?? "000").padStart(3, "0");
  const func = (params.functionCode ?? "000").padStart(3, "0");
  const sub = (params.subunitCode ?? "00").padStart(2, "0");

  const id = `${state}${type}${county}${unit}${func}${sub}`;
  if (id.length !== 14) {
    throw new Error(`Constructed Census Gov ID length mismatch: ${id}`);
  }
  return id;
}

/**
 * Deterministic stable ID for government entity: "gov-census-${censusGovId}"
 */
export function createStableGovernmentId(censusGovId: CensusGovId): string {
  const clean = censusGovId.trim();
  return `gov-census-${clean}`;
}

/**
 * Deterministic stable ID for a finance record: "gov-fin-${censusGovId}-${fiscalYear}-${vintage}"
 */
export function createStableFinanceRecordId(
  censusGovId: CensusGovId,
  fiscalYear: number,
  vintage: string,
): string {
  const cleanId = censusGovId.trim();
  const cleanVintage = vintage
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  return `gov-fin-${cleanId}-${fiscalYear}-${cleanVintage}`;
}

/**
 * Deterministic stable ID for an employment record: "gov-emp-${censusGovId}-${surveyYear}-${functionCode}-${vintage}"
 */
export function createStableEmploymentRecordId(
  censusGovId: CensusGovId,
  surveyYear: number,
  functionCode: string,
  vintage: string,
): string {
  const cleanId = censusGovId.trim();
  const cleanFunc = functionCode.trim().padStart(3, "0");
  const cleanVintage = vintage
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  return `gov-emp-${cleanId}-${surveyYear}-${cleanFunc}-${cleanVintage}`;
}

/**
 * Deterministic stable ID for a government function: "gov-func-${functionCode}"
 */
export function createStableFunctionId(functionCode: string): string {
  const cleanFunc = functionCode.trim().padStart(3, "0");
  return `gov-func-${cleanFunc}`;
}
