/**
 * The government-units domain's public API.
 *
 * This domain is wired into the command matrix and compiles **no production
 * records** in this environment, because the Census Government Units listing
 * could not be acquired here — the coding environment's outbound proxy denies
 * census.gov at the CONNECT with an HTTP 403 policy denial. The gate below
 * records that reason so `source:manifest` and `source:validate` carry it and an
 * auditor reads the gate rather than discovering an absence.
 *
 * The distinction from the state-office-qualifications gate matters. That domain
 * is gated on a *sourcing* question — whether a research synthesis is admissible
 * as production evidence. This domain is gated only on an *acquisition-
 * environment* limitation: the Census Government Units listing is a legitimate
 * first-party primary source, and the production compiler here is real and
 * complete. When a network environment that reaches census.gov pins the artifact
 * through `source:acquire`, lifting the gate and committing the lock is a data
 * change, not a design change — `compileGovernmentUnitsProduction` already
 * compiles the real corpus through the same capability boundary every other
 * domain uses.
 *
 * The compiler is exercised end to end by an authoritative fixture, on the cases
 * that matter: government identity kept distinct from Census place identity, a
 * county geography that implies no county government, missing kept distinct from
 * inactive and from not-applicable, and crosswalks preserved unresolved rather
 * than matched by name.
 */

import {
  corpusCanonicalDigest,
  openFixture,
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
  GOVERNMENT_UNITS_LISTING_MEMBER,
  GOVERNMENT_UNITS_ZIP_ARTIFACT,
  governmentUnitsAcquisition,
} from "./acquisition";
import { parseGovernmentUnitsListing } from "./parse";
import { normalizeGovernmentUnits } from "./normalize";
import { validateGovernmentUnitsCorpus } from "./validate";
import type { GovernmentUnitRecord } from "./types";

export type { GovernmentUnitRecord, GovernmentUnitCrosswalk } from "./types";
export type {
  GovernmentType,
  GovernmentTypeCode,
  GovernmentIdParts,
} from "./identity";
export {
  FORBIDDEN_GOVERNANCE_KEYS,
  GOVERNMENT_TYPE_BY_CODE,
  GOVERNMENT_TYPE_BY_LABEL,
  GOVERNMENT_UNIT_GID_PATTERN,
  decomposeGovernmentId,
  reconstructGovernmentId,
  governmentTypeOf,
  isGovernmentId,
} from "./identity";
export {
  GOVERNMENT_UNIT_COLUMNS,
  listingField,
  parseGovernmentUnitsListing,
} from "./parse";
export { normalizeGovernmentUnits } from "./normalize";
export { validateGovernmentUnitsCorpus } from "./validate";
export {
  GOVERNMENT_UNITS_ZIP_ARTIFACT,
  GOVERNMENT_UNITS_LISTING_MEMBER,
  GOVERNMENT_UNITS_ZIP_URL,
  GOVERNMENT_UNITS_PUBLIC_USE_PAGE,
} from "./acquisition";

// 1.1.0 splits the Census government ID's supplement code (positions 10-12) and
// sub code (positions 13-14) into distinct fields; 1.0.0 collapsed them.
export const GOVERNMENT_UNITS_COMPILER_VERSION = "1.1.0";
export const GOVERNMENT_UNITS_PARSER_VERSION = "1.0.0";

/**
 * The 2025 Government Units listing describes the governmental universe as of
 * its reference year. That date is an input declared by the product, never a
 * clock read at build time.
 */
export const GOVERNMENT_UNITS_CORPUS_AS_OF = "2025-01-01";

/**
 * Why no production corpus exists here.
 *
 * Stated in full so that the manifest and validator carry the exact blocker.
 */
export const GOVERNMENT_UNITS_PRODUCTION_GATE =
  "The 2025 Census Government Units listing could not be acquired in this coding environment: the outbound proxy denies census.gov, rejecting the CONNECT to www2.census.gov with an HTTP 403 policy denial, so gov_units_2025.zip cannot be retrieved and hashed here. Production compilation is gated on running source:acquire --domain government-units from a network environment that reaches census.gov, which pins the real artifact through the ordinary source lock and requires no code change to compile. The domain, its compiler, its validator and its capability boundary are complete and exercised by an authoritative fixture.";

type GovernmentUnitsRole = "listing";

export type GovernmentUnitsArtifacts = OpenedArtifacts<GovernmentUnitsRole>;

/** The bytes a fixture supplies, inline. */
export interface GovernmentUnitsFixtureArtifacts {
  readonly listingTsv: string;
}

interface AssembledInputs {
  readonly bytes: Buffer;
  readonly artifactId: string;
  readonly inputClass: "production" | "fixture";
}

