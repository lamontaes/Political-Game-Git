import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Playwright loads the simulation through Node's ESM loader, which refuses a
 * bare JSON import; one such import anywhere under world.ts collected zero
 * browser tests in hosted run 34639494520. Generated data reaches the world
 * as TypeScript modules instead.
 */
function importGraph(entry: string): Map<string, readonly string[]> {
  const graph = new Map<string, readonly string[]>();
  const pending = [entry];
  while (pending.length) {
    const file = pending.pop()!;
    if (graph.has(file)) continue;
    const specifiers = [
      ...readFileSync(file, "utf8").matchAll(
        /^\s*(?:import|export)\s[^;]*?from\s+"(\.[^"]+)"/gms,
      ),
    ].map((match) => match[1]!);
    graph.set(file, specifiers);
    for (const specifier of specifiers) {
      if (specifier.endsWith(".json")) continue;
      const base = resolve(dirname(file), specifier);
      const found = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(
        (candidate) => existsSync(candidate),
      );
      if (found) pending.push(found);
    }
  }
  return graph;
}

describe("simulation import graph", () => {
  it("imports no JSON module anywhere below world.ts", () => {
    const graph = importGraph(resolve("src/simulation/world.ts"));
    const offenders = [...graph].flatMap(([file, specifiers]) =>
      specifiers
        .filter((specifier) => specifier.endsWith(".json"))
        .map((specifier) => `${file} -> ${specifier}`),
    );
    expect(graph.size).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
