/**
 * The place-within-county domain's public API.
 *
 * Summary-level-155 slices of the 2020 redistricting files compile into one
 * record per part of a place lying in one county. A place across several
 * counties stays across several counties; nothing picks one.
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
  LATIN1_GEOHEADER_STATES,
  PLACE_COUNTY_DOMAIN,
  PL_STATES,
  placeCountyRelationsAcquisition,
  sliceArtifactId,
} from "./acquisition";
import { parsePlaceCountyParts } from "./parse";
import { normalizePlaceCountyParts } from "./normalize";
import { validatePlaceCountyCorpus } from "./validate";
import type { PlaceCountyPartRecord } from "./types";

export type { PlaceCountyPartRecord, PublisherPartFlag } from "./types";
export {
  EXPECTED_PART_RECORD_COUNT,
  EXPECTED_PLACE_COUNT,
  OFFICIAL_PLACE_COUNTY_VECTORS,
} from "./validate";
export {
  PL_STATES,
  cutPlaceCountyParts,
  archiveCachePath,
  slicePath,
} from "./acquisition";

export const PLACE_COUNTY_COMPILER_VERSION = "1.0.0";
export const PLACE_COUNTY_PARSER_VERSION = "1.0.0";
/** Census Day, the reference date of 2020 Census geography. */
export const PLACE_COUNTY_CORPUS_AS_OF = "2020-04-01";

type StateRole = (typeof PL_STATES)[number][0];
export type PlaceCountyArtifacts = OpenedArtifacts<StateRole>;

/** Compile place-within-county parts from locked slice bytes. */
export function compilePlaceCountyRelations(
  input:
    ProductionInput<PlaceCountyArtifacts> | FixtureInput<PlaceCountyArtifacts>,
): CompiledCorpus<PlaceCountyPartRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const records: PlaceCountyPartRecord[] = [];
  const defects: string[] = [];
  const inputs: { artifactId: string; sha256: string }[] = [];

  for (const [usps, fips] of PL_STATES) {
    const opened = input.artifacts[usps];
    const parsed = parsePlaceCountyParts(
      opened.bytes,
      LATIN1_GEOHEADER_STATES.has(usps) ? "latin1" : "utf-8",
    );
    const normalized = normalizePlaceCountyParts(
      parsed.rows,
      fips,
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
      `The redistricting geoheader slices produced ${defects.length} defects, the first being: ${defects[0]}`,
    );
  }

  records.sort((left, right) => left.recordId.localeCompare(right.recordId));

  return {
    corpus: {
      corpusId: PLACE_COUNTY_DOMAIN,
      compiler: {
        name: PLACE_COUNTY_DOMAIN,
        version: PLACE_COUNTY_COMPILER_VERSION,
      },
      parser: {
        name: "census-pl94171-2020-geoheader",
        version: PLACE_COUNTY_PARSER_VERSION,
      },
      inputs,
      asOf: PLACE_COUNTY_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every part of a 2020 Census place (incorporated place or census designated place) lying in one county or county equivalent, as the 2020 Census Redistricting Data (P.L. 94-171) geographic headers publish at summary level 155 for the 50 states and the District of Columbia, with each part's land and water area. Puerto Rico is not included.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<PlaceCountyPartRecord>;
}

export function openPlaceCountyProduction(
  lock: ArtifactLock,
): ProductionInput<PlaceCountyArtifacts> {
  return openProductionArtifacts<StateRole>(
    PLACE_COUNTY_DOMAIN,
    lock,
    Object.fromEntries(
      PL_STATES.map(([usps]) => [usps, sliceArtifactId(usps)]),
    ) as Record<StateRole, string>,
  );
}

export const sourceDomain: SourceDomainModule<PlaceCountyPartRecord> = {
  domain: PLACE_COUNTY_DOMAIN,
  compilerVersion: PLACE_COUNTY_COMPILER_VERSION,
  acquisitionPlan: placeCountyRelationsAcquisition,
  lockPath: `data/source/${PLACE_COUNTY_DOMAIN}/artifact-lock.json`,
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<PlaceCountyPartRecord, "production"> {
    return compilePlaceCountyRelations(
      openPlaceCountyProduction(lock),
    ) as CompiledCorpus<PlaceCountyPartRecord, "production">;
  },
  validateCorpus(
    corpus: CompiledCorpus<PlaceCountyPartRecord>,
  ): ValidationReport {
    return validatePlaceCountyCorpus(corpus);
  },
};
