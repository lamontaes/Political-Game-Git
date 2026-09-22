/**
 * WHICH REGIONAL PLATE A PLACE MAY HONESTLY SHOW.
 *
 * The intro shows a player their surroundings after the White House. The point
 * of it is recognition: somebody from west Texas should see something that
 * looks like where they live. One plate can serve many places, because west
 * Texas and east Oklahoma do look much the same — but that shared look follows
 * landscape, not state lines, and a plate that is merely in the right state can
 * be badly wrong. El Paso and Houston are the same state and not the same
 * country to look at.
 *
 * So the unit here is a REGION keyed by landscape — `cross-timbers-oak-prairie`,
 * `trans-pecos-desert-mountain` — and the mapping from places to regions is
 * DATA, in `art/regions/regional-scene-places.json`, not a table in this file.
 * Research arrives at county resolution over time; nothing here has to change
 * when it does.
 *
 * THE RULE THAT MATTERS MOST: showing nothing beats showing the wrong place.
 * A wrong region is not a smaller version of recognition, it is the opposite of
 * it — a player from the Sonoran desert shown a pine forest has been told the
 * game does not know where they live. So `resolveRegionalPlate` returns a
 * reason for every miss, never a nearest guess, and an ambiguous match resolves
 * to nothing rather than to whichever region sorted first.
 *
 * PRECEDENCE. Place, then county, then state, most specific winning. An
 * exclusion at ANY level disqualifies a region outright, including over a
 * finer inclusion: a place listed inside an excluded county does not get the
 * plate. That is one rule rather than two, it is the conservative direction
 * when the two disagree, and mixed country is better handled by naming the
 * towns that do fit than by excluding a county and re-including parts of it.
 *
 * THERE IS NO COARSER TIER. A census division was tried and removed: `pacific`
 * is Alaska, Hawaii, California, Oregon and Washington, and a division-wide
 * fallback would let the Olympic rainforest plate stand in for Honolulu. A
 * specific regional scene needs positive geographic eligibility, not a bucket
 * that happens to contain it.
 *
 * Browser-safe: no Node imports, no filesystem, no network.
 */

import type {
  AssetCompatibilityTags,
  UsCensusDivision,
} from "./asset-compatibility";
import { US_CENSUS_DIVISIONS } from "./asset-compatibility";

export const REGIONAL_SCENE_COVERAGE_VERSION = 1 as const;

/**
 * Which places a region covers.
 *
 * Every list is optional and an absent list means "says nothing", never
 * "matches everything". A region with no lists at all covers no place by name
 * and can still be reached through the census-division fallback, which is the
 * honest position for a plate nobody has researched yet.
 *
 * GEOIDs are 2020 Census, as strings: five digits for a county or
 * county-equivalent, seven for a place. They are strings because `"01001"` is
 * Autauga County, Alabama, and `1001` is a number that lost a state.
 */
export interface RegionalPlaceSelectors {
  /** State jurisdiction keys as the rule packs write them: `US-KY`. */
  readonly includeStates?: readonly string[];
  readonly excludeStates?: readonly string[];
  readonly includeCounties?: readonly string[];
  readonly excludeCounties?: readonly string[];
  readonly includePlaces?: readonly string[];
  readonly excludePlaces?: readonly string[];
  /** Why these places and not others. Kept with the data, not in a report. */
  readonly note?: string;
}

/** The four seasons, as the northern-hemisphere calendar draws them. */
export type RegionalSeason = "spring" | "summer" | "autumn" | "winter";

/**
 * The shape of the land, coarse enough that a street and the hillside behind
 * it share one and fine enough that a desert and a rainforest cannot.
 *
 * This is how the resolver tells legitimate variety from contradictory data.
 * Two regions claiming one place is ordinary: a town view and the country
 * around it are both true of Pikeville, and showing either is honest. But no
 * place is both `desert-basin-and-range` and `coastal-lowland`, and a document
 * that says so has an error in it that no choice between the two can repair.
 */
export const REGIONAL_LANDFORMS = [
  "desert-basin-and-range",
  "plateau-canyon",
  "montane-slope",
  "forested-upland",
  "valley-and-ridge",
  "rolling-hills",
  "flat-plains",
  "basalt-steppe",
  "lake-lowland",
  "coastal-lowland",
  "rocky-shoreline",
  "coastal-basin",
] as const;
export type RegionalLandform = (typeof REGIONAL_LANDFORMS)[number];

