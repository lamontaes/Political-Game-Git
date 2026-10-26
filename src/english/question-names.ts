/**
 * The spoken names of the bill catalog's policy questions
 * (`data/english/question-names.json`, authored to the English engine's
 * patterns): one fixed noun phrase that reads after "about" and one verb
 * phrase that reads after "to", so a stand is said as a plain sentence. A
 * question with no name here is not offered as a stand.
 */
import data from "../../data/english/question-names.json" with { type: "json" };

const NAMES = data.names as Readonly<
  Record<string, { readonly about: string; readonly to: string }>
>;

/** The question as a noun phrase: "the bill is about {a higher minimum wage}". */
export function questionAbout(question: string): string | null {
  return NAMES[question]?.about ?? null;
}

/** The question as a verb phrase: "I want to {raise the minimum wage}". */
export function questionTo(question: string): string | null {
  return NAMES[question]?.to ?? null;
}

/** Every question that has a spoken name. */
export const NAMED_QUESTIONS: readonly string[] = Object.keys(NAMES);
