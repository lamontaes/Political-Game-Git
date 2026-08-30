import type {
  NationalOccupationCorpusManifest,
  NormalizedOccupationRecord,
} from "./types.js";
import {
  normalizeOccupationRecord,
  type RawInputRecord,
} from "./normalizer.js";
import {
  buildNationalOccupationManifest,
  type ManifestFileInput,
} from "./manifest_builder.js";
import { CorpusValidator, type CorpusValidationResult } from "./validator.js";

export interface CompiledCorpusOutput {
  readonly manifest: NationalOccupationCorpusManifest;
  readonly records: readonly NormalizedOccupationRecord[];
  readonly validation: CorpusValidationResult;
}

export class NationalOccupationCompiler {
  private readonly validator = new CorpusValidator();

  public compile(
    rawRecords: readonly RawInputRecord[],
    fileInputs: readonly ManifestFileInput[] = [],
    compiledAt?: string,
  ): CompiledCorpusOutput {
    const records = rawRecords.map((raw) => normalizeOccupationRecord(raw));
    const manifest = buildNationalOccupationManifest(
      fileInputs,
      records,
      compiledAt,
    );
    const validation = this.validator.validateCorpus(records, manifest);

    if (!validation.valid) {
      const errorSummary = validation.errors
        .map((e) => `[${e.recordId ?? "corpus"}]: ${e.message}`)
        .join("\n");
      throw new Error(`Corpus compilation failed validation:\n${errorSummary}`);
    }

    return {
      manifest,
      records,
      validation,
    };
  }
}
