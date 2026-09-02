import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type {
  EducationCorpusSnapshot,
  EducationInstitutionRecord,
  EducationSourceProvenance,
  PostsecondaryRecord,
  PublicSchoolRecord,
  SchoolDistrictRecord,
} from "../../../src/source/education/types.js";
import type { RawSourceArtifact } from "../../../src/source/provenance.js";

const RETRIEVAL_DATE = "2026-08-30";

const ARTIFACT_SPECS = [
  {
    filename: "ccd_sch_029_2223_w_0a_051023.zip",
    csvFilename: "ccd_sch_029_2223_w_0a_051023.csv",
    url: "https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2223_w_0a_051023.zip",
    datasetName:
      "NCES CCD Public Elementary/Secondary School Universe Survey Directory 2022-2023 (v.0a)",
    releaseStatus: "preliminary-directory" as const,
  },
  {
    filename: "ccd_lea_029_2223_w_0a_051023.zip",
    csvFilename: "ccd_lea_029_2223_w_0a_051023.csv",
    url: "https://nces.ed.gov/ccd/Data/zip/ccd_lea_029_2223_w_0a_051023.zip",
    datasetName:
      "NCES CCD Local Education Agency Universe Survey Directory 2022-2023 (v.0a)",
    releaseStatus: "preliminary-directory" as const,
  },
  {
    filename: "HD2022.zip",
    csvFilename: "hd2022.csv",
    url: "https://nces.ed.gov/ipeds/datacenter/data/HD2022.zip",
    datasetName:
      "NCES IPEDS Institutional Characteristics / Directory 2022 (HD2022)",
    releaseStatus: "final-release" as const,
  },
];

function ensureRawArtifacts(): Record<
  string,
  { sha256: string; byteSize: number }
> {
  const rawDir = path.join(process.cwd(), "data", "source", "education", "raw");
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const results: Record<string, { sha256: string; byteSize: number }> = {};

  for (const spec of ARTIFACT_SPECS) {
    const zipPath = path.join(rawDir, spec.filename);
    const csvPath = path.join(rawDir, spec.csvFilename);

    if (!fs.existsSync(zipPath)) {
      console.log(`Downloading raw artifact: ${spec.url}...`);
      execSync(`curl -s -o "${zipPath}" "${spec.url}"`);
    }

    const bytes = fs.readFileSync(zipPath);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const byteSize = bytes.length;
    results[spec.filename] = { sha256, byteSize };

    if (!fs.existsSync(csvPath)) {
      console.log(`Extracting CSV from ${spec.filename}...`);
      execSync(`unzip -o "${zipPath}" -d "${rawDir}"`);
    }
  }

  return results;
}

function parseCsvSimple(filePath: string): {
  headers: string[];
  rows: { rowIndex: number; data: Record<string, string> }[];
} {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]!);
  const rows: { rowIndex: number; data: Record<string, string> }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;
    const values = parseCsvLine(line);
    const data: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        data[header] = values[j] ?? "";
      }
    }
    rows.push({ rowIndex: i + 1, data });
  }

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^\uFEFF/, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^\uFEFF/, ""));
  return result;
}

