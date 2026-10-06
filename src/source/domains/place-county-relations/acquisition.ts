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

import {
  parseDelimited,
  readZipMember,
  listZipMembers,
} from "../../core/index";
import type { AcquisitionPlan, AcquisitionRequest } from "../../core/index";
import { normalizeDistrictPopulationParts } from "./normalize";
import type { DistrictPopulationBlock } from "./normalize";
import type { PlaceDistrictPopulationRecord } from "./types";
import { isStateLegislativeGeoid } from "../sld-place-relations/identity";
import { isCongressionalGeoid } from "../cd-place-relations/identity";
import districtCatalog from "../../../districts/place-membership.generated.json";

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
  LOGRECNO: 7,
  STATE: 12,
  COUNTY: 14,
  AREALAND: 84,
  AREAWATR: 85,
  /** POP100, the published population count (legacy field 91). */
  POP100: 90,
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
    // Selection fields are ASCII. Do not decode unrelated geography names:
    // publisher rows outside the retained slice may use another encoding.
    const sumlevBytes = line.toString("latin1").split("|", 4)[GEO_FIELD.SUMLEV];
    if (sumlevBytes !== "155" && sumlevBytes !== "160") continue;
    const parsed = parseDelimited(line, {
      delimiter: "|",
      // Read only ASCII identity/area fields; names never enter this cut.
      // Latin-1 preserves every original byte, including other-level names.
      encoding: "latin1",
    });
    if (parsed.defects.length > 0 || parsed.rows.length !== 1) {
      const detail = parsed.defects.map((defect) => defect.message).join("; ");
      throw new Error(
        `${geoheaderMember(usps)} line ${lineNumber} is not a valid ${GEO_FIELD_COUNT}-field geoheader row${detail ? `: ${detail}` : "."}`,
      );
    }
    const fields = parsed.rows[0]!.fields;
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

const BEF_BASE =
  "https://www2.census.gov/programs-surveys/decennial/rdo/mapping-files";
const DISTRICT_SOURCES = [
  {
    artifactId: "census-bef-sldl24",
    url: `${BEF_BASE}/2025/2024-state-legislative-bef/sldl24.zip`,
    member: "NationalSLDL24.txt",
    header: "GEOID,SLDLST",
    chamber: "state-lower",
    vintage: "census-rel-2024-sld-place20",
  },
  {
    artifactId: "census-bef-sldu24",
    url: `${BEF_BASE}/2025/2024-state-legislative-bef/sldu24.zip`,
    member: "NationalSLDU24.txt",
    header: "GEOID,SLDUST",
    chamber: "state-upper",
    vintage: "census-rel-2024-sld-place20",
  },
  {
    artifactId: "census-bef-cd119",
    url: `${BEF_BASE}/2025/119-congressional-district-befs/cd119.zip`,
    member: "NationalCD119.txt",
    header: "GEOID,CDFP",
    chamber: "congressional",
    vintage: "census-rel-2020-cd119-place20",
  },
] as const;
const CD120_ARTIFACT = "census-bef-cd120";
const CD120_URL = `${BEF_BASE}/2027/120-congressional-district-befs/cd120.zip`;

export function districtPopulationArtifactId(usps: string): string {
  return `census-pl2020-${usps.toLowerCase()}-place-district-population`;
}

function cachedDistrictRequest(
  artifactId: string,
  url: string,
): AcquisitionRequest {
  return {
    artifactId,
    url,
    provider: "U.S. Census Bureau, Geography Division",
    method: "bulk-download",
    mediaType: "application/zip",
    publisher: {
      statedVintage: artifactId,
      releaseDate: null,
      schemaVersion: "2020 Census block to district assignment",
      documentationUrl:
        "https://www.census.gov/geographies/reference-files/time-series/geo/block-assignment-files.html",
    },
    rights: RIGHTS,
    storage: "cached-not-committed",
    localPath: null,
    cachePath: `.source-cache/${PLACE_COUNTY_DOMAIN}/${artifactId}.zip`,
  };
}

/** One line at a time: national block files never become millions of row objects. */
function* textLines(bytes: Buffer): Generator<string> {
  let start = 0;
  while (start < bytes.length) {
    const next = bytes.indexOf(10, start);
    const end = next === -1 ? bytes.length : next;
    yield bytes.toString("utf8", start, end).replace(/\r$/, "");
    start = end + 1;
  }
}

