/**
 * The 2020 Census Redistricting Data (P.L. 94-171) state files, and the
 * place-within-county slice cut from each.
 *
 * The Geography Division publishes no 2020 place-to-county relationship file
 * (its rel2020 `place/` directory holds only place-to-place comparisons). The
 * redistricting summary files do carry the relationship: summary level 155,
 * "State-Place-County", is one geographic header row for every part of a place
 * that lies in one county, with that part's land and water area.
 *
 * Each state archive is cached, not committed — together they run to well over
 * a gigabyte. What is committed is a derived QA slice per state: the parent
 * geoheader's summary-level-155 lines, byte for byte. The cut also checks the
 * parts against the parent's own summary-level-160 place rows, so a slice
 * whose parts do not add up to the publisher's place areas is never written.
 */

import { readZipMember } from "../../core/index";
import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";

const PL_BASE =
  "https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171";

export const PLACE_COUNTY_DOMAIN = "place-county-relations";

/** The fifty states and the District of Columbia, as the publisher files them. */
export const PL_STATES = [
  ["AL", "01", "Alabama"],
  ["AK", "02", "Alaska"],
  ["AZ", "04", "Arizona"],
  ["AR", "05", "Arkansas"],
  ["CA", "06", "California"],
  ["CO", "08", "Colorado"],
  ["CT", "09", "Connecticut"],
  ["DE", "10", "Delaware"],
  ["DC", "11", "District_of_Columbia"],
  ["FL", "12", "Florida"],
  ["GA", "13", "Georgia"],
  ["HI", "15", "Hawaii"],
  ["ID", "16", "Idaho"],
  ["IL", "17", "Illinois"],
  ["IN", "18", "Indiana"],
  ["IA", "19", "Iowa"],
  ["KS", "20", "Kansas"],
  ["KY", "21", "Kentucky"],
  ["LA", "22", "Louisiana"],
  ["ME", "23", "Maine"],
  ["MD", "24", "Maryland"],
  ["MA", "25", "Massachusetts"],
  ["MI", "26", "Michigan"],
  ["MN", "27", "Minnesota"],
  ["MS", "28", "Mississippi"],
  ["MO", "29", "Missouri"],
  ["MT", "30", "Montana"],
  ["NE", "31", "Nebraska"],
  ["NV", "32", "Nevada"],
  ["NH", "33", "New_Hampshire"],
  ["NJ", "34", "New_Jersey"],
  ["NM", "35", "New_Mexico"],
  ["NY", "36", "New_York"],
  ["NC", "37", "North_Carolina"],
  ["ND", "38", "North_Dakota"],
  ["OH", "39", "Ohio"],
  ["OK", "40", "Oklahoma"],
  ["OR", "41", "Oregon"],
  ["PA", "42", "Pennsylvania"],
  ["RI", "44", "Rhode_Island"],
  ["SC", "45", "South_Carolina"],
  ["SD", "46", "South_Dakota"],
  ["TN", "47", "Tennessee"],
  ["TX", "48", "Texas"],
  ["UT", "49", "Utah"],
  ["VT", "50", "Vermont"],
  ["VA", "51", "Virginia"],
  ["WA", "53", "Washington"],
  ["WV", "54", "West_Virginia"],
  ["WI", "55", "Wisconsin"],
  ["WY", "56", "Wyoming"],
] as const;

export type PlStateUsps = (typeof PL_STATES)[number][0];

/**
 * States whose geoheader is Latin-1, not the UTF-8 the technical documentation
 * states. Observed in the locked bytes: New Mexico's file writes "Doña Ana" with
 * a lone 0xF1 byte, which is not valid UTF-8. Every other state's slice is
 * plain ASCII, where the two encodings agree.
 */
export const LATIN1_GEOHEADER_STATES: ReadonlySet<string> = new Set(["NM"]);

/** Geoheader field positions (0-based) in the 2020 legacy layout. */
export const GEO_FIELD = {
  FILEID: 0,
  SUMLEV: 2,
  GEOCOMP: 3,
  GEOID: 8,
  GEOCODE: 9,
  STATE: 12,
  COUNTY: 14,
  AREALAND: 84,
  AREAWATR: 85,
  PARTFLAG: 95,
} as const;
export const GEO_FIELD_COUNT = 97;

export const PLACE_COUNTY_SLICE_PREDICATE =
  "Every line of the state geoheader (<st>geo2020.pl) whose SUMLEV (field 3) is 155, State-Place-County, kept byte for byte in file order; cut only if every summary-level-160 place's AREALAND and AREAWATR equal the sums over its 155 parts and the two levels name the same places.";

export function archiveArtifactId(usps: string): string {
  return `census-pl2020-${usps.toLowerCase()}-archive`;
}

export function sliceArtifactId(usps: string): string {
  return `census-pl2020-${usps.toLowerCase()}-place-county-parts`;
}

export function geoheaderMember(usps: string): string {
  return `${usps.toLowerCase()}geo2020.pl`;
}

export function slicePath(usps: string): string {
  return `data/source/${PLACE_COUNTY_DOMAIN}/raw/${usps.toLowerCase()}geo2020.sumlev155.txt`;
}

