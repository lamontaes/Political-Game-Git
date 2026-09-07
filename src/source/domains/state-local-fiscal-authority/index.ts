/**
 * The state and local fiscal authority domain's public API.
 *
 * This domain is wired into the command matrix and compiles **no production
 * records**. That is a decision, not an omission, and it is the same decision
 * `state-office-qualifications` records: the substrate compiles production
 * corpora only from artifacts it retrieved and hashed itself, and 92N is a
 * research synthesis — a secondary source, however well cited.
 *
 * The distinction matters because of what a production record would claim.
 * Emitting `KNOWN(2.0)` for a California assessment growth cap, with evidence
 * pointing at Cal. Const. Art. XIII A, would say this repository read that
 * article. It did not. It read a document reporting it. The `Evidence` type in
 * this substrate means "these are the bytes this compiler read", and there is
 * no honest way to put a constitution's identity on a research paper's bytes.
 *
 * This is a *sourcing* gate, not an acquisition-environment one. Unlike
 * `government-units`, which is gated only because a proxy denies census.gov,
 * nothing here is unblocked by a better network. Lifting it needs one of two
 * things: the cited state constitutions and statutes acquired as first-party
 * artifacts through `source:acquire`, or an explicit architecture decision
 * admitting a declared secondary-source tier with its own evidence kind. Both
 * are decisions for current authority, not for a compiler.
 *
 * Everything else is real and exercised. The types keep the three ways of
 * saying "no tax here" apart, the schema refuses a percentage in a millage
 * column and a state-level rule filed under a municipality, the normalizer
 * refuses the three value states this matrix shape cannot honestly produce, the
 * derivations refuse a partial balanced-budget classification, and the
 * validator refuses a prohibition with no provision and a statistical survey
 * dressed as legal authority. The fixtures compile end to end through the same
 * capability boundary every other domain uses. When the gate clears, production
 * fiscal authority becomes a data change rather than a design.
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseFiscalMatrix } from "./parse";
import { normalizeFiscalAuthority } from "./normalize";
import { validateFiscalAuthorityCorpus } from "./validate";
import type { FiscalAuthorityRecord } from "./types";

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

export const FISCAL_AUTHORITY_COMPILER_VERSION = "1.1.0";
export const FISCAL_AUTHORITY_PARSER_VERSION = "2.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const FISCAL_AUTHORITY_CORPUS_AS_OF = "2026-01-01";

/**
 * Why no production corpus exists.
 *
 * Stated here so that `source:manifest` carries it and an auditor reads the
 * gate rather than discovering an absence.
 */
export const FISCAL_AUTHORITY_PRODUCTION_GATE =
  "92N establishes state and local fiscal authority for all 50 states with first-party legal citations, but it is a research synthesis and this substrate compiles production corpora only from artifacts it retrieved and hashed itself. A record citing Cal. Const. Art. XIII A would assert that this repository read that article; it read a document reporting it. Lifting the gate requires either acquiring the cited constitutions and statutes as first-party artifacts through source:acquire, or an explicit architecture decision admitting a declared secondary-source evidence tier.";

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
          "Fixture only. The domain compiles no production records; see FISCAL_AUTHORITY_PRODUCTION_GATE.",
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

export const sourceDomain: SourceDomainModule<FiscalAuthorityRecord> = {
  domain: "state-local-fiscal-authority",
  compilerVersion: FISCAL_AUTHORITY_COMPILER_VERSION,
  acquisitionPlan: { domain: "state-local-fiscal-authority", requests: [] },
  lockPath: "data/source/state-local-fiscal-authority/artifact-lock.json",
  productionGate: FISCAL_AUTHORITY_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<FiscalAuthorityRecord, "production"> {
    throw new Error(
      `The state-local-fiscal-authority domain compiles no production corpus. ${FISCAL_AUTHORITY_PRODUCTION_GATE}`,
    );
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
