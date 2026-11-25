/**
 * Where a person works, and which school they went to, as people say it in
 * passing (`data/english/workplace-words.json`): "the clinic", "work",
 * "Long Hill", "school", never the full name every line (Story lead, Nov 18).
 */
import data from "../../data/english/workplace-words.json" with { type: "json" };

const WORDS = data.words as Readonly<Record<string, string>>;
const BY_LENGTH = Object.keys(WORDS).sort((a, b) => b.length - a.length);

/** The employer as a common noun with its article, from the organization's classification; "work" where none matches. */
export function workplaceSaid(classification: string | undefined): string {
  const key = BY_LENGTH.find((prefix) =>
    (classification ?? "").startsWith(prefix),
  );
  return key ? WORDS[key]! : data.default;
}

/** A school as people at home say it: its name without its kind ("Long Hill"), or "school" when the name holds nothing else. */
export function schoolShortSaid(name: string): string {
  for (const kind of data.schoolKinds) {
    if (
      name.length > kind.length &&
      name.toLowerCase().endsWith(` ${kind.toLowerCase()}`)
    )
      return name.slice(0, name.length - kind.length - 1).trim() || "school";
    if (name.toLowerCase() === kind.toLowerCase()) return "school";
  }
  return name;
}