function main() {
  const artifactHashes = ensureRawArtifacts();
  const rawDir = path.join(process.cwd(), "data", "source", "education", "raw");

  const rawManifest: RawSourceArtifact[] = ARTIFACT_SPECS.map((spec) => ({
    id: spec.filename.replace(/\.zip$/, ""),
    provider: "National Center for Education Statistics (NCES)",
    authoritativeUrl: spec.url,
    // Date-only: the retrieval recorded a calendar date, not a time of day.
    retrievedAt: RETRIEVAL_DATE,
    sourceVintage: spec.filename.startsWith("ccd_") ? "2022-2023" : "2022",
    rawFilename: spec.filename,
    byteLength: artifactHashes[spec.filename]!.byteSize,
    sha256: artifactHashes[spec.filename]!.sha256,
    mimeType: "application/zip",
    retrievalMethod: "HTTPS download of the publisher-hosted ZIP archive",
    sourceReleaseStatus: spec.releaseStatus,
    coverageDescription: spec.datasetName,
    universeDescription:
      "Publisher universe for this release; this repository commits only a sample of its rows.",
  }));

  // Target IDs for LEAs
  const leaTargetIds = new Set([
    "2101860", // Fayette County
    "2102990", // Jefferson County
    "2102010", // Franklin County
    "2106000", // Woodford County
    "2103030", // Jessamine County
    "2103720", // Madison County
    "2105260", // Scott County
  ]);

  // Target IDs for Public Schools
  const schTargetIds = new Set([
    "210186000367", // Lafayette High School
    "210186000364", // Henry Clay High School
    "210186000389", // Bryan Station High School
    "210186001669", // Paul Laurence Dunbar High School
    "210186000383", // Tates Creek High School
    "210186002459", // Frederick Douglass High School
    "210186000353", // Beaumont Middle School
    "210186000391", // Jessie M Clark Middle School
    "210186000374", // Morton Middle School
    "210186000376", // Picadome Elementary School
    "210299000734", // duPont Manual High
  ]);

  // Target IDs for Postsecondary
  const ipedsTargetIds = new Set([
    "157085", // University of Kentucky
    "157818", // Transylvania University
    "156392", // Bluegrass Community and Technical College
    "157289", // University of Louisville
    "156620", // Eastern Kentucky University
    "157951", // Western Kentucky University
    "157447", // Northern Kentucky University
    "157058", // Kentucky State University
    "156408", // Centre College
    "166027", // Harvard University
    "130794", // Yale University
    "186131", // Princeton University
    "243744", // Stanford University
    "131496", // Georgetown University
  ]);

  const districts: SchoolDistrictRecord[] = [];
  const leaSpec = ARTIFACT_SPECS.find(
    (s) => s.filename === "ccd_lea_029_2223_w_0a_051023.zip",
  )!;
  const leaCsvPath = path.join(rawDir, leaSpec.csvFilename);
  const parsedLea = parseCsvSimple(leaCsvPath);

  for (const { rowIndex, data } of parsedLea.rows) {
    const leaid = data["LEAID"]?.trim();
    if (leaid && leaTargetIds.has(leaid)) {
      const name = data["LEA_NAME"]?.trim() || "";
      const provenance: EducationSourceProvenance = {
        sourceName: "NCES CCD",
        datasetName: leaSpec.datasetName,
        vintage: "2022-2023",
        releaseStatus: leaSpec.releaseStatus,
        officialIdName: "LEAID",
        sourceUrl: leaSpec.url,
        retrievedAt: RETRIEVAL_DATE,
        rowLocator: {
          sourceZipFilename: leaSpec.filename,
          sourceZipSha256: artifactHashes[leaSpec.filename]!.sha256,
          csvFilename: leaSpec.csvFilename,
          sourceRowIndex: rowIndex,
          sourceKeyColumn: "LEAID",
          sourceKeyValue: leaid,
        },
      };

      districts.push({
        officialId: leaid,
        stableId: `nces-lea:${leaid}`,
        name:
          name.endsWith(" District") || name.endsWith(" Schools")
            ? name
            : `${name} School District`,
        kind: "public-district",
        level: "district",
        location: {
          address: data["LSTREET1"]?.trim() || null,
          city: data["LCITY"]?.trim() || "",
          state: data["LSTATE"]?.trim() || "",
          zip: data["LZIP"]?.trim() || null,
          fipsState: data["FIPST"] ? `${data["FIPST"]}` : null,
          countyGeoid: null, // CCD directory file does not supply a county GEOID field; do NOT substitute state FIPS!
          countyName: null,
          latitude: null,
          longitude: null,
        },
        vintages: [
          {
            vintageYear: 2022,
            effectiveDateStart: null, // Historical opening date is NOT provided by NCES directory
            effectiveDateEnd: null,
            status: "open",
            nameAtVintage: name,
          },
        ],
        provenance,
      });
    }
  }

  const publicSchools: PublicSchoolRecord[] = [];
  const schSpec = ARTIFACT_SPECS.find(
    (s) => s.filename === "ccd_sch_029_2223_w_0a_051023.zip",
  )!;
  const schCsvPath = path.join(rawDir, schSpec.csvFilename);
  const parsedSch = parseCsvSimple(schCsvPath);

  for (const { rowIndex, data } of parsedSch.rows) {
    const ncessch = data["NCESSCH"]?.trim();
    if (ncessch && schTargetIds.has(ncessch)) {
      const schName = data["SCH_NAME"]?.trim() || "";
      const leaid = data["LEAID"]?.trim() || "";
      const levelCode = data["LEVEL"]?.trim();
      let level: "elementary" | "middle" | "high" | "combined" = "high";
      if (levelCode === "1" || schName.toLowerCase().includes("elementary")) {
        level = "elementary";
      } else if (
        levelCode === "2" ||
        schName.toLowerCase().includes("middle")
      ) {
        level = "middle";
      } else if (levelCode === "3" || schName.toLowerCase().includes("high")) {
        level = "high";
      }

      const provenance: EducationSourceProvenance = {
        sourceName: "NCES CCD",
        datasetName: schSpec.datasetName,
        vintage: "2022-2023",
        releaseStatus: schSpec.releaseStatus,
        officialIdName: "NCESSCH",
        sourceUrl: schSpec.url,
        retrievedAt: RETRIEVAL_DATE,
        rowLocator: {
          sourceZipFilename: schSpec.filename,
          sourceZipSha256: artifactHashes[schSpec.filename]!.sha256,
          csvFilename: schSpec.csvFilename,
          sourceRowIndex: rowIndex,
          sourceKeyColumn: "NCESSCH",
          sourceKeyValue: ncessch,
        },
      };

      publicSchools.push({
        officialId: ncessch,
        stableId: `nces-sch:${ncessch}`,
        name: schName,
        kind: "public-elementary-secondary",
        level,
        parentDistrictId: `nces-lea:${leaid}`,
        location: {
          address: data["LSTREET1"]?.trim() || null,
          city: data["LCITY"]?.trim() || "",
          state: data["LSTATE"]?.trim() || "",
          zip: data["LZIP"]?.trim() || null,
          fipsState: data["FIPST"] ? `${data["FIPST"]}` : null,
          countyGeoid: null, // CCD directory file does not supply a county GEOID field; do NOT substitute state FIPS!
          countyName: null,
          latitude: null,
          longitude: null,
        },
        vintages: [
          {
            vintageYear: 2022,
            effectiveDateStart: null, // Historical opening date is NOT provided by NCES directory
            effectiveDateEnd: null,
            status: "open",
            nameAtVintage: schName,
          },
        ],
        provenance,
      });
    }
  }

  const postsecondaryInstitutions: PostsecondaryRecord[] = [];
  const ipedsSpec = ARTIFACT_SPECS.find((s) => s.filename === "HD2022.zip")!;
  const ipedsCsvPath = path.join(rawDir, ipedsSpec.csvFilename);
  const parsedIpeds = parseCsvSimple(ipedsCsvPath);

  for (const { rowIndex, data } of parsedIpeds.rows) {
    const unitid = data["UNITID"]?.trim();
    if (unitid && ipedsTargetIds.has(unitid)) {
      const instName = data["INSTNM"]?.trim() || "";
      const controlCode = data["CONTROL"]?.trim();
      let control: "public" | "private-nonprofit" | "private-forprofit" =
        "public";
      if (controlCode === "2") control = "private-nonprofit";
      if (controlCode === "3") control = "private-forprofit";

      const levelCode = data["ICLEVEL"]?.trim();
      let level:
        | "postsecondary-4yr"
        | "postsecondary-2yr"
        | "postsecondary-less-than-2yr" = "postsecondary-4yr";
      if (levelCode === "2") level = "postsecondary-2yr";
      if (levelCode === "3") level = "postsecondary-less-than-2yr";

      const provenance: EducationSourceProvenance = {
        sourceName: "NCES IPEDS",
        datasetName: ipedsSpec.datasetName,
        vintage: "2022",
        releaseStatus: ipedsSpec.releaseStatus,
        officialIdName: "UNITID",
        sourceUrl: ipedsSpec.url,
        retrievedAt: RETRIEVAL_DATE,
        rowLocator: {
          sourceZipFilename: ipedsSpec.filename,
          sourceZipSha256: artifactHashes[ipedsSpec.filename]!.sha256,
          csvFilename: ipedsSpec.csvFilename,
          sourceRowIndex: rowIndex,
          sourceKeyColumn: "UNITID",
          sourceKeyValue: unitid,
        },
      };

      postsecondaryInstitutions.push({
        officialId: unitid,
        stableId: `ipeds-unit:${unitid}`,
        name: instName,
        kind: "postsecondary",
        level,
        control,
        location: {
          address: data["ADDR"]?.trim() || null,
          city: data["CITY"]?.trim() || "",
          state: data["STABBR"]?.trim() || "",
          zip: data["ZIP"]?.trim() || null,
          fipsState: data["FIPS"] ? `${data["FIPS"]}` : null,
          countyGeoid: data["COUNTYCD"]?.trim() || null, // Exact 5-digit state+county GEOID from IPEDS
          countyName: data["COUNTYNM"]?.trim() || null, // Exact official county name from IPEDS
          latitude: null,
          longitude: null,
        },
        vintages: [
          {
            vintageYear: 2022,
            effectiveDateStart: null, // Historical founding date is NOT provided by NCES IPEDS directory
            effectiveDateEnd: null,
            status: "open",
            nameAtVintage: instName,
          },
        ],
        provenance,
      });
    }
  }

  // Sort deterministically by stable ID
  districts.sort((a, b) => a.stableId.localeCompare(b.stableId));
  const sortedInstitutions: EducationInstitutionRecord[] = [
    ...publicSchools,
    ...postsecondaryInstitutions,
  ].sort((a, b) => a.stableId.localeCompare(b.stableId));

  const snapshot: EducationCorpusSnapshot = {
    version: "1.0.0",
    corpusScope: "sample-2022-vintage-not-national-universe",
    completeness: {
      isNationalUniverse: false,
      description:
        "A deliberately small sample drawn from the 2022 NCES CCD and IPEDS directory files. " +
        "Every record is empirical and row-locatable, but the set is NOT the national universe of " +
        "U.S. schools, districts or postsecondary institutions. Absence of an institution from this " +
        "corpus establishes nothing about whether it exists.",
      selectionBasis:
        "Hand-selected rows covering the jurisdictions exercised by existing regression fixtures, " +
        "plus a spread of institution kinds and levels.",
    },
    generatedAt: RETRIEVAL_DATE,
    counts: {
      publicDistricts: districts.length,
      publicSchools: publicSchools.length,
      postsecondaryInstitutions: postsecondaryInstitutions.length,
      total:
        districts.length +
        publicSchools.length +
        postsecondaryInstitutions.length,
    },
    stableIdStrategy: {
      publicSchoolPrefix: "nces-sch:",
      districtPrefix: "nces-lea:",
      postsecondaryPrefix: "ipeds-unit:",
    },
    rawArtifacts: rawManifest,
    districts,
    institutions: sortedInstitutions,
  };

  const outputDir = path.join(process.cwd(), "data", "source", "education");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "us-education-corpus.json");
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Education corpus successfully compiled at: ${outputPath}`);
  console.log(
    `Counts: Districts=${snapshot.counts.publicDistricts}, Public Schools=${snapshot.counts.publicSchools}, Postsecondary=${snapshot.counts.postsecondaryInstitutions}, Total=${snapshot.counts.total}`,
  );
}

main();
