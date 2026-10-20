/**
 * Golden path step 11 (the next election uses the record) from the headless
 * path check: a resident officeholder's bill takes effect, the seat's next
 * election comes, and a voter's ballot names the bill's vote as a reason.
 * The run lives years of game time, so it runs only with
 * GOLDEN_PATH_TO_NEXT_ELECTION=1 (about 15 minutes); the place is the one the
 * seed draws from all 56, named in the output. Where the incumbent does not
 * stand again, the path stops at step 10 and the test says so.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it.skipIf(process.env.GOLDEN_PATH_TO_NEXT_ELECTION !== "1")(
  "the next election weighs the officeholder's vote on their law",
  () => {
    const run = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/bench/path-check.ts"],
      {
        env: { ...process.env, GOLDEN_PATH_SEED: seed },
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const line = run.stdout
      .split("\n")
      .find((l) => l.startsWith("path-check:"));
    expect(line, `seed ${seed}: ${run.stderr.slice(-400)}`).toBeDefined();
    const furthest = Number(/furthest (\d+)/.exec(line!)?.[1]);
    expect(furthest, `seed ${seed}: ${line}`).toBeGreaterThanOrEqual(10);
    if (furthest === 11)
      expect(line, `seed ${seed}`).toMatch(
        /step 11: ballot ballot:\S+ weighed vote:\S+/,
      );
  },
  3_600_000,
);
