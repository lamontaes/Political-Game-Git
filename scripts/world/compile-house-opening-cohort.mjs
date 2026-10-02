#!/usr/bin/env node
/* global console, process */
// Reuse the electoral compiler and pinned Clerk bytes; no network or new votes.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  extractPdf,
  parseStatistics,
  summarizeContest,
  footnoteLookup,
  readPoliticalDivisions,
} from "./compile-electoral-calibration.mjs";

const root = resolve(import.meta.dirname, "../..");
const domain = "data/source/electoral-calibration-2024";
const lock = JSON.parse(
  readFileSync(resolve(root, domain, "artifact-lock.json")),
);
const artifact = lock.artifacts.find((row) => row.id === "clerk-2022");
const bytes = readFileSync(resolve(root, artifact.localPath));
const digest = createHash("sha256").update(bytes).digest("hex");
if (digest !== artifact.sha256 || bytes.length !== artifact.byteLength)
  throw new Error("Clerk 2022 bytes differ from the retained source lock.");
const pages = await extractPdf(bytes);
const parsed = parseStatistics(pages, artifact.id);
const control = pages
  .map((page) => readPoliticalDivisions(page, 118))
  .find(Boolean);
if (!control || control.houseTotal !== 435)
  throw new Error("Missing printed House division control.");
const rows = [];
for (const [stateUsps, state] of parsed.states) {
  for (const contest of state.house) {
    const summary = summarizeContest(contest.lines, {
      usps: stateUsps,
      chamber: "house",
      footnoteFor: footnoteLookup(parsed, stateUsps),
    });
    rows.push({
      seatKey: `us-house:${stateUsps}-${contest.district}`,
      affiliation: summary.certifiedWinnerParty,
      sourceRef: `${artifact.id}#p${contest.page}`,
      winnerBasis: summary.winnerBasis,
    });
  }
}
const counts = rows.reduce((acc, row) => {
  if (row.affiliation) acc[row.affiliation] = (acc[row.affiliation] ?? 0) + 1;
  return acc;
}, {});
const unknown = rows.filter((row) => row.affiliation === null);
const residuals = [
  ["democratic", control.houseDemocrats - (counts.democratic ?? 0)],
  ["republican", control.houseRepublicans - (counts.republican ?? 0)],
].filter(([, count]) => count > 0);
// Same residual reconciliation already used by the electoral compiler. Never
// assign individual unknowns when the source allows more than one party.
if (
  unknown.length &&
  control.houseOther === 0 &&
  residuals.length === 1 &&
  residuals[0][1] === unknown.length
) {
  for (const row of unknown) {
    row.affiliation = residuals[0][0];
    row.winnerBasis = "residual-of-clerk-political-divisions";
    row.sourceRef += `;${artifact.id}#p${pages.findIndex((page) => readPoliticalDivisions(page, 118)) + 1}`;
  }
}
const keys = rows.map((row) => row.seatKey);
const latest = JSON.parse(
  readFileSync(
    resolve(
      root,
      "src/simulation/world-setup/electoral-calibration.generated.json",
    ),
  ),
);
const latestKeys = latest.calibrationRows
  .filter((row) => row.office === "us-house")
  .map((row) => row.contestKey)
  .sort();
if (
  rows.length !== 435 ||
  new Set(keys).size !== 435 ||
  keys.sort().join() !== latestKeys.join() ||
  rows.some((row) => row.affiliation === null)
)
  throw new Error(
    "House cohort lacks a complete unique, source-determined seat roster.",
  );
for (const [party, expected] of [
  ["democratic", control.houseDemocrats],
  ["republican", control.houseRepublicans],
]) {
  if (rows.filter((row) => row.affiliation === party).length !== expected)
    throw new Error(`House cohort disagrees with printed ${party} total.`);
}
const corpus = {
  schema: "observed-house-opening-cohort/v1",
  electionDate: "2022-11-08",
  source: {
    artifactId: artifact.id,
    sha256: digest,
    url: artifact.url,
    retrievedAt: artifact.retrievedAt,
  },
  basis: "ESTIMATED FROM RECORDED COHORT",
  limitation:
    "Historical House roster only. District boundaries have not been compared with the current map; no historical district vote margin is transferred to current geography. No simulated election decision or forecast.",
  seats: rows.sort((a, b) => a.seatKey.localeCompare(b.seatKey)),
};
const output = await format(JSON.stringify(corpus), { parser: "json" });
const path = resolve(
  root,
  "src/simulation/world-setup/house-opening-cohort.generated.json",
);
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error("House opening cohort is stale.");
} else writeFileSync(path, output);
console.log(
  `House cohort ${corpus.electionDate}: ${rows.length} seats; ${control.houseDemocrats} D / ${control.houseRepublicans} R; source replay ${process.argv.includes("--check") ? "PASS" : "written"}.`,
);
