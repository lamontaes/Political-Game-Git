/**
 * Evidence of a computation.
 *
 * A `NormalizedCorpus` says: this compiler at this version read these locked
 * artifacts and produced this many records, whose canonical serialization has
 * this digest. It carries no wall clock. `compiledAt` is not a field that
 * exists, because a build-time observation is not a fact about the world and it
 * is what makes a tracked artifact fail to replay (13B B5).
 *
 * `asOf` is the corpus's semantic as-of date, which is an *input* — either the
 * publisher's stated vintage or a date the domain declares — never `new Date()`.
 */

import { SourceValidationError } from "./errors";
import { isSha256Hex } from "./hashing";

/** What universe the records cover, and honestly whether they cover all of it. */
export interface CorpusCoverage {
  /** Mandatory, with no default. A bounded sample must say so and say why. */
  readonly isCompleteUniverse: boolean;
  readonly universeDescription: string;
  readonly boundedSampleReason: string | null;
}

export interface NormalizedCorpus {
  readonly corpusId: string;
  readonly compiler: { readonly name: string; readonly version: string };
  readonly parser: { readonly name: string; readonly version: string };
  readonly inputs: readonly { readonly artifactId: string; readonly sha256: string }[];
  readonly asOf: string;
  readonly recordCount: number;
  readonly canonicalSha256: string;
  readonly inputClass: "production" | "fixture";
  readonly coverage: CorpusCoverage;
}

/** A compiled corpus: its records plus the provenance of the computation. */
export interface CompiledCorpus<
  TRecord,
  TClass extends "production" | "fixture" = "production" | "fixture",
> {
  readonly corpus: NormalizedCorpus & { readonly inputClass: TClass };
  readonly records: readonly TRecord[];
}

/** One problem found by a validator, named precisely enough to fix. */
export interface ValidationFinding {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly recordId?: string;
}

export interface ValidationReport {
  readonly domain: string;
  readonly checked: number;
  readonly findings: readonly ValidationFinding[];
}

/** True when a report contains no error-severity finding. */
export function isClean(report: ValidationReport): boolean {
  return report.findings.every((finding) => finding.severity !== "error");
}

/** Keys that must never appear in a tracked generated source artifact. */
export const FORBIDDEN_WALL_CLOCK_KEYS: readonly string[] = [
  "compiledAt",
  "compiledAtIso",
  "compiled_at",
  "generatedAt",
  "generated_at",
  "timestamp",
  "builtAt",
  "built_at",
  "runAt",
  "run_at",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[0-9:.]+Z)?$/;

/** Structural validation of the corpus provenance record itself. */
export function assertValidNormalizedCorpus(corpus: NormalizedCorpus): void {
  const fail = (message: string): never => {
    throw new SourceValidationError(`Corpus "${corpus.corpusId}": ${message}`);
  };

  if (!corpus.corpusId.trim()) fail("has no corpusId.");
  if (!corpus.compiler.version.trim()) fail("names no compiler version.");
  if (!corpus.parser.version.trim()) fail("names no parser version.");
  if (!ISO_DATE.test(corpus.asOf)) {
    fail(`asOf "${corpus.asOf}" is not an ISO date. It is an input, never a clock read.`);
  }
  if (!isSha256Hex(corpus.canonicalSha256)) {
    fail("canonicalSha256 is not a SHA-256 hex digest.");
  }
  if (corpus.inputs.length === 0) {
    fail("cites no input artifacts; a corpus with no evidence is not a corpus.");
  }
  for (const input of corpus.inputs) {
    if (!isSha256Hex(input.sha256)) {
      fail(`input "${input.artifactId}" carries a digest that is not SHA-256 hex.`);
    }
  }
  if (corpus.recordCount < 0) fail("declares a negative record count.");
  if (!corpus.coverage.universeDescription.trim()) {
    fail("does not describe the universe its records are drawn from.");
  }
  if (!corpus.coverage.isCompleteUniverse && !corpus.coverage.boundedSampleReason?.trim()) {
    fail(
      "is a bounded sample but gives no reason; a sample that will not say why it is bounded reads as a universe.",
    );
  }
  if (corpus.coverage.isCompleteUniverse && corpus.coverage.boundedSampleReason !== null) {
    fail("claims a complete universe while also giving a bounded-sample reason.");
  }
}
