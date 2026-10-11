// Lifted unchanged from src/simulation/nationwide-world/government-unit-names.ts; RULES-3, 2026-10-11.
import type { GovernmentUnitIdentity } from "../../simulation/government-units";

export const LOWERCASE_WORDS = new Set(["of", "the", "and", "de", "la", "du"]);

export const COUNTY_FORMS = ["county", "parish", "borough"] as const;

export const ABBREVIATIONS = new Map([
  ["st", "St."],
  ["ste", "Ste."],
]);

export function governmentUnitDisplayName(
  unit: Pick<GovernmentUnitIdentity, "name" | "unitType">,
): string {
  const words = unit.name
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word, index, all) =>
      index > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : index < all.length - 1 && ABBREVIATIONS.has(word)
          ? ABBREVIATIONS.get(word)!
          : word.replace(
              /(^|[-'(])([a-z])/g,
              (_, lead: string, letter: string) =>
                `${lead}${letter.toUpperCase()}`,
            ),
    );
  const form = words[0]?.toLowerCase();
  if (
    unit.unitType === "county" &&
    words[1] === "of" &&
    words.length > 2 &&
    COUNTY_FORMS.some((candidate) => candidate === form)
  )
    return [...words.slice(2), words[0]!].join(" ");
  return words.join(" ");
}
