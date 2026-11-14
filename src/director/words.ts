/** Small word rules shared by the journal, conversations and scenes. */
import { governmentProperName } from "../core2/government-proper-name";
import { P } from "../core2/parameters";
import SPOKEN_WHEN from "./data/spoken-when.json" with { type: "json" };

/**
 * A broadcast call sign with its band suffix: four letters starting with K or
 * W, then -TV, -FM, -AM, -DT, -LP or -CD (47 CFR 73.3550). It stays in capitals.
 */
const CALL_SIGN = /^[KW][A-Z]{2,3}-(?:TV|FM|AM|DT|LP|CD)$/;

/**
 * A record's proper name as people write it: some federal files hold names in
 * capitals only ("CENTRAL HIGH"), which are written word by word.
 */
export function properName(text: string): string {
  if (CALL_SIGN.test(text)) return text;
  const titled = (run: string) =>
    run
      .toLowerCase()
      .replace(
        /(^|[\s\-/(])([a-z])/g,
        (_all, lead: string, letter: string) =>
          `${lead}${letter.toUpperCase()}`,
      );
  // "of", "the", "and" stay small inside a name ("County of Carbon").
  const small = (run: string) =>
    run.replace(/(?<=\s)(Of|The|And|For|In|On)(?=\s)/g, (word) =>
      word.toLowerCase(),
    );
  if (text === text.toUpperCase()) return small(titled(text));
  // A record name shouted inside a longer one ("COUNTY OF WASHINGTON
  // treasury"): a run of two or more capitalized words reads as a name.
  return text.replace(/\b[A-Z][A-Z'&.]*(?:\s+[A-Z][A-Z'&.]*)+\b/g, (run) =>
    small(titled(run)),
  );
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

/**
 * A state's or territory's name as a sentence says it: a plural name or a
 * district takes its article ("the U.S. Virgin Islands", "the District of
 * Columbia"); every other name stands alone ("Ohio", "Guam").
 */
export function stateInSentence(name: string): string {
  return /Islands$|^District of /.test(name) ? `the ${name}` : name;
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

/**
 * How long ago something happened, as people say it in passing ("yesterday",
 * "last week", "a few weeks ago"), never as a calendar date. The wording is
 * the row of `src/director/data/spoken-when.json` that covers the gap.
 */
export function spokenWhen(iso: string, today: string): string {
  return spokenWhenRow(iso, today).said;
}

/** The row of `./data/spoken-when.json` that covers the gap: its words, how long a gap it is, and whether it reads after "since". */
export function spokenWhenRow(
  iso: string,
  today: string,
): { said: string; gap: string; since: boolean } {
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) /
      (P.hoursPerDay *
        P.minutesPerHour *
        P.secondsPerMinute *
        P.millisecondsPerSecond),
  );
  return (
    SPOKEN_WHEN.rows.find((r) => days <= r.upToDays) ??
    SPOKEN_WHEN.rows[SPOKEN_WHEN.rows.length - P.one]!
  );
}

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
/** A count as people say it in a sentence: "nine" up to ten, the figure above. */
export const numberWord = (count: number): string =>
  NUMBER_WORDS[count] ?? String(count);

/**
 * An organization's name as people say it: a government's by its place
 * record's proper name ("McDowell County", "Town of Smithtown treasury"),
 * since the recorded name keeps the listing's capitals as its identity;
 * anyone else's by `properName`.
 */
export function organizationName(org: {
  readonly name: string;
  readonly governmentFacts?: Readonly<Record<string, unknown>>;
}): string {
  const key = org.governmentFacts?.governmentKey;
  if (typeof key !== "string") return properName(org.name);
  const treasury = /\s+treasury$/i.exec(org.name);
  const government = treasury
    ? org.name.slice(P.zero, treasury.index)
    : org.name;
  return `${governmentProperName(government, key)}${treasury ? " treasury" : ""}`;
}
