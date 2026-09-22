/**
 * THE REGIONAL PLATE THE INTRO ACTUALLY PAINTS.
 *
 * `src/authoring/regional-scene-coverage.ts` decides which plate a place may
 * honestly show; this module is the half that knows about the saved World and
 * about the bundler. It reads the place the player actually lives in, asks the
 * resolver, and hands back a URL the panel can put in an `img`.
 *
 * It also supplies the season, read from the saved world's date, so the
 * resolver can rule out a picture that shows the wrong time of year.
 *
 * Two things it deliberately does not do. It does not fall back to a nearby
 * region when the resolver says no: the resolver's "none" is the answer, and
 * the intro shows the step without a picture. And it does not invent a GEOID.
 * A place the save cannot identify resolves by state at best, which is a
 * weaker claim honestly made rather than a guess dressed as data.
 *
 * The plate files are optional in a checkout. A public clone without the art
 * has no URLs, and every resolution reports `plate-file-missing` rather than
 * rendering a broken image.
 */

import coverageDocument from "../../art/regions/regional-scene-places.json";
import type {
  RegionalPlaceQuery,
  RegionalSceneCoverageDocument,
  RegionalSceneKind,
} from "../authoring/regional-scene-coverage";
import {
  resolveRegionalPlate,
  seasonOfIsoDate,
} from "../authoring/regional-scene-coverage";
import type { EntityId, World } from "../simulation";
import { optionalGlob } from "./optional-glob";

export const REGIONAL_SCENE_COVERAGE: RegionalSceneCoverageDocument =
  coverageDocument as RegionalSceneCoverageDocument;

const urls = optionalGlob(() =>
  import.meta.glob<string>("../../art/families/regional-opening/*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

/** `art/families/regional-opening/x.png` to the key the glob uses. */
function globKey(repositoryPath: string): string {
  return `../../${repositoryPath}`;
}

export interface RegionalOpeningPlate {
  readonly regionKey: string;
  /** What the region is called, for the caption and the alt text. */
  readonly displayName: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Which rule matched: place, county, state or census-division. */
  readonly matchedBy: string;
  /** How the picture may be captioned. */
  readonly sceneKind: RegionalSceneKind;
  /** The other pictures that were equally valid for this place. */
  readonly alternatives: readonly string[];
}

export type RegionalOpeningMiss =
  | "no-place-known"
  | "matched-region-has-no-plate"
  | "no-region-covers-this-place"
  | "no-picture-fits-this-context"
  | "conflicting-coverage"
  /** The coverage names a file this checkout does not carry. */
  | "plate-file-missing";

export type RegionalOpeningResult =
  | { readonly kind: "plate"; readonly plate: RegionalOpeningPlate }
  | {
      readonly kind: "none";
      readonly reason: RegionalOpeningMiss;
      readonly regionKeys: readonly string[];
    };

/**
 * Read the place identity out of a jurisdiction record.
 *
 * The corpus writes `us-place-<geoid>` and `us-county-<geoid>` into the
 * jurisdiction slug, which is the only place a GEOID survives into a save. An
 * authored jurisdiction with neither shape simply has no GEOID, and says so by
 * returning nothing.
 */
export function geoidsFromJurisdiction(
  world: World,
  jurisdictionId: EntityId | null,
): { placeGeoid?: string; countyGeoids?: readonly string[] } {
  if (!jurisdictionId) return {};
  const slug = world.jurisdictions?.[jurisdictionId]?.slug;
  if (!slug) return {};
  const place = /^us-place-(\d{7})$/.exec(slug);
  if (place) return { placeGeoid: place[1]! };
  const county = /^us-county-(\d{5})$/.exec(slug);
  if (county) return { countyGeoids: [county[1]!] };
  return {};
}

/**
 * Resolve the intro plate for a query.
 *
 * Split from the World reader so a test can ask about a place without building
 * a save, and so the resolver's reasons survive all the way to the caller
 * instead of collapsing into a null.
 */
export function regionalOpeningPlateFor(
  query: RegionalPlaceQuery,
  document: RegionalSceneCoverageDocument = REGIONAL_SCENE_COVERAGE,
): RegionalOpeningResult {
  const resolution = resolveRegionalPlate(document, query);
  if (resolution.outcome === "none") {
    return {
      kind: "none",
      reason: resolution.reason,
      regionKeys: resolution.regionKeys,
    };
  }
  const url = urls[globKey(resolution.plate.path)];
  if (!url) {
    return {
      kind: "none",
      reason: "plate-file-missing",
      regionKeys: [resolution.regionKey],
    };
  }
  return {
    kind: "plate",
    plate: {
      regionKey: resolution.regionKey,
      displayName: resolution.displayName,
      url,
      width: resolution.plate.width,
      height: resolution.plate.height,
      matchedBy: resolution.matchedBy,
      sceneKind: resolution.sceneKind,
      alternatives: resolution.alternatives,
    },
  };
}

/**
 * Build the query from a saved world's home state and locality.
 *
 * `stateUsps` is a bare code in the orientation projection and a `US-XX` key in
 * the rule packs; the coverage data speaks the rule-pack form, so it is
 * converted here rather than in the data, where somebody would eventually write
 * one of each.
 */
export function regionalPlaceQuery(
  world: World,
  homeStateUsps: string | null,
  localityJurisdictionId: EntityId | null,
): RegionalPlaceQuery {
  return {
    stateKey: homeStateUsps ? `US-${homeStateUsps.toUpperCase()}` : null,
    ...geoidsFromJurisdiction(world, localityJurisdictionId),
    /**
     * The season comes from the world's own date, so a January life never sees
     * a green canopy and a July one never sees bare branches. Reading the date
     * is a read: it moves no clock and writes nothing.
     */
    season: seasonOfIsoDate(world.currentDate) ?? undefined,
  };
}
