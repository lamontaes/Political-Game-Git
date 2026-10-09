import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { describe, expect, it } from "vitest";

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = `${root}/${name}`;
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("live code uses world contracts without scenario constructors", () => {
  it("no simulation, presentation or player module imports a world fixture", () => {
    const violations: string[] = [];
    for (const root of ["src/simulation", "src/presentation", "src/player"])
      for (const file of files(root)) {
        if (!/\.tsx?$/.test(file) || /\.test\.[^/]+$/.test(file)) continue;
        const text = readFileSync(file, "utf8");
        const imports = /(?:\bfrom\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;
        for (const match of text.matchAll(imports)) {
          const target = resolve(dirname(file), match[1]!);
          if (
            target.startsWith(resolve("src/scenarios") + "/") ||
            target.startsWith(resolve("tests/fixtures") + "/") ||
            /\/(?:demo(?:-jurisdiction-context)?|legislation-scenarios|portability-fixture|run-[ab]-fixture|[^/]+\.fixture)$/.test(
              target,
            )
          )
            violations.push(`${file}: ${match[1]}`);
        }
      }
    expect(violations).toEqual([]);
  });
});
