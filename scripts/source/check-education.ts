import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { buildEducationExport } from "./education-export";

/**
 * Producer replay for the committed education catalogs.
 *
 * `tests/source/education-catalog-integrity.test.ts` establishes INTERNAL
 * CONSISTENCY — the committed bytes are the bytes the manifest and the
 * content-addressed file names claim, and the loader refuses bytes that are
 * not. It says plainly that it is not producer replay. This is the missing
 * half: it recompiles the export from the locked sources and compares the
 * result, byte for byte, with what is on disk.
 *
 * The difference matters. Hashing a file proves nobody edited it after it was
 * written. Only replaying the producer proves the file is what the locked
 * sources actually make — which is what catches a catalog generated from a
 * source that has since changed, a lock edited without regenerating, or a
 * catalog minted by copying rather than by compiling.
 *
 * What it refuses, and each is exercised by the check's own negative controls:
 *
 *   - a missing or unreadable manifest;
 *   - a manifest whose chunk list, digests or record counts differ from a fresh
 *     compile;
 *   - a missing catalog file, or one whose bytes differ;
 *   - a stray catalog in the directory that no fresh compile produces;
 *   - missing or altered source material, which surfaces as a changed digest
 *     rather than as a silent pass.
 *
 * It deliberately does not write. A check that repairs what it is checking
 * cannot fail, and minting catalog outputs by copying the golden files is
 * exactly what this exists to make impossible.
 */

const DIRECTORY = "public/education";
const MANIFEST = join(DIRECTORY, "manifest.json");

function report(problems: readonly string[]): void {
  if (problems.length === 0) return;
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    `\neducation:check — ${problems.length} problem(s). The committed catalogs are not what the locked sources produce.`,
  );
  process.exitCode = 1;
}

function main(): void {
  const problems: string[] = [];

  if (!existsSync(MANIFEST)) {
    report([`${MANIFEST} is missing.`]);
    return;
  }

  /*
   * Altered or missing source material surfaces here, because the compiler
   * verifies each locked artifact's digest before it will read it. Catching it
   * keeps the failure a reported problem with an exit code rather than an
   * unhandled stack trace — the check has still failed either way, but only one
   * of those tells you which source moved.
   */
  let built;
  try {
    built = buildEducationExport();
  } catch (error) {
    report([
      `The locked education sources could not be compiled: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ]);
    return;
  }

  const onDisk = readFileSync(MANIFEST, "utf8");
  if (onDisk !== built.manifest) {
    problems.push(
      `${MANIFEST} differs from a fresh compile of the locked sources.`,
    );
  }

  const expected = new Set(built.chunks.map((chunk) => chunk.path));
  for (const chunk of built.chunks) {
    const path = join(DIRECTORY, chunk.path);
    if (!existsSync(path)) {
      problems.push(
        `${path} is missing; the ${chunk.kind} chunk compiles to that digest.`,
      );
      continue;
    }
    if (readFileSync(path, "utf8") !== chunk.data) {
      problems.push(
        `${path} differs from a fresh compile of the ${chunk.kind} chunk.`,
      );
    }
  }

  /*
   * A stray catalog is a real finding rather than harmless clutter: the files
   * are content-addressed, so one that no compile produces is either a stale
   * generation nobody removed or bytes that arrived some other way.
   */
  for (const entry of readdirSync(DIRECTORY)) {
    if (!/^catalog-[a-f0-9]{64}\.json$/.test(entry)) continue;
    if (!expected.has(entry)) {
      problems.push(
        `${join(DIRECTORY, entry)} is not produced by the locked sources.`,
      );
    }
  }

  report(problems);
  if (problems.length === 0) {
    console.log(
      `education:check — replayed ${built.recordCount} institutions in ${built.chunks.length} chunks from the locked sources; committed catalogs match byte for byte.`,
    );
  }
}

main();
