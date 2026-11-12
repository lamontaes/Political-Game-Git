/**
 * A person's recorded pronoun set as the words a third-person line fills
 * (`data/english/pronoun-words.json`). Null for a set said with the they
 * form of a line (they-them, or none recorded).
 */
import data from "../../data/english/pronoun-words.json" with { type: "json" };

export type PronounWords = Readonly<
  Record<"subject" | "lower" | "object" | "reflexive" | "possessive", string>
>;

const SETS = data.sets as Readonly<Record<string, PronounWords>>;
const BY_GENDER = data.byGender as Readonly<Record<string, string>>;

export function pronounWords(set: string | undefined): PronounWords | null {
  return (set && SETS[set]) || null;
}

/** The pronoun set for someone with only a recorded gender; undefined for the they form. */
export function pronounSetOfGender(
  gender: string | undefined,
): string | undefined {
  return gender ? BY_GENDER[gender] : undefined;
}
