import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Proof E — the production player route cannot reach the developer fixture.
 *
 * The `?view=floor` route may keep its synthetic world; production must not be
 * able to import it, even transitively. This walks the real import graph from
 * the production entry points and asserts the fixture module is unreachable.
 * The dependency direction is also pinned the other way: the fixture reads the
 * shared brief, so a future edit cannot quietly reverse it.
 */

const FIXTURE_MODULE = "src/presentation/legislative-bargaining-fixture.ts";

const PRODUCTION_ENTRY_POINTS = [
  "src/player/PlayerGame.tsx",
  "src/player/MeasureFloorSurface.tsx",
  "src/presentation/legislative-bargaining-world.ts",
  "src/presentation/legislative-bargaining-brief.ts",
  "src/presentation/legislative-bargaining-actions.ts",
];

const ROOT = resolve(__dirname, "..", "..");

function moduleImports(filePath: string): readonly string[] {
  const source = readFileSync(filePath, "utf8");
  const specifiers: string[] = [];
  const pattern = /(?:from|import)\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    specifiers.push(match[1]!);
  }
  return specifiers;
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

function reachableFiles(entry: string): ReadonlySet<string> {
  const seen = new Set<string>();
  const queue = [resolve(ROOT, entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of moduleImports(file)) {
      const resolved = resolveRelative(file, specifier);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

describe("the production route and the developer fixture", () => {
  it("cannot import the fixture from any production entry point", () => {
    const fixtureAbsolute = resolve(ROOT, FIXTURE_MODULE);
    for (const entry of PRODUCTION_ENTRY_POINTS) {
      const reachable = reachableFiles(entry);
      expect(
        reachable.has(fixtureAbsolute),
        `${entry} reaches the developer floor fixture`,
      ).toBe(false);
    }
  });

  it("keeps the dependency direction: the fixture reads the brief", () => {
    const imports = moduleImports(resolve(ROOT, FIXTURE_MODULE));
    expect(
      imports.some((specifier) =>
        specifier.includes("legislative-bargaining-brief"),
      ),
    ).toBe(true);
    const briefImports = moduleImports(
      resolve(ROOT, "src/presentation/legislative-bargaining-brief.ts"),
    );
    expect(
      briefImports.some((specifier) =>
        specifier.includes("legislative-bargaining-fixture"),
      ),
    ).toBe(false);
  });

  it("keeps the dev route itself outside the production spine", () => {
    // MeasureFloorView is the developer wrapper; only App's dev routing may
    // reach it. The production game screen must not.
    const reachable = reachableFiles("src/player/PlayerGame.tsx");
    expect(
      reachable.has(resolve(ROOT, "src/player/MeasureFloorView.tsx")),
    ).toBe(false);
  });
});
