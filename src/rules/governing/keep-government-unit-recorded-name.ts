// Lifted unchanged from src/simulation/nationwide-world/government-unit-names.ts; RULES-3, 2026-10-11.
import type { GovernmentUnitIdentity } from "../../simulation/government-units";

export const LOWERCASE_WORDS = new Set(["of", "the", "and", "de", "la", "du"]);

export function governmentUnitRecordedName(
  unit: Pick<GovernmentUnitIdentity, "name">,
): string {
  return unit.name
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : word.replace(
            /(^|[-'(])([a-z])/g,
            (_, lead: string, letter: string) =>
              `${lead}${letter.toUpperCase()}`,
          ),
    )
    .join(" ");
}
