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

function importsIn(javascript: string): LoadedImport[] {
  return [
    ...javascript.matchAll(
      /(?:^|[;\s])(?:import|export)\s(?:[^;"']*?\sfrom\s)?["'](\.[^"']+)["'](\s*(?:with|assert)\s*\{[^}]*\btype\s*:\s*["']json["'][^}]*\})?/gm,
    ),
    ...javascript.matchAll(
      /\bimport\(\s*["'](\.[^"']+)["'](\s*,\s*\{\s*with\s*:\s*\{[^}]*\btype\s*:\s*["']json["'])?/g,
    ),
  ].map((match) => ({
    specifier: match[1]!,
    bareJson: match[1]!.endsWith(".json") && !match[2],
  }));
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

  it("imports no bare JSON module anywhere below world.ts", () => {
    const graph = importGraph([resolve("src/simulation/world.ts")]);
    expect(graph.size).toBeGreaterThan(20);
    expect(bareJsonImports(graph)).toEqual([]);
  });

  it("imports no bare JSON module from any Playwright spec, its support or the config", () => {
    const graph = importGraph([
      resolve("playwright.config.ts"),
      resolve("scripts/dev-lab/verify-server.ts"),
      ...browserSpecEntries(resolve("tests/e2e")),
    ]);
    // Specs reach the simulation in Node, as the failing hosted run did.
    expect(graph.has(resolve("src/simulation/world.ts"))).toBe(true);
    expect(bareJsonImports(graph)).toEqual([]);
  });
});
