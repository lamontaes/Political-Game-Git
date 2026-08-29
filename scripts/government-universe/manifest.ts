#!/usr/bin/env node
/**
 * CLI Manifest Generator for U.S. Government-Universe
 *
 * Generates and updates authoritative summary manifests:
 * - National Universe Manifest
 * - State Universe Manifest
 * - Type Classification Manifest
 * - Special Districts Functional Manifest
 * - School Systems Structure Manifest
 * - Historical Count Series Manifest
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  generateFunctionalSpecialDistrictsManifest,
  generateHistoricalCountSeriesManifest,
  generateNationalUniverseManifest,
  generateSchoolSystemsManifest,
  generateStateUniverseManifest,
  generateTypeClassificationManifest,
} from "../../src/government_universe/manifest_generator.js";

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const manifestsDir = join(
    rootDir,
    "data",
    "government_universe",
    "manifests",
  );
  await mkdir(manifestsDir, { recursive: true });

  const generatedAt = "2024-01-01T00:00:00.000Z";

  console.log("Generating authoritative Government Universe manifests...");

  // 1. National Universe Manifest
  const nationalManifest = generateNationalUniverseManifest(generatedAt);
  const nationalPath = join(manifestsDir, "national_universe_manifest.json");
  await writeFile(
    nationalPath,
    JSON.stringify(nationalManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Generated ${nationalPath} (Total: ${nationalManifest.totalGovernmentsNationally})`,
  );

  // 2. State Universe Manifest
  const stateManifest = generateStateUniverseManifest(generatedAt);
  const statePath = join(manifestsDir, "state_universe_manifest.json");
  await writeFile(
    statePath,
    JSON.stringify(stateManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Generated ${statePath} (States: ${stateManifest.stateCount})`);

  // 3. Type Classification Manifest
  const typeManifest = generateTypeClassificationManifest(generatedAt);
  const typePath = join(manifestsDir, "type_classification_manifest.json");
  await writeFile(
    typePath,
    JSON.stringify(typeManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Generated ${typePath}`);

  // 4. Special Districts Functional Manifest
  const functionalManifest =
    generateFunctionalSpecialDistrictsManifest(generatedAt);
  const functionalPath = join(
    manifestsDir,
    "special_districts_functional_manifest.json",
  );
  await writeFile(
    functionalPath,
    JSON.stringify(functionalManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Generated ${functionalPath} (Special Districts: ${functionalManifest.totalSpecialDistricts})`,
  );

  // 5. School Systems Manifest
  const schoolManifest = generateSchoolSystemsManifest(generatedAt);
  const schoolPath = join(manifestsDir, "school_systems_manifest.json");
  await writeFile(
    schoolPath,
    JSON.stringify(schoolManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Generated ${schoolPath} (Independent: ${schoolManifest.nationalSummary.independentDistricts}, Dependent: ${schoolManifest.nationalSummary.dependentSystems})`,
  );

  // 6. Historical Count Series Manifest
  const historicalManifest = generateHistoricalCountSeriesManifest(generatedAt);
  const historicalPath = join(
    manifestsDir,
    "historical_count_series_manifest.json",
  );
  await writeFile(
    historicalPath,
    JSON.stringify(historicalManifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Generated ${historicalPath} (${historicalManifest.censusYears.length} Census years)`,
  );

  console.log("\nAll summary manifests generated successfully.");
}

main().catch((err) => {
  console.error("Manifest generation failed:", err);
  process.exit(1);
});
