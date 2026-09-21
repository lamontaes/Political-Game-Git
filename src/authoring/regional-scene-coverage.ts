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
 * PRECEDENCE, most specific first. An excluded place beats everything; then an
 * included place; then excluded county, included county, excluded state,
 * included state. Below all of that sits one coarse tier: the census division
 * from `asset-compatibility.ts`, used only when exactly one region's
 * `allowedReuseRegions` covers the player's division. Two regions claiming the
 * same division is not a tie to break, it is an unanswered question.
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
   * Reuse vocabulary from `asset-compatibility.ts`. Optional while a scene is
   * still being tagged; without it the region has no census-division fallback,
   * which is a narrower claim rather than a broken one.
   */
  readonly compatibility?: AssetCompatibilityTags;
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
}

export type RegionalPlateMissReason =
  /** The save does not say where the player lives. */
  | "no-place-known"
  /** A region matched by name but its picture is not delivered yet. */
  | "matched-region-has-no-plate"
  /** Nothing claims this place, at any level. */
  | "no-region-covers-this-place"
  /** Two or more regions claim it equally. Not a tie to break. */
  | "ambiguous-coverage";

export type RegionalPlateResolution =
  | {
      readonly outcome: "plate";
      readonly regionKey: string;
      readonly displayName: string;
      readonly plate: RegionalPlateFile;
      /** Which rule matched, so a reviewer can check the claim. */
      readonly matchedBy: RegionalMatchLevel;
    }
  | {
      readonly outcome: "none";
      readonly reason: RegionalPlateMissReason;
      /** Regions involved in the miss, for the ambiguous and undelivered cases. */
      readonly regionKeys: readonly string[];
    };

export type RegionalMatchLevel =
  "place" | "county" | "state" | "census-division";

/** Most specific first. Exclusion at a level removes the region entirely. */
const MATCH_ORDER: readonly RegionalMatchLevel[] = ["place", "county", "state"];

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
 * Pick the plate for a place, or say honestly that there is none.
 *
 * Never returns a nearest match. Every "none" carries the reason, because
 * "no region covers Wyoming" and "the Rocky Mountain plate is approved but its
 * bytes are not in the repository" are different problems with different fixes,
 * and a blank intro looks identical either way.
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
  const eligible = document.regions.filter((entry) =>
    MATCH_ORDER.every((level) => judge(entry, query, level) !== "excluded"),
  );

  for (const level of MATCH_ORDER) {
    const matched = eligible.filter(
      (entry) => judge(entry, query, level) === "matched",
    );
    if (matched.length === 0) continue;
    return settle(matched, level);
  }

  const division = censusDivisionOf(query.stateKey);
  if (division) {
    const claiming = eligible.filter((entry) =>
      entry.compatibility?.allowedReuseRegions.includes(division),
    );
    if (claiming.length > 0) return settle(claiming, "census-division");
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
 * A single region with a delivered plate is the answer. A single region without
 * one is a miss that names itself, so the gap is reportable. More than one is
 * ambiguous even if only one of them has a plate: picking the delivered one
 * would quietly make delivery order decide what a player sees.
 */
function settle(
  matched: readonly RegionalSceneEntry[],
  level: RegionalMatchLevel,
): RegionalPlateResolution {
  const keys = matched.map((entry) => entry.regionKey);
  if (matched.length > 1) {
    return { outcome: "none", reason: "ambiguous-coverage", regionKeys: keys };
  }
  const entry = matched[0]!;
  if (!entry.plate) {
    return {
      outcome: "none",
      reason: "matched-region-has-no-plate",
      regionKeys: keys,
    };
  }
  return {
    outcome: "plate",
    regionKey: entry.regionKey,
    displayName: entry.displayName,
    plate: entry.plate,
    matchedBy: level,
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

    const claimsSomething =
      (places.includeStates?.length ?? 0) > 0 ||
      (places.includeCounties?.length ?? 0) > 0 ||
      (places.includePlaces?.length ?? 0) > 0 ||
      (entry.compatibility?.allowedReuseRegions.length ?? 0) > 0;
    if (!claimsSomething) {
      warn(
        "region-claims-nothing",
        key,
        `No place, county, state or reuse division names this region, so it can never be shown. Honest for an unresearched scene; a bug for a delivered one.`,
      );
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
}

export function summarizeRegionalSceneCoverage(
  document: RegionalSceneCoverageDocument,
): RegionalCoverageSummary {
  const counties = new Set<string>();
  const states = new Set<string>();
  let withPlaceData = 0;
  for (const entry of document.regions) {
    const places = entry.places;
    for (const geoid of places.includeCounties ?? []) counties.add(geoid);
    for (const key of places.includeStates ?? []) states.add(key.toUpperCase());
    if (
      (places.includeStates?.length ?? 0) > 0 ||
      (places.includeCounties?.length ?? 0) > 0 ||
      (places.includePlaces?.length ?? 0) > 0
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
  };
}