/**
 * What kind of view the picture is.
 *
 * It decides how the picture may be captioned. "Typical countryside near here"
 * over a photograph of a main street is a small lie, and the player can see it.
 */
export const REGIONAL_SCENE_KINDS = [
  "open-landscape",
  "street",
  "shoreline",
] as const;
export type RegionalSceneKind = (typeof REGIONAL_SCENE_KINDS)[number];

/**
 * What the picture actually shows, as tags the resolver can act on.
 *
 * Declared, never inferred. A sentence in `note` reading "summer only"
 * documents a restriction without implementing one, and the resolver cannot
 * read English. Bare branches in July and a green canopy in January are both
 * wrong in the particular way that tells a player the game is not paying
 * attention.
 */
export interface RegionalSceneContext {
  /** The seasons this exact picture can honestly stand in for. */
  readonly seasons: readonly RegionalSeason[];
  readonly landform: RegionalLandform;
  /** Slugs, as the research names them: `saguaro-desert-scrub`. */
  readonly vegetation?: readonly string[];
  /** Slugs, as the research names them: `craftsman-bungalow-street`. */
  readonly builtForm?: readonly string[];
  readonly sceneKind: RegionalSceneKind;
  /** Where these tags come from, in the researcher's own words. */
  readonly note?: string;
}

/**
 * The season a date falls in, by the calendar the scenes were requested against.
 *
 * Meteorological quarters, not solstices, because the pictures were briefed in
 * those words: "explicitly summer", "leaf-on", "January". Every scenario the
 * game ships is in the northern hemisphere; a southern-hemisphere place would
 * need its own reading of the same month and does not silently get this one.
 */
