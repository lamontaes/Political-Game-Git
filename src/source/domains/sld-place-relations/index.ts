/**
 * The SLDL/SLDU–place relationship domain's public API.
 *
 * Publisher intersection tables compile into place-chamber membership records.
 * Whole-place is the only KNOWN home join; splits stay split.
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
import {
  SLDL_PLACE_ARTIFACT,
  SLDU_PLACE_ARTIFACT,
  sldPlaceRelationsAcquisition,
} from "./acquisition";
import { parseSldPlaceRelations } from "./parse";
import { normalizeSldPlaceRelations } from "./normalize";
import { validateSldPlaceRelationCorpus } from "./validate";
import type { PlaceDistrictRelationRecord, RelationChamber } from "./types";

export type { PlaceDistrictRelationRecord, RelationChamber } from "./types";
export {
  ADAK_PLACE_GEOID,
  LEXINGTON_FAYETTE_PLACE_GEOID,
  OFFICIAL_PLACE_RELATION_VECTORS,
} from "./identity";
export { EXPECTED_RELATION_RECORD_COUNT } from "./validate";
export { parseSldPlaceRelations } from "./parse";
export { normalizeSldPlaceRelations } from "./normalize";

export const SLD_PLACE_COMPILER_VERSION = "1.0.0";
export const SLD_PLACE_PARSER_VERSION = "1.0.0";
/** Semantic as-of of the 2024 SLD / 2020 place relationship product. */
export const SLD_PLACE_CORPUS_AS_OF = "2024-01-01";
export const SLD_PLACE_RELATION_VINTAGE = "census-rel-2024-sld-place20";

type RelationRole = "sldl" | "sldu";
export type SldPlaceArtifacts = OpenedArtifacts<RelationRole>;

const CHAMBER_BY_ROLE: Record<RelationRole, RelationChamber> = {
  sldl: "state-lower",
  sldu: "state-upper",
};

/** Compile place–district membership from locked publisher bytes. */
export function compileSldPlaceRelations(
  input: ProductionInput<SldPlaceArtifacts> | FixtureInput<SldPlaceArtifacts>,
): CompiledCorpus<PlaceDistrictRelationRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const roles: RelationRole[] = ["sldl", "sldu"];
  const records: PlaceDistrictRelationRecord[] = [];
  const defects: string[] = [];
  const inputs: { artifactId: string; sha256: string }[] = [];

  for (const role of roles) {
    const opened = input.artifacts[role];
    const parsed = parseSldPlaceRelations(opened.bytes, CHAMBER_BY_ROLE[role]);
    const normalized = normalizeSldPlaceRelations(
      parsed.rows,
      CHAMBER_BY_ROLE[role],
      opened.artifact.artifactId,
    );
    records.push(...normalized.records);
    for (const defect of [...parsed.defects, ...normalized.defects]) {
      defects.push(`${opened.artifact.artifactId}: ${defect.message}`);
    }
    inputs.push({
      artifactId: opened.artifact.artifactId,
      sha256: opened.artifact.bytes.sha256,
    });
  }

  if (defects.length > 0) {
    throw new Error(
      `The relationship files produced ${defects.length} parse defects, the first being: ${defects[0]}`,
    );
  }

  records.sort((left, right) => left.recordId.localeCompare(right.recordId));

  return {
    corpus: {
      corpusId: "sld-place-relations",
      compiler: {
        name: "sld-place-relations",
        version: SLD_PLACE_COMPILER_VERSION,
      },
      parser: {
        name: "census-sld-place-delimited",
        version: SLD_PLACE_PARSER_VERSION,
      },
      inputs,
      asOf: SLD_PLACE_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every 2020 Census place that the U.S. Census Bureau 2024 SLDL and SLDU national relationship files intersect with a published state legislative district, classified as whole-place membership or a split, including Nebraska's upper chamber and excluding empty-district and residual-only rows as unpublished membership.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<PlaceDistrictRelationRecord>;
}

export function openSldPlaceProduction(
  lock: ArtifactLock,
): ProductionInput<SldPlaceArtifacts> {
  return openProductionArtifacts<RelationRole>("sld-place-relations", lock, {
    sldl: SLDL_PLACE_ARTIFACT,
    sldu: SLDU_PLACE_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<PlaceDistrictRelationRecord> = {
  domain: "sld-place-relations",
  compilerVersion: SLD_PLACE_COMPILER_VERSION,
  acquisitionPlan: sldPlaceRelationsAcquisition,
  lockPath: "data/source/sld-place-relations/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<PlaceDistrictRelationRecord, "production"> {
    return compileSldPlaceRelations(
      openSldPlaceProduction(lock),
    ) as CompiledCorpus<PlaceDistrictRelationRecord, "production">;
  },
  validateCorpus(
    corpus: CompiledCorpus<PlaceDistrictRelationRecord>,
  ): ValidationReport {
    return validateSldPlaceRelationCorpus(corpus);
  },
};
