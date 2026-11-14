/**
 * A public contract award as people say it: "the road contract", by the
 * spending line it pays from (data/english/contract-words.json). A line with
 * no word there is said as "the contract": a budget heading ("elementary and
 * secondary education") is never said (Words lead, Nov 14). Every line the
 * contracts engine buys work on has a word (contract-words.test.ts).
 */
import data from "../../data/english/contract-words.json" with { type: "json" };

const WORK = data.work as Readonly<Record<string, string>>;

/** The contract for a spending line, with its article. */
export function contractSaid(line: string): string {
  const work = WORK[line];
  return work ? `the ${work} contract` : "the contract";
}
