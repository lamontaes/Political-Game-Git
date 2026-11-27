import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { familyOf } from "../../tests/guards/family-map";

/**
 * What the core imports from engines, measured (core audit K2): read by
 * tests/guards/core-imports-no-engine.test.ts and written into its baseline by
 * write-core-imports-baseline.ts.
 */
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const ROOTS = [
  "src/core2",
  "src/director",
  "src/english",
  "src/bench",
  "src/districts",
  "src/rules",
  "src/release",
];

export const files = execFileSync("git", ["ls-files", ...ROOTS], {
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
export const exists = new Set(files);

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

export function counts(): Record<string, number> {
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
