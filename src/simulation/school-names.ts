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

import type { SeededRng } from "./rng";

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

const CORPORA: Record<string, SchoolNameCorpus> = {
  [SCHOOL_NAMES_V1.version]: SCHOOL_NAMES_V1,
};

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
): string {
  const corpus = getSchoolNameCorpus(corpusVersion);
  const pattern = rng.pick(weightedPatterns(level));
  return nameForPattern(pattern, rng, level, stem, corpus);
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
): Readonly<Record<SchoolLevel, string>> {
  const drawn = new Map<SchoolLevel, string>();
  const taken = new Set<string>();
  for (const level of ["elementary", "middle", "high"] as const) {
    let name = generateSchoolName(rng.fork(level), level, stem, corpusVersion);
    // A bounded redraw: the pools are large, and a stem-only collision is the
    // one case a redraw cannot clear, so it stops rather than looping.
    for (let attempt = 1; attempt < 8 && taken.has(name); attempt += 1) {
      name = generateSchoolName(
        rng.fork(`${level}:${attempt}`),
        level,
        stem,
        corpusVersion,
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
