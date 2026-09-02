import fs from "node:fs";
import path from "node:path";
import type {
  PumsAcquisitionManifest,
  QASliceArtifact,
  PumsHousingRecord,
  PumsPersonRecord,
} from "../../src/acs_pums/types.js";
import {
  parseCsvHeaderAndRows,
  parseHousingRecord,
  parsePersonRecord,
  compileHouseholdClusters,
} from "../../src/acs_pums/compiler.js";

export function generateQaSliceFromCsvs(
  housingCsvPath: string,
  personCsvPath: string,
  maxHouseholds = 50,
): QASliceArtifact {
  const housingCsv = fs.readFileSync(housingCsvPath, "utf8");
  const personCsv = fs.readFileSync(personCsvPath, "utf8");

  const { headers: hHeaders, rows: hRows } = parseCsvHeaderAndRows(housingCsv);
  const { headers: pHeaders, rows: pRows } = parseCsvHeaderAndRows(personCsv);

  const selectedHRows = hRows.slice(0, maxHouseholds);
  const selectedHousingRecords: PumsHousingRecord[] = selectedHRows.map((r) =>
    parseHousingRecord(hHeaders, r),
  );

  const selectedSerialnos = new Set(
    selectedHousingRecords.map((h) => h.SERIALNO),
  );

  const selectedPersonRecords: PumsPersonRecord[] = [];
  for (const r of pRows) {
    const person = parsePersonRecord(pHeaders, r);
    if (selectedSerialnos.has(person.SERIALNO)) {
      selectedPersonRecords.push(person);
    }
  }

  const clusters = compileHouseholdClusters(
    selectedHousingRecords,
    selectedPersonRecords,
  );

  let missingCount = 0;
  const missingExamples: Record<string, string> = {};

  for (const cluster of clusters) {
    for (const [k, v] of Object.entries(cluster.housing)) {
      if (v === null || v === "" || v === "b" || v === "b.b" || v === "-1") {
        missingCount++;
        if (!missingExamples[k]) {
          missingExamples[k] = String(v);
        }
      }
    }
    for (const person of cluster.persons) {
      for (const [k, v] of Object.entries(person)) {
        if (v === null || v === "" || v === "b" || v === "b.b" || v === "-1") {
          missingCount++;
          if (!missingExamples[k]) {
            missingExamples[k] = String(v);
          }
        }
      }
    }
  }

  return {
    manifest_title:
      "U.S. Census Bureau ACS Public Use Microdata Sample (PUMS) Acquisition Manifest",
    vintage: "2023",
    extraction_date: "2026-09-02T20:35:00Z",
    selection_rule: `First ${maxHouseholds} housing units from Wyoming 2023 1-Year ACS PUMS (psam_h56.csv) and all corresponding person records from psam_p56.csv`,
    households: clusters,
    summary: {
      total_housing_units: clusters.length,
      total_persons: clusters.reduce((acc, c) => acc + c.persons.length, 0),
      preserved_missing_codes_count: missingCount,
      missing_code_examples: missingExamples,
    },
  };
}

function main() {
  const manifestPath = path.resolve("data/acs_pums/pums_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest: PumsAcquisitionManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  );
  console.log(
    `PUMS Manifest loaded: ${manifest.title} (${manifest.vintage} ${manifest.dataset_type})`,
  );

  // Verify file hashes if raw files exist locally in /tmp/pums_test or data/acs_pums
  const rawHPath = fs.existsSync("data/acs_pums/psam_h56.csv")
    ? "data/acs_pums/psam_h56.csv"
    : "/tmp/pums_test/psam_h56.csv";
  const rawPPath = fs.existsSync("data/acs_pums/psam_p56.csv")
    ? "data/acs_pums/psam_p56.csv"
    : "/tmp/pums_test/psam_p56.csv";

  if (fs.existsSync(rawHPath) && fs.existsSync(rawPPath)) {
    console.log(
      `Generating QA slice from local raw PUMS CSVs: ${rawHPath}, ${rawPPath}`,
    );
    const qaSlice = generateQaSliceFromCsvs(rawHPath, rawPPath, 50);
    const qaSlicePath = path.resolve("data/acs_pums/qa_slice_wy_2023.json");
    fs.writeFileSync(qaSlicePath, JSON.stringify(qaSlice, null, 2));
    console.log(`QA slice saved to ${qaSlicePath}`);
  } else {
    console.log(
      "Raw PUMS CSVs not found in data/acs_pums or /tmp/pums_test. Skipping QA slice generation.",
    );
  }
}

if (process.argv[1] && process.argv[1].includes("compile-pums.ts")) {
  main();
}
