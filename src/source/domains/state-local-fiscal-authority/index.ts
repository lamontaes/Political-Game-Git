/**
 * The state and local fiscal authority domain's public API.
 *
 * This domain compiles production records only from legal artifacts retrieved,
 * hashed, rights-scoped, and excerpt-checked by the source substrate. The 92N
 * research synthesis is preserved and fully dispositioned, but its claims do
 * not become production evidence merely because its prose contains citations.
 *
 * The distinction matters because of what a production record would claim.
 * Emitting `KNOWN(2.0)` for a California assessment growth cap, with evidence
 * pointing at Cal. Const. Art. XIII A, would say this repository read that
 * article. It did not. It read a document reporting it. The `Evidence` type in
 * this substrate means "these are the bytes this compiler read", and there is
 * no honest way to put a constitution's identity on a research paper's bytes.
 *
 * The production tranche follows that route for exact Alaska municipal
 * sales-and-use-tax, property-tax, and general-obligation-bond statutes. Claims
 * for which the route has not completed stay outside production with a
 * machine-readable disposition; this is evidence-bounded coverage, not an
 * arbitrary state sample.
 *
 * Everything else is real and exercised. The types keep the three ways of
 * saying "no tax here" apart, the schema refuses a percentage in a millage
 * column and a state-level rule filed under a municipality, the normalizer
 * refuses the three value states this matrix shape cannot honestly produce, the
 * derivations refuse a partial balanced-budget classification, and the
 * validator refuses a prohibition with no provision and a statistical survey
 * dressed as legal authority. The fixtures compile end to end through the same
 * capability boundary every other domain uses. Additional production coverage
 * is therefore a first-party data acquisition and declaration change, not a
 * redesign.
 */

import {
  assertValidArtifactLock,
  corpusCanonicalDigest,
  openFixture,
  openProductionArtifacts,
  requireArtifact,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifact,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseFiscalMatrix } from "./parse";
import { normalizeFiscalAuthority } from "./normalize";
import { validateFiscalAuthorityCorpus } from "./validate";
import type { FiscalAuthorityRecord } from "./types";
import {
  ALASKA_SESSION_LAW_EXTRACT,
  FISCAL_AUTHORITY_ACQUISITION,
  FISCAL_AUTHORITY_AS_OF,
  FISCAL_AUTHORITY_SOURCES,
} from "./acquisition";
import { compileFiscalAuthorityDeclarations } from "./declarations";
import {
  ALASKA_SESSION_LAW_PDF_ARTIFACT_ID,
  ALASKA_SESSION_LAW_SELECTION_PREDICATE,
} from "./session-law";

export type {
  BalancedBudgetStage,
  CitedFiscalAuthority,
  EnablingAuthoritySearchScope,
  FiscalAuthorityLineage,
  FiscalAuthorityRecord,
  FiscalLegalArtifactKind,
  FiscalLevel,
  FiscalRuleField,
  FiscalRuleRecord,
  FiscalRuleValue,
  TaxAuthorizationStatus,
  TaxInstrument,
  TaxInstrumentAuthorityRecord,
} from "./types";
export {
  BARRING_AUTHORIZATIONS,
  LOCAL_LEVELS,
  PERMISSIVE_AUTHORIZATIONS,
  isFiscalRule,
  isTaxInstrumentAuthority,
} from "./types";
export type {
  FieldLevelScope,
  FiscalFieldSchema,
  FiscalValueKind,
} from "./schema";
export {
  FISCAL_FIELD_SCHEMA,
  FISCAL_AUTHORITY_LINEAGE,
  FISCAL_LEGAL_ARTIFACT_KINDS,
  FISCAL_RULE_DEPENDENCIES,
  FISCAL_RULE_FIELDS,
  MAX_PLAUSIBLE_MILLS,
  TAX_INSTRUMENTS,
} from "./schema";
export type { FiscalMatrixColumn, FiscalMatrixTable } from "./parse";
export {
  FISCAL_MATRIX_COLUMNS,
  fiscalMatrixField,
  parseFiscalMatrix,
} from "./parse";
export { normalizeFiscalAuthority, readRuleValue } from "./normalize";
export type { FiscalNormalizeResult } from "./normalize";
export type {
  BalancedBudgetClassification,
  BalancedBudgetGap,
} from "./classify";
export {
  BALANCED_BUDGET_STAGE_FIELDS,
  classifyBalancedBudget,
  fiscalRule,
  instrumentPermission,
  presentRuleValue,
  statesCovered,
  taxInstrumentAuthorization,
} from "./classify";
export { validateFiscalAuthorityCorpus } from "./validate";
export * from "./acquisition";
export * from "./declarations";
export * from "./session-law";

export const FISCAL_AUTHORITY_COMPILER_VERSION = "2.1.0";
export const FISCAL_AUTHORITY_PARSER_VERSION = "2.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const FISCAL_AUTHORITY_CORPUS_AS_OF = "2026-01-01";

export const FISCAL_AUTHORITY_PRODUCTION_SCOPE =
  "Production contains only declarations verified against acquired first-party legal text. The recovered 92N matrix is separately dispositioned and never compiles as legal evidence.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface FiscalAuthorityFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile a fiscal authority corpus from a fixture matrix.
 *
 * There is deliberately no production counterpart. A caller cannot reach this
 * compiler with a production input because none can be opened for this domain,
 * and cannot reach it with a plain object because `FixtureInput` is branded.
 */
