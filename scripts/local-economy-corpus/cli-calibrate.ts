#!/usr/bin/env node
/**
 * CLI: Local Economy Calibration Diagnostic Inspection Tool
 *
 * Runs economic structure profiling and Location Quotient (LQ) calculations
 * for Lexington/Fayette and contrasting counties.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EconomyCorpusQueryEngine } from "../../src/local_economy_corpus/calibration.js";
import type { NormalizedEconomyCorpusPackage } from "../../src/local_economy_corpus/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

const CORPUS_PATH = path.join(
  ROOT_DIR,
  "data/local_economy_source/corpus/normalized_economy_corpus.json",
);

function runCalibrationDiagnostics() {
  console.log("=== LOCAL ECONOMY CALIBRATION DIAGNOSTIC REPORT ===\n");

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(
      `Error: Corpus file not found at ${CORPUS_PATH}. Run 'npm run compile:economy' first.`,
    );
    process.exit(1);
  }

  const corpus: NormalizedEconomyCorpusPackage = JSON.parse(
    fs.readFileSync(CORPUS_PATH, "utf-8"),
  );

  const engine = new EconomyCorpusQueryEngine(corpus);

  const counties = [
    { fips: "21067", name: "Fayette County, KY (Lexington Core)" },
    {
      fips: "21159",
      name: "Martin County, KY (Appalachian Coal/Transfer Dependent)",
    },
    { fips: "26163", name: "Wayne County, MI (Detroit Manufacturing)" },
    { fips: "06085", name: "Santa Clara County, CA (Silicon Valley Tech)" },
    {
      fips: "48329",
      name: "Midland County, TX (Permian Basin Oil Extraction)",
    },
    { fips: "12086", name: "Miami-Dade County, FL (Tourism/Services)" },
  ];

  for (const county of counties) {
    console.log(`------------------------------------------------------------`);
    console.log(`JURISDICTION: ${county.name} [FIPS: ${county.fips}]`);
    console.log(`------------------------------------------------------------`);

    const profile = engine.buildEconomicStructureProfile({
      geoFips: county.fips,
      year: 2022,
    });

    if (profile.totalGdpNominalUsd) {
      console.log(
        `  Nominal GDP: $${profile.totalGdpNominalUsd.toLocaleString()} thousand`,
      );
    }
    if (profile.totalGdpRealUsd) {
      console.log(
        `  Real GDP (2017 chained): $${profile.totalGdpRealUsd.toLocaleString()} thousand`,
      );
    }
    if (profile.totalPersonalIncomeNominalUsd) {
      console.log(
        `  Personal Income: $${profile.totalPersonalIncomeNominalUsd.toLocaleString()} thousand`,
      );
    }
    if (profile.perCapitaPersonalIncomeUsd) {
      console.log(
        `  Per Capita Income: $${profile.perCapitaPersonalIncomeUsd.toLocaleString()}`,
      );
    }
    if (profile.transferShareOfPersonalIncome !== undefined) {
      console.log(
        `  Transfer Receipts Share of Personal Income: ${(profile.transferShareOfPersonalIncome * 100).toFixed(2)}%`,
      );
    }
    if (profile.proprietorShareOfJobs !== undefined) {
      console.log(
        `  Proprietor Share of Jobs: ${(profile.proprietorShareOfJobs * 100).toFixed(2)}%`,
      );
    }
    if (profile.averageAnnualPayTotalCoveredUsd) {
      console.log(
        `  Average Annual Pay (Total Covered): $${profile.averageAnnualPayTotalCoveredUsd.toLocaleString()}`,
      );
    }

    // Sample Location Quotients vs US Benchmark (00000)
    console.log(`\n  Selected Location Quotients vs US Benchmark (2022):`);
    const sectors = [
      { code: "11", name: "Agriculture" },
      { code: "21", name: "Mining / Oil & Gas" },
      { code: "31-33", name: "Manufacturing" },
      { code: "51", name: "Information" },
      { code: "54", name: "Professional / Technical" },
    ];

    for (const sec of sectors) {
      const lq = engine.calculateLocationQuotient({
        geoFips: county.fips,
        benchmarkFips: "00000",
        naicsCode: sec.code,
        year: 2022,
      });

      if (lq.status === "valid" && lq.locationQuotient !== null) {
        console.log(
          `    - ${sec.name} (NAICS ${sec.code}): LQ = ${lq.locationQuotient.toFixed(3)}`,
        );
      } else if (lq.status === "suppressed") {
        console.log(
          `    - ${sec.name} (NAICS ${sec.code}): [SUPPRESSED / CONFIDENTIAL]`,
        );
      } else {
        console.log(`    - ${sec.name} (NAICS ${sec.code}): [N/A]`);
      }
    }
    console.log("");
  }
}

runCalibrationDiagnostics();
