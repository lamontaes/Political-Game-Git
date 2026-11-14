/**
 * Folds reviewers' verdict files into the one store (`data/english/judged/`).
 *
 *   npm run words:verdicts -- --from <dir>   fold every reviewer file in <dir>
 *   npm run words:verdicts                   only drop verdicts that no longer apply
 *
 * See `scripts/words/verdicts.ts`. Folding the same directory twice changes
 * nothing. Run `npm run words:rules` after it.
 */
import { execSync } from "node:child_process";
import { knownPairs, pathsOf } from "./reply-pairs";
import {
  exchangePairs,
  readBankPieces,
  readLedger,
  readRules,
} from "./run-rules";
import { foldVerdicts } from "./verdicts";

function main() {
  const at = process.argv.indexOf("--from");
  const from = at >= 0 ? process.argv[at + 1] : undefined;
  if (at >= 0 && !from)
    throw new Error("usage: npm run words:verdicts -- --from <dir>");
  const result = foldVerdicts(from, readRules(), {
    pieces: readBankPieces(),
    ledger: readLedger(),
    pairs: knownPairs,
    exchangePairs,
    paths: pathsOf,
  });
  if (result.written.length)
    execSync(
      `npx prettier --write ${result.written.filter((f) => f.endsWith(".json")).join(" ")}`,
      { stdio: "ignore" },
    );
  console.log(`Folded ${result.sheets} reviewer files.`);
  for (const [rule, count] of Object.entries(result.perRule))
    console.log(
      `- ${rule}: ${count.yes} judged good, ${count.no} judged bad, ${count.dropped} dropped (a line the bank no longer holds in those words).`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
