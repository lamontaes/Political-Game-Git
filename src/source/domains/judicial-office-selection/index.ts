/**
 * The judicial-office-selection domain's public API.
 *
 * This domain models how judicial offices are constituted and filled — the
 * first sourced slice of the 92G judicial research — and it compiles **no
 * production records**. That is the deliberate consequence of the source-honesty
 * posture the task sets out, not an omission.
 *
 * The substrate compiles production corpora only from artifacts it retrieved and
 * hashed itself. The 92G report is a research synthesis, a secondary source; and
 * the first-party authorities it cites — the U.S. Constitution and the
 * constitutions of Kentucky, Texas, Missouri and Virginia — have not been
 * retrieved into this repository as first-party artifacts. Emitting a production
 * record that read "Missouri fills its Supreme Court by merit selection" with
 * evidence pointing at Mo. Const. art. V, § 25 would assert this repository read
 * that article. It did not; it read a document reporting it. So the domain is
 * gated exactly as state-office-qualifications is, and the prose report is never
 * promoted into first-party authority.
 *
 * Everything else is real and exercised. The types, matrix reader, normalizer
 * and validator all work, and the fixture compiles end to end through the same
 * capability boundary every other domain uses — on the cases that matter here:
 * five structurally different ways to constitute and fill a court, an office
 * whose qualification law imposes nothing, and a requirement nobody resolved. If
 * the gate clears — the cited constitutions acquired as first-party artifacts,
 * or an explicit decision to admit a declared secondary-source tier — production
 * records become a data change rather than a design.
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseJudicialMatrix } from "./parse";
import { normalizeJudicialOffices } from "./normalize";
import { validateJudicialCorpus } from "./validate";
import type { JudicialOfficeRecord } from "./types";

export type {
  CourtLevel,
  JudicialCitedAuthority,
  JudicialOfficeRecord,
  RetentionMethod,
  RetrievalStatus,
  SelectionMechanism,
  SelectionStage,
  TenureKind,
  VerificationStatus,
} from "./types";
export { FORBIDDEN_CONCEPTS } from "./types";
export { JUDICIAL_COLUMNS, matrixField, parseJudicialMatrix } from "./parse";
export {
  courtSlug,
  normalizeJudicialOffices,
  parseSelectionPipeline,
  readScalar,
} from "./normalize";
export { validateJudicialCorpus } from "./validate";

export const JUDICIAL_COMPILER_VERSION = "1.0.0";
export const JUDICIAL_PARSER_VERSION = "1.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const JUDICIAL_CORPUS_AS_OF = "2026-09-05";

/**
 * Why no production corpus exists.
 *
 * Stated here so that `source:manifest` carries it and an auditor reads the gate
 * rather than discovering an absence.
 */
export const JUDICIAL_PRODUCTION_GATE =
  "The 92G judicial research (JUDICIAL_ROLE_GAMEPLAY_AND_INSTITUTIONAL_RESEARCH, 2026-09-05) is a research synthesis, a secondary source. The substrate compiles production corpora only from artifacts it retrieved and hashed, so production is gated on either acquiring the cited first-party authorities (the U.S. Constitution and the constitutions of Kentucky, Texas, Missouri and Virginia) as first-party artifacts, or an explicit architecture decision to admit a declared secondary-source tier. The prose report itself is never promoted into first-party authority.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface JudicialFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile a judicial-office corpus from a fixture matrix.
 *
 * There is deliberately no production counterpart. A caller cannot reach this
 * compiler with a production input because none can be opened for this domain,
 * and cannot reach it with a plain object because `FixtureInput` is branded.
 */
export function compileJudicialFixture(
  input: FixtureInput<JudicialFixtureArtifacts>,
  corpusAsOf: string = JUDICIAL_CORPUS_AS_OF,
): CompiledCorpus<JudicialOfficeRecord, "fixture"> {
  const bytes = Buffer.from(input.artifacts.matrixTsv, "utf-8");
  const table = parseJudicialMatrix(bytes);
  const { records, defects } = normalizeJudicialOffices(
    table.rows,
    input.fixtureId,
  );
  if (defects.length > 0) {
    throw new Error(
      `The judicial-office fixture produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "judicial-office-selection",
      compiler: {
        name: "judicial-office-selection",
        version: JUDICIAL_COMPILER_VERSION,
      },
      parser: {
        name: "judicial-office-matrix-tsv",
        version: JUDICIAL_PARSER_VERSION,
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
          "A fixture exercising the judicial-office compiler across five structurally distinct selection models. It describes no jurisdiction's law as retrieved fact and must never be read as one.",
        boundedSampleReason:
          "Fixture only. The domain compiles no production records; the 92G research is a secondary source and its cited authorities are not retrieved. See JUDICIAL_PRODUCTION_GATE.",
      },
    },
    records,
  };
}

/** Open a judicial-office fixture through the capability boundary. */
export function openJudicialFixture(
  path: string,
): FixtureInput<JudicialFixtureArtifacts> {
  return openFixture<JudicialFixtureArtifacts>(
    "judicial-office-selection",
    path,
  );
}

export const sourceDomain: SourceDomainModule<JudicialOfficeRecord> = {
  domain: "judicial-office-selection",
  compilerVersion: JUDICIAL_COMPILER_VERSION,
  acquisitionPlan: { domain: "judicial-office-selection", requests: [] },
  lockPath: "data/source/judicial-office-selection/artifact-lock.json",
  productionGate: JUDICIAL_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<JudicialOfficeRecord, "production"> {
    throw new Error(
      `The judicial-office-selection domain compiles no production corpus. ${JUDICIAL_PRODUCTION_GATE}`,
    );
  },
  validateCorpus(
    corpus: CompiledCorpus<JudicialOfficeRecord>,
  ): ValidationReport {
    return validateJudicialCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type JudicialProductionInput = ProductionInput<JudicialFixtureArtifacts>;
