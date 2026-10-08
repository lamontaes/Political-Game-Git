import type { SeededRng } from "./rng";
import type {
  GenderIdentityKey,
  Person,
  PersonIdentity,
  PronounSetKey,
} from "./types";

export type { GenderIdentityKey, PersonIdentity, PronounSetKey };

/**
 * Who somebody is, in the two ways a sentence has to know.
 *
 * The world had no answer to this at all. `Person` carried a name, a birth
 * date, a home jurisdiction and an appearance seed, and nothing about gender —
 * so every sentence in the game said "they" about everybody, and the human
 * playtest read a scene that named Maya and then referred to her as "them"
 * two lines later. That is not a neutral default working; that is a sentence
 * with nothing behind it.
 *
 * Two rules govern everything here, and they are the reason this is a module
 * rather than a string on a person.
 *
 * **A name is not evidence.** The name corpus carries no demographic attribute
 * of any kind, by a decision older than this file and worth keeping — see the
 * header of `names-data.ts`. So nothing in this module may look at a name.
 * Guessing gender from "Samantha" would be exactly the inference the corpus
 * was built to make impossible.
 *
 * **Generated is not inferred.** The people this world invents — a guardian, a
 * classmate, a housemate — get their names, their birth dates and their
 * appearance seeds from the generator. Giving them pronouns from the same
 * generator is the same act, not a new one: the world is making somebody up,
 * and people have genders. What would be dishonest is deciding a *real*
 * record's subject has a gender the record never mentioned, and that is why
 * `identity` is optional and absence is preserved rather than defaulted away.
 */

export interface PronounSet {
  readonly key: PronounSetKey;
  /** she / he / they */
  readonly subject: string;
  /** her / him / them */
  readonly object: string;
  /** her / his / their */
  readonly possessive: string;
  /** hers / his / theirs */
  readonly possessivePronoun: string;
  /** herself / himself / themselves */
  readonly reflexive: string;
  /**
   * Whether this set takes a plural verb.
   *
   * The whole reason pronouns are a closed set rather than free text: "she
   * has" and "they have" are different sentences, and a game that stores the
   * words but not the agreement writes one of them wrong.
   */
  readonly pluralVerb: boolean;
}

export const PRONOUN_SETS: Readonly<Record<PronounSetKey, PronounSet>> = {
  "she-her": {
    key: "she-her",
    subject: "she",
    object: "her",
    possessive: "her",
    possessivePronoun: "hers",
    reflexive: "herself",
    pluralVerb: false,
  },
  "he-him": {
    key: "he-him",
    subject: "he",
    object: "him",
    possessive: "his",
    possessivePronoun: "his",
    reflexive: "himself",
    pluralVerb: false,
  },
  "they-them": {
    key: "they-them",
    subject: "they",
    object: "them",
    possessive: "their",
    possessivePronoun: "theirs",
    reflexive: "themselves",
    pluralVerb: true,
  },
};

export const PRONOUN_SET_KEYS: readonly PronounSetKey[] = [
  "she-her",
  "he-him",
  "they-them",
];

export const GENDER_IDENTITY_KEYS: readonly GenderIdentityKey[] = [
  "female",
  "male",
  "nonbinary",
  "unstated",
];

/**
 * What a person says about themselves, in the words a player picks from.
 *
 * These are labels for a control, not a taxonomy. The point of the list is
 * that the game stops deciding for the player, not that the game has an
 * opinion about how many answers there are.
 */
export const GENDER_IDENTITY_LABELS: Readonly<
  Record<GenderIdentityKey, string>
> = {
  female: "Female",
  male: "Male",
  nonbinary: "Non-binary",
  // The second playtest named this one: "Rather not say" is what an
  // employment form says, and a game asking a player who their character is
  // should not sound like one. The semantics are unchanged — no identity is
  // stored — and only the words are different.
  unstated: "Leave unspecified",
};

export const PRONOUN_SET_LABELS: Readonly<Record<PronounSetKey, string>> = {
  "she-her": "she / her",
  "he-him": "he / him",
  "they-them": "they / them",
};

/**
 * The pronouns that usually go with a gender.
 *
 * A default for a control, not a rule about people: the setup screen offers
 * the pronoun choice separately and a player can disagree with this, which is
 * the entire reason the two are stored as separate fields.
 */
export function defaultPronounsForGender(
  gender: GenderIdentityKey,
): PronounSetKey {
  switch (gender) {
    case "female":
      return "she-her";
    case "male":
      return "he-him";
    case "nonbinary":
    case "unstated":
      return "they-them";
  }
}

/** The neutral set, used for everybody the record does not describe. */
export const UNKNOWN_PRONOUNS: PronounSet = PRONOUN_SETS["they-them"];

/**
 * How to refer to somebody.
 *
 * Falls back to they/them when the record is silent, and does so for the whole
 * sentence rather than for the pronoun alone — the mixing the playtest caught
 * came from a narrator that knew a name and a button that did not, so callers
 * are expected to take the whole set from here rather than assembling one.
 */
export function personPronouns(person: Person | undefined): PronounSet {
  const key = person?.identity?.pronouns;
  return key === undefined ? UNKNOWN_PRONOUNS : PRONOUN_SETS[key];
}

