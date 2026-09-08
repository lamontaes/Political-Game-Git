/**
 * `npm run coverage:state-legislatures` — the identity coverage report.
 *
 * It reads the tracked corpus rather than recompiling, so it reports on what is
 * actually committed, and it writes both a machine-readable report and a prose
 * one. Neither carries a wall clock, so both regenerate byte-identically and a
 * test can prove it.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { writeText, toCanonicalJson } from "../../src/source/core/index";
import type {
  CompiledCorpus,
  NormalizedCorpus,
} from "../../src/source/core/index";
import {
  buildCoverageReport,
  renderCoverageMarkdown,
} from "../../src/source/domains/state-legislatures/index";
import type { StateLegislatureIdentity } from "../../src/source/domains/state-legislatures/index";
import { REPO_ROOT, domainDataDir } from "./registry";

const DIR = domainDataDir("state-legislatures");

/** Read the tracked corpus back into the shape the report expects. */
export function trackedCorpus(): CompiledCorpus<StateLegislatureIdentity> {
  const corpus = JSON.parse(
    readFileSync(resolve(DIR, "corpus-manifest.json"), "utf-8"),
  ) as NormalizedCorpus;
  const records = JSON.parse(
    readFileSync(resolve(DIR, "corpus.json"), "utf-8"),
  ) as StateLegislatureIdentity[];
  return { corpus, records };
}

export const COVERAGE_JSON_PATH =
  "data/source/state-legislatures/coverage.json";
export const COVERAGE_MARKDOWN_PATH =
  "docs/systems/state-elective-office-identity-coverage.md";

/** Render both reports into a target root, and return what was written. */
export function renderCoverageInto(root: string): {
  readonly json: string;
  readonly markdown: string;
} {
  const report = buildCoverageReport(trackedCorpus());
  const json = toCanonicalJson(report);
  const markdown = renderCoverageMarkdown(report);
  writeText(resolve(root, COVERAGE_JSON_PATH), json);
  writeText(resolve(root, COVERAGE_MARKDOWN_PATH), markdown);
  return { json, markdown };
}

async function main(): Promise<void> {
  renderCoverageInto(REPO_ROOT);
  const report = buildCoverageReport(trackedCorpus());
  console.log(
    `coverage:state-legislatures: ${report.stateCount} states, ${report.statesWithKnownStructure} with a known structure, ${report.statesWithCompleteChamberIdentity} with complete chamber identity, ${report.distinctSourceArtifacts} source artifacts.`,
  );
}

if (process.argv[1]?.endsWith("state-legislature-coverage.ts")) {
  await main();
}
