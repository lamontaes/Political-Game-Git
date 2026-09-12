import { readFileSync } from "node:fs";

import { readZipMember, readXlsxSheet } from "../../src/source/core/index";
import { compileEducation } from "../../src/source/domains/education/index";
import { sha256HexOfUtf8, toCanonicalJson } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";

/**
 * The education export, built from locked sources and not written anywhere.
 *
 * This is the producer, separated from the act of writing, so that the same code
 * path can either emit the catalogs or be replayed and compared against the ones
 * already committed. That separation is the whole point of U-2: re-hashing a
 * file that is already on disk proves the file has not been edited since it was
 * written, and nothing at all about whether the committed bytes are what the
 * locked sources actually produce. Only running the producer proves that.
 *
 * Determinism is a requirement here, not a hope. `compileEducation` walks the
 * locked artifacts in a fixed order, the chunk kinds are iterated in a fixed
 * order, the record filter preserves corpus order, and the manifest goes through
 * `toCanonicalJson`. Two runs over the same lock produce byte-identical output,
 * which is what makes the comparison below meaningful rather than flaky.
 */

const LOCK_PATH = "data/source/education/artifact-lock.json";

/** The chunk kinds, in the order the manifest records them. */
const CHUNK_KINDS = ["postsecondary", "school", "district"] as const;

export interface EducationChunk {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
  readonly recordCount: number;
  /** Exact bytes, including the producer's trailing newline. */
  readonly data: string;
}

export interface EducationExport {
  readonly chunks: readonly EducationChunk[];
  /** Exact canonical bytes of `manifest.json`. */
  readonly manifest: string;
  readonly recordCount: number;
}

/**
 * Reads the capability dictionary out of the locked survey dictionaries.
 *
 * These are the human labels for award levels, noncredit programmes and offered
 * grades. They come from the locked zips rather than from a hand-maintained
 * table so that a changed source changes the output, which is exactly the
 * property the replay check needs in order to be able to fail.
 */
function readCapabilities(): Record<string, { label: string; kind: string }> {
  const capabilities: Record<string, { label: string; kind: string }> = {};
  for (const year of [2024, 2025]) {
    const ic = readZipMember(
      readFileSync(`data/source/education/raw/IC${year}_Dict.zip`),
      `ic${year}.xlsx`,
    );
    for (const row of readXlsxSheet(ic, "Varlist").rows) {
      if (row[1] && /^(LEVEL\d|NONCRDT[1-8]$)/.test(row[1])) {
        capabilities[`${year}:${row[1]}`] = {
          label: row[6]!.replace(/_x000D_/g, "").trim(),
          kind: row[1].startsWith("LEVEL") ? "award" : "noncredit",
        };
      }
    }
  }
  const ccd = readZipMember(
    readFileSync("data/source/education/raw/ccd-2024-25.zip"),
    "SY 2024-25 School Directory Companion 2025-046d.xlsx",
  );
  for (const row of readXlsxSheet(ccd, "File Layout").rows) {
    if (row[1] && /^G_.+_OFFERED$/.test(row[1])) {
      capabilities[`2024:${row[1]}`] = {
        label: row[6]!.replace(/_x000D_/g, "").trim(),
        kind: "grade",
      };
    }
  }
  return capabilities;
}

/** Compiles the locked education sources into the exact bytes of the export. */
export function buildEducationExport(): EducationExport {
  const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as ArtifactLock;
  const corpus = compileEducation(lock);
  const dictionary = {
    capabilities: readCapabilities(),
    hashes: Object.fromEntries(
      lock.artifacts.map((artifact) => [
        artifact.artifactId,
        artifact.bytes.sha256,
      ]),
    ),
  };

  const chunks: EducationChunk[] = [];
  for (const kind of CHUNK_KINDS) {
    const records = corpus.records.filter((record) => record[1] === kind);
    const data = JSON.stringify({ version: 1, dictionary, records }) + "\n";
    const digest = sha256HexOfUtf8(data);
    chunks.push({
      kind,
      path: `catalog-${digest}.json`,
      sha256: digest,
      recordCount: records.length,
      data,
    });
  }

  const manifest = toCanonicalJson({
    version: 1,
    chunks: chunks.map(({ kind, path, sha256, recordCount }) => ({
      kind,
      path,
      sha256,
      recordCount,
    })),
    recordCount: corpus.records.length,
    source: corpus.corpus,
  });

  return { chunks, manifest, recordCount: corpus.records.length };
}
