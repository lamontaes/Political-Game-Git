/**
 * A school's name as people write it: the abbreviations school records hold
 * ("Sch", "El", "MS") spelled out from data/english/school-name-words.json,
 * after the name's case is set (properName). No school or place is named
 * here; the table holds word forms only.
 */
import table from "../../data/english/school-name-words.json" with { type: "json" };

const WORDS = new Map(
  Object.entries(table.words).map(([short, long]) => [
    short.toLowerCase(),
    long,
  ]),
);
const BEFORE_SCHOOL = new Map(
  Object.entries(table.onlyBeforeSchoolOrLast).map(([short, long]) => [
    short.toLowerCase(),
    long,
  ]),
);
const BEFORE_HIGH = new Map(
  Object.entries(table.onlyBeforeHigh).map(([short, long]) => [
    short.toLowerCase(),
    long,
  ]),
);
const AFTER_FIRST = new Map(
  Object.entries(table.onlyAfterFirstWord).map(([short, long]) => [
    short.toLowerCase(),
    long,
  ]),
);
const SMALL = new Set(table.lowerCaseInsideAName);
/** A whole word: not part of a longer one and not an abbreviation with its period ("Jr."). */
const WORD = /(?<![\w'.])([A-Za-z]+)(?![\w'.])/g;

export function schoolNameWords(name: string): string {
  // "School" after the general words are spelled out, so "El Sch" reads
  // "Elementary School".
  // A code after a comma is a state ("Jackson, MS"), never a school word.
  let spaced = name;
  for (const [short, long] of Object.entries(table.spacedAbbreviations))
    spaced = spaced.replace(
      new RegExp(`(?<![\\w'.])${short.replace(" ", "\\s")}(?![\\w'.])`, "g"),
      long,
    );
  const spelled = spaced.replace(
    WORD,
    (word: string, _w: string, at: number) => {
      const key = word.toLowerCase();
      if (/,\s*$/.test(spaced.slice(0, at))) return word;
      if (at > 0 && AFTER_FIRST.has(key) && spaced[at + word.length] !== "-")
        return AFTER_FIRST.get(key)!;
      if (at > 0 && SMALL.has(key)) return key;
      return WORDS.get(key) ?? word;
    },
  );
  // A district's Roman numeral after "R-" (properName leaves "R-Ii" lower case).
  const numbered = spelled.replace(
    /(?<=\bR-)(?:Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii)\b/g,
    (numeral) => numeral.toUpperCase(),
  );
  return numbered.replace(WORD, (word: string, _w: string, at: number) => {
    const after = numbered.slice(at + word.length);
    const key = word.toLowerCase();
    const beforeSchool = BEFORE_SCHOOL.get(key);
    if (beforeSchool)
      return /^\s+School\b/.test(after) || after.trim() === ""
        ? beforeSchool
        : word;
    const beforeHigh = BEFORE_HIGH.get(key);
    return beforeHigh && /^(?:[/-][A-Za-z]+)?\s+High\b/.test(after)
      ? beforeHigh
      : word;
  });
}
