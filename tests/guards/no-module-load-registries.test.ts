import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

/*
 * Clock handler registries and handler lists are never built while a module
 * loads.
 *
 * The simulation modules import each other in cycles. A top-level `const`
 * that builds a registry, or lists `[KEY, handler]` pairs, reads the key
 * constants of other modules at the moment its own module loads. Inside a
 * cycle one of those constants may not exist yet: under Vitest the key is
 * `undefined` ("Future transition key must be a namespaced semantic key:
 * undefined"), and under plain Node it is a ReferenceError. Either way a test
 * file, or the whole game, fails to load before anything runs, and which file
 * fails depends only on which module happens to be imported first.
 *
 * The rule: build handler registries and handler lists inside a function and
 * call it when the registry is needed (memoized where it is reused), after
 * every module has loaded. This guard fails when a top-level initializer, not
 * counting anything inside a function body, either
 *   - calls createFutureTransitionHandlerRegistry,
 *     composeFutureTransitionHandlerRegistries or composeWorldTimeHandlers, or
 *   - holds an array of `[KEY, someHandler]` pairs (the shape of every handler
 *     list the clock composes).
 * Test files are exempt: a test file is the entry module, so everything it
 * imports has finished loading before its own top level runs.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const SCANNED_ROOTS = ["src", "scripts", "tests/fixtures"];
const REGISTRY_BUILDERS = new Set([
  "createFutureTransitionHandlerRegistry",
  "composeFutureTransitionHandlerRegistries",
  "composeWorldTimeHandlers",
]);

function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (
      /\.(ts|tsx|mts)$/.test(entry.name) &&
      !/\.test\.(ts|tsx|mts)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      found.push(path);
    }
  }
  return found;
}

function isFunctionBoundary(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node)
  );
}

/**
 * `createFutureTransitionHandlerRegistry([])` holds no key, so it has nothing
 * to read from another module and cannot hit a half-loaded cycle.
 */
function isEmptyRegistry(call: ts.CallExpression): boolean {
  const [entries, ...rest] = call.arguments;
  return (
    rest.length === 0 &&
    entries !== undefined &&
    ts.isArrayLiteralExpression(entries) &&
    entries.elements.length === 0
  );
}

/** What a module's top level builds at load time, as `line: what` strings. */
export function moduleLoadRegistryViolations(
  fileName: string,
  text: string,
): string[] {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];
  const report = (node: ts.Node, what: string) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    found.push(`${fileName}:${line + 1}: ${what}`);
  };
  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node)) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      REGISTRY_BUILDERS.has(node.expression.text) &&
      !isEmptyRegistry(node)
    ) {
      report(node, `calls ${node.expression.text} while the module loads`);
    }
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 2) {
      const key = node.elements[0];
      const handler = node.elements[1];
      if (
        key !== undefined &&
        handler !== undefined &&
        ts.isIdentifier(key) &&
        ts.isIdentifier(handler) &&
        /Handler$/.test(handler.text)
      ) {
        report(
          node,
          `lists the pair [${key.text}, ${handler.text}] while the module loads`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  for (const statement of source.statements) {
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isImportDeclaration(statement)
    ) {
      continue;
    }
    visit(statement);
  }
  return found;
}

describe("no handler registry or handler list is built while a module loads", () => {
  it("catches a registry built in a top-level const", () => {
    const hits = moduleLoadRegistryViolations(
      "example.ts",
      `import { createFutureTransitionHandlerRegistry } from "./registry";
       import { SOME_KEY, someHandler } from "./other";
       export const HANDLERS = createFutureTransitionHandlerRegistry([
         [SOME_KEY, someHandler],
       ]);`,
    );
    expect(hits.some((hit) => hit.includes("calls create"))).toBe(true);
    expect(hits.some((hit) => hit.includes("lists the pair"))).toBe(true);
  });

  it("catches a composed registry and a bare handler list in top-level consts", () => {
    expect(
      moduleLoadRegistryViolations(
        "example.ts",
        `export const ALL = composeFutureTransitionHandlerRegistries(a, b);
         export const WORLD = composeWorldTimeHandlers();`,
      ),
    ).toHaveLength(2);
    expect(
      moduleLoadRegistryViolations(
        "example.ts",
        `export const LIST = [[CONGRESS_SITTING_TRANSITION, congressSittingHandler]] as const;`,
      ),
    ).toHaveLength(1);
  });

  it("accepts an empty registry, which reads no key", () => {
    expect(
      moduleLoadRegistryViolations(
        "example.ts",
        `export const EMPTY = createFutureTransitionHandlerRegistry([]);`,
      ),
    ).toEqual([]);
  });

  it("accepts the same registry built inside a function and memoized", () => {
    expect(
      moduleLoadRegistryViolations(
        "example.ts",
        `let cache: unknown;
         export function handlers() {
           return (cache ??= createFutureTransitionHandlerRegistry([
             [SOME_KEY, someHandler],
           ]));
         }
         export const lazy = () => composeWorldTimeHandlers();`,
      ),
    ).toEqual([]);
  });

  it("no source, script or fixture file builds one at load", () => {
    const violations: string[] = [];
    for (const root of SCANNED_ROOTS) {
      for (const file of sourceFiles(join(REPO_ROOT, root))) {
        const text = readFileSync(file, "utf8");
        // Cheap pre-filter: only files that name a builder or a handler pair.
        if (
          !/createFutureTransitionHandlerRegistry|composeFutureTransitionHandlerRegistries|composeWorldTimeHandlers|Handler\s*\]/.test(
            text,
          )
        ) {
          continue;
        }
        violations.push(
          ...moduleLoadRegistryViolations(
            relative(REPO_ROOT, file).split(sep).join("/"),
            text,
          ),
        );
      }
    }
    expect(
      violations,
      "Build handler registries and handler lists inside a function and call it when needed, so no key is read while modules are still loading.",
    ).toEqual([]);
  });
});
