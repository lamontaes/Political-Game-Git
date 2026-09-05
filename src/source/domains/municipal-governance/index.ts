/**
 * The municipal-governance domain's public API.
 *
 * Like state-office-qualifications, this domain is wired into the command matrix
 * and compiles **no production records**. That is a decision, not an omission.
 * The substrate compiles production corpora only from artifacts it retrieved and
 * hashed itself, and the municipal research (Drive 42A / 44 / 45, and the 92I
 * research-to-implementation frontier) is a secondary synthesis. Emitting a
 * KNOWN council structure with evidence pointing at a city's charter would say
 * this repository read that charter. It did not; it read a document reporting
 * it, and (in this environment) could not even retrieve the official pages,
 * whose hosts the network egress proxy blocks.
 *
 * So the schema, compiler, validator and the three Kentucky pilot packs are all
 * real and exercised through the same capability boundary every other domain
 * uses — but as a fixture, behind a truthful production gate. Clearing the gate
 * is the acquisition step (92I Lane B): retrieve and hash the exact first-party
 * charters/statutes each pack cites, then compile production from those bytes.
 * That is a data-and-acquisition change, not a redesign.
 */

import {
  corpusCanonicalDigest,
  openFixture,
  toCanonicalJson,
} from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseMunicipalArtifacts } from "./parse";
import type { MunicipalGovernanceArtifacts } from "./parse";
import { normalizeMunicipalPacks } from "./normalize";
import { validateMunicipalGovernanceCorpus } from "./validate";
import type { MunicipalGovernanceRecord } from "./types";

export type {
  ActorRole,
  AdministrativeStructure,
  CitedSource,
  CompositionPattern,
  CompositionValue,
  Consolidation,
  ConsolidationType,
  ElectedStructure,
  EnumeratedPower,
  GovernmentForm,
  LegalBasis,
  LegislativeProcedure,
  ManagerValue,
  MayorValue,
  MunicipalGovernanceRecord,
  NestedGovernment,
  PowerKind,
  PredecessorUnit,
  RecordProvenance,
  RetainedOffice,
  SourceIdentity,
} from "./types";
export {
  FORBIDDEN_STRENGTH_KEYS,
  NON_GOVERNMENTAL_IDENTITY_AUTHORITY_TYPES,
} from "./types";
export type {
  Cell,
  CellStatus,
  MunicipalGovernanceArtifacts,
  MunicipalPackInput,
} from "./parse";
export { parseMunicipalArtifacts } from "./parse";
export { normalizeMunicipalPacks, readCell } from "./normalize";
export { validateMunicipalGovernanceCorpus } from "./validate";

export const MUNICIPAL_COMPILER_VERSION = "1.0.0";
export const MUNICIPAL_PARSER_VERSION = "1.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const MUNICIPAL_CORPUS_AS_OF = "2026-09-05";

/**
 * Why no production corpus exists.
 *
 * Stated here so `source:manifest` carries it and an auditor reads the gate
 * rather than discovering an absence.
 */
export const MUNICIPAL_PRODUCTION_GATE =
  "The municipal-governance packs are compiled from the existing Drive municipal research (42A/44/45, frontier 92I), which is a secondary synthesis, and the substrate compiles production corpora only from artifacts it retrieved and hashed. The Kentucky pilot facts were re-verified against current official/authoritative sources, but this environment's egress proxy blocks the official hosts, so the bytes could not be hash-locked as first-party artifacts. Production compilation is gated on acquiring the exact cited charters/statutes as first-party artifacts (92I Lane B), or an explicit decision to admit a declared secondary-source tier.";

/** The fixture payload: the three Kentucky pilot packs, inline. */
export interface MunicipalGovernanceFixtureArtifacts extends MunicipalGovernanceArtifacts {
  readonly __unused?: never;
}

/**
 * Compile a municipal-governance corpus from a fixture.
 *
 * There is deliberately no production counterpart a caller can reach with a
 * plain object: `FixtureInput` is branded, and `compileProduction` throws.
 */
export function compileMunicipalFixture(
  input: FixtureInput<MunicipalGovernanceFixtureArtifacts>,
  corpusAsOf: string = MUNICIPAL_CORPUS_AS_OF,
): CompiledCorpus<MunicipalGovernanceRecord, "fixture"> {
  const { packs, defects: parseDefects } = parseMunicipalArtifacts(
    input.artifacts,
  );
  if (parseDefects.length > 0) {
    throw new Error(
      `The municipal fixture is malformed (${parseDefects.length} defects); the first: ${parseDefects[0]?.message}`,
    );
  }
  const { records, defects } = normalizeMunicipalPacks(packs, corpusAsOf);
  if (defects.length > 0) {
    throw new Error(
      `The municipal fixture produced ${defects.length} normalization defects, the first being: ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "municipal-governance",
      compiler: {
        name: "municipal-governance",
        version: MUNICIPAL_COMPILER_VERSION,
      },
      parser: {
        name: "municipal-governance-packs",
        version: MUNICIPAL_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: input.fixtureId,
          sha256: corpusCanonicalDigest([toCanonicalJson(input.artifacts)]),
        },
      ],
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "fixture",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Three Kentucky pilot governments (Lexington-Fayette Urban County, Louisville-Jefferson County Metro, Bowling Green), chosen to exercise the schema across consolidated and non-consolidated forms. It is not a census of Kentucky local governments and must never be read as one.",
        boundedSampleReason:
          "Fixture only. The domain compiles no production records; see the production gate for why, and 92I Lane B for how it clears.",
      },
    },
    records,
  };
}

/** Open a municipal-governance fixture through the capability boundary. */
export function openMunicipalFixture(
  path: string,
): FixtureInput<MunicipalGovernanceFixtureArtifacts> {
  return openFixture<MunicipalGovernanceFixtureArtifacts>(
    "municipal-governance",
    path,
  );
}

export const sourceDomain: SourceDomainModule<MunicipalGovernanceRecord> = {
  domain: "municipal-governance",
  compilerVersion: MUNICIPAL_COMPILER_VERSION,
  acquisitionPlan: { domain: "municipal-governance", requests: [] },
  lockPath: "data/source/municipal-governance/artifact-lock.json",
  productionGate: MUNICIPAL_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<MunicipalGovernanceRecord, "production"> {
    throw new Error(
      `The municipal-governance domain compiles no production corpus. ${MUNICIPAL_PRODUCTION_GATE}`,
    );
  },
  validateCorpus(
    corpus: CompiledCorpus<MunicipalGovernanceRecord>,
  ): ValidationReport {
    return validateMunicipalGovernanceCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type MunicipalProductionInput =
  ProductionInput<MunicipalGovernanceFixtureArtifacts>;
