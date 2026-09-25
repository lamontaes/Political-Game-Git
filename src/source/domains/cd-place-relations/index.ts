/**
 * The 119th Congressional District–2020 place relationship domain.
 *
 * One publisher intersection table compiles into place membership records. A
 * place the file lists with exactly one district is whole-place membership; a
 * place it lists with more stays split, its intersecting districts candidates.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
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
import { CD_PLACE_ARTIFACT, cdPlaceRelationsAcquisition } from "./acquisition";
import { parseCdPlaceRelations } from "./parse";
import { normalizeCdPlaceRelations } from "./normalize";
import { validateCdPlaceRelationCorpus } from "./validate";
import type { CongressionalPlaceRelationRecord } from "./types";

export type {
  CongressionalPlaceMembershipKind,
  CongressionalPlaceRelationRecord,
} from "./types";
export {
  ELKO_NV_PLACE_GEOID,
  LEWISTON_ME_PLACE_GEOID,
  OFFICIAL_CONGRESSIONAL_PLACE_VECTORS,
  PEORIA_IL_PLACE_GEOID,
  SAN_ANTONIO_TX_PLACE_GEOID,
  isUnassignedResidualGeoid,
} from "./identity";
export { CD_PLACE_COLUMNS, parseCdPlaceRelations } from "./parse";
export { normalizeCdPlaceRelations } from "./normalize";
export { EXPECTED_CD_RELATION_RECORD_COUNT } from "./validate";

export const CD_PLACE_COMPILER_VERSION = "1.0.0";
export const CD_PLACE_PARSER_VERSION = "1.0.0";
/** The 119th Congress's districts, as the 2025 Gazetteer identities date them. */
export const CD_PLACE_CORPUS_AS_OF = "2025-01-03";
export const CD_PLACE_RELATION_VINTAGE = "census-rel-2020-cd119-place20";

type RelationRole = "cd";
export type CdPlaceArtifacts = OpenedArtifacts<RelationRole>;

export function compileCdPlaceRelations(
  input: ProductionInput<CdPlaceArtifacts> | FixtureInput<CdPlaceArtifacts>,
): CompiledCorpus<CongressionalPlaceRelationRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const opened = input.artifacts.cd;
  const parsed = parseCdPlaceRelations(opened.bytes);
  const normalized = normalizeCdPlaceRelations(
    parsed.rows,
    opened.artifact.artifactId,
  );
  const defects = [...parsed.defects, ...normalized.defects];
  if (defects.length > 0) {
    throw new Error(
      `The congressional relationship file produced ${defects.length} parse defects, the first being: ${defects[0]!.message}`,
    );
  }
  const records = normalized.records;
  return {
    corpus: {
      corpusId: "cd-place-relations",
      compiler: {
        name: "cd-place-relations",
        version: CD_PLACE_COMPILER_VERSION,
      },
      parser: {
        name: "census-cd-place-delimited",
        version: CD_PLACE_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: opened.artifact.artifactId,
          sha256: opened.artifact.bytes.sha256,
        },
      ],
      asOf: CD_PLACE_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every 2020 Census place that the U.S. Census Bureau 119th Congressional District to 2020 Place national relationship file intersects with a congressional district, classified as whole-place membership (exactly one intersecting district) or a split, including delegate districts and excluding district remainders outside every place.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<CongressionalPlaceRelationRecord>;
}

export function openCdPlaceProduction(
  lock: ArtifactLock,
): ProductionInput<CdPlaceArtifacts> {
  return openProductionArtifacts<RelationRole>("cd-place-relations", lock, {
    cd: CD_PLACE_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<CongressionalPlaceRelationRecord> =
  {
    domain: "cd-place-relations",
    compilerVersion: CD_PLACE_COMPILER_VERSION,
    acquisitionPlan: cdPlaceRelationsAcquisition,
    lockPath: "data/source/cd-place-relations/artifact-lock.json",
    compileProduction(
      lock: ArtifactLock,
    ): CompiledCorpus<CongressionalPlaceRelationRecord, "production"> {
      return compileCdPlaceRelations(
        openCdPlaceProduction(lock),
      ) as CompiledCorpus<CongressionalPlaceRelationRecord, "production">;
    },
    validateCorpus(
      corpus: CompiledCorpus<CongressionalPlaceRelationRecord>,
    ): ValidationReport {
      return validateCdPlaceRelationCorpus(corpus);
    },
  };
