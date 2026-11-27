import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Determinism holds (core audit K11, docs/coordination/refactor/core-2026-11-26.md,
 * Nov 26: "Determinism holds... Keep it, with a guard"). The same seed makes
 * the same world; that is what lets every structure change in this repository
 * be held to an identical fixed-seed records digest. So game code reads no
 * unseeded randomness and no wall clock: no `Math.random`, `randomBytes`,
 * `randomUUID`, `randomInt`, `getRandomValues`, `Date.now`, `performance.now`
 * and no `new Date()` with no argument, as a call or as a reference.
 *
 * They are allowed only in the places that are not the simulation: the dev
 * panels (dev mode is game, but it times and names things for the person at
 * the keyboard) and the play server (session ids, response times). Everything
 * else, the measurement tools, browser checks and test kits that still sit in
 * src, is listed in determinism-baseline.json and moves out of src (Core item
 * 2); the list only shrinks.
 */
const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(__dirname, "determinism-baseline.json");

/** Where the clock and the unseeded draw may be read: dev panels and the play server. */
const ALLOWED = [
  /^src\/bench\/dev-[^/]*\.ts$/,
  /^src\/bench\/dev-views\//,
  /^src\/bench\/ui\/dev-[^/]*\.mjs$/,
  /^src\/bench\/(?:handler|server)\.ts$/,
];

const READS = new Set([
  "Math.random",
  "Date.now",
  "performance.now",
  "globalThis.performance.now",
  "crypto.randomUUID",
  "crypto.getRandomValues",
  "globalThis.crypto.randomUUID",
  "globalThis.crypto.getRandomValues",
]);
const DRAWS = new Set(["randomBytes", "randomUUID", "randomInt"]);

/** The unseeded reads in one file's text, by kind: a call or a reference such as `clock: Date.now`. */
export function unseededReads(file: string, text: string): string[] {
  const found: string[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const written = node.getText(source);
      if (READS.has(written))
        found.push(written.split(".").slice(-2).join("."));
    }
    if (
      ts.isIdentifier(node) &&
      DRAWS.has(node.text) &&
      !ts.isImportSpecifier(node.parent) &&
      !ts.isExportSpecifier(node.parent) &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
    )
      found.push(node.text);
    if (
      ts.isNewExpression(node) &&
      node.expression.getText(source) === "Date" &&
      (node.arguments?.length ?? 0) === 0
    )
      found.push("new Date()");
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function gameFiles(): string[] {
  return execFileSync("git", ["ls-files", "src"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx|mjs)$/.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file) &&
        !/\.d\.ts$/.test(file),
    );
}

function counts(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const file of gameFiles()) {
    if (ALLOWED.some((test) => test.test(file))) continue;
    for (const kind of unseededReads(
      file,
      readFileSync(path.join(ROOT, file), "utf8"),
    )) {
      const row = (out[file] ??= {});
      row[kind] = (row[kind] ?? 0) + 1;
    }
  }
  return out;
}

describe("determinism: game code reads no unseeded randomness and no clock", () => {
  const now = counts();
  const known = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<
    string,
    Record<string, number>
  >;

  it("finds each kind, called or only named", () => {
    expect(
      unseededReads(
        "a.ts",
        'import { randomBytes } from "node:crypto"; const a = Math.random(); Date.now(); const clock = { now: performance.now }; new Date(); new Date(5); crypto.randomUUID(); randomBytes(4);',
      ),
    ).toEqual([
      "Math.random",
      "Date.now",
      "performance.now",
      "new Date()",
      "crypto.randomUUID",
      "randomBytes",
    ]);
  });

  it("reads none outside the dev panels and the play server that it did not before", () => {
    const over = Object.entries(now).flatMap(([file, row]) =>
      Object.entries(row)
        .filter(([kind, n]) => n > (known[file]?.[kind] ?? 0))
        .map(
          ([kind, n]) =>
            `${file}: ${n} ${kind}, ${known[file]?.[kind] ?? 0} known. Seed it from the world's own draw or the game date; a tool belongs in scripts/.`,
        ),
    );
    expect(over).toEqual([]);
  });

  it("only shrinks: drops a file or lowers a count as soon as it moves out of src", () => {
    const stale = Object.entries(known).flatMap(([file, row]) =>
      Object.entries(row)
        .filter(([kind, n]) => (now[file]?.[kind] ?? 0) < n)
        .map(
          ([kind, n]) =>
            `${file}: lower ${n} ${kind} to ${now[file]?.[kind] ?? 0}`,
        ),
    );
    expect(stale, "edit tests/guards/determinism-baseline.json").toEqual([]);
  });
});
