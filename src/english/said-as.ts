/**
 * Said-as: the one reader that says a person, an employer and a job from the
 * telling (words composer, part 2; docs/design/words-composer.md). No bank
 * line holds a title or a full name; a line holds a slot, and this reader
 * words it from what the text has already said:
 *
 * - the first time a text says someone: role and name ("Vice President
 *   Kathryn Hansen", "your sister Maya");
 * - after that: the pronoun when they were the last one said, else the role
 *   ("the President"), or the first name for someone close;
 * - to their face: what the speaker calls them;
 * - never a full name twice in one text, and never a bare full name for
 *   someone the listener was not told about.
 *
 * Employers and jobs go through the same reader: the outside market that
 * stands in for work out of town is never said as an employer, a government's
 * treasury is said as its government (`employerSaid`), and the commuter's
 * fill-in title is said as people say it ("works outside the town").
 *
 * Pure: the caller hands the person's record as a `SaidPerson` (`saidPersonOf`
 * in the director builds one from the world).
 */
import data from "../../data/english/said-as.json" with { type: "json" };
import { pronounWords, pronounSetOfGender } from "./pronoun-words";
import {
  employerSaid,
  JOURNAL_WORDS,
  kinAddress,
  withArticle,
  type EmployerRecord,
} from "./journal-words";
import { isPresent, mentionsOf, noteMention, type Telling } from "./telling";

/** A person as the records hold them, enough to say them. */
export interface SaidPerson {
  readonly id: string;
  readonly givenName: string;
  readonly familyName: string;
  /** The recorded pronoun set ("she-her"); else read from `gender`; else the they form. */
  readonly pronouns?: string;
  readonly gender?: string;
  /** The office they hold, by its office kind (`officials`/`offices` engines). */
  readonly officeKind?: string;
  /** What they are to the listener, by the family record's relation ("sibling"). */
  readonly toListener?: string;
  /** What they are to the speaker, by the family record's relation. */
  readonly toSpeaker?: string;
  /** What the speaker calls them to their face ("Mom", or their first name). */
  readonly calledBySpeaker?: string;
  /** Whether the listener knows who they are (met, told of, or family). */
  readonly knownToListener?: boolean;
}

/** Where the slot stands in the sentence. */
export type SaidCase = "subject" | "object" | "possessive";

export interface SaidAsOptions {
  readonly case?: SaidCase;
  /** The slot opens the sentence (a pronoun or "the" is capitalized). */
  readonly start?: boolean;
}

interface OfficeWords {
  readonly before: string;
  readonly again: string;
}
const OFFICES = data.offices as Readonly<Record<string, OfficeWords>>;

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const possessive = (name: string) =>
  data.relation.possessive.replace("{name}", name);

/** The office words for a kind, when the words hold one. */
export function officeWords(
  officeKind: string | undefined,
): OfficeWords | undefined {
  return officeKind ? OFFICES[officeKind] : undefined;
}

function pronounOf(person: SaidPerson, kase: SaidCase, start: boolean) {
  const set = person.pronouns ?? pronounSetOfGender(person.gender) ?? undefined;
  const words = pronounWords(set);
  if (!words) return null;
  const word =
    kase === "object"
      ? words.object
      : kase === "possessive"
        ? words.possessive
        : words.lower;
  return start ? capital(word) : word;
}

/** A relative's word with "your"/"my" and their first name ("your sister Maya"). */
function relationSaid(
  relation: string,
  person: SaidPerson,
  whose: "yours" | "mine",
): string | undefined {
  const forms = JOURNAL_WORDS.relationWords[relation];
  const word = forms?.[person.gender ?? "other"] ?? forms?.other;
  return word
    ? data.relation[whose]
        .replace("{relation}", word)
        .replace("{given}", person.givenName)
    : undefined;
}

/**
 * A person as this text says them now, and recorded as said. The first
 * mention carries who they are; every later one is shorter.
 */
