/**
 * The political districts domain's public API.
 *
 * Three official products compile into one corpus keyed by chamber, because a
 * congressional district and a state house district can share a GEOID and are
 * not the same thing.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  readZipMember,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifact,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  CONGRESSIONAL_ARTIFACT,
  CONGRESSIONAL_MEMBER,
  STATE_LOWER_ARTIFACT,
  STATE_LOWER_MEMBER,
  STATE_UPPER_ARTIFACT,
  STATE_UPPER_MEMBER,
  politicalDistrictsAcquisition,
} from "./acquisition";
import {
  parseGazetteerCongressional,
  parseGazetteerStateLegislative,
} from "./parse";
import { normalizeDistricts } from "./normalize";
import { validatePoliticalDistrictCorpus } from "./validate";
import type { DistrictChamber, PoliticalDistrictRecord } from "./types";

export type { DistrictChamber, PoliticalDistrictRecord } from "./types";
export { OFFICIAL_DISTRICT_VECTORS } from "./identity";
export {
  EXPECTED_CONGRESSIONAL_COUNT,
  EXPECTED_STATE_LOWER_COUNT,
  EXPECTED_STATE_UPPER_COUNT,
} from "./validate";

export const DISTRICTS_COMPILER_VERSION = "1.0.0";
export const DISTRICTS_PARSER_VERSION = "1.0.0";
export const DISTRICTS_CORPUS_AS_OF = "2025-01-01";

type DistrictRole = "congressional" | "stateLower" | "stateUpper";
export type DistrictArtifacts = OpenedArtifacts<DistrictRole>;

const MEMBER_BY_ROLE: Record<DistrictRole, string> = {
  congressional: CONGRESSIONAL_MEMBER,
  stateLower: STATE_LOWER_MEMBER,
  stateUpper: STATE_UPPER_MEMBER,
};

const CHAMBER_BY_ROLE: Record<DistrictRole, DistrictChamber> = {
  congressional: "congressional",
  stateLower: "state-lower",
  stateUpper: "state-upper",
};

function rowsFor(role: DistrictRole, opened: OpenedArtifact) {
  const bytes = readZipMember(
    opened.bytes,
    opened.artifact.container?.memberPath ?? MEMBER_BY_ROLE[role],
  );
  return role === "congressional"
    ? parseGazetteerCongressional(bytes)
    : parseGazetteerStateLegislative(bytes);
}

/** Compile the district geography corpus from locked publisher bytes. */
export function compilePoliticalDistricts(
  input: ProductionInput<DistrictArtifacts> | FixtureInput<DistrictArtifacts>,
): CompiledCorpus<PoliticalDistrictRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const roles: DistrictRole[] = ["congressional", "stateLower", "stateUpper"];

  const records: PoliticalDistrictRecord[] = [];
  const defects: string[] = [];
  const inputs: { artifactId: string; sha256: string }[] = [];

  for (const role of roles) {
    const opened = input.artifacts[role];
    const parsed = rowsFor(role, opened);
    const normalized = normalizeDistricts(
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
      `The district files produced ${defects.length} parse defects, the first being: ${defects[0]}`,
    );
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  return {
    corpus: {
      corpusId: "political-districts",
      compiler: {
        name: "political-districts",
        version: DISTRICTS_COMPILER_VERSION,
      },
      parser: {
        name: "gazetteer-delimited",
        version: DISTRICTS_PARSER_VERSION,
      },
      inputs,
      asOf: DISTRICTS_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every 119th Congressional District, state legislative lower-chamber district and state legislative upper-chamber district published in the U.S. Census Bureau 2025 Gazetteer national files, including at-large, delegate and unassigned-residual records exactly as published.",
        boundedSampleReason: null,
      },
    },
    records,
  } as CompiledCorpus<PoliticalDistrictRecord>;
}

export function openDistrictProduction(
  lock: ArtifactLock,
): ProductionInput<DistrictArtifacts> {
  return openProductionArtifacts<DistrictRole>("political-districts", lock, {
    congressional: CONGRESSIONAL_ARTIFACT,
    stateLower: STATE_LOWER_ARTIFACT,
    stateUpper: STATE_UPPER_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<PoliticalDistrictRecord> = {
  domain: "political-districts",
  compilerVersion: DISTRICTS_COMPILER_VERSION,
  acquisitionPlan: politicalDistrictsAcquisition,
  lockPath: "data/source/political-districts/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<PoliticalDistrictRecord, "production"> {
    return compilePoliticalDistricts(
      openDistrictProduction(lock),
    ) as CompiledCorpus<PoliticalDistrictRecord, "production">;
  },
  validateCorpus(
    corpus: CompiledCorpus<PoliticalDistrictRecord>,
  ): ValidationReport {
    return validatePoliticalDistrictCorpus(corpus);
  },
};
