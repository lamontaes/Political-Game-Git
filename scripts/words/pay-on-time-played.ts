/**
 * The played file for a promise to pay on time, written at the head it runs
 * on (Account lead, Nov 15: the proof lives in the repository, not in a
 * reader's copy of a test). Development tooling; shipped play never imports it.
 *
 *   NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/words/pay-on-time-played.ts --out <file.md>
 *
 * (A played world outgrows node's default heap.)
 *
 * Plays the drawn borrower from the New game creator's birthday
 * (`buildBenchWorld`'s playerBirthDate) on the player's own clock, through
 * tests/support/promise-play.ts, the same flow promises.test.ts asserts:
 * the loan the credit engine writes, the missed payment and the quarrel over
 * it, the apology answered with a promise, the promise's window, and the talk
 * that brings it up. Nothing is staged or set by hand; the only choices are
 * the birthday and how many days the player plays to the quarrel. The file
 * is headed with the commit it ran at, and stops on the first check that
 * fails.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { type Check, playPayOnTime } from "../../tests/support/promise-play";

/**
 * The borrower whose talk says the payment name (data/english/payment-words.json)
 * is found by drawing places (tests/support/real-borrower.ts `findBorrower`,
 * CTO, Nov 17: never pinned): a bank loan the credit engine wrote, broken by
 * the next missed payment. No played borrower keeps it on the Train (item
 * world-loan-bill-before-first-payday-no-borrower-keeps).
 */

const stop: Check = (holds, message) => {
  if (!holds) throw new Error(message);
};

function main(): void {
  const at = process.argv.indexOf("--out");
  const out = at >= 0 ? process.argv[at + 1] : undefined;
  if (!out) throw new Error("usage: --out <file.md>");
  const head = execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  setBookkeeping(false);
  const played: string[] = [playPayOnTime(stop)];
  writeFileSync(
    out,
    `# Pay-on-time promises played at ${head}\n\nWritten by scripts/words/pay-on-time-played.ts at ${head}. Nothing is staged by hand: each loan is one the credit engine wrote, each missed payment one it billed and was not paid, on the player's own clock from the New game creator's birthday.\n\n\`\`\`\nPAY ON TIME\n  ${played.join("\n  ")}\n\`\`\`\n`,
  );
}

main();
