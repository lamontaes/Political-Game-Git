/**
 * Versioned corpus and seeded generator for the names of generated schools.
 *
 * A character whose history the world generates went somewhere, and the world
 * has to say where. It was saying "Local Elementary School", which reads as a
 * placeholder the moment a player looks at their own past.
 *
 * These names are GENERATED, never sourced. The education directory the
 * repository ships describes one recent academic year and explicitly refuses
 * to establish that any real school existed when a grown character was a
 * child (`institutionDateReason`), so a real school's name cannot be used for
 * an attendance forty years ago without asserting something the source does
 * not carry. The organizations built from these names carry `generated`
 * provenance like every other generated record.
 *
 * The shapes are the ones American schools actually use: a town or county, a
 * historical figure, a compass point, or a piece of local landscape. A
 * generated name may coincide with a real school's; so do real schools with
 * each other, and nothing here claims to describe one.
 *
 * PROVENANCE OF THE FIGURE LIST: public historical figures whose names are in
 * wide use on American public schools. It is a naming corpus, not a claim that
 * a particular school is named for a particular person, and it carries no
 * attribute of any generated character.
 */

import { NAMES_STARTER_V1 } from "./names-data";
import type { SeededRng } from "./rng";
import PATTERNS from "./school-name-patterns.json" with { type: "json" };

export type SchoolLevel = "elementary" | "middle" | "high";

export interface SchoolNameCorpus {
  readonly version: string;
  /** Historical figures in wide use on American public schools. */
  readonly figures: readonly string[];
  /** Landscape and neighborhood stems, the other half of the convention. */
  readonly features: readonly string[];
  readonly directions: readonly string[];
}

export const DEFAULT_SCHOOL_NAME_CORPUS_VERSION = "school-names-v1";

export const SCHOOL_NAMES_V1: SchoolNameCorpus = {
  version: DEFAULT_SCHOOL_NAME_CORPUS_VERSION,
  figures: [
    "Abigail Adams",
    "Abraham Lincoln",
    "Alexander Graham Bell",
    "Alexander Hamilton",
    "Amelia Earhart",
    "Andrew Jackson",
    "Andrew Johnson",
    "Benjamin Banneker",
    "Benjamin Franklin",
    "Booker T. Washington",
    "Cesar Chavez",
    "Clara Barton",
    "Daniel Boone",
    "Daniel Webster",
    "Davy Crockett",
    "Dorothea Dix",
    "Dwight Eisenhower",
    "Eleanor Roosevelt",
    "Eli Whitney",
    "Elizabeth Cady Stanton",
    "Emily Dickinson",
    "Emma Willard",
    "Frederick Douglass",
    "George Washington",
    "George Washington Carver",
    "Harriet Tubman",
    "Harry Truman",
    "Helen Keller",
    "Henry Clay",
    "Horace Mann",
    "James Madison",
    "James Monroe",
    "Jane Addams",
    "John Adams",
    "John Brown",
    "John F. Kennedy",
    "John Marshall",
    "John Muir",
    "John Paul Jones",
    "Jonas Salk",
    "Langston Hughes",
    "Laura Ingalls Wilder",
    "Louisa May Alcott",
    "Lucretia Mott",
    "Maria Mitchell",
    "Mark Twain",
    "Martin Luther King",
    "Mary McLeod Bethune",
    "Meriwether Lewis",
    "Nathan Hale",
    "Nathaniel Hawthorne",
    "Neil Armstrong",
    "Noah Webster",
    "Patrick Henry",
    "Paul Laurence Dunbar",
    "Phillis Wheatley",
    "Rachel Carson",
    "Ralph Waldo Emerson",
    "Robert Fulton",
    "Rosa Parks",
    "Sacagawea",
    "Sojourner Truth",
    "Susan B. Anthony",
    "Theodore Roosevelt",
    "Thomas Edison",
    "Thomas Jefferson",
    "Thurgood Marshall",
    "Ulysses Grant",
    "Walt Whitman",
    "Washington Irving",
    "William Clark",
    "Willa Cather",
    "Woodrow Wilson",
  ],
  features: [
    "Birch Hollow",
    "Brookside",
    "Cedar Creek",
    "Cedar Grove",
    "Chestnut Hill",
    "Clearview",
    "Cottonwood",
    "Elmwood",
    "Fairview",
    "Glenwood",
    "Greenwood",
    "Hickory Ridge",
    "Highland",
    "Hillcrest",
    "Laurel Hill",
    "Lakeview",
    "Magnolia",
    "Maple Grove",
    "Meadowbrook",
    "Mill Creek",
    "Oak Ridge",
    "Pine Valley",
    "Prairie View",
    "Riverside",
    "Rolling Hills",
    "Spring Hill",
    "Stone Bridge",
    "Sunset",
    "Sycamore",
    "Valley View",
    "Willow Bend",
    "Woodland",
  ],
  directions: ["North", "South", "East", "West", "Central"],
};

/**
 * The same lists, drawn the way American schools are actually named: see
 * `generateSchoolName`. A new game declares it; an old replay keeps v1.
 */