/** Parse, normalize and package a corpus from already-decided input bytes. */
function assembleGovernmentUnits(
  input: AssembledInputs,
  corpusAsOf: string,
): CompiledCorpus<GovernmentUnitRecord> {
  const parsed = parseGovernmentUnitsListing(input.bytes);
  const { records, defects } = normalizeGovernmentUnits(
    parsed.rows,
    input.artifactId,
    corpusAsOf,
  );
  if (defects.length > 0) {
    throw new Error(
      `The Government Units listing produced ${defects.length} normalization defects, the first being: ${defects[0]?.message}`,
    );
  }

  const isProduction = input.inputClass === "production";
  return {
    corpus: {
      corpusId: "government-units",
      compiler: {
        name: "government-units",
        version: GOVERNMENT_UNITS_COMPILER_VERSION,
      },
      parser: {
        name: "gov-units-listing-tsv",
        version: GOVERNMENT_UNITS_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: input.artifactId,
          sha256: corpusCanonicalDigest([input.bytes.toString("utf-8")]),
        },
      ],
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: input.inputClass,
      coverage: isProduction
        ? {
            isCompleteUniverse: true,
            universeDescription:
              "Every active state and local government unit in the U.S. Census Bureau 2025 Government Units Survey public-use listing.",
            boundedSampleReason: null,
          }
        : {
            isCompleteUniverse: false,
            universeDescription:
              "A fixture exercising the government-units compiler. It describes no real jurisdiction's governments and must never be read as one.",
            boundedSampleReason:
              "Fixture only. The domain compiles no production records in this environment; see the government-units production gate for the acquisition blocker.",
          },
    },
    records,
  } as CompiledCorpus<GovernmentUnitRecord>;
}

/** Compile the real corpus from locked publisher bytes. */
export function compileGovernmentUnitsProduction(
  input: ProductionInput<GovernmentUnitsArtifacts>,
  corpusAsOf: string = GOVERNMENT_UNITS_CORPUS_AS_OF,
): CompiledCorpus<GovernmentUnitRecord, "production"> {
  const opened = input.artifacts.listing;
  const memberBytes = readZipMember(
    opened.bytes,
    opened.artifact.container?.memberPath ?? GOVERNMENT_UNITS_LISTING_MEMBER,
  );
  return assembleGovernmentUnits(
    {
      bytes: memberBytes,
      artifactId: opened.artifact.artifactId,
      inputClass: "production",
    },
    corpusAsOf,
  ) as CompiledCorpus<GovernmentUnitRecord, "production">;
}

/** Compile a corpus from a fixture listing. */
export function compileGovernmentUnitsFixture(
  input: FixtureInput<GovernmentUnitsFixtureArtifacts>,
  corpusAsOf: string = GOVERNMENT_UNITS_CORPUS_AS_OF,
): CompiledCorpus<GovernmentUnitRecord, "fixture"> {
  return assembleGovernmentUnits(
    {
      bytes: Buffer.from(input.artifacts.listingTsv, "utf-8"),
      artifactId: input.fixtureId,
      inputClass: "fixture",
    },
    corpusAsOf,
  ) as CompiledCorpus<GovernmentUnitRecord, "fixture">;
}

/** Open the locked artifacts this domain would compile from. */
export function openGovernmentUnitsProduction(
  lock: ArtifactLock,
): ProductionInput<GovernmentUnitsArtifacts> {
  requireArtifact(lock, GOVERNMENT_UNITS_ZIP_ARTIFACT);
  return openProductionArtifacts<GovernmentUnitsRole>(
    "government-units",
    lock,
    { listing: GOVERNMENT_UNITS_ZIP_ARTIFACT },
  );
}

/** Open a government-units fixture through the capability boundary. */
export function openGovernmentUnitsFixture(
  path: string,
): FixtureInput<GovernmentUnitsFixtureArtifacts> {
  return openFixture<GovernmentUnitsFixtureArtifacts>("government-units", path);
}

export const sourceDomain: SourceDomainModule<GovernmentUnitRecord> = {
  domain: "government-units",
  compilerVersion: GOVERNMENT_UNITS_COMPILER_VERSION,
  acquisitionPlan: governmentUnitsAcquisition,
  lockPath: "data/source/government-units/artifact-lock.json",
  productionGate: GOVERNMENT_UNITS_PRODUCTION_GATE,
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<GovernmentUnitRecord, "production"> {
    return compileGovernmentUnitsProduction(
      openGovernmentUnitsProduction(lock),
    );
  },
  validateCorpus(
    corpus: CompiledCorpus<GovernmentUnitRecord>,
  ): ValidationReport {
    return validateGovernmentUnitsCorpus(corpus);
  },
};
