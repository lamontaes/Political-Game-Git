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

/** What a line needs to know to speak of someone: their recorded pronoun set, else their gender. */
export interface PronounSource {
  readonly pronouns?: string | undefined;
  readonly gender?: string | undefined;
}

/**
 * The pronoun a person is spoken of with, by their own recorded set and only
 * then by gender (owner: "avoid the pronoun or use the person's own"). "they"
 * when the record holds neither he nor she.
 */
export function pronounKeyOf(person: PronounSource): "he" | "she" | "they" {
  const lower = pronounWords(
    person.pronouns ?? pronounSetOfGender(person.gender),
  )?.lower;
  return lower === "he" || lower === "she" ? lower : "they";
}

/** Their possessive in a sentence: "his", "her", or "their" when the record holds no set. */
export function possessiveOf(person: PronounSource): string {
  return (
    pronounWords(person.pronouns ?? pronounSetOfGender(person.gender))
      ?.possessive ?? "their"
  );
}