/** True when the world has actually been told, rather than falling back. */
export function personIdentityIsStated(person: Person | undefined): boolean {
  return person?.identity !== undefined;
}

export function personGender(person: Person | undefined): GenderIdentityKey {
  return person?.identity?.gender ?? "unstated";
}

/**
 * `has` or `have`, `is` or `are`, for whoever this is.
 *
 * Small, and the reason the pronoun set carries agreement at all. Every
 * sentence that used to hard-code a verb around an assumed "they" can ask.
 */
export function agreeVerb(
  pronouns: PronounSet,
  singular: string,
  plural: string,
): string {
  return pronouns.pluralVerb ? plural : singular;
}

/**
 * The published national figures an invented person's gender is checked
 * against.
 *
 * - Nonbinary: Pew Research Center, American Trends Panel Wave 109
 *   (May 16-22, 2022, n = 10,188), question GENDERNEW "Do you describe
 *   yourself as a man, a woman, nonbinary or in some other way?": 1% of U.S.
 *   adults answered "nonbinary" (the topline rounds to whole percents).
 * - Female and male: everyone else, split as the U.S. Census Bureau's
 *   American Community Survey 2024 1-year estimates count them, table B01001
 *   (Sex by Age), United States: 171,816,640 female and 168,294,340 male of
 *   340,110,980, a sex ratio of 97.95 males per 100 females.
 *
 * ACS records sex, not gender identity, and Pew's figure is of adults; the
 * two are combined here as the closest published national figures.
 */
export const GENERATED_GENDER_SOURCES = {
  pewNonbinaryPercent: 1,
  pewSource:
    "Pew Research Center, American Trends Panel Wave 109, May 16-22, 2022, GENDERNEW: 1% nonbinary",
  acsFemale: 171_816_640,
  acsMale: 168_294_340,
  acsSource:
    "U.S. Census Bureau, ACS 2024 1-year, B01001: 171,816,640 female, 168,294,340 male (97.95 males per 100 females)",
} as const;

/** The whole the gender weights are counted out of. */
export const GENERATED_GENDER_BASIS = 100_000;

/**
 * Whole-number weights out of `GENERATED_GENDER_BASIS` for each generated
 * gender, read from `GENERATED_GENDER_SOURCES` and rounded by largest
 * remainder so they add up to the basis exactly.
 */
export function generatedGenderWeights(): {
  readonly female: number;
  readonly male: number;
  readonly nonbinary: number;
} {
  const { pewNonbinaryPercent, acsFemale, acsMale } = GENERATED_GENDER_SOURCES;
  const nonbinary = (GENERATED_GENDER_BASIS * pewNonbinaryPercent) / 100;
  const rest = GENERATED_GENDER_BASIS - nonbinary;
  const exact = {
    female: (rest * acsFemale) / (acsFemale + acsMale),
    male: (rest * acsMale) / (acsFemale + acsMale),
  };
  let female = Math.floor(exact.female);
  let male = Math.floor(exact.male);
  if (female + male < rest) {
    if (exact.female - female >= exact.male - male) female += 1;
    else male += 1;
  }
  return { female, male, nonbinary };
}

const GENDER_WEIGHTS = generatedGenderWeights();

/**
 * An identity for somebody the world is inventing.
 *
 * Drawn from the same seeded generator that gives them a name and a birth
 * date, and from nothing else — not from the name it just drew, and not from
 * the part they are about to play. Deterministic, so the same seed builds the
 * same person every time, including on replay.
 *
 * This is still a seeded pick, made among the real options in the weights of
 * `generatedGenderWeights`: nothing in the world causes an invented adult's
 * gender, so the totals are what the published figures check. Generated
 * people get a stated gender, and `unstated` is reserved for the case it
 * actually describes — a person nobody has told the game about.
 */
export function generatePersonIdentity(rng: SeededRng): PersonIdentity {
  const { female, male } = GENDER_WEIGHTS;
  const at = rng.integer(0, GENERATED_GENDER_BASIS);
  const gender: GenderIdentityKey =
    at < female ? "female" : at < female + male ? "male" : "nonbinary";
  return { gender, pronouns: defaultPronounsForGender(gender) };
}

/**
 * The identity a person-generating writer should use, given what it was told.
 *
 * Callers that have an explicit identity — the player's own character, whose
 * gender the player chose — pass it through untouched. Callers that have
 * nothing get one generated from their own seeded stream.
 */
export function resolvePersonIdentity(
  explicit: PersonIdentity | undefined,
  rng: SeededRng,
): PersonIdentity {
  return explicit ?? generatePersonIdentity(rng);
}

/** Rejects an identity the canonical record should not hold. */
export function assertPersonIdentity(identity: PersonIdentity): void {
  if (!GENDER_IDENTITY_KEYS.includes(identity.gender)) {
    throw new Error(`Unsupported gender identity: ${identity.gender}`);
  }
  if (!PRONOUN_SET_KEYS.includes(identity.pronouns)) {
    throw new Error(`Unsupported pronoun set: ${identity.pronouns}`);
  }
}
