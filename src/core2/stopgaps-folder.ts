// The stopgap register's files on disk, for tools that read or write it under a
// repository root (the tripwires, the outcome-web writers, the research checks).
// The game itself reads the register through src/core2/stopgaps.ts.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The register's folder, relative to the repository root. */
export const STOPGAP_FOLDER = "src/core2/data/stopgaps";

/** The family file an entry belongs in: `SG-GOV-x` goes in `gov.json`. */
export function stopgapFamilyFile(id: string): string {
  const [, family] = /^SG-([A-Za-z0-9]+)-/.exec(id) ?? [];
  if (!family) throw new Error(`Stopgap id ${id} has no SG-<FAMILY>- prefix`);
  return `${family.toLowerCase()}.json`;
}

/** Each family file's parsed contents, by file name, sorted by name. */
export function readStopgapFiles(root: string): Map<string, unknown> {
  const folder = join(root, STOPGAP_FOLDER);
  const out = new Map<string, unknown>();
  if (!existsSync(folder)) return out;
  for (const name of readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .sort())
    out.set(name, JSON.parse(readFileSync(join(folder, name), "utf8")));
  return out;
}

/** Every entry in the register under `root`, family files in name order. */
export function readStopgapFolder<T = Record<string, unknown>>(
  root: string,
): T[] {
  return [...readStopgapFiles(root).values()].flatMap((rows) =>
    Array.isArray(rows) ? (rows as T[]) : [],
  );
}

/**
 * Writes entries back by family: each family named by an entry is rewritten
 * with that family's entries in the given order. Families no entry names are
 * left as they are.
 */
export function writeStopgapFolder(
  root: string,
  entries: readonly { id: string }[],
): void {
  const byFile = new Map<string, { id: string }[]>();
  for (const entry of entries) {
    const file = stopgapFamilyFile(entry.id);
    byFile.set(file, [...(byFile.get(file) ?? []), entry]);
  }
  for (const [file, rows] of byFile)
    writeFileSync(
      join(root, STOPGAP_FOLDER, file),
      `${JSON.stringify(rows, null, "  ")}\n`,
    );
}
