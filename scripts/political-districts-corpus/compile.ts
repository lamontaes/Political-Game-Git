/**
 * Official U.S. Census Bureau Political Districts Geography Corpus
 * Deterministic Compiler Script
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  PoliticalDistrictRecord,
  GeographyType,
  PoliticalDistrictCorpusData,
  SourceProvenanceEntry,
} from "../../src/political_districts/types.js";

const RAW_DIR = path.join(process.cwd(), "data", "political-districts", "raw");
const COMPILED_PATH = path.join(
  process.cwd(),
  "data",
  "political-districts",
  "compiled-political-districts.json",
);
const PROVENANCE_PATH = path.join(
  process.cwd(),
  "data",
  "political-districts",
  "provenance.json",
);

function formatCdName(usps: string, districtCode: string): string {
  if (districtCode === "00") {
    return "Congressional District (At Large)";
  }
  if (districtCode === "98") {
    if (usps === "DC") {
      return "Delegate District (At Large)";
    }
    if (usps === "PR") {
      return "Resident Commissioner District";
    }
    return `Congressional District ${districtCode}`;
  }
  if (districtCode === "ZZ") {
    return "Congressional Districts not defined";
  }
  const num = parseInt(districtCode, 10);
  if (!isNaN(num)) {
    return `Congressional District ${num}`;
  }
  return `Congressional District ${districtCode}`;
}

function parseCdFile(filePath: string): PoliticalDistrictRecord[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const header = lines[0].split("|").map((c) => c.trim());
  const records: PoliticalDistrictRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("|").map((c) => c.trim());
    if (parts.length < header.length) continue;

    const usps = parts[0];
    const geoid = parts[1];
    const geoidfq = parts[2];
    const aland = parseInt(parts[3], 10);
    const awater = parseInt(parts[4], 10);
    const alandSqmi = parseFloat(parts[5]);
    const awaterSqmi = parseFloat(parts[6]);
    const intptlat = parseFloat(parts[7]);
    const intptlong = parseFloat(parts[8]);

    const stateFips = geoid.substring(0, 2);
    const districtCode = geoid.substring(2);
    const name = formatCdName(usps, districtCode);

    records.push({
      geographyType: "cd",
      usps,
      stateFips,
      districtCode,
      geoid,
      geoidfq,
      name,
      aland,
      awater,
      alandSqmi,
      awaterSqmi,
      intptlat,
      intptlong,
      vintage: {
        censusYear: 2025,
        congress: "119th Congress",
        gazetteerFile: path.basename(filePath),
      },
    });
  }

  return records;
}

function parseSldFile(
  filePath: string,
  geographyType: "sldl" | "sldu",
): PoliticalDistrictRecord[] {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const header = lines[0].split("|").map((c) => c.trim());
  const records: PoliticalDistrictRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("|").map((c) => c.trim());
    if (parts.length < header.length) continue;

    const usps = parts[0];
    const geoid = parts[1];
    const geoidfq = parts[2];
    const name = parts[3];
    const aland = parseInt(parts[4], 10);
    const awater = parseInt(parts[5], 10);
    const alandSqmi = parseFloat(parts[6]);
    const awaterSqmi = parseFloat(parts[7]);
    const intptlat = parseFloat(parts[8]);
    const intptlong = parseFloat(parts[9]);

    const stateFips = geoid.substring(0, 2);
    const districtCode = geoid.substring(2);

    records.push({
      geographyType,
      usps,
      stateFips,
      districtCode,
      geoid,
      geoidfq,
      name,
      aland,
      awater,
      alandSqmi,
      awaterSqmi,
      intptlat,
      intptlong,
      vintage: {
        censusYear: 2025,
        congress: null,
        gazetteerFile: path.basename(filePath),
      },
    });
  }

  return records;
}

export function compileCorpus(): PoliticalDistrictCorpusData {
  console.log("Compiling official Census political district corpus...");

  const cdPath = path.join(RAW_DIR, "2025_Gaz_119CDs_national.txt");
  const sldlPath = path.join(RAW_DIR, "2025_Gaz_sldl_national.txt");
  const slduPath = path.join(RAW_DIR, "2025_Gaz_sldu_national.txt");

  const cdRecords = parseCdFile(cdPath);
  const sldlRecords = parseSldFile(sldlPath, "sldl");
  const slduRecords = parseSldFile(slduPath, "sldu");

  const allRecords = [...cdRecords, ...sldlRecords, ...slduRecords];

  // Deterministic sorting order
  const typeOrder: Record<GeographyType, number> = { cd: 1, sldl: 2, sldu: 3 };
  allRecords.sort((a, b) => {
    if (typeOrder[a.geographyType] !== typeOrder[b.geographyType]) {
      return typeOrder[a.geographyType] - typeOrder[b.geographyType];
    }
    if (a.usps !== b.usps) {
      return a.usps.localeCompare(b.usps);
    }
    return a.geoid.localeCompare(b.geoid);
  });

  const recordCountsByType: Record<GeographyType, number> = {
    cd: cdRecords.length,
    sldl: sldlRecords.length,
    sldu: slduRecords.length,
  };

  // Load existing provenance if available
  let sources: SourceProvenanceEntry[] = [];
  if (fs.existsSync(PROVENANCE_PATH)) {
    const provContent = fs.readFileSync(PROVENANCE_PATH, "utf-8");
    const provJson = JSON.parse(provContent);
    sources = provJson.sources || [];
  }

  const payloadSansHash = {
    manifest: {
      datasetName:
        "Official U.S. Census Bureau Political Districts Geography Corpus",
      vintage: "2025 Census Gazetteer / 119th Congress",
      generatedAt: "2026-09-02T20:33:00Z",
      compiledSha256: "",
      totalRecordCount: allRecords.length,
      recordCountsByType,
      sources,
    },
    records: allRecords,
  };

  // Compute deterministic payload SHA256 (canonical JSON format with trailing newline)
  const canonicalJson = JSON.stringify(payloadSansHash, null, 2) + "\n";
  const compiledSha256 = crypto
    .createHash("sha256")
    .update(canonicalJson, "utf-8")
    .digest("hex");

  payloadSansHash.manifest.compiledSha256 = compiledSha256;

  const finalOutputJson = JSON.stringify(payloadSansHash, null, 2) + "\n";

  fs.writeFileSync(COMPILED_PATH, finalOutputJson, "utf-8");
  console.log(
    `Compiled ${allRecords.length} records into ${COMPILED_PATH} (SHA256: ${compiledSha256})`,
  );

  return payloadSansHash;
}

if (process.argv[1] && process.argv[1].endsWith("compile.ts")) {
  compileCorpus();
}