export function compileFiscalAuthorityFixture(
  input: FixtureInput<FiscalAuthorityFixtureArtifacts>,
  corpusAsOf: string = FISCAL_AUTHORITY_CORPUS_AS_OF,
): CompiledCorpus<FiscalAuthorityRecord, "fixture"> {
  const bytes = Buffer.from(input.artifacts.matrixTsv, "utf-8");
  const table = parseFiscalMatrix(bytes);
  const { records, defects } = normalizeFiscalAuthority(
    table.rows,
    input.fixtureId,
    corpusAsOf,
  );
  if (defects.length > 0) {
    throw new Error(
      `The fiscal authority fixture produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "state-local-fiscal-authority",
      compiler: {
        name: "state-local-fiscal-authority",
        version: FISCAL_AUTHORITY_COMPILER_VERSION,
      },
      parser: {
        name: "fiscal-authority-matrix-tsv",
        version: FISCAL_AUTHORITY_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: input.fixtureId,
          sha256: corpusCanonicalDigest([input.artifacts.matrixTsv]),
        },
      ],
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "fixture",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "A fixture exercising the fiscal authority compiler. It describes no real jurisdiction's fiscal law and must never be read as one.",
        boundedSampleReason:
          "Fixture only. Production compiles separately from acquired first-party legal artifacts.",
      },
    },
    records,
  };
}

/** Open a fiscal authority fixture through the capability boundary. */
export function openFiscalAuthorityFixture(
  path: string,
): FixtureInput<FiscalAuthorityFixtureArtifacts> {
  return openFixture<FiscalAuthorityFixtureArtifacts>(
    "state-local-fiscal-authority",
    path,
  );
}

function requireDigest(lock: ArtifactLock, artifactId: string): string {
  const artifact = lock.artifacts.find(
    (candidate) => candidate.artifactId === artifactId,
  );
  if (!artifact) throw new Error(`Missing locked artifact ${artifactId}.`);
  return artifact.bytes.sha256;
}

export function assertFiscalAuthoritySessionLawLock(lock: ArtifactLock): void {
  assertValidArtifactLock(lock);
  const parent = requireArtifact(lock, ALASKA_SESSION_LAW_PDF_ARTIFACT_ID);
  const extract = requireArtifact(lock, ALASKA_SESSION_LAW_EXTRACT.artifactId);
  if (
    parent.storage !== "cached-not-committed" ||
    parent.mediaType !== "application/pdf"
  ) {
    throw new Error(
      `${parent.artifactId} must be the locked cache-only publisher PDF.`,
    );
  }
  if (
    extract.storage !== "derived-qa-slice" ||
    extract.derivation?.parentArtifactId !== parent.artifactId ||
    extract.derivation.parentSha256 !== parent.bytes.sha256
  ) {
    throw new Error(
      `${extract.artifactId} does not resolve to the locked publisher PDF digest.`,
    );
  }
  if (
    extract.derivation.selectionPredicate !==
    ALASKA_SESSION_LAW_SELECTION_PREDICATE
  ) {
    throw new Error(
      `${extract.artifactId} does not declare the accepted PDF page decoding predicate.`,
    );
  }
  if (
    extract.retrieval.url !== parent.retrieval.url ||
    extract.retrieval.retrievedAt !== parent.retrieval.retrievedAt
  ) {
    throw new Error(
      `${extract.artifactId} is not tied to the parent PDF retrieval receipt.`,
    );
  }
}

export function openFiscalAuthorityArtifacts(lock: ArtifactLock) {
  assertFiscalAuthoritySessionLawLock(lock);
  return openProductionArtifacts(
    "state-local-fiscal-authority",
    lock,
    Object.fromEntries(
      FISCAL_AUTHORITY_SOURCES.map((source) => [
        source.artifactId,
        source.artifactId,
      ]),
    ),
  );
}

export function compileFiscalAuthorityProduction(
  input: ProductionInput<Readonly<Record<string, OpenedArtifact>>>,
): CompiledCorpus<FiscalAuthorityRecord, "production"> {
  const records = compileFiscalAuthorityDeclarations(input.artifacts);
  return {
    corpus: {
      corpusId: "state-local-fiscal-authority",
      compiler: {
        name: "state-local-fiscal-authority",
        version: FISCAL_AUTHORITY_COMPILER_VERSION,
      },
      parser: {
        name: "literal-first-party-legal-declarations",
        version: "1.0.0",
      },
      inputs: FISCAL_AUTHORITY_ACQUISITION.requests.map((source) => ({
        artifactId: source.artifactId,
        sha256: requireDigest(input.lock, source.artifactId),
      })),
      asOf: FISCAL_AUTHORITY_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Fifty states, six government levels, eight tax instruments, and every declared fiscal-rule field. This production tranche emits only claims verified against acquired first-party legal text; the separate 92N disposition accounts for the rest.",
        boundedSampleReason:
          "First-party acquisition currently verifies Alaska borough and municipal sales-tax, property-tax, millage-cap, and general-obligation-bond-vote claims. Every other matrix candidate remains explicitly outside production rather than being promoted from secondary research.",
      },
    },
    records,
  };
}

export const sourceDomain: SourceDomainModule<FiscalAuthorityRecord> = {
  domain: "state-local-fiscal-authority",
  compilerVersion: FISCAL_AUTHORITY_COMPILER_VERSION,
  acquisitionPlan: FISCAL_AUTHORITY_ACQUISITION,
  lockPath: "data/source/state-local-fiscal-authority/artifact-lock.json",
  compileProduction(lock): CompiledCorpus<FiscalAuthorityRecord, "production"> {
    return compileFiscalAuthorityProduction(openFiscalAuthorityArtifacts(lock));
  },
  validateCorpus(
    corpus: CompiledCorpus<FiscalAuthorityRecord>,
  ): ValidationReport {
    return validateFiscalAuthorityCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type FiscalAuthorityProductionInput =
  ProductionInput<FiscalAuthorityFixtureArtifacts>;
