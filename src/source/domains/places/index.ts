/**
 * The places domain's public API.
 *
 * The chosen Places lineage is #61's — the 2025 Gazetteer national file audited
 * PASS in `17_ANTIGRAVITY_PR61_NATIONAL_PLACES_AUDIT_REPORT` — re-homed onto the
 * core contracts. The older #58/#42 lineages are superseded and contribute
 * nothing here.
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
  PLACES_TXT_MEMBER,
  PLACES_ZIP_ARTIFACT,
  placesAcquisition,
} from "./acquisition";
import { parseGazetteerPlaces } from "./parse";
import { normalizePlaces } from "./normalize";
import { validatePlaceCorpus } from "./validate";
import type { PlaceRecord } from "./types";

export type { PlaceRecord } from "./types";
export { OFFICIAL_PLACE_VECTORS } from "./identity";
export { EXPECTED_PLACE_RECORD_COUNT } from "./validate";
export {
  deriveClassSuffixes,
  deriveDisplayName,
  normalizePlaces,
} from "./normalize";
export { parseGazetteerPlaces } from "./parse";

export const PLACE_COMPILER_VERSION = "1.0.0";
export const PLACE_PARSER_VERSION = "1.0.0";
export const PLACE_CORPUS_AS_OF = "2025-01-01";

type PlaceRole = "gazetteer";
export type PlaceArtifacts = OpenedArtifacts<PlaceRole>;

/** Compile the place identity corpus from locked publisher bytes. */
export function compilePlaces(
  input: ProductionInput<PlaceArtifacts> | FixtureInput<PlaceArtifacts>,
): CompiledCorpus<PlaceRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const opened = input.artifacts.gazetteer;
  const artifactId = opened.artifact.artifactId;

  const memberBytes = readZipMember(
    opened.bytes,
    opened.artifact.container?.memberPath ?? PLACES_TXT_MEMBER,
  );
  const parsed = parseGazetteerPlaces(memberBytes);
  const { records, defects } = normalizePlaces(parsed.rows, artifactId);

  const allDefects = [...parsed.defects, ...defects];
  if (allDefects.length > 0) {
    throw new Error(
      `The places file produced ${allDefects.length} parse defects, the first being: ${allDefects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "places",
      compiler: { name: "places", version: PLACE_COMPILER_VERSION },
      parser: { name: "gazetteer-delimited", version: PLACE_PARSER_VERSION },
      inputs: [{ artifactId, sha256: opened.artifact.bytes.sha256 }],
      asOf: PLACE_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every incorporated place and census designated place in the U.S. Census Bureau 2025 Gazetteer national places file, covering the 50 states, the District of Columbia and Puerto Rico.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<PlaceRecord>;
}

export function openPlaceProduction(
  lock: ArtifactLock,
): ProductionInput<PlaceArtifacts> {
  requireArtifact(lock, PLACES_ZIP_ARTIFACT);
  return openProductionArtifacts<PlaceRole>("places", lock, {
    gazetteer: PLACES_ZIP_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<PlaceRecord> = {
  domain: "places",
  compilerVersion: PLACE_COMPILER_VERSION,
  acquisitionPlan: placesAcquisition,
  lockPath: "data/source/places/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<PlaceRecord, "production"> {
    return compilePlaces(openPlaceProduction(lock)) as CompiledCorpus<
      PlaceRecord,
      "production"
    >;
  },
  validateCorpus(corpus: CompiledCorpus<PlaceRecord>): ValidationReport {
    return validatePlaceCorpus(corpus);
  },
};
