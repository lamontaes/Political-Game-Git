import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  getNameCorpus,
  givenNamePoolForStatedGender,
} from "../core2/gov-rules/names-data";
import {
  corePlaceByKey,
  searchCorePlaces,
  corePlaceStateIdentities,
} from "../core2/place-lookup";
import {
  countyGeoidsForPlace,
  governmentUnitsForPlace,
} from "../core2/reference/government-units";
import { municipiosForPlace } from "../core2/gov-rules/county-governing-body-rules";
import { publishedPlaceReferencePopulation } from "../core2/gov-rules/place-population";
import { parameter } from "../core2/parameters";
import { realLocalities } from "../core2/places";
import { hash, lookForGender, readRecipe, type LookRecipe } from "./appearance";
import { selectBenchPlace } from "./place-selection.mjs";

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

const TOWNS_BY_STATE = new Map<string, ReadonlyMap<string, string>>();

/** The county (or Puerto Rico municipio) a town lies mostly in. */
function townCounty(sourceGeoid: string | undefined) {
  if (!sourceGeoid) return null;
  const [municipio] = municipiosForPlace(sourceGeoid);
  if (municipio) return municipio.name.replace(/ Municipio$/, "");
  const [geoid] = countyGeoidsForPlace(sourceGeoid);
  return geoid ? (corePlaceByKey(`county:${geoid}`)?.formalName ?? null) : null;
}

/** The kind of government the listing gives a town: "Village" of "VILLAGE OF X". */
function townKind(sourceGeoid: string | undefined) {
  const name = sourceGeoid ? governmentUnitsForPlace(sourceGeoid)[0]?.name : "";
  const word = name?.split(" ")[0] ?? "";
  return word ? word[0] + word.slice(1).toLowerCase() : null;
}

/** A formal name that says more than the town's plain name, else null. */
function otherName(place: { displayName: string; formalName: string | null }) {
  const plain = place.displayName.split(",")[0];
  const formal = place.formalName?.split(",")[0];
  return formal && formal !== plain ? formal : null;
}

/**
 * For each town whose name the state repeats, what tells it apart: its
 * county, then (where two share a county) its formal name or kind of
 * government.
 */
function stateTownFacts(stateKey: string) {
  const known = TOWNS_BY_STATE.get(stateKey);
  if (known) return known;
  const places = searchCorePlaces("", Infinity, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  });
  const byName = new Map<string, typeof places>();
  for (const place of places) {
    byName.set(place.displayName, [
      ...(byName.get(place.displayName) ?? []),
      place,
    ]);
  }
  const apart = new Map<string, string>();
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    const label = (place: (typeof same)[number], deeper: boolean) =>
      [
        townCounty(place.sourceGeoid),
        ...(deeper ? [townKind(place.sourceGeoid) ?? otherName(place)] : []),
      ]
        .filter(Boolean)
        .join(", ");
    const tied = (place: (typeof same)[number]) =>
      same.filter((other) => label(other, false) === label(place, false))
        .length > 1;
    for (const place of same) apart.set(place.key, label(place, tied(place)));
  }
  TOWNS_BY_STATE.set(stateKey, apart);
  return apart;
}

/**
 * A state's cities and towns matching a search, all of them, each with the
 * population the world opens with: the town's Census count, the one source
 * the opening reads (`buildPopulation`). A town the records hold no count for
 * opens at the model's own size, so it reads that, marked `estimated`; a name
 * the state repeats carries its county.
 * stopgapId: SG-PLAY-town-count-estimate
 * stopgapId: SG-WORLD-creator-town-count-published
 */
export function creatorTowns(stateKey: string, query: string) {
  const apart = stateTownFacts(stateKey);
  return searchCorePlaces(query, Infinity, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  }).map((place) => {
    const population = place.sourceGeoid
      ? publishedPlaceReferencePopulation(place.sourceGeoid)
      : null;
    const county = apart.get(place.key);
    return {
      key: place.key,
      name: place.displayName,
      population: population ? population.value : parameter("targetPopulation"),
      ...(population ? {} : { estimated: true }),
      ...(county ? { county } : {}),
    };
  });
}

/**
 * Random place: the world's own draw of a state and a town from all 56
 * (`selectBenchPlace`, the draw New world uses), by the creator's seed and
 * how many times the button was pressed, so the same seed gives the same
 * places in the same order. Seeded generation of where a life starts.
 */
export function creatorRandomPlace(seed: string, draw: number) {
  const place = selectBenchPlace(
    `${seed || "creator"}:place:${draw}`,
    corePlaceStateIdentities(),
    realLocalities(),
  );
  const state = corePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === place.stateJurisdictionKey,
  );
  // A locality the draw returns always sits in a state (the draw groups by it).
  const stateKey = place.stateJurisdictionKey ?? "";
  const town = creatorTowns(stateKey, "").find((row) => row.key === place.key);
  return {
    state: { key: stateKey, name: state?.name ?? stateKey },
    town: town ?? {
      key: place.key,
      name: place.displayName,
      population: parameter("targetPopulation"),
      estimated: true,
    },
  };
}

export interface ChosenPerson {
  givenName: string;
  familyName: string;
  gender: CreatorGender;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  recipe?: LookRecipe;
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
    // The look is checked against the set and redrawn on the chosen
    // gender's body, whatever the page sent.
    ...(input.recipe
      ? {
          recipe: lookForGender(
            readRecipe(JSON.stringify(input.recipe)),
            input.gender,
          ),
        }
      : {}),
  };
}

/** The chosen birthday as a date, the one the world build and the identity call both take. */
export function chosenBirthDate(chosen: ChosenPerson) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return makeIsoDate(
    `${chosen.birthYear}-${pad(chosen.birthMonth)}-${pad(chosen.birthDay)}`,
  );
}

/**
 * Makes the new world's player the chosen person: name, birth date, gender
 * and appearance, through the core's identity call. The world was built for
 * the chosen birthday (`playerBirthDate` in buildBenchWorld), so the player is
 * a resident of that age and the past drawn for them (household, kin,
 * schooling, work, money) already fits it; only who they are called and how
 * they look is set here.
 */
export function applyChosenPerson(
  core: CoreState,
  id: string,
  chosen: ChosenPerson,
) {
  coreAPI(core).chooseIdentityV1(id, {
    givenName: chosen.givenName,
    familyName: chosen.familyName,
    birthDate: chosenBirthDate(chosen),
    looks: {
      gender: chosen.gender,
      ...(chosen.recipe ? { recipe: JSON.stringify(chosen.recipe) } : {}),
    },
  });
}
