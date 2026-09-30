import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import ts from "typescript";

const FORBIDDEN_IMPORT =
  /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["'](?:react(?:-dom)?(?:\/[^"']*)?|node:sqlite|\.\.\/persistence(?:\/[^"']*)?|\.\.\/ui(?:\/[^"']*)?|\.\.\/(?:App|main))["']/;
const BROWSER_GLOBALS = new Set([
  "document",
  "window",
  "navigator",
  "localStorage",
  "sessionStorage",
  "fetch",
  "WebSocket",
]);
const FORBIDDEN_AMBIENT_ENTROPY = /\b(?:Math\.random|Date\.now)\b/;

/** Resolve names in their lexical scope, without supplying browser libraries. */
function browserGlobalReferences(source: string): string[] {
  const filename = "boundary-input.ts";
  const file = ts.createSourceFile(
    filename,
    `${source}\nexport {};`,
    ts.ScriptTarget.Latest,
    true,
  );
  const options: ts.CompilerOptions = { noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === filename ? file : undefined);
  const checker = ts.createProgram([filename], options, host).getTypeChecker();
  const references: string[] = [];
  const isLocal = (node: ts.Identifier) => {
    const symbol = ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node);
    return (
      symbol?.declarations?.some(
        (declaration) => declaration.getSourceFile() === file,
      ) ?? false
    );
  };
  const visit = (node: ts.Node) => {
    // Type names are not runtime accesses. Template expressions still are.
    if (ts.isTypeNode(node)) return;
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "globalThis" &&
      !isLocal(node.expression)
    ) {
      const member = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : node.argumentExpression && ts.isStringLiteral(node.argumentExpression)
          ? node.argumentExpression.text
          : null;
      if (member && BROWSER_GLOBALS.has(member))
        references.push(`globalThis.${member}`);
    }
    if (
      ts.isIdentifier(node) &&
      BROWSER_GLOBALS.has(node.text) &&
      !isLocal(node)
    ) {
      const parent = node.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node);
      if (!isPropertyName) references.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return references;
}

/**
 * The entropy scan strips comments and prose before checking runtime calls.
 * Browser references use the lexical resolver above. Imports remain a raw
 * source check because the quoted module path is part of the dependency.
 */
function codeOnly(source: string): string {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const character = source[index]!;
    const next = source[index + 1];
    if (character === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") index += 1;
        index += 1;
      }
      index += 1;
      // A placeholder, so `"window"` cannot become an accidental identifier
      // boundary and hide a neighboring one.
      output += " ";
      continue;
    }
    output += character;
    index += 1;
  }
  return output;
}

describe("simulation dependency boundary", () => {
  it("allows local window bindings, parameters, and ordinary property names", () => {
    expect(
      browserGlobalReferences(`
      const window = { start: 1 };
      const document = window.start;
      function local(fetch: () => void) { fetch(); }
      const value = { navigator: document, window: 2 };
      value.window;
    `),
    ).toEqual([]);
  });

  it("still rejects browser globals outside a local binding's scope", () => {
    expect(
      browserGlobalReferences(`
      function local() { const window = 1; return window; }
      window.location;
      fetch('/api');
    `),
    ).toEqual(["window", "fetch"]);
  });

  it("rejects qualified browser globals and accesses inside template expressions", () => {
    expect(
      browserGlobalReferences(
        'globalThis.window; globalThis["localStorage"]; `value: ${document.title}`;',
      ),
    ).toEqual(["globalThis.window", "globalThis.localStorage", "document"]);
  });

  it("ignores prose and locally bound globalThis without hiding computed accesses", () => {
    expect(
      browserGlobalReferences(`
      // window is a date range here.
      const text = 'document window fetch';
      const globalThis = { window: 1 };
      globalThis.window;
    `),
    ).toEqual([]);
    expect(
      browserGlobalReferences("const value = { [window.name]: 1 };"),
    ).toEqual(["window"]);
    expect(browserGlobalReferences("const value = { window };")).toEqual([
      "window",
    ]);
    expect(
      browserGlobalReferences("const window = 1; const value = { window };"),
    ).toEqual([]);
  });

  it("keeps production simulation modules independent of React, UI, and SQLite persistence", async () => {
    const simulationDirectory = dirname(fileURLToPath(import.meta.url));
    const productionModules = (await readdir(simulationDirectory)).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );

    for (const moduleName of productionModules) {
      const source = await readFile(
        join(simulationDirectory, moduleName),
        "utf8",
      );
      const code = codeOnly(source);
      expect(source, moduleName).not.toMatch(FORBIDDEN_IMPORT);
      expect(browserGlobalReferences(source), moduleName).toEqual([]);
      expect(code, moduleName).not.toMatch(FORBIDDEN_AMBIENT_ENTROPY);
    }
  });
});