export function archiveCachePath(usps: string): string {
  return `.source-cache/${PLACE_COUNTY_DOMAIN}/${usps.toLowerCase()}2020.pl.zip`;
}

const PUBLISHER = {
  statedVintage: "2020 Census Redistricting Data (Public Law 94-171)",
  releaseDate: "2021-08-12",
  schemaVersion:
    "2020 Census Redistricting Data (P.L. 94-171) Summary File legacy format geographic header, 97 pipe-delimited fields",
  documentationUrl:
    "https://www2.census.gov/programs-surveys/decennial/2020/technical-documentation/complete-tech-docs/summary-file/2020Census_PL94_171Redistricting_StatesTechDoc_English.pdf",
} as const;

const RIGHTS = {
  status: "public-domain-us-government",
  declaredLicense: null,
  attributionRequired: false,
} as const;

function stateRequests(usps: string, folder: string): AcquisitionRequest[] {
  const url = `${PL_BASE}/${folder}/${usps.toLowerCase()}2020.pl.zip`;
  return [
    {
      artifactId: archiveArtifactId(usps),
      provider:
        "U.S. Census Bureau, Redistricting and Voting Rights Data Office",
      url,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: geoheaderMember(usps),
      publisher: PUBLISHER,
      rights: RIGHTS,
      storage: "cached-not-committed",
      localPath: null,
      cachePath: archiveCachePath(usps),
    },
    {
      artifactId: sliceArtifactId(usps),
      provider:
        "U.S. Census Bureau, Redistricting and Voting Rights Data Office",
      url,
      method: "bulk-download",
      mediaType: LATIN1_GEOHEADER_STATES.has(usps)
        ? "text/plain; charset=iso-8859-1"
        : "text/plain; charset=utf-8",
      publisher: PUBLISHER,
      rights: RIGHTS,
      storage: "derived-qa-slice",
      localPath: slicePath(usps),
      sliceOf: {
        parentArtifactId: archiveArtifactId(usps),
        selectionPredicate: PLACE_COUNTY_SLICE_PREDICATE,
        cut: (parentBytes) => cutPlaceCountyParts(parentBytes, usps),
      },
    },
  ];
}

export const placeCountyRelationsAcquisition: AcquisitionPlan = {
  domain: PLACE_COUNTY_DOMAIN,
  requests: PL_STATES.flatMap(([usps, , folder]) =>
    stateRequests(usps, folder),
  ),
};

/**
 * Cut one state's summary-level-155 lines out of its archive.
 *
 * Lines are kept as the parent's bytes; fields are read only to decide which
 * lines to keep and to check the parts against the place rows.
 */
export function cutPlaceCountyParts(archive: Buffer, usps: string): Buffer {
  const geoheader = readZipMember(archive, geoheaderMember(usps));
  if (geoheader.length === 0 || geoheader[geoheader.length - 1] !== 0x0a) {
    throw new Error(
      `${geoheaderMember(usps)} does not end in a newline; the last line cannot be kept whole.`,
    );
  }
  const kept: Buffer[] = [];
  const partSums = new Map<string, [number, number]>();
  const placeTotals = new Map<string, [number, number]>();
  let start = 0;
  let lineNumber = 0;
  while (start < geoheader.length) {
    const end = geoheader.indexOf(0x0a, start);
    const line = geoheader.subarray(start, end + 1);
    start = end + 1;
    lineNumber += 1;
    const fields = line
      .subarray(0, line.length - 1)
      .toString("utf-8")
      .split("|");
    const sumlev = fields[GEO_FIELD.SUMLEV];
    if (sumlev !== "155" && sumlev !== "160") continue;
    if (fields.length !== GEO_FIELD_COUNT) {
      throw new Error(
        `${geoheaderMember(usps)} line ${lineNumber} has ${fields.length} fields, not ${GEO_FIELD_COUNT}.`,
      );
    }
    const land = Number(fields[GEO_FIELD.AREALAND]);
    const water = Number(fields[GEO_FIELD.AREAWATR]);
    if (!Number.isSafeInteger(land) || !Number.isSafeInteger(water)) {
      throw new Error(
        `${geoheaderMember(usps)} line ${lineNumber} has a non-integer area.`,
      );
    }
    const place = (fields[GEO_FIELD.GEOCODE] ?? "").slice(0, 7);
    if (sumlev === "160") {
      placeTotals.set(place, [land, water]);
      continue;
    }
    kept.push(line);
    const sum = partSums.get(place) ?? [0, 0];
    partSums.set(place, [sum[0] + land, sum[1] + water]);
  }

  if (partSums.size !== placeTotals.size) {
    throw new Error(
      `${usps}: summary level 155 names ${partSums.size} places but level 160 has ${placeTotals.size}.`,
    );
  }
  for (const [place, [land, water]] of placeTotals) {
    const sum = partSums.get(place);
    if (!sum || sum[0] !== land || sum[1] !== water) {
      throw new Error(
        `${usps}: place ${place} publishes ${land} m² land and ${water} m² water, but its county parts sum to ${sum ? `${sum[0]} and ${sum[1]}` : "nothing"}.`,
      );
    }
  }
  return Buffer.concat(kept);
}
