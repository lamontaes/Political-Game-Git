/** Existing municipal compiler, research corpus and independently proven enacted provisions.
 * Research and production remain different evidence classes at every consumer.
 */

import {
  corpusCanonicalDigest,
  openFixture,
  toCanonicalJson,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { MUNICIPAL_ACQUISITION_PLAN } from "./acquisition";
import {
  compileMunicipalProduction,
  openMunicipalProduction,
} from "./production";
import { parseMunicipalArtifacts } from "./parse";
import type { MunicipalGovernanceArtifacts } from "./parse";
import { normalizeMunicipalPacks } from "./normalize";
import { validateMunicipalGovernanceCorpus } from "./validate";
import type { MunicipalGovernanceRecord } from "./types";

export type {
  ActorRole,
  AdministrativeStructure,
  BudgetDeadlineRule,
  BudgetProcedure,
  CitedSource,
  CompositionPattern,
  CompositionValue,
  Consolidation,
  ConsolidationType,
  ElectionCalendarRule,
  ElectionPartisanship,
  ElectedStructure,
  EnumeratedPower,
  FiscalYearRule,
  GovernmentForm,
  LegalBasis,
  LegislativeVoteRole,
  LegislativeProcedure,
  ManagerValue,
  MayoralActionWindow,
  MayoralInactionOutcome,
  MayorValue,
  MeetingCadenceRule,
  MeetingPlace,
  MeetingPlaceKind,
  MeetingSeries,
  MeetingSeriesKind,
  MeetingWeekday,
  MonthlyOrdinal,
  MunicipalGovernanceRecord,
  PublicAttendanceRule,
  NestedGovernment,
  PowerKind,
  PowerRule,
  PredecessorUnit,
  PresidingContext,
  PresidingRule,
  RecordProvenance,
  RetainedOffice,
  SourceIdentity,
  VoteDenominatorBasis,
  VoteThreshold,
} from "./types";
export {
  FORBIDDEN_STRENGTH_KEYS,
  NON_GOVERNMENTAL_IDENTITY_AUTHORITY_TYPES,
} from "./types";
export type {
  Cell,
  CellStatus,
  MeetingPlaceInput,
  MeetingSeriesInput,
  MunicipalGovernanceArtifacts,
  MunicipalPackInput,
  PowerInput,
  PresidingRuleInput,
} from "./parse";
export { parseMunicipalArtifacts } from "./parse";
export { normalizeMunicipalPacks, readCell } from "./normalize";
export { validateMunicipalGovernanceCorpus } from "./validate";

export const MUNICIPAL_COMPILER_VERSION = "2.0.0";
export const MUNICIPAL_PARSER_VERSION = "2.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const MUNICIPAL_CORPUS_AS_OF = "2026-09-05";

/**
 * What is still not production, and why.
 *
 * #120 recorded this as a gate on the whole domain: nothing compiled, because
 * nothing had been read. Three governments have now been read, so the domain
 * compiles production and no longer declares `productionGate` — a gate in this
 * substrate means the domain produces no production records at all, and that is
 * no longer true.
 *
 * The sentence survives because the boundary did. It names exactly which
 * governments are backed by enacted text this repository retrieved and which
 * remain a research transcription, and the corpus coverage metadata says the
 * same thing where an auditor reads it.
 */
export const MUNICIPAL_PRODUCTION_GATE =
  "Production contains only individually retrieved, scoped and excerpt-checked enacted provisions. The full declared research corpus remains separately attributed research, with unsupported fields UNKNOWN. A source being downloaded or quoted does not itself prove an authored interpretation, nor does a partial charter authorize unsupported procedures.";

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
          "Audit fixture only. This research fixture does not claim independently verified law; production provisions have separate locked evidence.",
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
  acquisitionPlan: MUNICIPAL_ACQUISITION_PLAN,
  lockPath: "data/source/municipal-governance/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<MunicipalGovernanceRecord, "production"> {
    return compileMunicipalProduction(openMunicipalProduction(lock));
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

export {
  MUNICIPAL_ACQUISITION_PLAN,
  MUNICIPAL_SOURCES,
  municipalSourceById,
} from "./acquisition";
export type { MunicipalSourceSpec } from "./acquisition";
export {
  compileMunicipalProduction,
  openMunicipalProduction,
} from "./production";
export {
  MUNICIPAL_PRODUCTION_AS_OF,
  MUNICIPAL_PRODUCTION_PACKS,
  PRODUCTION_PACK_ARTIFACTS,
  PRODUCTION_PLACE_CROSSWALK,
} from "./production-packs";
export type { Sourced } from "../../core/index";
export { NATIONAL_MUNICIPAL_RESEARCH } from "./national-corpus";
export {
  packForResearchGovernment,
  packsForResearchCorpus,
} from "./national-packs";
export type {
  NationalResearchCorpus,
  ResearchGovernment,
} from "./national-research";

/** The fixture the national institutional corpus compiles from. */
export const MUNICIPAL_NATIONAL_FIXTURE_PATH =
  "fixtures/source/municipal-governance/national.json";

/** The fixture the three Kentucky pilot packs compile from. */
export const MUNICIPAL_KENTUCKY_FIXTURE_PATH =
  "fixtures/source/municipal-governance/kentucky-pilot.json";
