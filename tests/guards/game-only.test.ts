import { describe, expect, it } from "vitest";
import {
  gameOnlyFinding,
  gameOnlyFindings,
} from "../../scripts/guards/game-only";

/**
 * The game folder holds only the game (owner, Nov 26: "if I were to download
 * a game online and I were to open the folder and look at all the files, it
 * should just be the game stuff"). A test file, or a file that imports a test
 * runner, belongs under tests/, never under src/, public/ or art/.
 */
describe("the game folder holds only game code", () => {
  it("holds no test file and no file that imports a test runner", () => {
    expect(
      gameOnlyFindings().map(({ file, reason }) => `${file}: ${reason}`),
    ).toEqual([]);
  });

  it("refuses each way a test can land in the game tree", () => {
    const none = () => "";
    for (const file of [
      "src/core2/a.test.ts",
      "src/core2/a.spec.ts",
      "src/bench/a.browser.mjs",
      "src/bench/a.test.mjs",
      "src/bench/a.node-test.mjs",
      "public/a.test.js",
      "art/a.test.mjs",
      "src/core2/__snapshots__/a.snap",
      "src/core2/__tests__/helper.ts",
    ])
      expect(gameOnlyFinding(file, none), file).not.toBeNull();
    for (const code of [
      'import { expect } from "vitest";',
      "import { test } from 'node:test';",
      'const { it } = require("vitest");',
      'await import("vitest");',
    ])
      expect(
        gameOnlyFinding("src/core2/kit.ts", () => code),
        code,
      ).not.toBeNull();
  });

  it("leaves game code and the workshop alone", () => {
    const vitest = () => 'import { expect } from "vitest";';
    expect(
      gameOnlyFinding("src/core2/engine.ts", () => "export {};"),
    ).toBeNull();
    expect(
      gameOnlyFinding(
        "src/core2/engine.ts",
        () => 'const vitestRate = "vitest";',
      ),
    ).toBeNull();
    expect(gameOnlyFinding("tests/src/core2/a.test.ts", vitest)).toBeNull();
    expect(gameOnlyFinding("tests/support/kit.ts", vitest)).toBeNull();
    expect(gameOnlyFinding("scripts/a.test.ts", vitest)).toBeNull();
  });
});