export function seasonOfIsoDate(isoDate: string): RegionalSeason | null {
  const match = /^\d{4}-(\d{2})-\d{2}/.exec(isoDate.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  if (month === 12 || month === 1 || month === 2) return "winter";
  return null;
}

/**
 * The delivered picture, when one exists.
 *
 * `null` on a region means the scene is requested or approved but its bytes are
 * not in the repository yet. That is a different fact from a region that covers
 * no places, and the resolver treats it as a miss with its own reason so nobody
 * reads a blank intro as a coverage gap.
 */
export interface RegionalPlateFile {
  /** Repository-relative path, as every other plate declares it. */
  readonly path: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  /** The bench candidate these exact bytes came from. */
  readonly candidateId: string;
}

export interface RegionalSceneEntry {
  /** Landscape-keyed, never a state name. Matches the bench request's variant. */
  readonly regionKey: string;
  readonly displayName: string;
  /** The Art Bench request this scene is tracked by. */
  readonly benchRequestId: string;
  /** The bench asset id, once the scene has one. */
  readonly assetId?: string;
  /** Owner-approved and delivered, or not yet. */
  readonly plate: RegionalPlateFile | null;
  readonly places: RegionalPlaceSelectors;
  /**
   * What the picture shows, which is checked before geography.
   *
   * Optional only so an unresearched row can exist; a region with a delivered
   * plate and no context is a validation error, because an undeclared picture
   * is one that can be shown in any season.
   */
  readonly context?: RegionalSceneContext;
  /**
   * Regions never simultaneously true of one place, named explicitly.
   *
   * Landform catches most contradictions on its own. This is for the pairs it
   * cannot: the Cross Timbers oak savanna and the southern pine-hardwood
   * forest are both rolling hills and are not the same country, and the
   * research says in as many words not to reuse one for the other.
   */
  readonly neverAlongside?: readonly string[];
  /**
   * What is unresolved about this scene's source bytes.
   *
   * Kept beside the row rather than in a report, because the fact that a
   * selected record is a 640x432 preview is the reason the row has no plate,
   * and the two belong in the same place or somebody will later read the empty
   * `plate` as a delivery backlog.
   */
  readonly sourceNote?: string;
  /**
   * The owner's geographic research for this region, in his own words.
   *
   * Prose on purpose. It is not selectors and it does not become selectors by
   * being read: turning "the lower, warmer parts of Pima, Pinal and Maricopa"
   * into place GEOIDs is a judgement with sources behind it, and code that
   * guessed at it would be inventing coverage. His own research file says the
   * same thing about itself — its status is
   * `research-input-not-runtime-admission` and it carries no IDs at all.
   *
   * It lives beside the row anyway, because whoever does produce those IDs
   * needs the envelope, the exclusions and the sources in front of them, and a
   * separate document is where that gets lost.
   */
  readonly research?: RegionalSceneResearch;
  /**
   * Reuse vocabulary from `asset-compatibility.ts`. Optional while a scene is
   * still being tagged; a region without it simply makes a narrower claim.
   */
  readonly compatibility?: AssetCompatibilityTags;
}

/**
 * Owner-supplied geography for one region. Every field is prose for a person.
 *
 * The resolver never reads this. `doNotAssume` in particular is the field a
 * reader is most likely to want to act on and the one most dangerous to act on
 * automatically: "do not extend to the entire California portion of the
 * Sonoran Desert" is an instruction to whoever draws up the place list, not an
 * exclusion the code can apply, because no California place is claimed here in
 * the first place.
 */
export interface RegionalSceneResearch {
  /** The region's geographic envelope, as described rather than enumerated. */
  readonly envelope?: string;
  /** How to narrow within a county, where county presence alone is too coarse. */
  readonly countyRefinement?: string;
  /** What the approved pixels actually show, and in what season. */
  readonly appearance?: string;
  /** Places and readings explicitly ruled out. For a person, not the resolver. */
  readonly doNotAssume?: string;
  /** Primary sources behind the envelope. */
  readonly sources?: readonly string[];
}

export interface RegionalSceneCoverageDocument {
  readonly documentVersion: typeof REGIONAL_SCENE_COVERAGE_VERSION;
  readonly generatedFrom: string;
  readonly regions: readonly RegionalSceneEntry[];
}

/** What the game knows about where the player is, at resolution time. */
export interface RegionalPlaceQuery {
  /** `US-KY`. Null when the save does not name a home state. */
  readonly stateKey: string | null;
  /** 7-digit place GEOID, when the save's place is a corpus place. */
  readonly placeGeoid?: string;
  /**
   * 5-digit county GEOIDs the place sits in. A place can straddle counties,
   * so this is a list; any of them matching is a match.
   */
  readonly countyGeoids?: readonly string[];
  /**
   * The season being played, from the saved world's own date.
   *
   * Absent means the caller is not asking about a season, and every picture is
   * admissible. That is the right default for a tool inspecting coverage, and
   * the wrong one for the intro, which always knows its date.
   */
  readonly season?: RegionalSeason;
  /**
   * Which kinds of view the caller can present. Absent means all of them.
   */
  readonly sceneKinds?: readonly RegionalSceneKind[];
}

export type RegionalPlateMissReason =
  /** The save does not say where the player lives. */
  | "no-place-known"
  /** A region matched by name but its picture is not delivered yet. */
  | "matched-region-has-no-plate"
  /** Nothing claims this place, at any level. */
  | "no-region-covers-this-place"
  /**
   * A region claims the place but no picture it has fits the season or the
   * kind of view being asked for. A real gap, and a different one from having
   * no coverage at all.
   */
  | "no-picture-fits-this-context"
  /**
   * Two regions claim the place and cannot both be true of it. Not a tie to
   * break: one of them is wrong, and picking either shows a player a place
   * they do not live in.
   */
  | "conflicting-coverage";

export type RegionalPlateResolution =
  | {
      readonly outcome: "plate";
      readonly regionKey: string;
      readonly displayName: string;
      readonly plate: RegionalPlateFile;
      /** Which rule matched, so a reviewer can check the claim. */
      readonly matchedBy: RegionalMatchLevel;
      /** How the picture may be captioned. */
      readonly sceneKind: RegionalSceneKind;
      /**
       * The other pictures that were equally valid here.
       *
       * Reported rather than hidden: a region with a forest view and a street
       * view is coverage working, and a reviewer should be able to see that
       * the choice was made among valid options rather than forced.
       */
      readonly alternatives: readonly string[];
    }
  | {
      readonly outcome: "none";
      readonly reason: RegionalPlateMissReason;
      /** Regions involved in the miss, for the ambiguous and undelivered cases. */
      readonly regionKeys: readonly string[];
    };

export type RegionalMatchLevel = "place" | "county" | "state";

/** Most specific first. Exclusion at a level removes the region entirely. */
const MATCH_ORDER: readonly RegionalMatchLevel[] = ["place", "county", "state"];

/**
 * Whether a county list can be reached from an ordinary town.
 *
 * It cannot, today, and the honest place for that fact is here rather than in
 * a report. A place GEOID is state plus place, not a county nesting code, so a
 * town's county cannot be derived from its identifier, and the runtime corpus
 * carries no place-to-county crosswalk. County selectors still work for a life
 * started at county scope, whose jurisdiction slug is `us-county-<geoid>`.
 * Until a crosswalk exists, a county list is coverage for fewer players than
 * it looks like, and the validator says so out loud.
 */
export const COUNTY_SELECTORS_REACH_TOWN_QUERIES = false;

/**
 * Census divisions, as the Census Bureau draws them.
 *
 * Here only as the coarse fallback of last resort, and deliberately not as the
 * primary key: a division is nine buckets for a continent and puts El Paso and
 * Houston together. Territories have no division and get none rather than a
 * borrowed one.
 */
export const CENSUS_DIVISION_BY_STATE: Readonly<
  Record<string, UsCensusDivision>
> = {
  CT: "new-england",
  ME: "new-england",
  MA: "new-england",
  NH: "new-england",
  RI: "new-england",
  VT: "new-england",
  NJ: "mid-atlantic",
  NY: "mid-atlantic",
  PA: "mid-atlantic",
  IL: "east-north-central",
  IN: "east-north-central",
  MI: "east-north-central",
  OH: "east-north-central",
  WI: "east-north-central",
  IA: "west-north-central",
  KS: "west-north-central",
  MN: "west-north-central",
  MO: "west-north-central",
  NE: "west-north-central",
  ND: "west-north-central",
  SD: "west-north-central",
  DE: "south-atlantic",
  DC: "south-atlantic",
  FL: "south-atlantic",
  GA: "south-atlantic",
  MD: "south-atlantic",
  NC: "south-atlantic",
  SC: "south-atlantic",
  VA: "south-atlantic",
  WV: "south-atlantic",
  AL: "east-south-central",
  KY: "east-south-central",
  MS: "east-south-central",
  TN: "east-south-central",
  AR: "west-south-central",
  LA: "west-south-central",
  OK: "west-south-central",
  TX: "west-south-central",
  AZ: "mountain",
  CO: "mountain",
  ID: "mountain",
  MT: "mountain",
  NV: "mountain",
  NM: "mountain",
  UT: "mountain",
  WY: "mountain",
  AK: "pacific",
  CA: "pacific",
  HI: "pacific",
  OR: "pacific",
  WA: "pacific",
};

/** `US-KY` to `KY`. Anything else is not a state key and yields null. */
export function stateCodeOf(stateKey: string | null): string | null {
  if (!stateKey) return null;
  const match = /^US-([A-Z]{2})$/.exec(stateKey.trim().toUpperCase());
  return match ? match[1]! : null;
}

export function censusDivisionOf(
  stateKey: string | null,
): UsCensusDivision | null {
  const code = stateCodeOf(stateKey);
  return code ? (CENSUS_DIVISION_BY_STATE[code] ?? null) : null;
}

function has(
  list: readonly string[] | undefined,
  value: string | undefined,
): boolean {
  return value !== undefined && (list ?? []).includes(value);
}

function hasAny(
  list: readonly string[] | undefined,
  values: readonly string[] | undefined,
): boolean {
  if (!list || !values) return false;
  return values.some((value) => list.includes(value));
}

/**
 * Does this region claim the place at this level, and is it excluded there?
 *
 * Returns "excluded" for an explicit no, "matched" for an explicit yes, and
 * "silent" when the region's data says nothing at this level. Silence is never
 * a yes.
 */
function judge(
  entry: RegionalSceneEntry,
  query: RegionalPlaceQuery,
  level: RegionalMatchLevel,
): "excluded" | "matched" | "silent" {
  const places = entry.places;
  if (level === "place") {
    if (has(places.excludePlaces, query.placeGeoid)) return "excluded";
    return has(places.includePlaces, query.placeGeoid) ? "matched" : "silent";
  }
  if (level === "county") {
    if (hasAny(places.excludeCounties, query.countyGeoids)) return "excluded";
    return hasAny(places.includeCounties, query.countyGeoids)
      ? "matched"
      : "silent";
  }
  const stateKey = query.stateKey?.toUpperCase();
  if (!stateKey) return "silent";
  const upper = (list: readonly string[] | undefined) =>
    (list ?? []).map((item) => item.toUpperCase());
  if (upper(places.excludeStates).includes(stateKey)) return "excluded";
  return upper(places.includeStates).includes(stateKey) ? "matched" : "silent";
}

/**
 * Does this picture fit what is being asked for?
 *
 * A region with no declared context makes no claim and is not filtered out
 * here; validation is what stops a delivered plate from staying undeclared.
 * That split matters: silence in the data must never become a silent yes at
 * runtime, but it also must not blank a row nobody has tagged yet.
 */
function fitsContext(
  entry: RegionalSceneEntry,
  query: RegionalPlaceQuery,
): boolean {
  const context = entry.context;
  if (!context) return true;
  if (query.season && !context.seasons.includes(query.season)) return false;
  if (query.sceneKinds && !query.sceneKinds.includes(context.sceneKind)) {
    return false;
  }
  return true;
}

/** Two regions that cannot both describe one place. */
function conflicts(
  left: RegionalSceneEntry,
  right: RegionalSceneEntry,
): boolean {
  if ((left.neverAlongside ?? []).includes(right.regionKey)) return true;
  if ((right.neverAlongside ?? []).includes(left.regionKey)) return true;
  const a = left.context?.landform;
  const b = right.context?.landform;
  if (!a || !b) return false;
  return a !== b;
}

/**
 * FNV-1a, 32-bit. Here to make one choice repeatable, nothing else.
 *
 * Deliberately not the world's seeded RNG: choosing a picture must not consume
 * simulation randomness, must not depend on how many times a panel has been
 * opened, and must not differ between a first view and a redraw of the same
 * save. A read-only screen that changed the world would be a bug however
 * pretty the result.
 */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Choose among pictures that are all valid here.
 *
 * Keyed on the place, so one place always shows the same view while two places
 * sharing a region can show different ones. Sorted by key first, so the answer
 * does not depend on the order rows happen to sit in the file.
 */
function chooseRepeatably(
  candidates: readonly RegionalSceneEntry[],
  query: RegionalPlaceQuery,
): RegionalSceneEntry {
  const sorted = [...candidates].sort((left, right) =>
    left.regionKey.localeCompare(right.regionKey),
  );
  const placeKey =
    query.placeGeoid ?? query.countyGeoids?.[0] ?? query.stateKey ?? "";
  return sorted[hash32(placeKey) % sorted.length]!;
}

/**
 * Pick the plate for a place, or say honestly that there is none.
 *
 * Never returns a nearest match. Every "none" carries the reason, because
 * "no region covers Wyoming", "the Rocky Mountain plate is approved but its
 * bytes are not in the repository" and "every picture we have of this place is
 * a summer one and it is January" are three different problems with three
 * different fixes, and a blank intro looks identical for all of them.
 *
 * What it will not do is blank a place merely for having more than one valid
 * picture. A region can legitimately have a forest view, a town view and
 * seasonal variants; treating that as a conflict would mean each new approved
 * scene made more screens empty, which is the opposite of what approving art
 * is for. Contradictory data is still a blank, and says so by name.
 */
export function resolveRegionalPlate(
  document: RegionalSceneCoverageDocument,
  query: RegionalPlaceQuery,
): RegionalPlateResolution {
  if (!query.stateKey && !query.placeGeoid && !query.countyGeoids?.length) {
    return { outcome: "none", reason: "no-place-known", regionKeys: [] };
  }

  /**
   * An exclusion disqualifies a region outright, at every level.
   *
   * Excluding Harris County from a plate that includes all of Texas has to mean
   * Houston does not get that plate. If exclusion only applied at its own level,
   * the state inclusion one tier down would hand it back, and the exclusion
   * would read as written but do nothing.
   */
  const notExcluded = document.regions.filter((entry) =>
    MATCH_ORDER.every((level) => judge(entry, query, level) !== "excluded"),
  );

  /**
   * Context before geography, not after.
   *
   * A winter plate is not a candidate in July at all, so a summer plate that
   * only reaches this place by state still wins over it. Filtering the other
   * way round would let the most specific row win and then discover it was the
   * wrong season, and blank a screen that had a perfectly good picture for it.
   */
  const fits = notExcluded.filter((entry) => fitsContext(entry, query));

  for (const level of MATCH_ORDER) {
    const matched = fits.filter(
      (entry) => judge(entry, query, level) === "matched",
    );
    if (matched.length === 0) continue;
    return settle(matched, level, query);
  }

  const wrongContext = notExcluded.filter(
    (entry) =>
      !fitsContext(entry, query) &&
      MATCH_ORDER.some((level) => judge(entry, query, level) === "matched"),
  );
  if (wrongContext.length > 0) {
    return {
      outcome: "none",
      reason: "no-picture-fits-this-context",
      regionKeys: wrongContext.map((entry) => entry.regionKey),
    };
  }

  return {
    outcome: "none",
    reason: "no-region-covers-this-place",
    regionKeys: [],
  };
}

/**
 * Turn the regions that matched at one level into an answer.
 *
 * Several regions matching is variety, not a tie, so long as they can all be
 * true of the same place: the picture is chosen repeatably among them and the
 * others are reported as alternatives. Regions that cannot both be true of the
 * place are a contradiction in the data and blank the screen, because choosing
 * between them would mean showing somebody a landscape they do not live in
 * half the time.
 *
 * A matched region whose bytes are not delivered is a miss that names itself,
 * so the gap stays reportable rather than looking like missing coverage.
 */
function settle(
  matched: readonly RegionalSceneEntry[],
  level: RegionalMatchLevel,
  query: RegionalPlaceQuery,
): RegionalPlateResolution {
  const keys = matched.map((entry) => entry.regionKey);
  for (let i = 0; i < matched.length; i += 1) {
    for (let j = i + 1; j < matched.length; j += 1) {
      if (conflicts(matched[i]!, matched[j]!)) {
        return {
          outcome: "none",
          reason: "conflicting-coverage",
          regionKeys: keys,
        };
      }
    }
  }

  const delivered = matched.filter((entry) => entry.plate !== null);
  if (delivered.length === 0) {
    return {
      outcome: "none",
      reason: "matched-region-has-no-plate",
      regionKeys: keys,
    };
  }

  const entry = chooseRepeatably(delivered, query);
  return {
    outcome: "plate",
    regionKey: entry.regionKey,
    displayName: entry.displayName,
    plate: entry.plate!,
    matchedBy: level,
    sceneKind: entry.context?.sceneKind ?? "open-landscape",
    alternatives: delivered
      .filter((other) => other.regionKey !== entry.regionKey)
      .map((other) => other.regionKey),
  };
}

export type CoverageFindingCode =
  | "unknown-document-version"
  | "duplicate-region-key"
  | "non-semantic-region-key"
  | "place-included-and-excluded"
  | "malformed-county-geoid"
  | "malformed-place-geoid"
  | "unknown-state-key"
  | "unknown-census-division"
  | "plate-without-sha"
  | "plate-with-non-positive-dimensions"
  | "delivered-plate-without-context"
  | "context-without-seasons"
  | "unknown-season"
  | "unknown-landform"
  | "unknown-scene-kind"
  | "never-alongside-unknown-region"
  | "contradictory-place-membership"
  | "county-selector-unreachable-from-a-town"
  | "region-claims-nothing";

export interface CoverageFinding {
  readonly code: CoverageFindingCode;
  readonly severity: "error" | "warning";
  readonly regionKey: string;
  readonly message: string;
}

export interface CoverageValidation {
  readonly valid: boolean;
  readonly findings: readonly CoverageFinding[];
}

const COUNTY_GEOID = /^\d{5}$/;
const PLACE_GEOID = /^\d{7}$/;
const STATE_KEY = /^US-[A-Z]{2}$/;
const REGION_KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SEASONS: readonly RegionalSeason[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

/**
 * Check the coverage document.
 *
 * The rules that are errors are the ones that would make a player see the wrong
 * place or see nothing without anyone noticing. A region that claims nothing is
 * only a warning: that is the honest state of a scene nobody has researched
 * yet, and it is exactly the row research is meant to fill in.
 */
export function validateRegionalSceneCoverage(
  document: RegionalSceneCoverageDocument,
): CoverageValidation {
  const findings: CoverageFinding[] = [];
  const seen = new Set<string>();

  const error = (
    code: CoverageFindingCode,
    regionKey: string,
    message: string,
  ) => findings.push({ code, severity: "error", regionKey, message });
  const warn = (
    code: CoverageFindingCode,
    regionKey: string,
    message: string,
  ) => findings.push({ code, severity: "warning", regionKey, message });

  if (document.documentVersion !== REGIONAL_SCENE_COVERAGE_VERSION) {
    error(
      "unknown-document-version",
      "",
      `Document version ${String(document.documentVersion)} is not ${REGIONAL_SCENE_COVERAGE_VERSION}.`,
    );
  }

  for (const entry of document.regions) {
    const key = entry.regionKey;
    if (seen.has(key)) {
      error(
        "duplicate-region-key",
        key,
        `Two regions share the key '${key}'. Resolution would depend on array order.`,
      );
    }
    seen.add(key);
    if (!REGION_KEY.test(key)) {
      error(
        "non-semantic-region-key",
        key,
        `'${key}' is not a lowercase hyphenated slug of at least two words.`,
      );
    }

    const places = entry.places;
    for (const geoid of places.includeCounties ?? []) {
      if (!COUNTY_GEOID.test(geoid)) {
        error(
          "malformed-county-geoid",
          key,
          `'${geoid}' is not a 5-digit county GEOID string. Leading zeros matter: Autauga County, Alabama is "01001".`,
        );
      }
    }
    for (const geoid of places.excludeCounties ?? []) {
      if (!COUNTY_GEOID.test(geoid)) {
        error(
          "malformed-county-geoid",
          key,
          `Excluded '${geoid}' is not a 5-digit county GEOID string.`,
        );
      }
    }
    for (const geoid of [
      ...(places.includePlaces ?? []),
      ...(places.excludePlaces ?? []),
    ]) {
      if (!PLACE_GEOID.test(geoid)) {
        error(
          "malformed-place-geoid",
          key,
          `'${geoid}' is not a 7-digit place GEOID string.`,
        );
      }
    }
    for (const stateKey of [
      ...(places.includeStates ?? []),
      ...(places.excludeStates ?? []),
    ]) {
      if (!STATE_KEY.test(stateKey.toUpperCase())) {
        error(
          "unknown-state-key",
          key,
          `'${stateKey}' is not a state jurisdiction key such as 'US-KY'.`,
        );
      }
    }

    const overlaps = [
      ...(places.includeCounties ?? []).filter((geoid) =>
        (places.excludeCounties ?? []).includes(geoid),
      ),
      ...(places.includePlaces ?? []).filter((geoid) =>
        (places.excludePlaces ?? []).includes(geoid),
      ),
      ...(places.includeStates ?? []).filter((stateKey) =>
        (places.excludeStates ?? []).includes(stateKey),
      ),
    ];
    for (const overlap of overlaps) {
      error(
        "place-included-and-excluded",
        key,
        `'${overlap}' is both included and excluded. Exclusion wins, so the inclusion is dead text somebody will later read as coverage.`,
      );
    }

    for (const division of entry.compatibility?.allowedReuseRegions ?? []) {
      if (!US_CENSUS_DIVISIONS.includes(division)) {
        error(
          "unknown-census-division",
          key,
          `'${division}' is not a census division.`,
        );
      }
    }

    const plate = entry.plate;
    if (plate) {
      if (!SHA256.test(plate.sha256)) {
        error(
          "plate-without-sha",
          key,
          `A delivered plate must carry the sha256 of its exact bytes. Owner approval is of those bytes, not of a filename.`,
        );
      }
      if (
        !Number.isInteger(plate.width) ||
        plate.width <= 0 ||
        !Number.isInteger(plate.height) ||
        plate.height <= 0
      ) {
        error(
          "plate-with-non-positive-dimensions",
          key,
          `A delivered plate must record its real pixel dimensions.`,
        );
      }
    }

    const context = entry.context;
    if (context) {
      if (context.seasons.length === 0) {
        error(
          "context-without-seasons",
          key,
          `A context with no seasons admits the picture nowhere and blanks the region in every month of the year.`,
        );
      }
      for (const season of context.seasons) {
        if (!SEASONS.includes(season)) {
          error("unknown-season", key, `'${season}' is not a season.`);
        }
      }
      if (!REGIONAL_LANDFORMS.includes(context.landform)) {
        error(
          "unknown-landform",
          key,
          `'${context.landform}' is not a landform in the shared vocabulary. Contradiction between regions is decided by landform, so an unknown one silently stops being checked.`,
        );
      }
      if (!REGIONAL_SCENE_KINDS.includes(context.sceneKind)) {
        error(
          "unknown-scene-kind",
          key,
          `'${context.sceneKind}' is not a scene kind, so the caption cannot be chosen for it.`,
        );
      }
    } else if (entry.plate) {
      error(
        "delivered-plate-without-context",
        key,
        `A delivered plate must declare its seasons, landform and scene kind. An undeclared picture is one that can be shown in any month, which is how a bare-branch January scene ends up standing in for July.`,
      );
    }

    for (const other of entry.neverAlongside ?? []) {
      if (!document.regions.some((row) => row.regionKey === other)) {
        error(
          "never-alongside-unknown-region",
          key,
          `'${other}' is not a region in this document, so the exclusivity it declares can never fire.`,
        );
      }
    }

    if (
      !COUNTY_SELECTORS_REACH_TOWN_QUERIES &&
      (places.includeCounties?.length ?? 0) > 0
    ) {
      warn(
        "county-selector-unreachable-from-a-town",
        key,
        `This region claims ${places.includeCounties!.length} county(ies), which only reach a life started at county scope. A town carries a place GEOID, and a county cannot be derived from one. Name the towns that fit until a place-to-county crosswalk exists.`,
      );
    }

    const claimsSomething =
      (places.includeStates?.length ?? 0) > 0 ||
      (places.includeCounties?.length ?? 0) > 0 ||
      (places.includePlaces?.length ?? 0) > 0;
    if (!claimsSomething) {
      warn(
        "region-claims-nothing",
        key,
        `No place, county or state names this region, so it can never be shown. Honest for an unresearched scene; a bug for a delivered one.`,
      );
    }
  }

  /**
   * Two regions that cannot both be true of one place, both claiming it.
   *
   * Caught here rather than left to the resolver's runtime blank, because at
   * runtime it is one silent empty panel for one player and here it is a
   * failing check with both region keys in it.
   */
  const byPlace = new Map<string, RegionalSceneEntry[]>();
  for (const entry of document.regions) {
    for (const geoid of entry.places.includePlaces ?? []) {
      const rows = byPlace.get(geoid) ?? [];
      rows.push(entry);
      byPlace.set(geoid, rows);
    }
  }
  for (const [geoid, rows] of byPlace) {
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const left = rows[i]!;
        const right = rows[j]!;
        if (!conflicts(left, right)) continue;
        error(
          "contradictory-place-membership",
          left.regionKey,
          `Place '${geoid}' is claimed by both '${left.regionKey}' and '${right.regionKey}', which cannot both describe one place. The intro will show nothing there until one of them gives it up.`,
        );
      }
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

export interface RegionalCoverageSummary {
  readonly regions: number;
  readonly withPlate: number;
  readonly withPlaceData: number;
  readonly countiesNamed: number;
  readonly statesNamed: number;
  readonly placesNamed: number;
  readonly withContext: number;
}

export function summarizeRegionalSceneCoverage(
  document: RegionalSceneCoverageDocument,
): RegionalCoverageSummary {
  const counties = new Set<string>();
  const states = new Set<string>();
  const places = new Set<string>();
  let withPlaceData = 0;
  for (const entry of document.regions) {
    const selectors = entry.places;
    for (const geoid of selectors.includeCounties ?? []) counties.add(geoid);
    for (const key of selectors.includeStates ?? [])
      states.add(key.toUpperCase());
    for (const geoid of selectors.includePlaces ?? []) places.add(geoid);
    if (
      (selectors.includeStates?.length ?? 0) > 0 ||
      (selectors.includeCounties?.length ?? 0) > 0 ||
      (selectors.includePlaces?.length ?? 0) > 0
    ) {
      withPlaceData += 1;
    }
  }
  return {
    regions: document.regions.length,
    withPlate: document.regions.filter((entry) => entry.plate !== null).length,
    withPlaceData,
    countiesNamed: counties.size,
    statesNamed: states.size,
    placesNamed: places.size,
    withContext: document.regions.filter((entry) => entry.context).length,
  };
}
