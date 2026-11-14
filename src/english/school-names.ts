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
/** A whole word: not part of a longer one and not an abbreviation with its period ("Jr."). */
const WORD = /(?<![\w'.])([A-Za-z]+)(?![\w'.])/g;

export function schoolNameWords(name: string): string {
  // "School" after the general words are spelled out, so "El Sch" reads
  // "Elementary School".
  // A code after a comma is a state ("Jackson, MS"), never a school word.
  const spelled = name.replace(WORD, (word: string, _w: string, at: number) =>
    /,\s*$/.test(name.slice(0, at))
      ? word
      : (WORDS.get(word.toLowerCase()) ?? word),
  );
  return spelled.replace(WORD, (word: string, _w: string, at: number) => {
    const after = spelled.slice(at + word.length);
    const key = word.toLowerCase();
    const beforeSchool = BEFORE_SCHOOL.get(key);
    if (beforeSchool)
      return /^\s+School\b/.test(after) || after.trim() === ""
        ? beforeSchool
        : word;
    const beforeHigh = BEFORE_HIGH.get(key);
    return beforeHigh && /^\s+High\b/.test(after) ? beforeHigh : word;
  });
}
