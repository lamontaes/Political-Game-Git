/**
 * Writing a corpus into `data/source/`.
 *
 * The writer takes a corpus whose `inputClass` is statically `"production"`, so
 * a fixture-derived corpus does not typecheck here, and re-checks at runtime in
 * case somebody reached the function through an `any`. Fixtures live in
 * `fixtures/source/` and there is no path from there to `data/source/`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { toCanonicalJson } from "./canonical-json";
import { SourceCapabilityError } from "./errors";
import { sha256HexOfUtf8 } from "./hashing";
import type { CompiledCorpus, NormalizedCorpus } from "./corpus";
import { assertValidNormalizedCorpus, FORBIDDEN_WALL_CLOCK_KEYS } from "./corpus";

/**
 * The canonical serialization of a corpus's records.
 *
 * One record per line, each record itself canonical with sorted keys. Records
 * are the one thing in this tree that runs to tens of thousands of entries, and
 * a record per line keeps a corpus both compact and diffable: a changed fact
 * shows up as one changed line rather than as a re-indented wall or as a single
 * unreadable line.
 */
export function corpusRecordsJson<T>(records: readonly T[]): string {
  if (records.length === 0) return "[]\n";
  const lines = records.map((record) => toCanonicalJson(record, 0).trimEnd());
  return `[\n${lines.join(",\n")}\n]\n`;
}

/** The digest a corpus's `canonicalSha256` must carry. */
export function corpusCanonicalDigest<T>(records: readonly T[]): string {
  return sha256HexOfUtf8(corpusRecordsJson(records));
}

function assertNoWallClockKeys(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoWallClockKeys(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_WALL_CLOCK_KEYS.includes(key)) {
      throw new SourceCapabilityError(
        `Tracked source output would carry the wall-clock key "${key}" at ${path}. Retrieval time belongs to the acquisition lock; a build-time observation is not a fact about the world.`,
      );
    }
    assertNoWallClockKeys(entry, `${path}.${key}`);
  }
}

/** Write a production corpus's records and its provenance record. */
export function writeProductionCorpus<T>(
  compiled: CompiledCorpus<T, "production">,
  recordsPath: string,
  manifestPath: string,
): void {
  if (compiled.corpus.inputClass !== "production") {
    throw new SourceCapabilityError(
      `Corpus "${compiled.corpus.corpusId}" is ${String(compiled.corpus.inputClass)} and may not be written into data/source/.`,
    );
  }
  assertValidNormalizedCorpus(compiled.corpus);

  const recordsJson = corpusRecordsJson(compiled.records);
  const digest = sha256HexOfUtf8(recordsJson);
  if (digest !== compiled.corpus.canonicalSha256) {
    throw new SourceCapabilityError(
      `Corpus "${compiled.corpus.corpusId}" declares canonicalSha256 ${compiled.corpus.canonicalSha256} but its records hash to ${digest}.`,
    );
  }

  assertNoWallClockKeys(compiled.records, "records");
  assertNoWallClockKeys(compiled.corpus, "corpus");

  writeText(recordsPath, recordsJson);
  writeText(manifestPath, toCanonicalJson(compiled.corpus satisfies NormalizedCorpus));
}

/** Create parent directories and write text with a trailing newline preserved. */
export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf-8");
}
