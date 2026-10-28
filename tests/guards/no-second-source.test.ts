import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * One source per fact (owner, Oct 27) and replace, never layer (Oct 14); on
 * Oct 28 the owner had every twin already merged found and removed, and new
 * ones blocked. This guard blocks the kinds of twin that can be found by
 * reading the tree:
 *   - a new file outside the deleted old-engine folders that imports
 *     them (the old-imports check refuses it; its list only shrinks);
 *   - a second file that emits an event kind another file already emits (the
 *     world's records of what happened). The kinds written by more than one
 *     file today are listed in event-kind-writers.json, and that list only
 *     shrinks. Seat-filling is one example: an election and an appointment each
 *     write took-office (the dev start seats through the offices term writer).
 * Set UPDATE_SECOND_SOURCE=1 to rewrite the list after deleting a writer.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const WRITERS_PATH = join(import.meta.dirname, "event-kind-writers.json");

function trackedCore(): string[] {
  return execFileSync("git", ["ls-files", "src/core2"], { cwd: REPO_ROOT })
    .toString()
    .split("\n")
    .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$|\/tooling\//.test(f));
}

/** The top-level `kind` of each `emit({ ... })` call, by file. */
function eventKindWriters(): Map<string, Set<string>> {
  const kinds = new Map<string, Set<string>>();
  for (const file of trackedCore()) {
    const src = readFileSync(join(REPO_ROOT, file), "utf8");
    const consts = new Map(
      [...src.matchAll(/const ([A-Z][A-Z0-9_]*)\s*=\s*"([^"]+)"/g)].map(
        (m) => [m[1]!, m[2]!] as const,
      ),
    );
    for (const m of src.matchAll(/\bemit\(\s*\{/g)) {
      let depth = 1;
      let top = "";
      for (let i = m.index + m[0].length; i < src.length && depth; i++) {
        const c = src[i]!;
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (depth === 1) top += c;
      }
      const k = top.match(/\bkind:\s*(?:"([^"]+)"|([A-Z][A-Z0-9_]*)\b)/);
      const kind = k?.[1] ?? (k?.[2] && consts.get(k[2]));
      if (!kind) continue;
      if (!kinds.has(kind)) kinds.set(kind, new Set());
      kinds.get(kind)!.add(file);
    }
  }
  return kinds;
}

describe("no second source", () => {
  it("adds no importer of the old engine folders", () => {
    let output = "";
    let failed = false;
    try {
      output = execFileSync("node", ["scripts/core2-guard/old-imports.mjs"], {
        cwd: REPO_ROOT,
      }).toString();
    } catch (error) {
      failed = true;
      output = String((error as { stdout?: Buffer }).stdout ?? error);
    }
    expect(
      failed ? output.split("\n").filter((l) => /^NEW|no longer/.test(l)) : [],
    ).toEqual([]);
  });

  it("adds no second writer of an event kind", () => {
    const multi = Object.fromEntries(
      [...eventKindWriters()]
        .filter(([, files]) => files.size > 1)
        .map(([kind, files]) => [kind, [...files].sort()] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    if (process.env.UPDATE_SECOND_SOURCE)
      writeFileSync(WRITERS_PATH, JSON.stringify(multi, null, 2) + "\n");
    const allowed = JSON.parse(readFileSync(WRITERS_PATH, "utf8")) as Record<
      string,
      string[]
    >;
    const added = Object.entries(multi).flatMap(([kind, files]) =>
      files
        .filter((f) => !allowed[kind]?.includes(f))
        .map((f) => `${f} writes ${kind}, which another file already writes`),
    );
    const gone = Object.entries(allowed).flatMap(([kind, files]) =>
      files
        .filter((f) => !multi[kind]?.includes(f))
        .map((f) => `${f} no longer writes ${kind}: shrink the list`),
    );
    expect([...added, ...gone]).toEqual([]);
  });
});
