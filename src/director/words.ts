/** Small word rules shared by the journal, conversations and scenes. */
import { P } from "../core2/parameters";

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
  if (text === text.toUpperCase()) return titled(text);
  // A record name shouted inside a longer one ("COUNTY OF WASHINGTON
  // treasury"): a run of two or more capitalized words reads as a name.
  return text.replace(/\b[A-Z][A-Z'&.]*(?:\s+[A-Z][A-Z'&.]*)+\b/g, (run) =>
    titled(run).replace(/(?<=\s)(Of|The|And|For|In|On)(?=\s)/g, (word) =>
      word.toLowerCase(),
    ),
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
