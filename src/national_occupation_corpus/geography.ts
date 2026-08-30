import type { GeographicScope } from "./types.js";

export interface StateMetadata {
  readonly postal: string;
  readonly fips: string;
  readonly name: string;
}

export interface MsaMetadata {
  readonly areaCode: string;
  readonly areaName: string;
  readonly statePostal: string;
  readonly stateFips: string;
}

export const STATES_BY_POSTAL: Readonly<Record<string, StateMetadata>> = {
  KY: { postal: "KY", fips: "21", name: "Kentucky" },
  TX: { postal: "TX", fips: "48", name: "Texas" },
  CA: { postal: "CA", fips: "06", name: "California" },
  NY: { postal: "NY", fips: "36", name: "New York" },
};

export const KNOWN_MSAS: Readonly<Record<string, MsaMetadata>> = {
  "30460": {
    areaCode: "30460",
    areaName: "Lexington-Fayette, KY MSA",
    statePostal: "KY",
    stateFips: "21",
  },
  "12420": {
    areaCode: "12420",
    areaName: "Austin-Round Rock-San Marcos, TX MSA",
    statePostal: "TX",
    stateFips: "48",
  },
};

export function createNationalGeography(): GeographicScope {
  return {
    level: "national",
    statePostal: null,
    stateFips: null,
    areaCode: "0000000",
    areaName: "U.S.",
  };
}

export function createStateGeography(statePostal: string): GeographicScope {
  const meta = STATES_BY_POSTAL[statePostal.toUpperCase()];
  if (!meta) {
    throw new Error(
      `Unsupported state postal code for geographic scope: ${statePostal}`,
    );
  }
  return {
    level: "state",
    statePostal: meta.postal,
    stateFips: meta.fips,
    areaCode: `${meta.fips}00000`,
    areaName: meta.name,
  };
}

export function createMsaGeography(areaCode: string): GeographicScope {
  const meta = KNOWN_MSAS[areaCode];
  if (!meta) {
    throw new Error(
      `Unsupported MSA area code for geographic scope: ${areaCode}`,
    );
  }
  return {
    level: "msa",
    statePostal: meta.statePostal,
    stateFips: meta.stateFips,
    areaCode: meta.areaCode,
    areaName: meta.areaName,
  };
}

export function validateGeographicScope(geography: GeographicScope): void {
  if (!geography.areaCode || typeof geography.areaCode !== "string") {
    throw new Error("Geographic scope must have a valid non-empty areaCode.");
  }
  if (!geography.areaName || typeof geography.areaName !== "string") {
    throw new Error("Geographic scope must have a valid non-empty areaName.");
  }
  if (geography.level === "state" && !geography.statePostal) {
    throw new Error("State-level geographic scope must specify statePostal.");
  }
  if ((geography.level as string) === "county") {
    throw new Error(
      "Direct county-level scope is not a supported standard OEWS observation scope. OEWS supports national, state, and MSA/non-metropolitan area levels.",
    );
  }
}
