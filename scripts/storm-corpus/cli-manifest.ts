#!/usr/bin/env node
/* global console, process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StormCoverageManifest } from "../../src/storm_corpus/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const manifestPath = path.join(
  rootDir,
  "data/noaa_storm_corpus/manifests/coverage_manifest.json",
);

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: Coverage manifest not found at ${manifestPath}`);
  console.error("Run `npm run compile:storm-corpus` first.");
  process.exit(1);
}

const manifest: StormCoverageManifest = JSON.parse(
  fs.readFileSync(manifestPath, "utf8"),
);

console.log(
  "================================================================================",
);
console.log(
  "NOAA STORM EVENTS DATABASE — NATIONAL & JURISDICTION COVERAGE MANIFEST",
);
console.log(`Vintage: ${manifest.vintage}`);
console.log(
  `Total Events: ${manifest.totalEventsInCorpus} | Total Episodes: ${manifest.totalEpisodesInCorpus}`,
);
console.log(
  "================================================================================\n",
);

console.log("HISTORICAL COLLECTION ERAS:");
for (const era of manifest.eras) {
  console.log(`\n• [${era.era}] (${era.period})`);
  console.log(`  Procedure: ${era.collectionProcedure}`);
  console.log(
    `  Types (${era.coveredEventTypes.length}): ${era.coveredEventTypes.slice(0, 8).join(", ")}${era.coveredEventTypes.length > 8 ? "..." : ""}`,
  );
  for (const caveat of era.historicalCaveats) {
    console.log(`  * Caveat: ${caveat}`);
  }
}

console.log(
  "\n--------------------------------------------------------------------------------",
);
console.log("JURISDICTION COVERAGE SUMMARY:");
console.log(
  "--------------------------------------------------------------------------------",
);
console.log(
  "FIPS".padEnd(6) +
    "State".padEnd(18) +
    "Period".padEnd(26) +
    "Events".padEnd(10) +
    "Episodes".padEnd(10) +
    "Dominant Family",
);
console.log("-".repeat(85));

for (const jur of manifest.jurisdictions) {
  const period = `${jur.earliestEventDate.slice(0, 10)} to ${jur.latestEventDate.slice(0, 10)}`;
  const dominantFamily = Object.entries(jur.eventCountByFamily).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const domStr =
    dominantFamily && dominantFamily[1] > 0
      ? `${dominantFamily[0]} (${dominantFamily[1]})`
      : "none";

  console.log(
    jur.stateFips.padEnd(6) +
      jur.stateName.padEnd(18) +
      period.padEnd(26) +
      String(jur.totalEvents).padEnd(10) +
      String(jur.totalEpisodes).padEnd(10) +
      domStr,
  );
}
console.log(
  "================================================================================\n",
);
