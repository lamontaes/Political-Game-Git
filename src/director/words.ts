/** Small word rules shared by the journal, conversations and scenes. */
import spokenTimeJson from "../../data/english/spoken-time.json" with { type: "json" };
import { P } from "../core2/parameters";

/**
 * A record's proper name as people write it: some federal files hold names in
 * capitals only ("CENTRAL HIGH"), which are written word by word.
 */
export function properName(text: string): string {
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

const SPOKEN_TIME = spokenTimeJson as {
  spans: readonly { maxDays?: number; text: string }[];
};

/** A month and year as people say it: "April 2016". */
export function spokenMonth(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * How long ago something happened, as people say it in passing ("the other
 * day", "a few months ago"), from the authored spans in
 * `data/english/spoken-time.json`. Nobody says a date in speech (owner, Oct
 * 15, evening).
 */
export function spokenWhen(iso: string, today: string): string {
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) /
      (P.hoursPerDay *
        P.minutesPerHour *
        P.secondsPerMinute *
        P.millisecondsPerSecond),
  );
  const spans = SPOKEN_TIME.spans;
  return (
    spans.find((span) => span.maxDays === undefined || days <= span.maxDays) ??
    spans[spans.length - P.one]!
  ).text;
}
