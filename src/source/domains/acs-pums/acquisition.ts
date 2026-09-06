/**
 * The PUMS artifacts, and the QA slice cut from them.
 *
 * The Census Bureau publishes PUMS per state and nationally. This domain holds
 * the complete Wyoming 2023 1-year person and housing products — the smallest
 * complete state products, and the ones #65 used — plus the 2023 data
 * dictionary, which is what lets the compiler tell a loss from a gap.
 *
 * The corpus itself is compiled from a QA slice rather than from all 6,024
 * Wyoming persons, because every variable carries its own provenance and a
 * corpus of the whole state would run to tens of megabytes. The slice is cut by
 * a stated predicate from the committed parent, its record carries the parent's
 * digest, and a test re-cuts it from the parent and asserts byte equality — so
 * the slice is verifiable by anyone holding the parent, which is everyone.
 *
 * Nothing here pretends to be national. `csv_pus.zip` is roughly a gigabyte and
 * is not retrieved, not hashed and not claimed.
 */

import { parseDelimited, readZipMember } from "../../core/index";
import type { AcquisitionPlan } from "../../core/index";

const PUMS_BASE =
  "https://www2.census.gov/programs-surveys/acs/data/pums/2023/1-Year";
const DICT_URL =
  "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2023.csv";

export const ACS_PUMS_DONOR_SURVEY_YEAR = 2024;
export const ACS_PUMS_2024_PRODUCTION_GATE =
  "No 2024 ACS 1-year state housing/person archives or 2024 dictionary are locked in this repository. The acquisition factory declares the cache-only path, but production donor compilation remains unavailable until npm run source:acquire -- --domain acs-pums --survey-year 2024 --state-usps <USPS> --state-fips <FIPS> records the actual bytes and hashes.";

export interface AcsPumsStateShardIdentity {
  readonly product: "acs-1-year-pums";
  readonly surveyYear: 2024;
  /** Publisher state/territory abbreviation used in the archive filename. */
  readonly stateUsps: string;
  /** Publisher two-digit STATE value and archive-member suffix. */
  readonly stateFips: string;
}

export type AcsPumsStateShardArtifactRole =
  "housingArchive" | "personArchive" | "dictionary";

export interface AcsPumsStateShardAcquisition {
  readonly identity: AcsPumsStateShardIdentity;
  /** A shard lock never replaces the accepted 2023 QA corpus lock. */
  readonly lockPath: string;
  readonly plan: AcquisitionPlan;
  readonly cachedArtifacts: Readonly<
    Record<
      AcsPumsStateShardArtifactRole,
      { readonly artifactId: string; readonly cachePath: string }
    >
  >;
}

/**
 * Declare one reproducible 2024 state shard without claiming it was acquired.
 *
 * The caller supplies the USPS/FIPS pairing from an accepted state identity
 * source. This module validates shape but deliberately carries no hand-authored
 * state crosswalk that could silently disagree with the publisher.
 */
