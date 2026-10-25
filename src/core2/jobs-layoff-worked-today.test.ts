/**
 * Pool item jobs-layoff-worked-today: the player plays their own day before
 * the calendar runs, so the employer review could choose to lay off someone
 * who had already worked today, and ending that job stopped the game ("A job
 * ends before its day's work, from calendar work"). The business now makes
 * the same choice at the next review, before that day's work. Medicine Lake,
 * Montana is the M0-03 draw where it stopped; M0-03 plays a controlled
 * character through the calendar skip, which is the path that reached it.
 */
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

const PLACE = {
  seed: "f1581305148c217d80a6ee5f927e879713d25c27409cce441aa7c94ed61c5d95",
  key: "3048775",
  name: "Medicine Lake, Montana",
};

it("a controlled character's skip runs past a layoff review without ending a job worked today", () => {
  const out = execFileSync(
    process.execPath,
    [
      "--max-old-space-size=8192",
      "--import",
      "tsx",
      "src/bench/m0-check.ts",
      "M0-03",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GOLDEN_PATH_SEED: PLACE.seed,
        GOLDEN_PATH_PLACE_KEY: PLACE.key,
      },
      timeout: 600_000,
      encoding: "utf8",
      maxBuffer: 1 << 24,
    },
  );
  expect(out, `${PLACE.name} (${PLACE.key}) seed ${PLACE.seed}`).toContain(
    "M0-03 passed",
  );
}, 700_000);
