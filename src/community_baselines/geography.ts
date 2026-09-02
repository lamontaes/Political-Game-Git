import type { GeographyId, GeographyRef } from "./types";

export const US_STATE_FIPS_MAP: Record<
  string,
  { name: string; postalCode: string }
> = {
  "01": { name: "Alabama", postalCode: "AL" },
  "02": { name: "Alaska", postalCode: "AK" },
  "04": { name: "Arizona", postalCode: "AZ" },
  "05": { name: "Arkansas", postalCode: "AR" },
  "06": { name: "California", postalCode: "CA" },
  "08": { name: "Colorado", postalCode: "CO" },
  "09": { name: "Connecticut", postalCode: "CT" },
  "10": { name: "Delaware", postalCode: "DE" },
  "11": { name: "District of Columbia", postalCode: "DC" },
  "12": { name: "Florida", postalCode: "FL" },
  "13": { name: "Georgia", postalCode: "GA" },
  "15": { name: "Hawaii", postalCode: "HI" },
  "16": { name: "Idaho", postalCode: "ID" },
  "17": { name: "Illinois", postalCode: "IL" },
  "18": { name: "Indiana", postalCode: "IN" },
  "19": { name: "Iowa", postalCode: "IA" },
  "20": { name: "Kansas", postalCode: "KS" },
  "21": { name: "Kentucky", postalCode: "KY" },
  "22": { name: "Louisiana", postalCode: "LA" },
  "23": { name: "Maine", postalCode: "ME" },
  "24": { name: "Maryland", postalCode: "MD" },
  "25": { name: "Massachusetts", postalCode: "MA" },
  "26": { name: "Michigan", postalCode: "MI" },
  "27": { name: "Minnesota", postalCode: "MN" },
  "28": { name: "Mississippi", postalCode: "MS" },
  "29": { name: "Missouri", postalCode: "MO" },
  "30": { name: "Montana", postalCode: "MT" },
  "31": { name: "Nebraska", postalCode: "NE" },
  "32": { name: "Nevada", postalCode: "NV" },
  "33": { name: "New Hampshire", postalCode: "NH" },
  "34": { name: "New Jersey", postalCode: "NJ" },
  "35": { name: "New Mexico", postalCode: "NM" },
  "36": { name: "New York", postalCode: "NY" },
  "37": { name: "North Carolina", postalCode: "NC" },
  "38": { name: "North Dakota", postalCode: "ND" },
  "39": { name: "Ohio", postalCode: "OH" },
  "40": { name: "Oklahoma", postalCode: "OK" },
  "41": { name: "Oregon", postalCode: "OR" },
  "42": { name: "Pennsylvania", postalCode: "PA" },
  "44": { name: "Rhode Island", postalCode: "RI" },
  "45": { name: "South Carolina", postalCode: "SC" },
  "46": { name: "South Dakota", postalCode: "SD" },
  "47": { name: "Tennessee", postalCode: "TN" },
  "48": { name: "Texas", postalCode: "TX" },
  "49": { name: "Utah", postalCode: "UT" },
  "50": { name: "Vermont", postalCode: "VT" },
  "51": { name: "Virginia", postalCode: "VA" },
  "53": { name: "Washington", postalCode: "WA" },
  "54": { name: "West Virginia", postalCode: "WV" },
  "55": { name: "Wisconsin", postalCode: "WI" },
  "56": { name: "Wyoming", postalCode: "WY" },
  "72": { name: "Puerto Rico", postalCode: "PR" },
};

export function padFips(code: string | number, length: number): string {
  return String(code).padStart(length, "0");
}

export function createNationGeographyId(): GeographyId {
  return "geo:us";
}

export function createStateGeographyId(
  stateFips: string | number,
): GeographyId {
  const padded = padFips(stateFips, 2);
  return `geo:state:${padded}`;
}

export function createCountyGeographyId(
  stateFips: string | number,
  countyFips: string | number,
): GeographyId {
  const sPadded = padFips(stateFips, 2);
  const cPadded = padFips(countyFips, 3);
  return `geo:county:${sPadded}${cPadded}`;
}

export function createPlaceGeographyId(
  stateFips: string | number,
  placeFips: string | number,
): GeographyId {
  const sPadded = padFips(stateFips, 2);
  const pPadded = padFips(placeFips, 5);
  return `geo:place:${sPadded}${pPadded}`;
}

export function createCongressionalDistrictGeographyId(
  stateFips: string | number,
  cdNumber: string | number,
): GeographyId {
  const sPadded = padFips(stateFips, 2);
  const cdPadded = padFips(cdNumber, 2);
  return `geo:cd:${sPadded}${cdPadded}`;
}

export function createMetroGeographyId(cbsaCode: string | number): GeographyId {
  const padded = padFips(cbsaCode, 5);
  return `geo:cbsa:${padded}`;
}

export function createZctaGeographyId(zctaCode: string | number): GeographyId {
  const padded = padFips(zctaCode, 5);
  return `geo:zcta:${padded}`;
}

export function createTractGeographyId(
  stateFips: string | number,
  countyFips: string | number,
  tractFips: string | number,
): GeographyId {
  const sPadded = padFips(stateFips, 2);
  const cPadded = padFips(countyFips, 3);
  const tPadded = padFips(tractFips, 6);
  return `geo:tract:${sPadded}${cPadded}${tPadded}`;
}

export function createBlockGroupGeographyId(
  stateFips: string | number,
  countyFips: string | number,
  tractFips: string | number,
  bgFips: string | number,
): GeographyId {
  const sPadded = padFips(stateFips, 2);
  const cPadded = padFips(countyFips, 3);
  const tPadded = padFips(tractFips, 6);
  const bgPadded = padFips(bgFips, 1);
  return `geo:bg:${sPadded}${cPadded}${tPadded}${bgPadded}`;
}

