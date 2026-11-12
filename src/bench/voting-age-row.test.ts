// @vitest-environment node
// One fact, one row: the age of majority is the `votingAge` row in the parameter table. The bench's
// checks and its figures read it and never type their own version (pool item play-bench-reads-voting-age-row).
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { ageBandOf } from "./whole-figures";
import parameters from "../core2/data/parameters.json";

const sites = [
  "m0-check.ts",
  "m1-10-check.ts",
  "verify.mjs",
  "whole-figures.ts",
];

it("no bench check or figure types the age of majority", () => {
  for (const file of sites) {
    const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    expect(
      text.match(/(?:age|\)|\d)\s*(?:>=|<)\s*18\b/g),
      `${file} types the age of majority`,
    ).toBeNull();
  }
});

it("the teen band ends at the voting-age row", () => {
  const votingAge = parameters.votingAge.value;
  const core = { date: "2026-06-15" } as Parameters<typeof ageBandOf>[0];
  const born = (age: number) => `${2026 - age}-01-01`;
  expect(ageBandOf(core, born(votingAge - 1))).toBe("teen");
  expect(ageBandOf(core, born(votingAge))).toBe("adult");
});
