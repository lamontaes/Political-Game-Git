/** Small word rules shared by the journal, conversations and scenes. */
import schoolNamesJson from "./data/school-names.json" with { type: "json" };
import { P } from "../core2/parameters";

/**
 * A record's proper name as people write it: some federal files hold names in
 * capitals only ("CENTRAL HIGH"), which are written word by word.
 */
export function properName(text: string): string {
  if (text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(
      /(^|[\s\-/(])([a-z])/g,
      (_all, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`,
    );
}

interface SchoolNameRules {
  /** A numbered school's prefix ("PS 123" is P.S. 123). */
  numbered: readonly { word: string; said: string }[];
  /** Words kept lowercase inside a name. */
  minorWords: readonly string[];
  endings: readonly { words: readonly string[]; said: string }[];
  before: readonly { word: string; next: readonly string[]; said: string }[];
}
const SCHOOL_NAMES = schoolNamesJson as unknown as SchoolNameRules;

/**
 * A school's directory name as people say it: abbreviations expanded where
 * they end the name or come before the word that confirms them ("Kennedy
 * Elem" is Kennedy Elementary; "El Dorado High" keeps "El"), then in
 * proper case.
 */
export function schoolName(text: string): string {
  const words = text.trim().split(/\s+/);
  const key = (word: string) => word.replace(/\.$/, "").toUpperCase();
  for (const rule of SCHOOL_NAMES.endings) {
    const tail = words.slice(-rule.words.length).map(key);
    if (
      words.length > rule.words.length &&
      tail.join(" ") === rule.words.join(" ")
    ) {
      words.splice(-rule.words.length, rule.words.length, rule.said);
      break;
    }
  }
  for (let at = P.zero; at < words.length - P.one; at += P.one) {
    const rule = SCHOOL_NAMES.before.find(
      (row) =>
        row.word === key(words[at]!) &&
        row.next.includes(key(words[at + P.one]!)),
    );
    if (rule) words[at] = rule.said;
  }
  // A numbered school keeps its prefix: "PS 123" is P.S. 123.
  const numbered = SCHOOL_NAMES.numbered.find(
    (row) =>
      row.word === key(words[P.zero] ?? "") && /^\d/.test(words[P.one] ?? ""),
  );
  if (numbered) words[P.zero] = numbered.said;
  const joined = words.join(" ");
  // A name held in capitals is said in proper case, expanded words included.
  const said =
    text === text.toUpperCase() ? properName(joined.toUpperCase()) : joined;
  // Small words stay lowercase inside a name ("Academy of Science"), and a
  // numbered prefix keeps its capitals.
  return said
    .split(" ")
    .map((word, index) =>
      index > P.zero && SCHOOL_NAMES.minorWords.includes(word.toLowerCase())
        ? word.toLowerCase()
        : numbered && index === P.zero
          ? numbered.said
          : word,
    )
    .join(" ");
}

/** How a resident says a town aloud: without the state it sits in. */
export function spoken(place: {
  displayName: string;
  withinName: string | null;
}): string {
  const suffix = place.withinName ? `, ${place.withinName}` : "";
  return suffix && place.displayName.endsWith(suffix)
    ? place.displayName.slice(P.zero, -suffix.length)
    : place.displayName;
}

/** The possessive of a name: "Chen's", "Chandler Builders'". */
export function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/** A date as people say it: the year only when it is not this year. */
export function spokenDate(iso: string, today: string): string {
  const sameYear =
    iso.slice(P.zero, iso.indexOf("-")) ===
    today.slice(P.zero, today.indexOf("-"));
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
    timeZone: "UTC",
  });
}

/** A month and year as people say it: "April 2016". */
export function spokenMonth(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * When something happened, as people say it in passing: "today",
 * "yesterday", or "on March 3" (with the year only when it differs).
 */
export function spokenWhen(iso: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) /
      (P.hoursPerDay *
        P.minutesPerHour *
        P.secondsPerMinute *
        P.millisecondsPerSecond),
  );
  if (days === P.zero) return "today";
  if (days === P.one) return "yesterday";
  return `on ${spokenDate(iso, today)}`;
}
