/**
 * The golden path is one life: the person who turned 18 files, campaigns,
 * wins or loses and tries again, and then, as the winner, proposes the bill.
 * The headless check (src/bench/path-check.ts) never switches to a seated
 * official, and it prints the one player id it played as. Run with
 *   node --max-old-space-size=8192 --import tsx tests/golden-path/one-life.node-test.ts
 * The place is the one the seed draws from all 56 (GOLDEN_PATH_SEED fixes it).
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`the golden path is one life (seed ${seed})`, () => {
  it("never selects another person after the player is chosen", () => {
    const source = readFileSync("src/bench/path-check.ts", "utf8");
    const selects = source.match(/player\.select\(/g) ?? [];
    assert.equal(selects.length, 1, "path-check selects the player once");
    assert.match(source, /player\.select\(me\)/);
  });

  it("plays as one player id from the filing to the last step it reaches", () => {
    const run = spawnSync(
      process.execPath,
      [
        "--max-old-space-size=8192",
        "--import",
        "tsx",
        "src/bench/path-check.ts",
      ],
      {
        env: { ...process.env, GOLDEN_PATH_SEED: seed },
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const line = run.stdout
      .split("\n")
      .find((l) => l.startsWith("path-check:"));
    assert.ok(line, `seed ${seed}: ${run.stderr.slice(-400)}`);
    // The player never changes; a place with no contest an 18-year-old can
    // enter still plays as one person and says where it stopped.
    assert.match(line, /one life: person_\w+/, `seed ${seed}: ${line}`);
    assert.doesNotMatch(line, /the player changed/, `seed ${seed}: ${line}`);
  });
});
