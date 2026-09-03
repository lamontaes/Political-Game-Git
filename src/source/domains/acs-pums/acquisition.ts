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

import { readZipMember } from "../../core/index";
import type { AcquisitionPlan } from "../../core/index";

const PUMS_BASE = "https://www2.census.gov/programs-surveys/acs/data/pums/2023/1-Year";
const DICT_URL =
  "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2023.csv";

export const PERSON_ARTIFACT = "census-acs-pums-2023-1yr-wy-person-zip";
export const HOUSING_ARTIFACT = "census-acs-pums-2023-1yr-wy-housing-zip";
export const DICTIONARY_ARTIFACT = "census-acs-pums-2023-data-dictionary-csv";
export const PERSON_SLICE_ARTIFACT = "census-acs-pums-2023-wy-person-qa-slice";
export const HOUSING_SLICE_ARTIFACT = "census-acs-pums-2023-wy-housing-qa-slice";

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

export const HOUSING_SLICE_PREDICATE =
  `The header row of ${HOUSING_MEMBER}, followed by the first ${QA_SLICE_HOUSING_UNITS} data rows whose SERIALNO marks a housing unit (contains "HU") and the first ${QA_SLICE_GROUP_QUARTERS} whose SERIALNO marks group quarters (contains "GQ"), each stratum in published file order and each row byte-for-byte, with a trailing newline.`;

export const PERSON_SLICE_PREDICATE =
  `The header row of ${PERSON_MEMBER} followed by every data row whose SERIALNO appears in the housing QA slice, in published file order, byte-for-byte, with a trailing newline.`;

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

/** The serial numbers the housing slice takes, read from the housing parent. */
export function housingSliceSerials(housingZipBytes: Buffer): ReadonlySet<string> {
  const lines = cutHousingSlice(housingZipBytes).toString("utf-8").split("\n");
  const serialColumn = (lines[0] ?? "").split(",").indexOf("SERIALNO");
  const serials = new Set<string>();
  for (const line of lines.slice(1)) {
    if (line.trim() === "") continue;
    const serial = line.split(",")[serialColumn];
    if (serial !== undefined && serial !== "") serials.add(serial);
  }
  return serials;
}

/** Take the header and both strata of housing rows, in published order. */
export function cutHousingSlice(housingZipBytes: Buffer): Buffer {
  const lines = memberText(housingZipBytes, HOUSING_MEMBER).split("\n");
  const header = lines[0] ?? "";
  const serialColumn = header.split(",").indexOf("SERIALNO");
  const housingUnits: string[] = [];
  const groupQuarters: string[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim() === "") continue;
    const serial = line.split(",")[serialColumn] ?? "";
    if (serial.includes("HU")) {
      if (housingUnits.length < QA_SLICE_HOUSING_UNITS) housingUnits.push(line);
    } else if (serial.includes("GQ")) {
      if (groupQuarters.length < QA_SLICE_GROUP_QUARTERS) groupQuarters.push(line);
    }
    if (
      housingUnits.length === QA_SLICE_HOUSING_UNITS &&
      groupQuarters.length === QA_SLICE_GROUP_QUARTERS
    ) {
      break;
    }
  }

  return Buffer.from(`${[header, ...housingUnits, ...groupQuarters].join("\n")}\n`, "utf-8");
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
  const lines = memberText(personZipBytes, PERSON_MEMBER).split("\n");
  const header = lines[0] ?? "";
  const serialColumn = header.split(",").indexOf("SERIALNO");
  const kept = [header];
  for (const line of lines.slice(1)) {
    if (line.trim() === "") continue;
    const serial = line.split(",")[serialColumn];
    if (serial !== undefined && serials.has(serial)) kept.push(line);
  }
  return Buffer.from(`${kept.join("\n")}\n`, "utf-8");
}
