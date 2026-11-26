import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import baseline from "./duplicate-exports-baseline.json";
import { duplicateExports, repositoryDuplicates } from "./duplicate-exports";

describe("one exported helper across engine families", () => {
  it("refuses new copies and drops exceptions when the copies are gone", () => {
    const current = repositoryDuplicates(path.resolve(__dirname, "../.."));
    const known = new Set<string>(baseline);
    // The change guard measures baseline lines. Keep exactly one row per line.
    expect(
      readFileSync(
        path.join(__dirname, "duplicate-exports-baseline.json"),
        "utf8",
      ),
    ).toBe(JSON.stringify([...known].sort(), null, 2) + "\n");
    expect(
      current.filter((pair) => !known.has(pair)),
      "Import the shared helper instead of defining another copy.",
    ).toEqual([]);
    const present = new Set(current);
    expect(
      [...known].filter((pair) => !present.has(pair)),
      "Remove obsolete pairs from duplicate-exports-baseline.json.",
    ).toEqual([]);
  });

  it("reports the two definitions across families but ignores a re-export", () => {
    const elections = "src/core2/modules/elections.ts";
    const screens = "src/bench/duplicate-helper.ts";
    const source = {
      file: elections,
      text: "export function helper(value: number) { return value + 1; }",
    };
    const copies = duplicateExports([
      source,
      {
        file: screens,
        text: "const local = (value: number) => { /* comment */ return value + 1; }; export { local as helper };",
      },
      {
        file: "src/bench/reuse.ts",
        text: 'export { helper } from "../core2/modules/elections";',
      },
    ]);
    expect(copies).toEqual([
      expect.stringMatching(
        new RegExp(`^helper [a-f0-9]{64} ${screens} ${elections}$`),
      ),
    ]);
  });

  it("does not report different bodies or pairs in the same family", () => {
    expect(
      duplicateExports([
        {
          file: "src/bench/a.ts",
          text: "export const helper = () => 'text a';",
        },
        {
          file: "src/bench/b.ts",
          text: "export const helper = () => 'text a';",
        },
        {
          file: "src/core2/modules/elections.ts",
          text: "export const helper = () => 'text  a';",
        },
      ]),
    ).toEqual([]);
  });
});
