import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Playwright loads specs and everything they import through Node's ESM
 * loader, which refuses a JSON import that lacks `with { type: "json" }`; one
 * such bare import under world.ts collected zero browser tests in hosted run
 * 34639494520. Generated data reaches the world as TypeScript modules instead.
 *
 * Imports are read from each file's transpiled output, so an import used only
 * as a type is erased here exactly as the loader's TypeScript transform
 * erases it, and is not an edge.
 */
interface LoadedImport {
  readonly specifier: string;
  readonly bareJson: boolean;
}

function importsIn(
  source: string,
  fileName = "json-import-guard.ts",
): LoadedImport[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const staticImports: LoadedImport[] = [];
  const dynamicImports: LoadedImport[] = [];
  function isJson(specifier: string): boolean {
    return /\.json(?:[?#].*)?$/i.test(specifier);
  }
  function property(
    object: ts.ObjectLiteralExpression,
    key: string,
  ): ts.Expression | undefined {
    if (
      object.properties.some(
        (entry) =>
          ts.isSpreadAssignment(entry) ||
          ("name" in entry &&
            entry.name !== undefined &&
            ts.isComputedPropertyName(entry.name)),
      )
    )
      return undefined;
    const matches = object.properties.filter(
      (entry) =>
        "name" in entry &&
        entry.name !== undefined &&
        (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
        entry.name.text === key,
    );
    const entry = matches.length === 1 ? matches[0] : undefined;
    return entry && ts.isPropertyAssignment(entry)
      ? entry.initializer
      : undefined;
  }
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const module = node.moduleSpecifier;
      const typeOnly = ts.isImportDeclaration(node)
        ? node.importClause?.isTypeOnly === true
        : node.isTypeOnly;
      if (!typeOnly && module && ts.isStringLiteral(module)) {
        const types =
          node.attributes?.elements.filter(
            (entry) => entry.name.text === "type",
          ) ?? [];
        const valid =
          node.attributes?.token === ts.SyntaxKind.WithKeyword &&
          types.length === 1 &&
          ts.isStringLiteral(types[0]!.value) &&
          types[0]!.value.text === "json";
        staticImports.push({
          specifier: module.text,
          bareJson: isJson(module.text) && !valid,
        });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const module = node.arguments[0];
      if (module && ts.isStringLiteralLike(module)) {
        const options = node.arguments[1];
        const withValue =
          options && ts.isObjectLiteralExpression(options)
            ? property(options, "with")
            : undefined;
        const type =
          withValue && ts.isObjectLiteralExpression(withValue)
            ? property(withValue, "type")
            : undefined;
        const valid =
          type !== undefined &&
          ts.isStringLiteral(type) &&
          type.text === "json";
        dynamicImports.push({
          specifier: module.text,
          bareJson: isJson(module.text) && !valid,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...staticImports, ...dynamicImports];
}

function loadedImports(file: string): LoadedImport[] {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
  });
  return importsIn(outputText);
}

function importGraph(
  entries: readonly string[],
): Map<string, readonly LoadedImport[]> {
  const graph = new Map<string, readonly LoadedImport[]>();
  const pending = [...entries];
  while (pending.length) {
    const file = pending.pop()!;
    if (graph.has(file)) continue;
    const imports = loadedImports(file);
    graph.set(file, imports);
    for (const { specifier } of imports) {
      if (specifier.endsWith(".json")) continue;
      const base = resolve(dirname(file), specifier.replace(/\.js$/, ""));
      const found = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}/index.ts`,
      ].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate));
      if (found) pending.push(found);
    }
  }
  return graph;
}

/**
 * Files Playwright's default testMatch loads in Node. Support pages such as
 * scene-depth.tsx are served to the browser by Vite and are not entries.
 */
function browserSpecEntries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return browserSpecEntries(path);
    return /\.(spec|test)\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

function bareJsonImports(
  graph: Map<string, readonly LoadedImport[]>,
): string[] {
  return [...graph].flatMap(([file, imports]) =>
    imports
      .filter((entry) => entry.bareJson)
      .map((entry) => `${relative(process.cwd(), file)} -> ${entry.specifier}`),
  );
}

describe("browser-loaded import graph", () => {
  it("tells a bare JSON import from one Node's loader accepts", () => {
    const found = importsIn(
      [
        'import a from "./a.json";',
        'import b from "./b.json" with { type: "json" };',
        'export { c } from "./c.json";',
        'import "./d.json";',
        'const e = await import("./e.json");',
        'const f = await import("./f.json", { with: { type: "json" } });',
        'import { g } from "./g";',
      ].join("\n"),
    );
    expect(found).toEqual([
      { specifier: "./a.json", bareJson: true },
      { specifier: "./b.json", bareJson: false },
      { specifier: "./c.json", bareJson: true },
      { specifier: "./d.json", bareJson: true },
      { specifier: "./g", bareJson: false },
      { specifier: "./e.json", bareJson: true },
      { specifier: "./f.json", bareJson: false },
    ]);
  });

  it("checks multiline declarations and rejects obsolete or wrong attributes", () => {
    expect(
      importsIn(
        [
          "import {",
          "  value,",
          '} from "./bare.json";',
          "export { default as data }",
          '  from "./export.json" with { type: "json" };',
          'export { default as invalid } from "./newline.json"',
          'with { type: "json" };',
          'import old from "./old.json" assert { type: "json" };',
          'import wrong from "./wrong.json" with { type: "text" };',
          'import "./side-effect.json";',
        ].join("\n"),
      ),
    ).toEqual([
      { specifier: "./bare.json", bareJson: true },
      { specifier: "./export.json", bareJson: false },
      { specifier: "./newline.json", bareJson: true },
      { specifier: "./old.json", bareJson: true },
      { specifier: "./wrong.json", bareJson: true },
      { specifier: "./side-effect.json", bareJson: true },
    ]);
  });

  it("does not turn comments, string contents or type references into runtime imports", () => {
    expect(
      importsIn(
        [
          '// import data from "./comment.json";',
          '/* export { default } from "./block.json"; */',
          "const text = 'import data from \"./string.json\";';",
          'import type Data from "./type.json";',
          'export type { Data } from "./export-type.json";',
          'type Module = typeof import("./type-query.json");',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("checks dynamic attributes, escaped specifiers and query suffixes", () => {
    expect(
      importsIn(
        [
          'const a = import("./a.json", { with: { type: "json" } });',
          'const b = import("./b.json", { assert: { type: "json" } });',
          'const c = import("./c.json", { with: { type: "text" } });',
          'const d = import("./d.json", { with: { type: "json", ...other } });',
          'const e = import("./e.json?cache=1");',
          'import escaped from "./f\\u002ejson";',
        ].join("\n"),
      ),
    ).toEqual([
      { specifier: "./f.json", bareJson: true },
      { specifier: "./a.json", bareJson: false },
      { specifier: "./b.json", bareJson: true },
      { specifier: "./c.json", bareJson: true },
      { specifier: "./d.json", bareJson: true },
      { specifier: "./e.json?cache=1", bareJson: true },
    ]);
  });

  it("requires the JSON attribute in every source module, including new directories", () => {
    function sourceFiles(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap(
        (entry) => {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) return sourceFiles(path);
          return entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)
            ? [path]
            : [];
        },
      );
    }
    const files = sourceFiles(resolve("src"));
    expect(files.length).toBeGreaterThan(0);
    expect(
      files.flatMap((file) =>
        importsIn(readFileSync(file, "utf8"), file)
          .filter((entry) => entry.bareJson)
          .map(
            (entry) => `${relative(process.cwd(), file)} -> ${entry.specifier}`,
          ),
      ),
    ).toEqual([]);
  }, 30_000);

  // Walks every module below world.ts, which grows with the game; like the
  // spec walk below, it outlasts the default five seconds on a busy runner.
  it("imports no bare JSON module anywhere below world.ts", () => {
    const graph = importGraph([resolve("src/simulation/world.ts")]);
    expect(graph.size).toBeGreaterThan(20);
    expect(bareJsonImports(graph)).toEqual([]);
  }, 30_000);

  it("imports no bare JSON module from any Playwright spec, its support or the config", () => {
    const graph = importGraph([
      resolve("playwright.config.ts"),
      resolve("scripts/dev-lab/verify-server.ts"),
      ...browserSpecEntries(resolve("tests/e2e")),
    ]);
    // Specs reach the simulation in Node, as the failing hosted run did.
    expect(graph.has(resolve("src/simulation/world.ts"))).toBe(true);
    expect(bareJsonImports(graph)).toEqual([]);
  }, 30_000);
});
