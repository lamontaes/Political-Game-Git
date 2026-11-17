/**
 * The played file for a promise to pay on time, written at the head it runs
 * on (Account lead, Nov 15: the proof lives in the repository, not in a
 * reader's copy of a test). Development tooling; shipped play never imports it.
 *
 *   NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/words/pay-on-time-played.ts --out <file.md>
 *
 * (A played world outgrows node's default heap.)
 *
 * Draws places (`GOLDEN_PATH_SEED` replays a run) and plays the first where
 * the credit engine's own missed payment and the partnerships engine's own
 * quarrel name a borrower and a promise to pay on time is broken and said,
 * through tests/support/promise-play.ts, the same flow promises.test.ts
 * asserts. Only each borrower's choice to promise is staged, and labeled in
 * that file. The file is headed with the commit it ran at, and stops on the
 * first check that fails.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { type Check, playPayOnTime } from "../../tests/support/promise-play";
import { LOAN_SEED, findTownBorrower } from "../../tests/support/real-borrower";

const stop: Check = (holds, message) => {
  if (!holds) throw new Error(message);
};

function main(): void {
  const at = process.argv.indexOf("--out");
  const out = at >= 0 ? process.argv[at + 1] : undefined;
  if (!out) throw new Error("usage: --out <file.md>");
  const head = execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  setBookkeeping(false);
  const passedOver: string[] = [];
  let from = 0;
  for (;;) {
    const found = findTownBorrower(from, passedOver);
    const result = playPayOnTime(found, stop);
    if (result.played) {
      writeFileSync(
        out,
        `# Pay-on-time promises played at ${head}\n\nWritten by scripts/words/pay-on-time-played.ts at ${head}, seed ${LOAN_SEED}. Each loan is one the credit engine wrote and each missed payment one it billed and was not paid; only each borrower's choice to promise is staged by hand. Places passed over: ${passedOver.join("; ") || "none"}.\n\n\`\`\`\nPAY ON TIME\n  ${result.passed}\n  ${result.played}\n\`\`\`\n`,
      );
      return;
    }
    passedOver.push(result.passed);
    from = found.nextDraw;
  }
}

main();
