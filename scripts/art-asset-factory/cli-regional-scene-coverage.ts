/**
 * Usage:
 *   cli-regional-scene-coverage.ts [--check]
 *
 * Prints the regional coverage as a reviewer would want to read it, and with
 * `--check` exits non-zero on any error, so it is usable as a gate.
 *
 * It also verifies that every declared plate file exists and hashes to the
 * sha256 the document records. Owner approval is of exact bytes; a path that
 * has drifted from its hash is a different picture wearing an approved name.
 */

import { createHash } from "node:crypto";
import fs from "fs";
import path from "path";

import coverage from "../../art/regions/regional-scene-places.json";
import {
  summarizeRegionalSceneCoverage,
  validateRegionalSceneCoverage,
  type RegionalSceneCoverageDocument,
} from "../../src/authoring/regional-scene-coverage";

const repositoryRoot = process.cwd();
const document = coverage as RegionalSceneCoverageDocument;
const check = process.argv.includes("--check");

const validation = validateRegionalSceneCoverage(document);
let failed = false;

for (const finding of validation.findings) {
  const mark = finding.severity === "error" ? "ERROR" : "warn ";
  if (finding.severity === "error") failed = true;
  console.error(`${mark} ${finding.regionKey}: ${finding.message}`);
}

for (const entry of document.regions) {
  const plate = entry.plate;
  if (!plate) continue;
  const absolute = path.join(repositoryRoot, plate.path);
  if (!fs.existsSync(absolute)) {
    failed = true;
    console.error(
      `ERROR ${entry.regionKey}: declares ${plate.path}, which this checkout does not carry.`,
    );
    continue;
  }
  const actual = createHash("sha256")
    .update(fs.readFileSync(absolute))
    .digest("hex");
  if (actual !== plate.sha256) {
    failed = true;
    console.error(
      `ERROR ${entry.regionKey}: ${plate.path} hashes to ${actual}, not the approved ${plate.sha256}. Approval is of exact bytes.`,
    );
  }
}

const summary = summarizeRegionalSceneCoverage(document);
console.log(
  `${summary.regions} regions; ${summary.withPlate} with a delivered plate; ` +
    `${summary.withPlaceData} carrying place data; ` +
    `${summary.countiesNamed} counties and ${summary.statesNamed} states named.`,
);

for (const entry of document.regions) {
  const places = entry.places;
  const claims = [
    (places.includeStates?.length ?? 0) > 0
      ? `${places.includeStates!.length} state(s)`
      : null,
    (places.includeCounties?.length ?? 0) > 0
      ? `${places.includeCounties!.length} county(ies)`
      : null,
    (places.includePlaces?.length ?? 0) > 0
      ? `${places.includePlaces!.length} place(s)`
      : null,
  ].filter((part): part is string => part !== null);
  console.log(
    `  ${entry.plate ? "plate " : "no art"} ${entry.regionKey} — ${
      claims.length > 0 ? claims.join(", ") : "no place data yet"
    }`,
  );
}

if (check && failed) process.exit(1);
