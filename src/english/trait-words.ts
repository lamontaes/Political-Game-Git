/**
 * A person's temperament as the character screen says it
 * (`data/english/trait-words.json`): one phrase for each lean of each trait,
 * the middle as what someone with no marked lean does, never one label shared
 * by every trait. Callers pass the trait and its recorded value.
 */
import data from "../../data/english/trait-words.json" with { type: "json" };

type Lean = "low" | "middle" | "high";
const WORDS = data.traits as Readonly<
  Record<string, Readonly<Record<Lean, string>>>
>;

/** The phrase for a trait's recorded value: below zero, zero or above. */
export function traitSaid(trait: string, value: number): string | undefined {
  const lean: Lean = value < 0 ? "low" : value > 0 ? "high" : "middle";
  return WORDS[trait]?.[lean];
}
