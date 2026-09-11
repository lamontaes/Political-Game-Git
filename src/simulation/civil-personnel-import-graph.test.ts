import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Playwright loads specs and everything they import through Node's ESM
 * loader, which refuses a bare JSON import; one such import under world.ts
 * collected zero browser tests in hosted run 34639494520. Generated data
 * reaches the world as TypeScript modules instead.
 *
 * Imports are read from each file's transpiled output, so an import used only
 * as a type is erased here exactly as the loader's TypeScript transform
 * erases it, and is not an edge.
 */
function loadedSpecifiers(file: string): string[] {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
  });
  return [
    ...outputText.matchAll(
      /(?:^|[;\s])(?:import|export)\s(?:[^;"']*?\sfrom\s)?["'](\.[^"']+)["']/gm,
    ),
    ...outputText.matchAll(/\bimport\(\s*["'](\.[^"']+)["']\s*\)/g),
  ].map((match) => match[1]!);
}

function importGraph(
  entries: readonly string[],
): Map<string, readonly string[]> {
  const graph = new Map<string, readonly string[]>();
  const pending = [...entries];
  while (pending.length) {
    const file = pending.pop()!;
    if (graph.has(file)) continue;
    const specifiers = loadedSpecifiers(file);
    graph.set(file, specifiers);
    for (const specifier of specifiers) {
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

function jsonImports(graph: Map<string, readonly string[]>): string[] {
  return [...graph].flatMap(([file, specifiers]) =>
    specifiers
      .filter((specifier) => specifier.endsWith(".json"))
      .map((specifier) => `${relative(process.cwd(), file)} -> ${specifier}`),
  );
}

describe("browser-loaded import graph", () => {
  it("imports no JSON module anywhere below world.ts", () => {
    const graph = importGraph([resolve("src/simulation/world.ts")]);
    expect(graph.size).toBeGreaterThan(20);
    expect(jsonImports(graph)).toEqual([]);
  });

  it("imports no JSON module from any Playwright spec, its support or the config", () => {
    const graph = importGraph([
      resolve("playwright.config.ts"),
      resolve("scripts/dev-lab/verify-server.ts"),
      ...browserSpecEntries(resolve("tests/e2e")),
    ]);
    // Specs reach the simulation in Node, as the failing hosted run did.
    expect(graph.has(resolve("src/simulation/world.ts"))).toBe(true);
    expect(jsonImports(graph)).toEqual([]);
  });
});
