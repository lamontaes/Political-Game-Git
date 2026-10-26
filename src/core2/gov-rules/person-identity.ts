/**
 * An invented person's gender and pronouns. Ported from the old engine's
 * `person-identity.ts`, keeping only the generator and what it reads.
 *
 * A name is not evidence: nothing here looks at a name. Generated is not
 * inferred: the people the world invents get their identity from the same
 * seeded generator that gives them a name and a birth date.
 */
import type { SeededRng } from "../kernel/rng";
import type { GenderIdentityKey, PersonIdentity, PronounSetKey } from "./types";

export type { GenderIdentityKey, PersonIdentity, PronounSetKey };

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
