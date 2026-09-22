import type { GovernmentUnitIdentity } from "../government-units";

const LOWERCASE_WORDS = new Set(["of", "the", "and", "de", "la", "du"]);

/**
 * County-type units the Census listing names "County of Washington", "Parish
 * of St James" or "Borough of Kodiak Island", which Americans say the other
 * way round. Only county-type units: a "Borough of" in New Jersey is a town
 * and keeps its name.
 */
const COUNTY_FORMS = ["county", "parish", "borough"] as const;

/** Words the listing writes without their period. */
const ABBREVIATIONS = new Map([
  ["st", "St."],
  ["ste", "Ste."],
]);

/**
 * A government unit's name as people write it: ordinary capitals, the period
 * the listing drops from "St.", and a county called "Washington County"
 * rather than "County of Washington". No other word is added or dropped.
 *
 * Leaf module so every caller shares one rule without an import cycle.
 */
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
