import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { familyOf } from "./family-map";

/**
 * The core imports no engine; engines plug in (core audit K2, Nov 26; owner:
 * "the core is where engines plug in, and it can also be very friendly for
 * modders"). A file of the `core` family in tests/guards/families.json (the
 * kernel, the state, the record, the clock, the plug, parameters, starting
 * and saving a world, the choice engine) may not import a file of an engine
 * family. Every import counts, a type import too: the families guard counted
 * the core's type imports of engines before the core was its own family, and
 * a type the core names from an engine is the same dependency in the wrong
 * direction.
 *
 * The families guard leaves the core's outgoing imports out of its own count
 * so that making the core a family raised nothing; they are counted here,
 * per file, and the counts only shrink as the core's hooks (items 6 to 10)
 * replace each one. The baseline is core-imports-no-engine-baseline.json.
 */
const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(__dirname, "core-imports-no-engine-baseline.json");
const ROOTS = [
  "src/core2",
  "src/director",
  "src/english",
  "src/bench",
  "src/districts",
  "src/rules",
  "src/release",
];

const files = execFileSync("git", ["ls-files", ...ROOTS], {
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
const exists = new Set(files);

/** The repository files a source imports or re-exports from (relative specifiers only), a type import too. */
export function importsOf(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      specifiers.push(node.moduleSpecifier.text);
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      specifiers.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const out: string[] = [];
  for (const specifier of specifiers) {
    if (!specifier.startsWith(".")) continue;
    const base = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), specifier),
    );
    const target = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mjs`,
      `${base}/index.ts`,
    ].find((candidate) => exists.has(candidate));
    if (target) out.push(target);
  }
  return out;
}

function counts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of files) {
    if (familyOf(file) !== "core") continue;
    const reached = importsOf(
      file,
      readFileSync(path.join(ROOT, file), "utf8"),
    ).filter((target) => {
      const family = familyOf(target);
      return family !== null && family !== "core" && family !== "shared";
    });
    if (reached.length) out[file] = reached.length;
  }
  return out;
}

describe("the core imports no engine", () => {
  const now = counts();
  const known = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<
    string,
    number
  >;

  it("finds an import, a type import and a re-export, and not a package", () => {
    const names = new Set([
      "src/core2/a.ts",
      "src/core2/b.ts",
      "src/core2/c.ts",
      "src/core2/d.ts",
    ]);
    for (const name of names) exists.add(name);
    expect(
      importsOf(
        "src/core2/state.ts",
        'import { x } from "./a"; import type { Y } from "./b"; import { type Z } from "./c"; export { w } from "./d"; import "left-pad";',
      ),
    ).toEqual([
      "src/core2/a.ts",
      "src/core2/b.ts",
      "src/core2/c.ts",
      "src/core2/d.ts",
    ]);
  });

  it("imports no engine that it did not before", () => {
    const over = Object.entries(now)
      .filter(([file, n]) => n > (known[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: ${n} imports of engines, ${known[file] ?? 0} known. The core calls an engine through a hook the engine registers (CoreModule), never by importing it.`,
      );
    expect(over).toEqual([]);
  });

  it("only shrinks: lowers a count or drops a file as soon as an import is cut", () => {
    const stale = Object.entries(known)
      .filter(([file, n]) => (now[file] ?? 0) < n)
      .map(([file, n]) => `${file}: lower ${n} to ${now[file] ?? 0}`);
    expect(
      stale,
      "edit tests/guards/core-imports-no-engine-baseline.json",
    ).toEqual([]);
  });
});
