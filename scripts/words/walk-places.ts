import { spawnSync } from "node:child_process";

/**
 * A walk plays one drawn place. A place without what the walk needs is passed over by name and the next
 * place is drawn (drawn-place-tests: draw until the case holds, name each place passed over); the seed
 * and every place passed over are printed, so a run replays. Attempt 0 draws exactly the place the walk
 * always drew. Each place runs in its own process, so a passed-over world's memory is freed before the
 * next is built.
 */
export const PASS_OVER = 3;

export interface WalkPlaces {
  /** The draw label for this run: the label itself for attempt 0, then `label:n`. */
  readonly drawLabel: string;
  /** Print the place passed over and its reason, then end this run so the driver draws the next place. */
  passOver(where: string, reason: string): never;
}

/**
 * Called first in a walk. In the driver process it runs the walk once per place (up to `--attempts`,
 * default 12) until one is not passed over, then exits; in a child (`--child`) it returns that child's place.
 */
export function walkPlaces(
  option: (name: string, fallback: string) => string,
  label: string,
): WalkPlaces {
  const attempt = Number(option("attempt", "0"));
  const attempts = Number(option("attempts", "12"));
  if (!process.argv.includes("--child")) {
    const args = process.argv.slice(2);
    for (let n = 0; n < attempts; n += 1) {
      const run = spawnSync(
        process.execPath,
        [
          ...process.execArgv,
          process.argv[1]!,
          ...args,
          "--child",
          "--attempt",
          String(n),
        ],
        { stdio: "inherit" },
      );
      if (run.status !== PASS_OVER) process.exit(run.status ?? 1);
    }
    console.log(`SKIP: none of ${attempts} drawn places had it`);
    process.exit(0);
  }
  return {
    drawLabel: attempt ? `${label}:${attempt}` : label,
    passOver(where, reason) {
      console.log(`# PASSED OVER ${where}: ${reason}`);
      process.exit(PASS_OVER);
    },
  };
}