const nationalMembers = new WeakMap<Buffer, ReadonlyMap<string, Buffer>>();
function districtAssignments(
  archive: Buffer,
  member: string,
  header: string,
  state: string,
): Map<string, string> {
  let states = nationalMembers.get(archive);
  if (!states) {
    const bytes = readZipMember(archive, member);
    const headerEnd = bytes.indexOf(10);
    if (bytes.toString("utf8", 0, headerEnd).replace(/\r$/, "") !== header)
      throw new Error(`Unexpected district header in ${member}`);
    const chunks = new Map<string, Buffer[]>();
    let start = headerEnd + 1;
    let partStart = start;
    let previous = bytes.toString("ascii", start, start + 2);
    const retain = (end: number) => {
      const list = chunks.get(previous) ?? [];
      list.push(bytes.subarray(partStart, end));
      chunks.set(previous, list);
    };
    while (start < bytes.length) {
      const current = bytes.toString("ascii", start, start + 2);
      if (current !== previous) {
        retain(start);
        partStart = start;
        previous = current;
      }
      const end = bytes.indexOf(10, start);
      start = end === -1 ? bytes.length : end + 1;
    }
    retain(bytes.length);
    states = new Map(
      [...chunks].map(([key, pieces]) => [
        key,
        pieces.length === 1 ? pieces[0]! : Buffer.concat(pieces),
      ]),
    );
    nationalMembers.set(archive, states);
  }
  const map = new Map<string, string>();
  const bytes = states.get(state);
  if (!bytes) return map;
  for (const line of textLines(bytes)) {
    if (!line) continue;
    const [block, code] = line.split(",");
    if (!block || !code || map.has(block))
      throw new Error(`Duplicate or incomplete district block in ${member}`);
    map.set(block, code);
  }
  return map;
}

