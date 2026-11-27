import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Determinism holds (core review K11, Nov 26; owner, Oct 29: "I want
 * simulations to be able to go hundreds of years"). The same seed makes the
 * same world, so game code reads no unseeded randomness and no wall clock:
 * no `Math.random`, `randomBytes`, `randomUUID` or `randomInt`, no
 * `Date.now`, no `performance.now`, no `new Date()` with no argument.
 *
 * They are allowed only in the places that are not the simulation: the dev
 * panels (dev mode is game, but it times and names things for the person at
 * the keyboard) and the play server (session ids, response times).
 * Everything else, the measurement tools and test kits that still sit in
 * src, is listed in determinism-baseline.json and moves out of src; the list
 * only shrinks.
 */
const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(__dirname, "determinism-baseline.json");

/** Where the clock and the unseeded draw may be read: dev panels and the play server. */
const ALLOWED = [
  /^src\/bench\/dev-[^/]*\.ts$/,
  /^src\/bench\/dev-views\//,
  /^src\/bench\/ui\/dev-[^/]*\.mjs$/,
  /^src\/bench\/(?:handler|server)\.ts$/,
  /^src\/bench\/verify\.mjs$/,
];

const DRAWS = /(^|\.)(randomBytes|randomUUID|randomInt|getRandomValues)$/;

/** The unseeded reads in one file's text, by kind. */
export function unseededReads(file: string, text: string): string[] {
  const found: string[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (callee === "Math.random") found.push("Math.random");
      else if (callee === "Date.now") found.push("Date.now");
      else if (
        callee === "performance.now" ||
        callee === "globalThis.performance.now"
      )
        found.push("performance.now");
      else if (DRAWS.test(callee)) found.push(callee.split(".").pop()!);
    }
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

  it("finds each kind in a file that holds it", () => {
    expect(
      unseededReads(
        "a.ts",
        "const a = Math.random(); Date.now(); performance.now(); new Date(); new Date(5); crypto.randomUUID(); randomBytes(4); randomInt(3);",
      ),
    ).toEqual([
      "Math.random",
      "Date.now",
      "performance.now",
      "new Date()",
      "randomUUID",
      "randomBytes",
      "randomInt",
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
