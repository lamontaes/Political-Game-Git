import { agreeVerb, personPronouns } from "../simulation/person-identity";
import type { IsoDate, Person } from "../simulation";
import { proseDate } from "./prose-dates";

/**
 * The grammar every player line goes through.
 *
 * Wording chooses what to say; this file makes the saying correct. Pronouns
 * and verb agreement come from the person record (they/them only when the
 * record is silent), past events are spoken as past, office names read as
 * the thing a person runs for, and money, percentages and dates follow AP
 * style in American English: "$36,000 a year", "5 percent", "January 7,
 * 2026". No ISO date reaches a player.
 */

/** The words for one person, with the verbs that agree with them. */
export interface PersonWords {
  /** she / he / they */
  readonly they: string;
  /** She / He / They, for the start of a sentence. */
  readonly They: string;
  /** her / him / them */
  readonly them: string;
  /** her / his / their */
  readonly their: string;
  /** Her / His / Their */
  readonly Their: string;
  /** herself / himself / themselves */
  readonly themselves: string;
  /** is / is / are */
  readonly are: string;
  /** was / was / were */
  readonly were: string;
  /** has / has / have */
  readonly have: string;
  /** does / does / do */
  readonly do: string;
}

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase("en-US") + word.slice(1);
}

export function personWords(person: Person | undefined): PersonWords {
  const set = personPronouns(person);
  return {
    they: set.subject,
    They: capitalize(set.subject),
    them: set.object,
    their: set.possessive,
    Their: capitalize(set.possessive),
    themselves: set.reflexive,
    are: agreeVerb(set, "is", "are"),
    were: agreeVerb(set, "was", "were"),
    have: agreeVerb(set, "has", "have"),
    do: agreeVerb(set, "does", "do"),
  };
}

/* -------------------------------------------------------------------------- */
/* Tense                                                                       */
/* -------------------------------------------------------------------------- */

export type Tense = "past" | "today" | "upcoming";

/** Whether a dated thing has happened, is today, or is still ahead. */
export function tenseOf(
  date: IsoDate | string,
  today: IsoDate | string,
): Tense {
  const day = date.slice(0, 10);
  const now = today.slice(0, 10);
  return day < now ? "past" : day === now ? "today" : "upcoming";
}

/* -------------------------------------------------------------------------- */
/* Offices                                                                     */
/* -------------------------------------------------------------------------- */

/** Title words AP lowercases when they are not directly before a name. */
const TITLE_WORDS = new Set([
  "Alderman",
  "Assessor",
  "Attorney",
  "Auditor",
  "Clerk",
  "Commissioner",
  "Comptroller",
  "Council",
  "Delegate",
  "Governor",
  "Judge",
  "Justice",
  "Lieutenant",
  "Mayor",
  "Member",
  "President",
  "Representative",
  "Secretary",
  "Senator",
  "Sheriff",
  "State",
  "Supervisor",
  "Treasurer",
  "Trustee",
]);

/**
 * An office as it reads inside a sentence: what a person runs for or holds.
 *
 * AP style: a title that is not directly before a name is lower case, and
 * proper nouns keep their capitals. "Mayor" is "mayor", "Governor of
 * Nebraska" is "governor of Nebraska", "U.S. Senator from Nebraska" is "U.S.
 * senator from Nebraska". A generic seat title ("Seat in the Nebraska
 * Legislature") is "a seat in the Nebraska Legislature".
 */
export function officePhrase(title: string): string {
  const trimmed = title.trim();
  const seat = /^Seat (in|on|for) (.+)$/.exec(trimmed);
  if (seat) return `a seat ${seat[1]} ${seat[2]}`;
  const words = trimmed.split(" ");
  const first = words[0] === "U.S." ? 1 : 0;
  for (let index = first; index < words.length; index += 1) {
    if (!TITLE_WORDS.has(words[index]!)) break;
    words[index] = words[index]!.toLocaleLowerCase("en-US");
  }
  return words.join(" ");
}

/**
 * The office after "run for" or "put your name in for": a seat takes "a",
 * a single office stands alone ("run for mayor").
 */
export function runForPhrase(title: string): string {
  return officePhrase(title);
}

/** The office standing alone as a label or heading. */
export function officeLabel(title: string): string {
  return capitalize(officePhrase(title));
}

/* -------------------------------------------------------------------------- */
/* Numbers, money and dates (AP style)                                        */
/* -------------------------------------------------------------------------- */

const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const CENTS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const ONE_DECIMAL = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export type MoneyPeriod = "year" | "month" | "week" | "day" | "hour";

/**
 * "$36,000", "$36.50", "$1.2 million", "$3 billion", with "a year" style
 * periods. Whole dollars drop the cents; amounts of a million or more use
 * words, as AP does.
 */
export function apMoney(amount: number, per?: MoneyPeriod): string {
  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(amount);
  let figure: string;
  if (value >= 1_000_000_000)
    figure = `$${ONE_DECIMAL.format(value / 1_000_000_000)} billion`;
  else if (value >= 1_000_000)
    figure = `$${ONE_DECIMAL.format(value / 1_000_000)} million`;
  else if (Number.isInteger(value)) figure = `$${WHOLE.format(value)}`;
  else figure = `$${CENTS.format(value)}`;
  return `${sign}${figure}${per ? ` ${per === "hour" ? "an" : "a"} ${per}` : ""}`;
}

/** "5 percent", "4.5 percent": AP spells out percent after a figure. */
export function apPercent(value: number): string {
  return `${ONE_DECIMAL.format(value)} percent`;
}

/** "January 7, 2026". */
export function apDate(iso: IsoDate | string): string {
  return proseDate(iso);
}

/* -------------------------------------------------------------------------- */
/* The final pass                                                              */
/* -------------------------------------------------------------------------- */

const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?\b/g;
const PERCENT_SIGN = /(\d+(?:\.\d+)?)\s?%/g;

/**
 * The last step before a line is shown.
 *
 * Rewrites any ISO date to "January 7, 2026" and any "5%" to "5 percent",
 * removes a doubled period or a space before punctuation, and capitalizes
 * the first letter. It never changes words, names or facts.
 */
export function finishPlayerLine(text: string): string {
  const cleaned = text
    .replace(ISO_DATE, (match, date: string) => {
      const spoken = proseDate(date);
      return spoken === date ? match : spoken;
    })
    .replace(PERCENT_SIGN, (_match, figure: string) => `${figure} percent`)
    .replace(/([^.])\.\.(?!\.)/g, "$1.")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned ? capitalize(cleaned) : cleaned;
}
