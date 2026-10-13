/**
 * The played world, alive (PW-1): builds the world the owner plays on a seed
 * drawn from the commit and this test's id, runs it one game year with no
 * character controlled, and asserts each lettered check from
 * `src/bench/played-world-check.ts`. A check that fails today is `it.fails`
 * with the package that owns the fix in its name, so the suite stays green
 * and the failing list stays visible; when that package lands, its letter
 * passes, `it.fails` turns red, and the package removes the letter from
 * EXPECTED_FAILURES.
 */
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "./place";
import {
  CHECK_OWNERS,
  CHECK_TITLES,
  EXPECTED_FAILURES,
  checkPlayedWorld,
  runPlayedWorld,
  type CheckResult,
} from "../../src/bench/played-world-check";
import { setBookkeeping } from "../../src/core2/bookkeeping";

const SPEC_ID = "PW-01";
/** A build and a year take about two and a half minutes; the bound is the PR budget. */
const RUN_TIMEOUT_MILLISECONDS = 600_000;

function commit(): string {
  if (process.env.GOLDEN_PATH_COMMIT) return process.env.GOLDEN_PATH_COMMIT;
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

const seed =
  process.env.PLAYED_WORLD_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  drawPlace(commit(), SPEC_ID).seed;

describe(`the played world for a year (seed ${seed})`, () => {
  const results = new Map<string, CheckResult>();
  beforeAll(async () => {
    // Play runs without the debug bookkeeping (AGENTS.md, "Keep it simple").
    const previous = setBookkeeping(false);
    try {
      const world = runPlayedWorld(seed);
      console.log(
        `played world: ${world.place.name}, ${world.place.state} (place ${world.place.key}), seed ${seed}; build ${world.buildSeconds.toFixed(0)} s, year ${world.runSeconds.toFixed(0)} s`,
      );
      for (const row of await checkPlayedWorld(world)) {
        results.set(row.letter, row);
        console.log(
          `${row.letter} ${row.pass ? "PASS" : "FAIL"}: ${row.detail}${row.records.length ? ` [${row.records.join(", ")}]` : ""}`,
        );
      }
    } finally {
      setBookkeeping(previous);
    }
  }, RUN_TIMEOUT_MILLISECONDS);

  for (const letter of Object.keys(CHECK_TITLES)) {
    const owner = EXPECTED_FAILURES[letter];
    const title = `${letter}: ${CHECK_TITLES[letter]} (${CHECK_OWNERS[letter]})`;
    const assertion = () => {
      const row = results.get(letter);
      expect(row, `check ${letter} did not run`).toBeDefined();
      expect(row!.pass, row!.detail).toBe(true);
    };
    if (owner) it.fails(`${title} [expected failure; ${owner}]`, assertion);
    else it(title, assertion);
  }
});
