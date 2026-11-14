/**
 * A public contract award as people say it: "the road contract", by the
 * spending line it pays from (data/english/contract-words.json), else by the
 * line's budget name ("the parks and recreation contract"), else nothing.
 */
import data from "../../data/english/contract-words.json" with { type: "json" };
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };

const WORK = data.work as Readonly<Record<string, string>>;
const NAMES = lineNames.lines as Readonly<
  Record<string, { readonly name: string } | undefined>
>;

/** The contract for a spending line, with its article, or null when the line has no name. */
export function contractSaid(line: string): string | null {
  const work =
    WORK[line] ??
    (NAMES[line]?.name
      ? NAMES[line]!.name.charAt(0).toLowerCase() + NAMES[line]!.name.slice(1)
      : null);
  return work ? `the ${work} contract` : null;
}