export const SCHOOL_NAMES_V2_VERSION = "school-names-v2";
export const SCHOOL_NAMES_V2: SchoolNameCorpus = {
  ...SCHOOL_NAMES_V1,
  version: SCHOOL_NAMES_V2_VERSION,
};

const CORPORA: Record<string, SchoolNameCorpus> = {
  [SCHOOL_NAMES_V1.version]: SCHOOL_NAMES_V1,
  [SCHOOL_NAMES_V2.version]: SCHOOL_NAMES_V2,
};

export type SchoolNameVersion =
  typeof DEFAULT_SCHOOL_NAME_CORPUS_VERSION | typeof SCHOOL_NAMES_V2_VERSION;

/** "US-ND" to "ND"; null for anything that is not a state key. */
export function stateUsps(stateJurisdictionKey: string | null): string | null {
  return stateJurisdictionKey?.startsWith("US-")
    ? stateJurisdictionKey.slice(3)
    : null;
}

/** Where the school is, for the measured draw. */
export interface SchoolNamingPlace {
  /** Two-letter postal code of the state, or null where none governs. */
  readonly state: string | null;
}

export function getSchoolNameCorpus(
  version: string = DEFAULT_SCHOOL_NAME_CORPUS_VERSION,
): SchoolNameCorpus {
  const corpus = CORPORA[version];
  if (!corpus) throw new Error(`Unknown school name corpus: ${version}`);
  return corpus;
}

const LEVEL_SUFFIX: Record<SchoolLevel, string> = {
  elementary: "Elementary School",
  middle: "Middle School",
  high: "High School",
};

type PatternKey = "figure" | "place" | "direction" | "feature";

/**
 * Which shape each level leans on, in the proportions the convention actually
 * runs at: a town usually has one high school and names it after the town,
 * while its elementary schools carry people and landscape.
 */
const PATTERN_WEIGHTS: Record<
  SchoolLevel,
  Readonly<Record<PatternKey, number>>
> = {
  elementary: { figure: 4, feature: 4, direction: 2, place: 1 },
  middle: { figure: 3, feature: 3, direction: 2, place: 2 },
  high: { figure: 2, feature: 1, direction: 3, place: 4 },
};

function weightedPatterns(level: SchoolLevel): readonly PatternKey[] {
  const weights = PATTERN_WEIGHTS[level];
  const pool: PatternKey[] = [];
  for (const key of ["figure", "feature", "direction", "place"] as const) {
    for (let index = 0; index < weights[key]; index += 1) pool.push(key);
  }
  return pool;
}

function nameForPattern(
  pattern: PatternKey,
  rng: SeededRng,
  level: SchoolLevel,
  stem: string,
  corpus: SchoolNameCorpus,
): string {
  const suffix = LEVEL_SUFFIX[level];
  // No town name means no town-shaped name. A school called " High School" is
  // worse than the placeholder this replaced, so the landscape pattern covers
  // the gap rather than a blank standing in for a fact nobody has.
  if (stem.length === 0 && (pattern === "place" || pattern === "direction"))
    return `${rng.pick(corpus.features)} ${suffix}`;
  switch (pattern) {
    case "figure":
      return `${rng.pick(corpus.figures)} ${suffix}`;
    case "feature":
      return `${rng.pick(corpus.features)} ${suffix}`;
    case "direction":
      // "North Sangamon County High School" is not a shape anyone uses; a
      // county keeps its plain name and the compass point goes to a town.
      return stem.endsWith("County")
        ? `${stem} ${suffix}`
        : `${rng.pick(corpus.directions)} ${stem} ${suffix}`;
    case "place":
      return `${stem} ${suffix}`;
  }
}

/**
 * One school's name. Deterministic in the rng it is handed, so a character
 * keeps the same school across saves.
 */
export function generateSchoolName(
  rng: SeededRng,
  level: SchoolLevel,
  stem: string,
  corpusVersion: string = DEFAULT_SCHOOL_NAME_CORPUS_VERSION,
  place: SchoolNamingPlace = { state: null },
): string {
  const corpus = getSchoolNameCorpus(corpusVersion);
  if (corpus.version === SCHOOL_NAMES_V2_VERSION) {
    return measuredSchoolName(rng, level, stem, corpus, place);
  }
  const pattern = rng.pick(weightedPatterns(level));
  return nameForPattern(pattern, rng, level, stem, corpus);
}

type MeasuredPattern =
  "place" | "direction" | "figure" | "person" | "family" | "other";

const MEASURED_PATTERNS: readonly MeasuredPattern[] = [
  "place",
  "direction",
  "figure",
  "person",
  "family",
  "other",
];

const MEASURED = PATTERNS as unknown as {
  readonly regions: Readonly<Record<string, string>>;
  readonly patterns: Readonly<
    Record<string, Readonly<Record<MeasuredPattern, number>>>
  >;
  readonly figureRegions: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  readonly towns: Readonly<Record<string, readonly [number, number, number]>>;
};

const LEVEL_INDEX: Record<SchoolLevel, 0 | 1 | 2> = {
  elementary: 0,
  middle: 1,
  high: 2,
};

