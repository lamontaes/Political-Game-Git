/**
 * The spoken names of the bill catalog's policy questions
 * (`data/english/question-names.json`, authored to the English engine's
 * patterns): one fixed noun phrase that reads after "about" and one verb
 * phrase that reads after "to", so a stand is said as a plain sentence. A
 * question with no name here is not offered as a stand.
 */
import data from "../../data/english/question-names.json" with { type: "json" };
import yearData from "../../data/english/year-claims.json" with { type: "json" };
import townData from "../../data/english/town-figures.json" with { type: "json" };

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

const YEAR = yearData.claims as Readonly<
  Record<string, { readonly about: string }>
>;

/** A claim the President's address made about the country's year, as a noun phrase ("prices still going up"); null for one with no name. */
export function yearClaimAbout(claim: string): string | null {
  return YEAR[claim]?.about ?? null;
}

const TOWN = townData.figures as Readonly<Record<string, string>>;

/** A town's figure as a resident says it in passing ("more people out of work than most places"); null for one with no words. */
export function townFigureWords(figure: string): string | null {
  return TOWN[figure] ?? null;
}
