import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface StopgapEntry {
  readonly id: string;
  readonly file: string;
  readonly line: number;
}

const files = [
  "parameters.ts",
  "town-pay.ts",
  "home-price-levels.ts",
  "bank-credit.ts",
  "town-employment-mix.ts",
  "quarterly-pay.ts",
].map((name) => new URL(`./${name}`, import.meta.url));
const registry = JSON.parse(
  readFileSync(new URL("./stopgaps.json", import.meta.url), "utf8"),
) as readonly StopgapEntry[];

describe("economy stopgap registry", () => {
  it("has a unique registry entry for every in-code marker and vice versa", () => {
    const registeredIds = registry.map((entry) => entry.id);
    expect(new Set(registeredIds).size).toBe(registeredIds.length);

    const markedIds = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return Array.from(
        source.matchAll(/(?:STOPGAP:\s*|stopgapId:\s*")([\w.-]+)/g),
        (match) => match[1]!,
      );
    });
    expect(new Set(markedIds)).toEqual(new Set(registeredIds));
  });

  it("records a code location for each stopgap", () => {
    expect(registry.length).toBeGreaterThan(0);
    for (const entry of registry) {
      expect(entry.file).toMatch(/^src\/rules\/economy\//);
      expect(entry.line).toBeGreaterThan(0);
      const file = readFileSync(
        new URL(`../../../${entry.file}`, import.meta.url),
        "utf8",
      );
      expect(file.split("\n")[entry.line - 1]).toContain(entry.id);
    }
  });
});