/** Aggregated QA slice; all raw block/P1/assignment archives stay in cache. */
export function cutDistrictPopulationParts(
  archive: Buffer,
  usps: string,
  state: string,
  acquired: ReadonlyMap<string, Buffer>,
): Buffer {
  const required = (id: string) => {
    const bytes = acquired.get(id);
    if (!bytes) throw new Error(`Missing district join artifact ${id}`);
    return bytes;
  };
  const placeArchive = required(`census-baf2020-place-${usps.toLowerCase()}`);
  const places = new Map<string, string>();
  const placeLines = textLines(
    readZipMember(
      placeArchive,
      `BlockAssign_ST${state}_${usps}_INCPLACE_CDP.txt`,
    ),
  );
  if (placeLines.next().value !== "BLOCKID|PLACEFP")
    throw new Error("Unexpected block-to-place header");
  for (const line of placeLines) {
    if (!line) continue;
    const [block, place] = line.split("|");
    if (!block || places.has(block))
      throw new Error("Duplicate or missing place-assignment block");
    places.set(block, place ?? "");
  }
  const p1 = new Map<string, number>();
  for (const line of textLines(
    readZipMember(archive, `${usps.toLowerCase()}000012020.pl`),
  )) {
    if (!line) continue;
    const cells = line.split("|");
    const population = Number(cells[5]);
    if (
      !cells[4] ||
      cells[5] === "" ||
      !Number.isSafeInteger(population) ||
      population < 0 ||
      p1.has(cells[4])
    )
      throw new Error("Invalid P1 total or LOGRECNO");
    p1.set(cells[4], population);
  }
  const blocks = new Map<
    string,
    { place: string | null; population: number }
  >();
  for (const line of textLines(readZipMember(archive, geoheaderMember(usps)))) {
    const cells = line.split("|");
    if (cells[GEO_FIELD.SUMLEV] !== "750") continue;
    const block = cells[GEO_FIELD.GEOCODE]!;
    const population = p1.get(cells[GEO_FIELD.LOGRECNO]!);
    const place = places.get(block);
    if (
      population === undefined ||
      population !== Number(cells[GEO_FIELD.POP100]) ||
      place === undefined ||
      blocks.has(block)
    )
      throw new Error(`Incomplete or inconsistent P1/place join for ${block}`);
    blocks.set(block, { place: place ? `${state}${place}` : null, population });
  }
  const records: PlaceDistrictPopulationRecord[] = [];
  const artifactId = districtPopulationArtifactId(usps);
  for (const source of DISTRICT_SOURCES) {
    const assignments = districtAssignments(
      required(source.artifactId),
      source.member,
      source.header,
      state,
    );
    if (assignments.size === 0) continue; // A chamber absent from the publisher's universe.
    function* joined(): Generator<DistrictPopulationBlock> {
      for (const [block, data] of blocks) {
        const code = assignments.get(block);
        if (code === undefined)
          throw new Error(`Missing ${source.chamber} assignment for ${block}`);
        const districtGeoid = `${state}${code}`;
        const valid =
          source.chamber === "congressional"
            ? isCongressionalGeoid(districtGeoid)
            : isStateLegislativeGeoid(districtGeoid);
        if (!valid) throw new Error(`Invalid district code ${districtGeoid}`);
        yield {
          blockGeoid: block,
          placeGeoid: data.place,
          population: data.population,
          districtGeoid: `${state}${code}`,
          chamber: source.chamber,
          boundaryVintage: source.vintage,
        };
      }
    }
    records.push(...normalizeDistrictPopulationParts(joined(), artifactId));
  }
  const cd120 = required(CD120_ARTIFACT);
  // Changed-state members are defined by the existing dated district catalog.
  const member = `CD120_${state}.txt`;
  const datedStates = districtCatalog.congressional.dated
    .filter((set) => set.vintage === "census-bef-cd120-2026")
    .flatMap((set) => set.stateFips);
  if (datedStates.includes(state)) {
    if (!listZipMembers(cd120).some((entry) => entry.path === member))
      throw new Error(`Catalog requires missing CD120 member ${member}`);
    const bytes = readZipMember(cd120, member);
    const lines = textLines(bytes);
    if (lines.next().value !== "GEOID,STATEFP,COUNTYFP,TRACTCE,BLOCKCE,CDFP")
      throw new Error("Unexpected CD120 header");
    const assignments = new Map<string, string>();
    for (const line of lines) {
      if (!line) continue;
      const cells = line.split(",");
      if (assignments.has(cells[0]!)) throw new Error("Duplicate CD120 block");
      assignments.set(cells[0]!, cells[5]!);
    }
    function* joined(): Generator<DistrictPopulationBlock> {
      for (const [block, data] of blocks) {
        const code = assignments.get(block);
        if (code === undefined)
          throw new Error(`Missing CD120 assignment for ${block}`);
        yield {
          blockGeoid: block,
          placeGeoid: data.place,
          population: data.population,
          districtGeoid: `${state}${code}`,
          chamber: "congressional",
          boundaryVintage: "census-bef-cd120-2026",
        };
      }
    }
    records.push(...normalizeDistrictPopulationParts(joined(), artifactId));
  }
  return Buffer.from(JSON.stringify(records));
}

export const placeCountyRelationsAcquisition: AcquisitionPlan = {
  domain: PLACE_COUNTY_DOMAIN,
  requests: [
    ...DISTRICT_SOURCES.map((source) =>
      cachedDistrictRequest(source.artifactId, source.url),
    ),
    cachedDistrictRequest(CD120_ARTIFACT, CD120_URL),
    ...PL_STATES.flatMap(([usps, fips, folder]) => [
      ...stateRequests(usps, folder),
      cachedDistrictRequest(
        `census-baf2020-place-${usps.toLowerCase()}`,
        `https://www2.census.gov/geo/docs/maps-data/data/baf2020/BlockAssign_ST${fips}_${usps}.zip`,
      ),
      {
        artifactId: districtPopulationArtifactId(usps),
        provider: "U.S. Census Bureau",
        url: `${PL_BASE}/${folder}/${usps.toLowerCase()}2020.pl.zip`,
        method: "bulk-download" as const,
        mediaType: "application/json",
        publisher: PUBLISHER,
        rights: RIGHTS,
        storage: "derived-qa-slice" as const,
        localPath: `data/source/${PLACE_COUNTY_DOMAIN}/raw/${usps.toLowerCase()}-place-district-population.json`,
        sliceOf: {
          parentArtifactId: archiveArtifactId(usps),
          selectionPredicate:
            "Join 2020 block P1 totals via LOGRECNO to 2020 block/place assignments and catalog-vintage district block assignments; aggregate place×district×chamber; retain zero-population parts.",
          cut: (bytes: Buffer, acquired: ReadonlyMap<string, Buffer>) =>
            cutDistrictPopulationParts(bytes, usps, fips, acquired),
        },
      },
    ]),
  ],
};