export function createAcsPums2024StateShardAcquisition(input: {
  readonly stateUsps: string;
  readonly stateFips: string;
}): AcsPumsStateShardAcquisition {
  const stateUsps = input.stateUsps.trim().toUpperCase();
  const stateFips = input.stateFips.trim();
  if (!/^[A-Z]{2}$/.test(stateUsps)) {
    throw new Error("ACS PUMS state USPS identity must be two ASCII letters.");
  }
  if (!/^\d{2}$/.test(stateFips)) {
    throw new Error("ACS PUMS state FIPS identity must be two digits.");
  }

  const identity: AcsPumsStateShardIdentity = {
    product: "acs-1-year-pums",
    surveyYear: ACS_PUMS_DONOR_SURVEY_YEAR,
    stateUsps,
    stateFips,
  };
  const stateToken = stateUsps.toLowerCase();
  const base =
    "https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year";
  const dictionaryUrl =
    "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2024.csv";
  const cacheRoot = `.source-cache/acs-pums/2024/1-year/${stateToken}`;
  const housingArtifactId = `census-acs-pums-2024-1yr-${stateToken}-housing-zip`;
  const personArtifactId = `census-acs-pums-2024-1yr-${stateToken}-person-zip`;
  const dictionaryArtifactId = "census-acs-pums-2024-data-dictionary-csv";

  const publisher = "U.S. Census Bureau, American Community Survey Office";
  const rights = {
    status: "public-domain-us-government" as const,
    declaredLicense: null,
    attributionRequired: false as const,
  };
  const documentationUrl =
    "https://www.census.gov/programs-surveys/acs/microdata/documentation.2024.html";
  const cachedArtifacts = {
    housingArchive: {
      artifactId: housingArtifactId,
      cachePath: `${cacheRoot}/csv_h${stateToken}.zip`,
    },
    personArchive: {
      artifactId: personArtifactId,
      cachePath: `${cacheRoot}/csv_p${stateToken}.zip`,
    },
    dictionary: {
      artifactId: dictionaryArtifactId,
      cachePath: ".source-cache/acs-pums/2024/PUMS_Data_Dictionary_2024.csv",
    },
  } as const;

  return {
    identity,
    lockPath: `data/source/acs-pums/shards/2024/${stateToken}/artifact-lock.json`,
    cachedArtifacts,
    plan: {
      domain: "acs-pums",
      requests: [
        {
          artifactId: housingArtifactId,
          provider: publisher,
          url: `${base}/csv_h${stateToken}.zip`,
          method: "bulk-download",
          mediaType: "application/zip",
          containerMemberPath: `psam_h${stateFips}.csv`,
          publisher: {
            statedVintage: "2024 ACS 1-year PUMS",
            releaseDate: null,
            schemaVersion: "ACS 2024 1-year PUMS housing record layout",
            documentationUrl,
          },
          rights,
          storage: "cached-not-committed",
          localPath: null,
          cachePath: cachedArtifacts.housingArchive.cachePath,
        },
        {
          artifactId: personArtifactId,
          provider: publisher,
          url: `${base}/csv_p${stateToken}.zip`,
          method: "bulk-download",
          mediaType: "application/zip",
          containerMemberPath: `psam_p${stateFips}.csv`,
          publisher: {
            statedVintage: "2024 ACS 1-year PUMS",
            releaseDate: null,
            schemaVersion: "ACS 2024 1-year PUMS person record layout",
            documentationUrl,
          },
          rights,
          storage: "cached-not-committed",
          localPath: null,
          cachePath: cachedArtifacts.personArchive.cachePath,
        },
        {
          artifactId: dictionaryArtifactId,
          provider: publisher,
          url: dictionaryUrl,
          method: "GET",
          mediaType: "text/csv",
          publisher: {
            statedVintage: "2024",
            releaseDate: null,
            schemaVersion: "PUMS data dictionary, 2024 1-year",
            documentationUrl,
          },
          rights,
          storage: "cached-not-committed",
          localPath: null,
          cachePath: cachedArtifacts.dictionary.cachePath,
        },
      ],
    },
  };
}

export const PERSON_ARTIFACT = "census-acs-pums-2023-1yr-wy-person-zip";
export const HOUSING_ARTIFACT = "census-acs-pums-2023-1yr-wy-housing-zip";
export const DICTIONARY_ARTIFACT = "census-acs-pums-2023-data-dictionary-csv";
export const PERSON_SLICE_ARTIFACT = "census-acs-pums-2023-wy-person-qa-slice";
export const HOUSING_SLICE_ARTIFACT =
  "census-acs-pums-2023-wy-housing-qa-slice";

export const PERSON_MEMBER = "psam_p56.csv";
export const HOUSING_MEMBER = "psam_h56.csv";

/**
 * How the QA slice is stratified, and why it is not simply the head of the file.
 *
 * Wyoming's housing file is ordered with every group-quarters record first. A
 * plain "first 200 rows" slice is therefore 200 group-quarters placeholders,
 * each with a housing weight of zero and one person — a slice that exercises
 * none of the household semantics this domain exists to carry, and whose
 * weights sum to nothing. The dictionary declares that a serial number marks
 * which kind of record it is (`2023HU…` or `2023GQ…`), so the slice reads that
 * marker and takes both strata in published order.
 */
