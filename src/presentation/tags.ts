import schema from "../../data/tags/schema.json" with { type: "json" };

/**
 * ONE TAG VOCABULARY FOR WHAT FITS THE MOMENT.
 *
 * Backdrops, poses, views, outfits, people and occasions all describe
 * themselves with the same dimensions (data/tags/schema.json), so one scorer
 * can ask "what fits here": which picture for a senator's home screen, which
 * pose at a rally, which outfit at a trial. A dimension a tag set leaves out
 * says nothing about that thing; it is never counted as a match or as a
 * mismatch.
 *
 * Choosing is deterministic: candidates are scored by weighted matches, and
 * ties break by a hash of the seed and the candidate's id, so the same world
 * always makes the same pick.
 */

export const TAG_LEVELS = [
  "federal",
  "state",
  "county",
  "city",
  "school",
  "party",
  "private",
] as const;
export const TAG_INSTITUTIONS = [
  "upper-chamber",
  "lower-chamber",
  "unicameral-chamber",
  "council",
  "commission",
  "supreme-court",
  "appellate-court",
  "trial-court",
  "executive-office",
  "agency",
  "campaign",
  "newsroom",
  "union",
  "church",
  "school",
  "hospital",
  "business",
  "home",
  "public-space",
  "residence-street",
] as const;
export const TAG_SETTINGS = ["interior", "exterior"] as const;
export const TAG_OCCASIONS = [
  "session",
  "hearing",
  "rally",
  "debate",
  "election-night",
  "town-hall",
  "door-knocking",
  "phone-bank",
  "press-conference",
  "trial",
  "ceremony",
  "meeting",
  "work-shift",
  "home-life",
] as const;
export const TAG_ROLES = [
  "legislator",
  "executive",
  "judge",
  "lawyer",
  "candidate",
  "organizer",
  "volunteer",
  "staffer",
  "clerk",
  "reporter",
  "worker",
  "teacher",
  "student",
  "nurse",
  "officer",
  "clergy",
  "resident",
] as const;
export const TAG_TIMES = ["morning", "midday", "night"] as const;
export const TAG_WEATHER = ["clear", "rain"] as const;
export const TAG_SEASONS = ["winter"] as const;
export const TAG_TONES = [
  "celebratory",
  "tense",
  "somber",
  "ordinary",
] as const;
export const TAG_WEAR = [
  "formal",
  "business",
  "work",
  "uniform",
  "casual",
  "robe",
] as const;

export type TagLevel = (typeof TAG_LEVELS)[number];
export type TagInstitution = (typeof TAG_INSTITUTIONS)[number];
export type TagSetting = (typeof TAG_SETTINGS)[number];
export type TagOccasion = (typeof TAG_OCCASIONS)[number];
export type TagRole = (typeof TAG_ROLES)[number];
export type TagTime = (typeof TAG_TIMES)[number];
export type TagWeather = (typeof TAG_WEATHER)[number];
export type TagSeason = (typeof TAG_SEASONS)[number];
export type TagTone = (typeof TAG_TONES)[number];
export type TagWear = (typeof TAG_WEAR)[number];

export interface TagPlace {
  readonly usps?: string;
  readonly countyFips?: string;
  readonly cityId?: string;
}

export interface TagSet {
  readonly place?: readonly TagPlace[];
  readonly level?: readonly TagLevel[];
  readonly institution?: readonly TagInstitution[];
  readonly setting?: readonly TagSetting[];
  readonly occasion?: readonly TagOccasion[];
  readonly roleFit?: readonly TagRole[];
  readonly time?: readonly TagTime[];
  readonly weather?: readonly TagWeather[];
  readonly season?: readonly TagSeason[];
  readonly tone?: readonly TagTone[];
  readonly wearFit?: readonly TagWear[];
}

/** The word-list dimensions, in the order they are scored. */
export const LIST_DIMENSIONS = [
  "level",
  "institution",
  "setting",
  "occasion",
  "roleFit",
  "time",
  "weather",
  "season",
  "tone",
  "wearFit",
] as const;
export type ListDimension = (typeof LIST_DIMENSIONS)[number];
export type TagDimension = ListDimension | "place";

const WEIGHTS = schema.weights as Readonly<
  Partial<Record<TagDimension, number>>
>;

/** What a moment wants, and what it will not have. */
export interface TagContext {
  /** Each dimension set here scores a candidate that shares a value. */
  readonly want: TagSet;
  /**
   * Dimensions a candidate must share a value in. A candidate silent on a
   * required dimension is out too: a picture nobody tagged with a place
   * cannot be a picture of that place.
   */
  readonly require?: readonly TagDimension[];
  /** Any candidate carrying one of these values is out. */
  readonly exclude?: TagSet;
  readonly seed: string;
}

function samePlace(a: TagPlace, b: TagPlace): boolean {
  // The most specific field both name decides.
  if (a.cityId && b.cityId) return a.cityId === b.cityId;
  if (a.countyFips && b.countyFips) return a.countyFips === b.countyFips;
  if (a.usps && b.usps) return a.usps === b.usps;
  return false;
}

function shares(
  dimension: TagDimension,
  candidate: TagSet,
  wanted: TagSet,
): boolean | null {
  if (dimension === "place") {
    const mine = candidate.place;
    const theirs = wanted.place;
    if (!mine?.length || !theirs?.length) return null;
    return mine.some((a) => theirs.some((b) => samePlace(a, b)));
  }
  const mine = candidate[dimension] as readonly string[] | undefined;
  const theirs = wanted[dimension] as readonly string[] | undefined;
  if (!mine?.length || !theirs?.length) return null;
  return mine.some((value) => theirs.includes(value));
}

/**
 * The candidate's score for this moment, or null when it is ruled out. Each
 * dimension the moment wants and the candidate shares adds its weight.
 */
export function scoreTags(
  candidate: TagSet,
  context: TagContext,
): number | null {
  const exclude = context.exclude;
  if (exclude) {
    for (const dimension of [...LIST_DIMENSIONS, "place"] as const) {
      if (shares(dimension, candidate, exclude) === true) return null;
    }
  }
  for (const dimension of context.require ?? []) {
    if (shares(dimension, candidate, context.want) !== true) return null;
  }
  let score = 0;
  for (const dimension of ["place", ...LIST_DIMENSIONS] as const) {
    if (shares(dimension, candidate, context.want) === true)
      score += WEIGHTS[dimension] ?? 1;
  }
  return score;
}

/** FNV-1a, for tie-breaks that are the same on every machine. */
export function tagHash(text: string): number {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export interface Tagged {
  readonly id: string;
  readonly tags: TagSet;
}

/**
 * Every candidate that is not ruled out, best first. Equal scores order by a
 * hash of the seed and the id, so a seed always gives the same order and two
 * seeds usually give different ones.
 */
export function rankByTags<T extends Tagged>(
  candidates: readonly T[],
  context: TagContext,
): readonly T[] {
  return candidates
    .flatMap((candidate) => {
      const score = scoreTags(candidate.tags, context);
      return score === null
        ? []
        : [
            {
              candidate,
              score,
              tie: tagHash(`${context.seed}|${candidate.id}`),
            },
          ];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.tie - b.tie ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .map((entry) => entry.candidate);
}