export function parseGeographyId(geoId: GeographyId): GeographyRef {
  if (!geoId.startsWith("geo:")) {
    throw new Error(
      `Invalid geography ID format (must start with 'geo:'): "${geoId}"`,
    );
  }

  const rest = geoId.slice(4);
  if (rest === "us") {
    return {
      id: "geo:us",
      level: "nation",
      name: "United States",
      parentId: null,
    };
  }

  const parts = rest.split(":");
  if (parts.length < 2) {
    throw new Error(`Malformed geography ID: "${geoId}"`);
  }

  const type = parts[0];
  const code = parts[1];
  if (!type || !code) {
    throw new Error(`Malformed geography ID: "${geoId}"`);
  }

  switch (type) {
    case "state": {
      if (code.length !== 2)
        throw new Error(`Invalid state FIPS in "${geoId}"`);
      const stateInfo =
        US_STATE_FIPS_MAP[code as keyof typeof US_STATE_FIPS_MAP];
      return {
        id: geoId,
        level: "state",
        name: stateInfo ? stateInfo.name : `State ${code}`,
        stateFips: code,
        parentId: "geo:us",
      };
    }
    case "county": {
      if (code.length !== 5)
        throw new Error(`Invalid 5-digit county FIPS in "${geoId}"`);
      const stateFips = code.slice(0, 2);
      const countyFips = code.slice(2, 5);
      return {
        id: geoId,
        level: "county",
        name: `County ${countyFips}, State ${stateFips}`,
        stateFips,
        countyFips,
        parentId: createStateGeographyId(stateFips),
      };
    }
    case "place": {
      if (code.length !== 7)
        throw new Error(`Invalid 7-digit place FIPS in "${geoId}"`);
      const stateFips = code.slice(0, 2);
      const placeFips = code.slice(2, 7);
      return {
        id: geoId,
        level: "place",
        name: `Place ${placeFips}, State ${stateFips}`,
        stateFips,
        placeFips,
        parentId: createStateGeographyId(stateFips),
      };
    }
    case "cd": {
      if (code.length !== 4)
        throw new Error(
          `Invalid 4-digit congressional district ID in "${geoId}"`,
        );
      const stateFips = code.slice(0, 2);
      const cdNumber = code.slice(2, 4);
      return {
        id: geoId,
        level: "congressional_district",
        name: `CD ${cdNumber}, State ${stateFips}`,
        stateFips,
        cdNumber,
        parentId: createStateGeographyId(stateFips),
      };
    }
    case "cbsa": {
      if (code.length !== 5)
        throw new Error(`Invalid 5-digit CBSA code in "${geoId}"`);
      return {
        id: geoId,
        level: "metro_area",
        name: `CBSA ${code}`,
        cbsaCode: code,
        parentId: "geo:us",
      };
    }
    case "zcta": {
      if (code.length !== 5)
        throw new Error(`Invalid 5-digit ZCTA code in "${geoId}"`);
      return {
        id: geoId,
        level: "zcta",
        name: `ZCTA ${code}`,
        zctaCode: code,
        parentId: "geo:us",
      };
    }
    case "tract": {
      if (code.length !== 11)
        throw new Error(`Invalid 11-digit tract FIPS in "${geoId}"`);
      const stateFips = code.slice(0, 2);
      const countyFips = code.slice(2, 5);
      const tractFips = code.slice(5, 11);
      return {
        id: geoId,
        level: "tract",
        name: `Census Tract ${tractFips}, County ${countyFips}, State ${stateFips}`,
        stateFips,
        countyFips,
        tractFips,
        parentId: createCountyGeographyId(stateFips, countyFips),
      };
    }
    case "bg": {
      if (code.length !== 12)
        throw new Error(`Invalid 12-digit block group FIPS in "${geoId}"`);
      const stateFips = code.slice(0, 2);
      const countyFips = code.slice(2, 5);
      const tractFips = code.slice(5, 11);
      const blockGroupFips = code.slice(11, 12);
      return {
        id: geoId,
        level: "block_group",
        name: `Block Group ${blockGroupFips}, Tract ${tractFips}, County ${countyFips}, State ${stateFips}`,
        stateFips,
        countyFips,
        tractFips,
        blockGroupFips,
        parentId: createTractGeographyId(stateFips, countyFips, tractFips),
      };
    }
    default:
      throw new Error(
        `Unsupported geography level type "${type}" in ID "${geoId}"`,
      );
  }
}

export interface CensusApiQueryParams {
  for: string;
  in?: string;
}

export function geographyIdToCensusApiParams(
  geoId: GeographyId,
): CensusApiQueryParams {
  const ref = parseGeographyId(geoId);
  switch (ref.level) {
    case "nation":
      return { for: "us:1" };
    case "state":
      return { for: `state:${ref.stateFips}` };
    case "county":
      return { for: `county:${ref.countyFips}`, in: `state:${ref.stateFips}` };
    case "place":
      return { for: `place:${ref.placeFips}`, in: `state:${ref.stateFips}` };
    case "congressional_district":
      return {
        for: `congressional district:${ref.cdNumber}`,
        in: `state:${ref.stateFips}`,
      };
    case "metro_area":
      return {
        for: `metropolitan statistical area/micropolitan statistical area:${ref.cbsaCode}`,
      };
    case "zcta":
      return { for: `zip code tabulation area:${ref.zctaCode}` };
    case "tract":
      return {
        for: `tract:${ref.tractFips}`,
        in: `state:${ref.stateFips} county:${ref.countyFips}`,
      };
    case "block_group":
      return {
        for: `block group:${ref.blockGroupFips}`,
        in: `state:${ref.stateFips} county:${ref.countyFips} tract:${ref.tractFips}`,
      };
  }
}
