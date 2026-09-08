/**
 * The counties domain's public API.
 *
 * `compileCounties` takes an opaque capability handle. There is no overload
 * accepting JSON, so 13B M2's probe — calling an exported compiler directly
 * with an unmarked synthetic payload — does not typecheck before it fails to
 * run.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  readZipMember,
  requireArtifact,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  COUNTIES_TXT_MEMBER,
  COUNTIES_ZIP_ARTIFACT,
  countiesAcquisition,
} from "./acquisition";
import { parseGazetteerCounties } from "./parse";
import { normalizeCounties } from "./normalize";
import { validateCountyCorpus } from "./validate";
import type { CountyRecord } from "./types";

export type { CountyRecord } from "./types";
export { OFFICIAL_COUNTY_VECTORS } from "./identity";
export { EXPECTED_COUNTY_RECORD_COUNT } from "./validate";
export { deriveDisplayName } from "./normalize";

export const COUNTY_COMPILER_VERSION = "1.0.0";
export const COUNTY_PARSER_VERSION = "1.0.0";

/**
 * The 2025 Gazetteer describes geography as of 1 January 2025. That date is an
 * input declared by the product, never a clock read at build time.
 */
export const COUNTY_CORPUS_AS_OF = "2025-01-01";

type CountyRole = "gazetteer";

export type CountyArtifacts = OpenedArtifacts<CountyRole>;

/** Compile the county identity corpus from locked publisher bytes. */
export function compileCounties(
  input: ProductionInput<CountyArtifacts> | FixtureInput<CountyArtifacts>,
): CompiledCorpus<CountyRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const opened = input.artifacts.gazetteer;
  const artifactId = opened.artifact.artifactId;

  const memberBytes = readZipMember(
    opened.bytes,
    opened.artifact.container?.memberPath ?? COUNTIES_TXT_MEMBER,
  );
  const parsed = parseGazetteerCounties(memberBytes);
  const { records, defects } = normalizeCounties(parsed.rows, artifactId);

  const allDefects = [...parsed.defects, ...defects];
  if (allDefects.length > 0) {
    throw new Error(
      `The counties file produced ${allDefects.length} parse defects, the first being: ${allDefects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "counties",
      compiler: { name: "counties", version: COUNTY_COMPILER_VERSION },
      parser: { name: "gazetteer-delimited", version: COUNTY_PARSER_VERSION },
      inputs: [{ artifactId, sha256: opened.artifact.bytes.sha256 }],
      asOf: COUNTY_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every county and county-equivalent in the U.S. Census Bureau 2025 Gazetteer counties national file: the 50 states, the District of Columbia and Puerto Rico.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<CountyRecord>;
}

/** Open the locked artifacts this domain compiles from. */
export function openCountyProduction(
  lock: ArtifactLock,
): ProductionInput<CountyArtifacts> {
  requireArtifact(lock, COUNTIES_ZIP_ARTIFACT);
  return openProductionArtifacts<CountyRole>("counties", lock, {
    gazetteer: COUNTIES_ZIP_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<CountyRecord> = {
  domain: "counties",
  compilerVersion: COUNTY_COMPILER_VERSION,
  acquisitionPlan: countiesAcquisition,
  lockPath: "data/source/counties/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<CountyRecord, "production"> {
    return compileCounties(openCountyProduction(lock)) as CompiledCorpus<
      CountyRecord,
      "production"
    >;
  },
  validateCorpus(corpus: CompiledCorpus<CountyRecord>): ValidationReport {
    return validateCountyCorpus(corpus);
  },
};
