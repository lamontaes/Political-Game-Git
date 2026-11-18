import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Every reader uses the world's live population (family 14, owner, Nov 16: "Everything comes
 * from the simulation"). A published head count may set where the country tier opens, never
 * what a budget, an electorate, a press market or a federal share reads during play. These
 * names held a published count for the life of the world; none may come back. Readers take
 * the count from src/core2/live-population.ts.
 */
const BANNED: readonly [RegExp, string][] = [
  [
    /referencePopulation\b/,
    "the town's published count held as world metadata",
  ],
  [/usResidents2024/, "the federal government's published residents"],
  [
    /\bgov\.residents\b|\bstate\.residents\b/,
    "a government's residents held on its row",
  ],
  [/\brestOfTown\b/, "the Census remainder past the town's own people"],
];

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|json)$/.test(name) && !/\.test\.ts$/.test(name))
      out.push(path);
  }
  return out;
}

describe("live population", () => {
  it("no code reads a published head count held for the life of the world", () => {
    const found: string[] = [];
    for (const file of sources("src"))
      for (const [pattern, what] of BANNED)
        if (pattern.test(readFileSync(file, "utf8")))
          found.push(`${file}: ${what}`);
    expect(found).toEqual([]);
  });
});
