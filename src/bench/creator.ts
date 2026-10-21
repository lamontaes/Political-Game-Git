import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  getNameCorpus,
  givenNamePoolForStatedGender,
} from "../simulation/names-data";
import {
  searchCorePlaces,
  corePlaceStateIdentities,
} from "../core2/place-lookup";
import { placeReferencePopulation } from "../core2/gov-rules/place-population";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";

/**
 * The New game creator as the Oct 12 creator had it (src/player/SetupScreen,
 * CreatorBirthdayFields at 29be9982f5^), on the new core: gender, name and
 * birthday; then where you are from; then the appearance (appearance.ts).
 */
export const GENDERS = ["female", "male", "nonbinary"] as const;
export type CreatorGender = (typeof GENDERS)[number];
/** The ages a life can begin at on the new core: the opening is the year before 18. */
export const CREATOR_MIN_AGE = 17;
/** The old creator's upper bound (MAXIMUM_START_AGE). */
export const CREATOR_MAX_AGE = 70;

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * A name from the national corpus, drawn by seed and draw number. With no
 * gender chosen yet, any given name may come up (owner, Oct 14: Randomize
 * name works before a gender is picked).
 */
export function drawName(seed: string, draw: number, gender?: string) {
  const corpus = getNameCorpus();
  const given =
    gender === "female" || gender === "male" || gender === "nonbinary"
      ? givenNamePoolForStatedGender(gender)
      : corpus.givenNames;
  return {
    givenName: given[hash(`${seed}:given:${draw}`) % given.length]!,
    familyName:
      corpus.familyNames[
        hash(`${seed}:family:${draw}`) % corpus.familyNames.length
      ]!,
  };
}

const startParts = () => gameStartDate().split("-").map(Number) as number[];

/** The age on the opening date of someone born on this day. */
export function ageAtStart(year: number, month: number, day: number): number {
  return ageOnDate(
    makeIsoDate(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    ),
    makeIsoDate(gameStartDate()),
  );
}

/** The birth years a start may take, each labeled "1978 (age 47)". */
export function birthYears(month: number, day: number) {
  const [openYear] = startParts();
  const years: { year: number; label: string }[] = [];
  for (
    let year = openYear! - CREATOR_MIN_AGE;
    year >= openYear! - CREATOR_MAX_AGE - 1;
    year--
  ) {
    const age = ageAtStart(year, month, day);
    if (age >= CREATOR_MIN_AGE && age <= CREATOR_MAX_AGE)
      years.push({ year, label: `${year} (age ${age})` });
  }
  return years;
}

/** A birthday drawn by seed and draw number, an adult as the old creator drew. */
export function drawBirthday(seed: string, draw: number) {
  const month = 1 + (hash(`${seed}:month:${draw}`) % 12);
  const length = new Date(Date.UTC(2001, month, 0)).getUTCDate();
  const day = 1 + (hash(`${seed}:day:${draw}`) % length);
  const years = birthYears(month, day).filter(
    (row) => ageAtStart(row.year, month, day) >= 18,
  );
  const { year } = years[hash(`${seed}:year:${draw}`) % years.length]!;
  return { year, month, day };
}

/** The states with places to start in, by name. */
export function creatorStates() {
  return corePlaceStateIdentities()
    .filter(
      (state) =>
        searchCorePlaces("", 1, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "locality",
        }).length > 0,
    )
    .map((state) => ({ key: state.jurisdictionKey, name: state.name }));
}

/** A state's cities and towns matching a search, with their population. */
export function creatorTowns(stateKey: string, query: string) {
  // Engineering list length for the scrolling list, not a model value.
  return searchCorePlaces(query, 400, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  }).map((place) => {
    const population = place.sourceGeoid
      ? placeReferencePopulation(place.sourceGeoid)
      : null;
    return {
      key: place.key,
      name: place.displayName,
      ...(population ? { population: population.value } : {}),
    };
  });
}

export interface ChosenPerson {
  givenName: string;
  familyName: string;
  gender: CreatorGender;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  recipe?: EngineRecipe;
}

/** Reads and checks the chosen person sent with New game. */
export function readChosenPerson(text: string): ChosenPerson {
  const input = JSON.parse(text) as ChosenPerson;
  const name = (value: unknown) => {
    const trimmed = String(value ?? "")
      .trim()
      .slice(0, 40);
    if (!trimmed) throw new Error("A name is needed.");
    return trimmed;
  };
  if (!GENDERS.includes(input.gender)) throw new Error("Choose a gender.");
  const { birthYear: year, birthMonth: month, birthDay: day } = input;
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  )
    throw new Error("No such birthday.");
  const age = ageAtStart(year, month, day);
  if (age < CREATOR_MIN_AGE || age > CREATOR_MAX_AGE)
    throw new Error(`Age ${CREATOR_MIN_AGE} to ${CREATOR_MAX_AGE}.`);
  return {
    givenName: name(input.givenName),
    familyName: name(input.familyName),
    gender: input.gender,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    ...(input.recipe ? { recipe: input.recipe } : {}),
  };
}

/**
 * Makes the new world's player the chosen person: name, birth date, gender
 * and appearance, through the core's identity call. The life's generated past
 * (school, work, household) stays as drawn for the original age.
 * stopgapId: SG-PLAY-creator-age-keeps-past
 */
export function applyChosenPerson(
  core: CoreState,
  id: string,
  chosen: ChosenPerson,
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  coreAPI(core).chooseIdentityV1(id, {
    givenName: chosen.givenName,
    familyName: chosen.familyName,
    birthDate: makeIsoDate(
      `${chosen.birthYear}-${pad(chosen.birthMonth)}-${pad(chosen.birthDay)}`,
    ),
    looks: {
      gender: chosen.gender,
      ...(chosen.recipe ? { recipe: JSON.stringify(chosen.recipe) } : {}),
    },
  });
}
