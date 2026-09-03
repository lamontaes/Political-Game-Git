/**
 * The FEMA disaster declarations domain's public API.
 *
 * 30C's verdict on #66 was critical rebuild, not repair, so nothing factual
 * came from that branch. What survived is its architecture — the separation of
 * physical hazard from administrative instrument, and the refusal to let
 * declaration history become hazard probability — rebuilt on bytes this
 * repository retrieved from OpenFEMA.
 */

import { corpusCanonicalDigest, openProductionArtifacts } from "../../core/index";
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
  AUDIT_SLICE_DISASTER_NUMBERS,
  AUDIT_SLICE_FILTER,
  DECLARATIONS_ARTIFACT,
  OPENFEMA_ENTITY,
  UNIVERSE_ARTIFACT,
  femaDisastersAcquisition,
} from "./acquisition";
import { parseOpenFemaEnvelope } from "./parse";
import { normalizeFemaDeclarations } from "./normalize";
import { validateFemaCorpus } from "./validate";
import type { FemaDeclarationRecord } from "./types";

export type { DesignatedAreaType, FemaDeclarationRecord } from "./types";
export {
  EASTERN_BAND_DESIGNATED_AREA,
  FEMA_FIELD_ORACLES,
  FEMA_FRAUD_ORACLES,
} from "./identity";
export { deriveDesignatedAreaType } from "./normalize";
export { AUDIT_SLICE_DISASTER_NUMBERS } from "./acquisition";

export const FEMA_COMPILER_VERSION = "1.0.0";
export const FEMA_PARSER_VERSION = "1.0.0";

/**
 * The latest declaration date in the slice. It is a property of the records,
 * not of the day this corpus was built.
 */
export const FEMA_CORPUS_AS_OF = "2024-09-28";

type FemaRole = "declarations" | "universe";
export type FemaArtifacts = OpenedArtifacts<FemaRole>;

/** Compile the declaration corpus from locked OpenFEMA response bytes. */
export function compileFemaDisasters(
  input: ProductionInput<FemaArtifacts> | FixtureInput<FemaArtifacts>,
): CompiledCorpus<FemaDeclarationRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const declarations = input.artifacts.declarations;
  const universe = input.artifacts.universe;

  const envelope = parseOpenFemaEnvelope(declarations.bytes, OPENFEMA_ENTITY);
  const universeEnvelope = parseOpenFemaEnvelope(universe.bytes, OPENFEMA_ENTITY);
  const universeCount = universeEnvelope.metadata.count ?? null;

  // The payload states the filter the provider actually applied. If it is not
  // the predicate this domain declares, the committed bytes are some other
  // query's answer and the coverage statement below would be describing a slice
  // nobody took.
  if (envelope.metadata.filter !== AUDIT_SLICE_FILTER) {
    throw new Error(
      `The committed OpenFEMA payload reports filter ${JSON.stringify(envelope.metadata.filter)}, but this domain's selection predicate is ${JSON.stringify(AUDIT_SLICE_FILTER)}.`,
    );
  }

  const { records, defects } = normalizeFemaDeclarations(
    envelope.records,
    declarations.artifact.artifactId,
  );
  if (defects.length > 0) {
    throw new Error(
      `The OpenFEMA payload produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "fema-disasters",
      compiler: { name: "fema-disasters", version: FEMA_COMPILER_VERSION },
      parser: { name: "openfema-json", version: FEMA_PARSER_VERSION },
      inputs: [
        {
          artifactId: declarations.artifact.artifactId,
          sha256: declarations.artifact.bytes.sha256,
        },
        { artifactId: universe.artifact.artifactId, sha256: universe.artifact.bytes.sha256 },
      ],
      asOf: FEMA_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: false,
        universeDescription: `Every designated-area row of the OpenFEMA DisasterDeclarationsSummaries v2 entity for the ${AUDIT_SLICE_DISASTER_NUMBERS.length} disaster numbers in this domain's selection predicate. The entity held ${universeCount ?? "an unrecorded number of"} rows in total when the slice was taken.`,
        boundedSampleReason: `Selection predicate, applied by the provider and recorded in the committed payload's own metadata: "${AUDIT_SLICE_FILTER}". Those disaster numbers are every number named either by PR #66's corpus or by the 30C audit that rejected it, so the slice contains the authentic record behind each of that corpus's fabricated declarations. The full entity is far too large to commit and no part of it is claimed here.`,
      },
    },
    records,
  } as CompiledCorpus<FemaDeclarationRecord>;
}

export function openFemaProduction(lock: ArtifactLock): ProductionInput<FemaArtifacts> {
  return openProductionArtifacts<FemaRole>("fema-disasters", lock, {
    declarations: DECLARATIONS_ARTIFACT,
    universe: UNIVERSE_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<FemaDeclarationRecord> = {
  domain: "fema-disasters",
  compilerVersion: FEMA_COMPILER_VERSION,
  acquisitionPlan: femaDisastersAcquisition,
  lockPath: "data/source/fema-disasters/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<FemaDeclarationRecord, "production"> {
    return compileFemaDisasters(openFemaProduction(lock)) as CompiledCorpus<
      FemaDeclarationRecord,
      "production"
    >;
  },
  validateCorpus(corpus: CompiledCorpus<FemaDeclarationRecord>): ValidationReport {
    return validateFemaCorpus(corpus);
  },
};
