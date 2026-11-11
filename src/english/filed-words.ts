/**
 * How many others have filed for an office, as a clerk says it ("two other
 * candidates"), from the words in `data/english/filed-words.json`. The
 * director passes the count from the elections engine's filings.
 */
import data from "../../data/english/filed-words.json" with { type: "json" };
import { P } from "../core2/parameters";

/** The others who filed, with their noun; empty for none. */
export function filedSaid(count: number): string {
  if (count < P.one) return "";
  return data.others[count - P.one] ?? data.many;
}
