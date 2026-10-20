/**
 * Did the last run end badly? The shell writes a marker file when the game
 * starts and removes it on a clean quit; a marker still there at the next
 * start means the game did not quit cleanly, and the player is offered the
 * bug report (shown first, sent only when they press save). The marker is a
 * file in the app's own data folder holding the start time and nothing else.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const MARKER = "running.marker";

/** At start: whether the last run left its marker, then a fresh marker for this run. */
export function takePreviousCrash(dir, now = new Date()) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, MARKER);
  const crashed = existsSync(file);
  writeFileSync(file, `${now.toISOString()}\n`);
  return crashed;
}

/** On a clean quit: the run ended as it should. */
export function markCleanQuit(dir) {
  rmSync(path.join(dir, MARKER), { force: true });
}
