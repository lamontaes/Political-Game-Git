import * as fs from "node:fs";
import * as path from "node:path";
import { normalizeCpsRecord, type RawCpsInput } from "./cps_normalizer";
import { normalizeEavsRecord, type RawEavsInput } from "./eavs_normalizer";
import {
  normalizeHistoricalTurnoutSeries,
  type RawHistoricalTurnoutSeriesInput,
} from "./historical_series";
import { buildElectionAdminManifest } from "./manifest_builder";
import {
  normalizePolicySurveyRecord,
  type RawPolicySurveyInput,
} from "./policy_survey_normalizer";
import { ELECTION_ADMIN_SCHEMA_VERSION } from "./provenance";
import type {
  CpsCalibrationRecord,
  EavsJurisdictionRecord,
  HistoricalTurnoutSeriesRecord,
  NormalizedElectionAdminCorpus,
  PolicySurveyRecord,
} from "./types";
import { validateElectionAdminCorpus } from "./validator";

export interface CompileOptions {
  readonly fixturesDir?: string;
  readonly outputDir?: string;
  readonly manifestsDir?: string;
}

export function compileElectionAdminCorpus(
  eavsInputs: readonly RawEavsInput[],
  policySurveyInputs: readonly RawPolicySurveyInput[],
  cpsInputs: readonly RawCpsInput[],
  historicalInputs: readonly RawHistoricalTurnoutSeriesInput[],
  compiledAt: string = new Date().toISOString(),
): NormalizedElectionAdminCorpus {
  const eavsRecords: EavsJurisdictionRecord[] = eavsInputs.map(normalizeEavsRecord);
  const policySurveys: PolicySurveyRecord[] = policySurveyInputs.map(
    normalizePolicySurveyRecord,
  );
  const cpsCalibrations: CpsCalibrationRecord[] = cpsInputs.map(normalizeCpsRecord);
  const historicalSeries: HistoricalTurnoutSeriesRecord[] = historicalInputs.map(
    normalizeHistoricalTurnoutSeries,
  );

  const manifest = buildElectionAdminManifest({
    eavsRecords,
    policySurveys,
    cpsCalibrations,
    historicalSeries,
    generatedAt: compiledAt,
  });

  const corpus: NormalizedElectionAdminCorpus = {
    schemaVersion: ELECTION_ADMIN_SCHEMA_VERSION,
    compiledAt,
    eavsRecords,
    policySurveys,
    cpsCalibrations,
    historicalSeries,
    manifest,
  };

  const validation = validateElectionAdminCorpus(corpus);
  if (!validation.valid) {
    const errorDetails = validation.issues
      .filter((i) => i.severity === "error")
      .map((i) => `[${i.rule}] ${i.recordId}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Corpus compilation validation failed with ${validation.totalErrors} error(s):\n${errorDetails}`,
    );
  }

  return corpus;
}

/**
 * Loads all JSON fixture files from a directory.
 */
export function loadJsonFixturesFromDir<T>(dirPath: string): T[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  const results: T[] = [];
  for (const file of files.sort()) {
    const fullPath = path.join(dirPath, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      results.push(...parsed);
    } else {
      results.push(parsed);
    }
  }
  return results;
}

/**
 * Compiles fixtures from disk and outputs normalized files to disk.
 */
export function runCompilationFromDisk(options?: CompileOptions): {
  corpus: NormalizedElectionAdminCorpus;
  writtenFiles: string[];
} {
  const baseDir = process.cwd();
  const fixturesDir =
    options?.fixturesDir ??
    path.join(baseDir, "data/election_administration/fixtures");
  const outputDir =
    options?.outputDir ??
    path.join(baseDir, "data/election_administration/corpus");
  const manifestsDir =
    options?.manifestsDir ??
    path.join(baseDir, "data/election_administration/manifests");

  const eavsInputs = loadJsonFixturesFromDir<RawEavsInput>(
    path.join(fixturesDir, "eavs"),
  );
  const policyInputs = loadJsonFixturesFromDir<RawPolicySurveyInput>(
    path.join(fixturesDir, "policy_survey"),
  );
  const cpsInputs = loadJsonFixturesFromDir<RawCpsInput>(
    path.join(fixturesDir, "cps"),
  );
  const histInputs = loadJsonFixturesFromDir<RawHistoricalTurnoutSeriesInput>(
    path.join(fixturesDir, "historical"),
  );

  const corpus = compileElectionAdminCorpus(
    eavsInputs,
    policyInputs,
    cpsInputs,
    histInputs,
  );

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(manifestsDir, { recursive: true });

  const writtenFiles: string[] = [];

  // Write normalized unified corpus
  const corpusPath = path.join(outputDir, "normalized_corpus.json");
  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2), "utf8");
  writtenFiles.push(corpusPath);

  // Write partitions
  const eavsPath = path.join(outputDir, "eavs_administrative.json");
  fs.writeFileSync(
    eavsPath,
    JSON.stringify(corpus.eavsRecords, null, 2),
    "utf8",
  );
  writtenFiles.push(eavsPath);

  const policyPath = path.join(outputDir, "policy_surveys.json");
  fs.writeFileSync(
    policyPath,
    JSON.stringify(corpus.policySurveys, null, 2),
    "utf8",
  );
  writtenFiles.push(policyPath);

  const cpsPath = path.join(outputDir, "cps_calibrations.json");
  fs.writeFileSync(
    cpsPath,
    JSON.stringify(corpus.cpsCalibrations, null, 2),
    "utf8",
  );
  writtenFiles.push(cpsPath);

  const histPath = path.join(outputDir, "historical_turnout.json");
  fs.writeFileSync(
    histPath,
    JSON.stringify(corpus.historicalSeries, null, 2),
    "utf8",
  );
  writtenFiles.push(histPath);

  // Write manifest
  const manifestPath = path.join(manifestsDir, "election_admin_manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(corpus.manifest, null, 2),
    "utf8",
  );
  writtenFiles.push(manifestPath);

  return { corpus, writtenFiles };
}