function weightedPick<T>(
  rng: SeededRng,
  entries: readonly (readonly [T, number])[],
): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let point = rng.next() * total;
  for (const [value, weight] of entries) {
    point -= weight;
    if (point < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

/**
 * How much each national figure weighs in the measured draw for this place:
 * the number of schools carrying that name in the place's Census region, or in
 * the country where the region is unknown, plus one (authored) so that no
 * figure is ruled out.
 */
export function schoolFigureWeights(
  corpus: SchoolNameCorpus,
  place: SchoolNamingPlace,
): readonly (readonly [string, number])[] {
  const region =
    place.state === null ? undefined : MEASURED.regions[place.state];
  return corpus.figures.map((name) => {
    const byRegion = MEASURED.figureRegions[name] ?? {};
    const count =
      region === undefined
        ? Object.values(byRegion).reduce((sum, value) => sum + value, 0)
        : (byRegion[region] ?? 0);
    return [name, 1 + count] as const;
  });
}

/**
 * The measured draw (`school-names-v2`).
 *
 * The directory the game ships says how schools are named, though never which
 * school existed when: `school-name-patterns.json`, measured by
 * `scripts/source/school-name-patterns.ts`. A town's only high school carries
 * the town's name about two times in three, in every region; a national figure
 * names about one high school in five hundred there, and one in a hundred where
 * a town has four or more. v1 drew a national figure for one high school in
 * five whatever the town, which is how a North Dakota town of 2,500 got
 * "Booker T. Washington High School".
 *
 * So the shape is drawn from the measured counts for this level and for how
 * many schools of this level the town has (one when the directory lists at
 * most one). A national figure is weighted by how many schools carry that name
 * in this Census region, plus one so that no figure is ruled out entirely; the
 * plus one is authored. A person or a family name is drawn from the game's own
 * name corpus, so it is a generated local honoree, not a real one. Everything
 * the classifier could not place, which includes landscape names, district and
 * county names and brands, is drawn as landscape.
 */
function measuredSchoolName(
  rng: SeededRng,
  level: SchoolLevel,
  stem: string,
  corpus: SchoolNameCorpus,
  place: SchoolNamingPlace,
): string {
  const suffix = LEVEL_SUFFIX[level];
  const town =
    place.state === null
      ? undefined
      : MEASURED.towns[`${place.state}:${stem.toUpperCase()}`];
  const count = town?.[LEVEL_INDEX[level]] ?? 1;
  const size = count <= 1 ? "1" : count <= 3 ? "2-3" : "4+";
  const counts = MEASURED.patterns[`${level}:${size}`]!;
  let pattern = weightedPick(
    rng,
    MEASURED_PATTERNS.map((key) => [key, counts[key]] as const),
  );
  // No town name means no town-shaped name, as in v1.
  if (stem.length === 0 && (pattern === "place" || pattern === "direction")) {
    pattern = "other";
  }
  switch (pattern) {
    case "place":
      return `${stem} ${suffix}`;
    case "direction":
      return stem.endsWith("County")
        ? `${stem} ${suffix}`
        : `${rng.pick(corpus.directions)} ${stem} ${suffix}`;
    case "figure": {
      const figure = weightedPick(rng, schoolFigureWeights(corpus, place));
      return `${figure} ${suffix}`;
    }
    case "person":
      return `${rng.pick(NAMES_STARTER_V1.givenNames)} ${rng.pick(NAMES_STARTER_V1.familyNames)} ${suffix}`;
    case "family":
      return `${rng.pick(NAMES_STARTER_V1.familyNames)} ${suffix}`;
    case "other":
      return `${rng.pick(corpus.features)} ${suffix}`;
  }
}

/**
 * The three schools one generated childhood passes through.
 *
 * Drawn together because they have to be three different schools: an
 * elementary and a middle school sharing a name is the kind of detail a
 * player notices immediately and cannot unsee.
 */
export function generateSchoolNames(
  rng: SeededRng,
  stem: string,
  corpusVersion: string = DEFAULT_SCHOOL_NAME_CORPUS_VERSION,
  place: SchoolNamingPlace = { state: null },
): Readonly<Record<SchoolLevel, string>> {
  const drawn = new Map<SchoolLevel, string>();
  const taken = new Set<string>();
  for (const level of ["elementary", "middle", "high"] as const) {
    let name = generateSchoolName(
      rng.fork(level),
      level,
      stem,
      corpusVersion,
      place,
    );
    // A bounded redraw: the pools are large, and a stem-only collision is the
    // one case a redraw cannot clear, so it stops rather than looping.
    for (let attempt = 1; attempt < 8 && taken.has(name); attempt += 1) {
      name = generateSchoolName(
        rng.fork(`${level}:${attempt}`),
        level,
        stem,
        corpusVersion,
        place,
      );
    }
    taken.add(name);
    drawn.set(level, name);
  }
  return {
    elementary: drawn.get("elementary") as string,
    middle: drawn.get("middle") as string,
    high: drawn.get("high") as string,
  };
}