export const QA_SLICE_HOUSING_UNITS = 200;
export const QA_SLICE_GROUP_QUARTERS = 20;

export const HOUSING_SLICE_PREDICATE = `The header row of ${HOUSING_MEMBER}, followed by the first ${QA_SLICE_HOUSING_UNITS} data rows whose SERIALNO marks a housing unit (contains "HU") and the first ${QA_SLICE_GROUP_QUARTERS} whose SERIALNO marks group quarters (contains "GQ"), each stratum in published file order and each row byte-for-byte, with a trailing newline.`;

export const PERSON_SLICE_PREDICATE = `The header row of ${PERSON_MEMBER} followed by every data row whose SERIALNO appears in the housing QA slice, in published file order, byte-for-byte, with a trailing newline.`;

export const acsPumsAcquisition: AcquisitionPlan = {
  domain: "acs-pums",
  requests: [
    {
      artifactId: HOUSING_ARTIFACT,
      provider: "U.S. Census Bureau, American Community Survey Office",
      url: `${PUMS_BASE}/csv_hwy.zip`,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: HOUSING_MEMBER,
      publisher: {
        statedVintage: "2023 ACS 1-year PUMS",
        releaseDate: null,
        schemaVersion: "ACS 2023 1-year PUMS housing record layout",
        documentationUrl:
          "https://www.census.gov/programs-surveys/acs/microdata/documentation.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/acs-pums/raw/csv_hwy.zip",
    },
    {
      artifactId: PERSON_ARTIFACT,
      provider: "U.S. Census Bureau, American Community Survey Office",
      url: `${PUMS_BASE}/csv_pwy.zip`,
      method: "bulk-download",
      mediaType: "application/zip",
      containerMemberPath: PERSON_MEMBER,
      publisher: {
        statedVintage: "2023 ACS 1-year PUMS",
        releaseDate: null,
        schemaVersion: "ACS 2023 1-year PUMS person record layout",
        documentationUrl:
          "https://www.census.gov/programs-surveys/acs/microdata/documentation.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/acs-pums/raw/csv_pwy.zip",
    },
    {
      artifactId: DICTIONARY_ARTIFACT,
      provider: "U.S. Census Bureau, American Community Survey Office",
      url: DICT_URL,
      method: "GET",
      mediaType: "text/csv",
      publisher: {
        statedVintage: "2023",
        releaseDate: null,
        schemaVersion: "PUMS data dictionary, 2023",
        documentationUrl:
          "https://www.census.gov/programs-surveys/acs/microdata/documentation.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "committed",
      localPath: "data/source/acs-pums/raw/PUMS_Data_Dictionary_2023.csv",
    },
    {
      artifactId: HOUSING_SLICE_ARTIFACT,
      provider: "U.S. Census Bureau, American Community Survey Office",
      url: `${PUMS_BASE}/csv_hwy.zip`,
      method: "bulk-download",
      mediaType: "text/csv",
      publisher: {
        statedVintage: "2023 ACS 1-year PUMS",
        releaseDate: null,
        schemaVersion: "ACS 2023 1-year PUMS housing record layout",
        documentationUrl:
          "https://www.census.gov/programs-surveys/acs/microdata/documentation.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "derived-qa-slice",
      localPath: "data/source/acs-pums/raw/psam_h56.qa-slice.csv",
      sliceOf: {
        parentArtifactId: HOUSING_ARTIFACT,
        selectionPredicate: HOUSING_SLICE_PREDICATE,
        cut: (parentBytes) => cutHousingSlice(parentBytes),
      },
    },
    {
      artifactId: PERSON_SLICE_ARTIFACT,
      provider: "U.S. Census Bureau, American Community Survey Office",
      url: `${PUMS_BASE}/csv_pwy.zip`,
      method: "bulk-download",
      mediaType: "text/csv",
      publisher: {
        statedVintage: "2023 ACS 1-year PUMS",
        releaseDate: null,
        schemaVersion: "ACS 2023 1-year PUMS person record layout",
        documentationUrl:
          "https://www.census.gov/programs-surveys/acs/microdata/documentation.html",
      },
      rights: {
        status: "public-domain-us-government",
        declaredLicense: null,
        attributionRequired: false,
      },
      storage: "derived-qa-slice",
      localPath: "data/source/acs-pums/raw/psam_p56.qa-slice.csv",
      sliceOf: {
        parentArtifactId: PERSON_ARTIFACT,
        selectionPredicate: PERSON_SLICE_PREDICATE,
        cut: (parentBytes, acquired) => cutPersonSlice(parentBytes, acquired),
      },
    },
  ],
};

// The cut functions live below the plan so the plan reads as a description of
// what is retrieved. They are exported so the slice-fidelity test can re-cut
// each slice from its committed parent and compare bytes.

function memberText(zipBytes: Buffer, member: string): string {
  return readZipMember(zipBytes, member).toString("utf-8");
}

/**
 * The serial number on each data line, read through the core CSV parser.
 *
 * A slice must emit the parent's bytes unchanged, so the lines themselves are
 * never rebuilt from parsed fields — but deciding *which* lines to keep is
 * reading the data, and reading the data goes through the parser like
 * everywhere else. Splitting on a comma here would be the same shortcut this
 * substrate replaced everywhere it mattered.
 */
function serialByLine(text: string): ReadonlyMap<number, string> {
  const parsed = parseDelimited(Buffer.from(text, "utf-8"), {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: false,
  });
  const column = (parsed.header ?? []).indexOf("SERIALNO");
  const serials = new Map<number, string>();
  if (column === -1) return serials;
  for (const row of parsed.rows) {
    const serial = row.fields[column];
    if (serial !== undefined && serial !== "") serials.set(row.line, serial);
  }
  return serials;
}

/** The serial numbers the housing slice takes, read from the housing parent. */
export function housingSliceSerials(
  housingZipBytes: Buffer,
): ReadonlySet<string> {
  const text = cutHousingSlice(housingZipBytes).toString("utf-8");
  return new Set(serialByLine(text).values());
}

/** Take the header and both strata of housing rows, in published order. */
export function cutHousingSlice(housingZipBytes: Buffer): Buffer {
  const text = memberText(housingZipBytes, HOUSING_MEMBER);
  const lines = text.split("\n");
  const header = lines[0] ?? "";
  const serials = serialByLine(text);
  const housingUnits: string[] = [];
  const groupQuarters: string[] = [];

  for (const [index, line] of lines.slice(1).entries()) {
    if (line.trim() === "") continue;
    const serial = serials.get(index + 2) ?? "";
    if (serial.includes("HU")) {
      if (housingUnits.length < QA_SLICE_HOUSING_UNITS) housingUnits.push(line);
    } else if (serial.includes("GQ")) {
      if (groupQuarters.length < QA_SLICE_GROUP_QUARTERS)
        groupQuarters.push(line);
    }
    if (
      housingUnits.length === QA_SLICE_HOUSING_UNITS &&
      groupQuarters.length === QA_SLICE_GROUP_QUARTERS
    ) {
      break;
    }
  }

  return Buffer.from(
    `${[header, ...housingUnits, ...groupQuarters].join("\n")}\n`,
    "utf-8",
  );
}

/** Take the header and every person row belonging to a sliced housing unit. */
export function cutPersonSlice(
  personZipBytes: Buffer,
  acquired: ReadonlyMap<string, Buffer>,
): Buffer {
  const housingZip = acquired.get(HOUSING_ARTIFACT);
  if (!housingZip) {
    throw new Error(
      `The person QA slice is selected by the serial numbers the housing slice took, so ${HOUSING_ARTIFACT} must be acquired first.`,
    );
  }
  const serials = housingSliceSerials(housingZip);
  const text = memberText(personZipBytes, PERSON_MEMBER);
  const lines = text.split("\n");
  const bySerial = serialByLine(text);
  const kept = [lines[0] ?? ""];
  for (const [index, line] of lines.slice(1).entries()) {
    if (line.trim() === "") continue;
    const serial = bySerial.get(index + 2);
    if (serial !== undefined && serials.has(serial)) kept.push(line);
  }
  return Buffer.from(`${kept.join("\n")}\n`, "utf-8");
}