export function saidAs(
  telling: Telling,
  person: SaidPerson,
  options: SaidAsOptions = {},
): string {
  const kase = options.case ?? "subject";
  const start = options.start ?? false;
  const full = `${person.givenName} ${person.familyName}`;
  const finish = (text: string, fullName: boolean) => {
    noteMention(telling, person.id, fullName);
    const cased = kase === "possessive" ? possessive(text) : text;
    return start ? capital(cased) : cased;
  };
  // To their face: what the speaker calls them, never their full name.
  if (person.id === telling.listenerId)
    return finish(person.calledBySpeaker ?? person.givenName, false);
  const first = mentionsOf(telling, person.id) === 0;
  const office = officeWords(person.officeKind);
  // Someone the two share: "Dad", or their first name, every time.
  const shared =
    (person.toListener &&
      person.toSpeaker &&
      kinAddress(person.toListener, person.gender ?? "")) ||
    undefined;
  const close = !!(person.toListener || person.toSpeaker);
  if (!first) {
    // A pronoun for whoever was said last; else the role, or the name.
    if (telling.text.lastPersonId === person.id) {
      const pronoun = pronounOf(person, kase, start);
      if (pronoun) {
        noteMention(telling, person.id, false);
        return pronoun;
      }
    }
    if (office) return finish(office.again, false);
    return finish(shared ?? person.givenName, false);
  }
  if (shared) return finish(shared, false);
  // Someone in the room is said by first name: everyone there can see them.
  if (isPresent(telling, person.id)) return finish(person.givenName, false);
  if (person.toListener && person.toSpeaker)
    return finish(person.givenName, false);
  const yours =
    person.toListener && relationSaid(person.toListener, person, "yours");
  if (yours) return finish(yours, false);
  const mine =
    person.toSpeaker && relationSaid(person.toSpeaker, person, "mine");
  if (mine) return finish(mine, false);
  if (close) return finish(person.givenName, false);
  // An official: role and name once; the role alone if the name was printed.
  if (office) {
    const named = telling.text.fullNamed.has(person.id);
    return named
      ? finish(office.again, false)
      : finish(`${office.before} ${full}`, true);
  }
  // Anyone else: the full name once, only for someone the listener knows.
  if (person.knownToListener && !telling.text.fullNamed.has(person.id))
    return finish(full, true);
  return finish(person.givenName, false);
}

/** An employer's record as the said-as reader reads it. */
export interface SaidEmployer extends EmployerRecord {
  /** The name as the reader already spells it (`properName`). */
  readonly name: string;
  /** The outside market that stands in for work out of town: never an employer. */
  readonly outside?: boolean;
}

/** An employer as people say it, or null when there is none to name (the outside market). */
export function employerSaidAs(employer: SaidEmployer): string | null {
  if (employer.outside) return null;
  return employerSaid(employer.name, employer);
}

/** A job as people say it. */
export type JobSaid =
  /** A job with the outside market: "works outside the town" / "a job out of town". */
  | { readonly kind: "outside"; readonly does: string; readonly job: string }
  /** A job with a title people say: "a stocker" after "works as". */
  | { readonly kind: "title"; readonly title: string; readonly asJob: string };

/** Whether a title is said the way people say a job: never a form's title with a parenthesis, comma or slash. */
export function sayableJobTitle(title: string | undefined): title is string {
  return !!title && !/[(),/]/.test(title) && title !== data.outsideJob.title;
}

/**
 * A job as people say it, from its title and its employer, or null when the
 * title cannot be said (a form's title). Never "a works outside the town".
 */
export function jobSaidAs(
  title: string | undefined,
  employer: Pick<SaidEmployer, "outside"> | undefined,
): JobSaid | null {
  if (employer?.outside || title === data.outsideJob.title)
    return {
      kind: "outside",
      does: data.outsideJob.does,
      job: data.outsideJob.job,
    };
  if (!sayableJobTitle(title)) return null;
  return { kind: "title", title, asJob: withArticle(title) };
}

/**
 * Every sentence of a line starts with a capital: a slot the reader filled
 * with a role or a pronoun ("the President", "he") may open a sentence.
 */
export function sentenceStarts(text: string): string {
  return text.replace(
    /(^|[.!?]["”]?\s+)(\p{Ll})/gu,
    (_, before: string, letter: string) => before + letter.toUpperCase(),
  );
}
