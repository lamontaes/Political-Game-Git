import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import baseline from "./import-cycles-baseline.json";
import { cycleStats, runtimeGraph } from "../../scripts/guards/import-cycles";

/**
 * One order to load in (owner, Nov 25: "STOP MAKING NEW SYSTEMS FOR NEW THINGS
 * WHEN THEY ALL USE THE SAME THING"; the Nov 26 refactor, row 1 and its load
 * failures). Source files that import each other in a ring load in an order
 * nobody chose, and the order decides which of them finds a constant already
 * built. The import cycles among src files are counted into
 * import-cycles-baseline.json and may only shrink: a move that adds an import
 * on a cycle, or closes a new one, fails here; breaking one lowers the
 * baseline in the same change.
 */
const ROOT = path.resolve(__dirname, "../..");

function sources(): Map<string, string> {
  const files = execFileSync("git", ["ls-files", "src"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (f) =>
        /\.(ts|tsx)$/.test(f) &&
        !/\.d\.ts$/.test(f) &&
        !/\.(test|spec|browser)\.(ts|tsx)$/.test(f),
    );
  return new Map(
    files.map((f) => [f, readFileSync(path.join(ROOT, f), "utf8")] as const),
  );
}

describe("import cycles among the source files", () => {
  const found = cycleStats(runtimeGraph(sources()));

  it("adds no import to a cycle and closes no new one", () => {
    const over = (["edgesInCycles", "filesInCycles"] as const)
      .filter((key) => found[key] > baseline[key])
      .map(
        (key) =>
          `${key}: ${found[key]}, ${baseline[key]} known. An import you added sits on a cycle (or closes one): import the piece that has nothing to import back, or move the shared piece out of the ring.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers the baseline as soon as a cycle is broken", () => {
    const stale = (["edgesInCycles", "filesInCycles"] as const)
      .filter((key) => found[key] < baseline[key])
      .map(
        (key) =>
          `${key}: lower ${baseline[key]} to ${found[key]} in tests/guards/import-cycles-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("counts a planted cycle, and a type-only import is not one", () => {
    const base = new Map([
      ["src/a.ts", 'import { b } from "./b";\nexport const a = b + 1;\n'],
      ["src/b.ts", "export const b = 1;\n"],
    ]);
    expect(cycleStats(runtimeGraph(base)).edgesInCycles).toBe(0);
    const planted = new Map(base);
    planted.set("src/b.ts", 'import { a } from "./a";\nexport const b = a;\n');
    const ring = cycleStats(runtimeGraph(planted));
    expect(ring.edgesInCycles).toBe(2);
    expect(ring.filesInCycles).toBe(2);
    const typeOnly = new Map(base);
    typeOnly.set(
      "src/b.ts",
      'import type { a } from "./a";\nexport const b: typeof a = 1 as never;\n',
    );
    expect(cycleStats(runtimeGraph(typeOnly)).edgesInCycles).toBe(0);
    // An unused named import is dropped by the transform the game runs under.
    const unused = new Map(base);
    unused.set("src/b.ts", 'import { a } from "./a";\nexport const b = 1;\n');
    expect(cycleStats(runtimeGraph(unused)).edgesInCycles).toBe(0);
  });
});
