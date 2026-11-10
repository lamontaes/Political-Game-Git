/**
 * Folds the verdict files judges wrote into `data/english/judged/`.
 *
 *   npm run words:verdicts -- --from <dir>
 *
 * See `scripts/words/reply-verdicts.ts`. Folding the same directory twice
 * changes nothing. Run `npm run words:rules` after it.
 */
import { execSync } from "node:child_process";
import { bankKeys, knownPairs } from "./reply-pairs";
import { foldVerdicts, JUDGED_DIR } from "./reply-verdicts";

function main() {
  const at = process.argv.indexOf("--from");
  const from = at >= 0 ? process.argv[at + 1] : undefined;
  if (!from) throw new Error("usage: npm run words:verdicts -- --from <dir>");
  const result = foldVerdicts(from, knownPairs(), bankKeys());
  execSync(`npx prettier --write ${JUDGED_DIR}/reply-follows*.json`, {
    stdio: "ignore",
  });
  console.log(
    `Folded ${result.sheets} sheets: ${result.yes} follow, ${result.no} do not follow, ${result.dropped} dropped (a line the bank no longer has).`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
