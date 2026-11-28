import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import map from "../../tests/guards/families.json";
import { familyOf, globToRegExp } from "../../tests/guards/family-map";

/**
 * What the families guard measures, read by tests/guards/families.test.ts and
 * written into its baseline by write-families-baseline.ts: the source files,
 * the test files, and each file's imports that reach inside another family
 * (the core's own imports of engines are counted by core-imports-no-engine).
 */
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export type Family = {
  id: string;
  name: string;
  entry: string[];
  paths: string[];
};
export const families = map.families as Family[];

export const entries = new Map(
  families.map((family) => [family.id, family.entry.map(globToRegExp)]),
);

export const SOURCE =
  /^(?:src\/(?:core2|director|english|bench|districts|rules|release)\/.*\.(?:ts|tsx|mjs))$/;
/** Every folder of game source: a file in none of them is not game code. */
export const ROOTS = [
  "src/core2",
  "src/director",
  "src/english",
  "src/bench",
  "src/districts",
  "src/rules",
  "src/release",
];
export function sources(): string[] {
  return execFileSync("git", ["ls-files", ...ROOTS], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        SOURCE.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file) &&
        !/\.d\.m?ts$/.test(file),
    );
}

/** The repository files a source imports by relative path. */
export function importsOf(file: string, source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(
    /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']/g,
  )) {
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), match[1]!),
    );
    out.push(/\.(ts|tsx|mjs|js|json)$/.test(target) ? target : `${target}.ts`);
  }
  return out;
}

/** The test files beside the source: each belongs to the family that answers for its failing. */
export function testFiles(): string[] {
  return execFileSync(
    "git",
    ["ls-files", ...ROOTS, ...ROOTS.map((root) => `tests/${root}`)],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(
      (file) =>
        SOURCE.test(file.replace(/^tests\//, "")) &&
        /\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file),
    );
}

export function deepImports(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of sources()) {
    const from = familyOf(file);
    // The core's own imports of engines are counted by core-imports-no-engine.test.ts.
    if (!from || from === "shared" || from === "core") continue;
    const reached = importsOf(file, readFileSync(path.join(ROOT, file), "utf8"))
      .map((target) => target.replace(/\.js$/, ".ts"))
      .filter((target) => {
        const to = familyOf(target);
        return (
          to !== null &&
          to !== "shared" &&
          to !== from &&
          !entries.get(to)!.some((test) => test.test(target))
        );
      });
    if (reached.length) out.set(file, reached);
  }
  return out;
}
