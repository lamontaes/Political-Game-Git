/**
 * A person's recorded pronoun set as the words a third-person line fills
 * (`data/english/pronoun-words.json`). Null for a set said with the they
 * form of a line (they-them, or none recorded).
 */
import data from "../../data/english/pronoun-words.json" with { type: "json" };

export type PronounWords = Readonly<
  Record<"subject" | "lower" | "object" | "reflexive", string>
>;

const SETS = data.sets as Readonly<Record<string, PronounWords>>;

export function pronounWords(set: string | undefined): PronounWords | null {
  return (set && SETS[set]) || null;
}
