import assert from "node:assert/strict";
import { test } from "node:test";
import { gameOnlyFindings } from "./game-only";

test("game-only checks the three runtime roots and leaves workshop files alone", () => {
  assert.equal(gameOnlyFindings("src/engine.test.ts", () => "").length, 1);
  assert.equal(gameOnlyFindings("public/run.browser.mjs", () => "").length, 1);
  assert.equal(gameOnlyFindings("art/README.md", () => "").length, 1);
  assert.deepEqual(
    gameOnlyFindings("tests/engine.test.ts", () => ""),
    [],
  );
});

test("game-only reports real comment attributions, not strings or stopgap markers", () => {
  const contents = [
    "const words = `// Owner: text, 2026-11-10`;",
    "// SG-WORLD-TEST-001: record why the world opened.",
    "const value = 1; // PR #1234",
    "/** owner, Nov 10: use the first value. */",
    "export { value };",
  ].join("\n");
  assert.deepEqual(
    gameOnlyFindings("src/example.ts", () => contents),
    [
      "src/example.ts:3: dated note or attribution belongs outside game code",
      "src/example.ts:4: dated note or attribution belongs outside game code",
    ],
  );
});
