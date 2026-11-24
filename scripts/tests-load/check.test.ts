// Tests for the pure parts of `npm run tests:load`: which imports it reads, how
// it resolves them, and what counts as a test call.
import { describe, expect, it } from "vitest";
import { hasTests, importSpecifiers, resolveSpecifier } from "./check";

describe("importSpecifiers", () => {
  it("reads runtime imports in order, across lines, and skips type-only ones", () => {
    const src = [
      'import { it } from "vitest";',
      'import type { A } from "./types";',
      "import {",
      "  b,",
      "  c,",
      '} from "../modules/views";',
      'import "./side-effect";',
      'import data from "./data.json" with { type: "json" };',
      'const x = "import y from ./not-an-import";',
    ].join("\n");
    expect(importSpecifiers(src)).toEqual([
      "vitest",
      "../modules/views",
      "./side-effect",
      "./data.json",
    ]);
  });
});

describe("resolveSpecifier", () => {
  it("resolves a relative file without its extension, and leaves package names alone", () => {
    expect(
      resolveSpecifier(`${process.cwd()}/scripts/tests-load/x.ts`, "./check"),
    ).toMatch(/scripts\/tests-load\/check\.ts$/);
    expect(resolveSpecifier("scripts/tests-load/x.ts", "vitest")).toBeNull();
    expect(
      resolveSpecifier("scripts/tests-load/x.ts", "./missing-file"),
    ).toBeNull();
  });
});

describe("hasTests", () => {
  it("finds it, test, and their each, skip and only forms; an empty shell has none", () => {
    expect(hasTests('describe("a", () => { it("b", () => {}); });')).toBe(true);
    expect(hasTests('test("b", () => {});')).toBe(true);
    expect(hasTests("it.each([1])('x', () => {});")).toBe(true);
    expect(hasTests('describe("a", () => { const bit = 1; });')).toBe(false);
    expect(hasTests('import { it } from "vitest";')).toBe(false);
  });
});
