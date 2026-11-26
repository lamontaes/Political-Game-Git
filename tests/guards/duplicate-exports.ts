import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { familyOf } from "./family-map";

const printer = ts.createPrinter({ removeComments: true });
const exported = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Only function bodies defined here count. Re-exporting an existing function is reuse. */
export function functionExports(file: string, text: string) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const bodies = new Map<string, ts.ConciseBody>();
  const names = new Map<string, string>();
  for (const node of source.statements) {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      const name = node.name.text;
      bodies.set(name, node.body);
      if (exported(node)) names.set(name, name);
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const { name, initializer } = declaration;
        if (!ts.isIdentifier(name) || !initializer) continue;
        if (
          !ts.isArrowFunction(initializer) &&
          !ts.isFunctionExpression(initializer)
        )
          continue;
        bodies.set(name.text, initializer.body);
        if (exported(node)) names.set(name.text, name.text);
      }
    } else if (
      ts.isExportDeclaration(node) &&
      !node.moduleSpecifier &&
      !node.isTypeOnly &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const specifier of node.exportClause.elements) {
        if (!specifier.isTypeOnly)
          names.set(
            specifier.name.text,
            (specifier.propertyName ?? specifier.name).text,
          );
      }
    }
  }
  return [...names].flatMap(([name, local]) => {
    const body = bodies.get(local);
    if (!body) return [];
    const printed = printer.printNode(ts.EmitHint.Unspecified, body, source);
    return [
      { name, digest: createHash("sha256").update(printed).digest("hex") },
    ];
  });
}

export function duplicateExports(
  files: readonly { file: string; text: string }[],
) {
  const seen = new Map<string, { family: string; file: string }[]>();
  const pairs = new Set<string>();
  for (const { file, text } of [...files].sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : 0,
  )) {
    const family = familyOf(file);
    if (!family || family === "shared") continue;
    for (const { name, digest } of functionExports(file, text)) {
      const key = `${name} ${digest}`;
      const matches = seen.get(key) ?? [];
      for (const match of matches) {
        if (match.family !== family) pairs.add(`${key} ${match.file} ${file}`);
      }
      matches.push({ family, file });
      seen.set(key, matches);
    }
  }
  return [...pairs].sort();
}

export function repositoryDuplicates(root: string) {
  const files = execFileSync("git", ["ls-files", "-z", "src"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(
      (file) =>
        /\.(?:[cm]?[jt]s|[jt]sx)$/.test(file) &&
        !/\.(?:d|test|spec|browser)\.[^.]+$/.test(file) &&
        familyOf(file),
    );
  return duplicateExports(
    files.map((file) => ({
      file,
      text: readFileSync(path.join(root, file), "utf8"),
    })),
  );
}
