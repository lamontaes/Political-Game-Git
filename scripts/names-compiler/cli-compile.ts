/**
 * National Names V2 Compiler CLI
 *
 * Runs the deterministic names compiler, produces normalized shards,
 * and writes data/names-v2 with cryptographic manifest and index.
 */

import fs from "node:fs";
import path from "node:path";
import {
  compileNamesDataset,
  writeCompiledDatasetToDisk,
  type CompileSourceBuffers,
} from "./compiler";
import { acquireSources } from "./acquire";

async function main() {
  const repoRoot = process.cwd();
  const defaultCacheDir = path.join(
    "/Users/lamontae/.gemini/antigravity/brain/cb16d32d-316a-4c08-8a0d-51dce82d3f7d/scratch",
  );
  const fallbackCacheDir = path.join(repoRoot, ".cache/names-raw");

  let rawDir = defaultCacheDir;
  if (!fs.existsSync(path.join(rawDir, "Names2020_FirstNames_Sex.xlsx"))) {
    rawDir = fallbackCacheDir;
  }

  // If sources are missing, acquire them
  const requiredFiles = [
    "Names2020_FirstNames_Sex.xlsx",
    "Names2020_LastNames_RaceHispanic.xlsx",
    "names.zip",
    "namesbystate.zip",
    "namesbyterritory.zip",
  ];

  const missing = requiredFiles.some(
    (f) => !fs.existsSync(path.join(rawDir, f)),
  );
  if (missing) {
    console.log(`Sources missing in ${rawDir}, acquiring...`);
    await acquireSources(rawDir);
  }

  console.log(`Reading raw sources from: ${rawDir}`);

  const sources: CompileSourceBuffers = {
    censusFirstNamesBuffer: fs.readFileSync(
      path.join(rawDir, "Names2020_FirstNames_Sex.xlsx"),
    ),
    censusSurnamesBuffer: fs.readFileSync(
      path.join(rawDir, "Names2020_LastNames_RaceHispanic.xlsx"),
    ),
    ssaNationalBuffer: fs.readFileSync(path.join(rawDir, "names.zip")),
    ssaStateBuffer: fs.readFileSync(path.join(rawDir, "namesbystate.zip")),
    ssaTerritoryBuffer: fs.readFileSync(
      path.join(rawDir, "namesbyterritory.zip"),
    ),
  };

  console.log("Compiling National Names V2 dataset...");
  const startTime = Date.now();
  const result = compileNamesDataset(sources);
  const durationMs = Date.now() - startTime;

  const outputDir = path.join(repoRoot, "data/names-v2");
  console.log(`Writing compiled dataset to: ${outputDir}`);
  writeCompiledDatasetToDisk(outputDir, result);

  console.log("\n=== COMPILATION SUMMARY ===");
  console.log(
    `- Unique Given Names: ${result.summary.totalGivenNames.toLocaleString()}`,
  );
  console.log(
    `- Unique Surnames: ${result.summary.totalSurnames.toLocaleString()}`,
  );
  console.log(
    `- SSA Birth Year Range: ${result.summary.earliestSSAYear} - ${result.summary.latestSSAYear}`,
  );
  console.log(
    `- SSA States Represented: ${result.summary.states.length} (${result.summary.states.slice(0, 5).join(", ")}...)`,
  );
  console.log(
    `- SSA Territories Represented: ${result.summary.territories.length} (${result.summary.territories.join(", ")})`,
  );
  console.log(`- Given Name Shards: ${result.givenNameShards.size}`);
  console.log(`- Surname Shards: ${result.surnameShards.size}`);
  console.log(`- Compilation Time: ${(durationMs / 1000).toFixed(2)}s`);
  console.log("===========================\n");
}

main().catch((err) => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
