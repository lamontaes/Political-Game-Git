/**
 * ONE VOCABULARY FOR WHERE A PICTURE MAY HONESTLY BE REUSED.
 *
 * A park plate is not "every park in America" because somebody tagged it
 * `outdoor`. Climate, built character, season and whether the place is a named
 * landmark are different facts, and mixing them is how a desert wash becomes a
 * Kentucky lawn. This module is the closed tag set and the compatibility rules.
 * It does not assign coverage percentages and it does not invent measurements.
 *
 * Source-reference region and allowed-reuse regions stay apart: the photograph
 * or drawing may have been made in one place while the plate is authorized for
 * a climate class, not a state-by-state sticker sheet.
 */

export const ART_DESK_CONTRACT_VERSION = "alive43-art-desk-v1" as const;

export type EnvironmentClass =
  | "civic-interior"
  | "domestic-interior"
  | "workplace-interior"
  | "storefront-interior"
  | "park-exterior"
  | "street-exterior"
  | "threshold-exterior"
  | "landmark-exterior"
  | "title-tableau";

export const ENVIRONMENT_CLASSES: readonly EnvironmentClass[] = [
  "civic-interior",
  "domestic-interior",
  "workplace-interior",
  "storefront-interior",
  "park-exterior",
  "street-exterior",
  "threshold-exterior",
  "landmark-exterior",
  "title-tableau",
];

export type ArchitecturalCharacter =
  | "wood-frame-residential"
  | "masonry-civic"
  | "storefront-commercial"
  | "timber-pavilion"
  | "open-lawn"
  | "stoop-and-sidewalk"
  | "chamber-or-hearing"
  | "press-or-briefing"
  | "unspecified-generic";

export const ARCHITECTURAL_CHARACTERS: readonly ArchitecturalCharacter[] = [
  "wood-frame-residential",
  "masonry-civic",
  "storefront-commercial",
  "timber-pavilion",
  "open-lawn",
  "stoop-and-sidewalk",
  "chamber-or-hearing",
  "press-or-briefing",
  "unspecified-generic",
];

export type ClimateClass =
  | "humid-continental"
  | "humid-subtropical"
  | "marine-west-coast"
  | "mediterranean"
  | "semi-arid"
  | "arid"
  | "alpine"
  | "tropical"
  | "polar";

export const CLIMATE_CLASSES: readonly ClimateClass[] = [
  "humid-continental",
  "humid-subtropical",
  "marine-west-coast",
  "mediterranean",
  "semi-arid",
  "arid",
  "alpine",
  "tropical",
  "polar",
];

export type TerrainClass =
  | "coastal-plain"
  | "inland-plain"
  | "rolling-hills"
  | "mountain"
  | "desert-basin"
  | "wetland"
  | "great-lakes"
  | "prairie";

export const TERRAIN_CLASSES: readonly TerrainClass[] = [
  "coastal-plain",
  "inland-plain",
  "rolling-hills",
  "mountain",
  "desert-basin",
  "wetland",
  "great-lakes",
  "prairie",
];

export type VegetationClass =
  | "deciduous-forest"
  | "mixed-forest"
  | "conifer"
  | "grassland"
  | "desert-scrub"
  | "wetland-plants"
  | "urban-sparse"
  | "none-interior";

export const VEGETATION_CLASSES: readonly VegetationClass[] = [
  "deciduous-forest",
  "mixed-forest",
  "conifer",
  "grassland",
  "desert-scrub",
  "wetland-plants",
  "urban-sparse",
  "none-interior",
];

export type SeasonClass =
  "winter" | "spring" | "summer" | "autumn" | "year-round-leaf";

export const SEASON_CLASSES: readonly SeasonClass[] = [
  "winter",
  "spring",
  "summer",
  "autumn",
  "year-round-leaf",
];

export type WeatherLightClass =
  "clear-day" | "overcast" | "golden-hour" | "night" | "rain" | "snow-falling";

export const WEATHER_LIGHT_CLASSES: readonly WeatherLightClass[] = [
  "clear-day",
  "overcast",
  "golden-hour",
  "night",
  "rain",
  "snow-falling",
];

export type IndoorOutdoor = "indoor" | "outdoor" | "threshold";

export const INDOOR_OUTDOOR: readonly IndoorOutdoor[] = [
  "indoor",
  "outdoor",
  "threshold",
];

/**
 * Census divisions are reuse *classes*, not a claim that one plate is every
 * city in the division. Exact named places use `placeIdentity` instead.
 */
export type UsCensusDivision =
  | "new-england"
  | "mid-atlantic"
  | "east-north-central"
  | "west-north-central"
  | "south-atlantic"
  | "east-south-central"
  | "west-south-central"
  | "mountain"
  | "pacific";

export const US_CENSUS_DIVISIONS: readonly UsCensusDivision[] = [
  "new-england",
  "mid-atlantic",
  "east-north-central",
  "west-north-central",
  "south-atlantic",
  "east-south-central",
  "west-south-central",
  "mountain",
  "pacific",
];

export type PlaceIdentityKind = "generic-reusable" | "exact-literal-site";

export const PLACE_IDENTITY_KINDS: readonly PlaceIdentityKind[] = [
  "generic-reusable",
  "exact-literal-site",
];

export interface PlaceIdentity {
  readonly kind: PlaceIdentityKind;
  /** Required when, and only when, the plate is a named real landmark. */
  readonly exactSiteName?: string;
}

export interface GeometryVariantLink {
  readonly parentAssetId: string;
  readonly parentGeometryId?: string;
  readonly geometryUnchanged: boolean;
  /**
   * When geometry changed, previously measured anchors on the parent must not
   * be copied. Missing stays missing until a new calibration.
   */
  readonly invalidatesParentAnchors: boolean;
}

export interface AssetCompatibilityTags {
  readonly environmentClass: EnvironmentClass;
  readonly architecturalCharacter: ArchitecturalCharacter;
  readonly climate: readonly ClimateClass[];
  readonly terrain: readonly TerrainClass[];
  readonly vegetation: readonly VegetationClass[];
  readonly seasons: readonly SeasonClass[];
  readonly weatherLight: readonly WeatherLightClass[];
  readonly indoorOutdoor: IndoorOutdoor;
  readonly sourceReferenceRegion: UsCensusDivision | "unspecified";
  readonly allowedReuseRegions: readonly UsCensusDivision[];
  readonly placeIdentity: PlaceIdentity;
  readonly exclusions: readonly string[];
  readonly snowCoverPossible: boolean;
  readonly geometryVariant?: GeometryVariantLink;
}

export type CompatibilityFindingCode =
  | "unknown-tag"
  | "exact-site-used-as-generic"
  | "generic-carries-exact-site-name"
  | "winter-implies-snow"
  | "snow-without-outdoor"
  | "desert-vegetation-in-wet-climate"
  | "interior-with-outdoor-vegetation"
  | "source-region-treated-as-sole-reuse"
  | "seasonal-variant-missing-parent"
  | "changed-geometry-reuses-anchors"
  | "empty-reuse-regions-for-generic"
  | "promised-coverage-percentage";

export interface CompatibilityFinding {
  readonly code: CompatibilityFindingCode;
  readonly severity: "error" | "warning";
  readonly message: string;
}

export interface CompatibilityValidation {
  readonly valid: boolean;
  readonly findings: readonly CompatibilityFinding[];
}

const WET_CLIMATES: readonly ClimateClass[] = [
  "humid-continental",
  "humid-subtropical",
  "marine-west-coast",
  "tropical",
];

export function tagsCompatible(
  tags: AssetCompatibilityTags,
  query: Partial<AssetCompatibilityTags>,
): boolean {
  if (
    query.environmentClass &&
    query.environmentClass !== tags.environmentClass
  ) {
    return false;
  }
  if (query.indoorOutdoor && query.indoorOutdoor !== tags.indoorOutdoor) {
    return false;
  }
  if (
    query.placeIdentity &&
    query.placeIdentity.kind !== tags.placeIdentity.kind
  ) {
    return false;
  }
  if (query.climate && query.climate.length > 0) {
    if (!query.climate.some((item) => tags.climate.includes(item)))
      return false;
  }
  if (query.seasons && query.seasons.length > 0) {
    if (!query.seasons.some((item) => tags.seasons.includes(item)))
      return false;
  }
  if (query.allowedReuseRegions && query.allowedReuseRegions.length > 0) {
    if (
      !query.allowedReuseRegions.some((item) =>
        tags.allowedReuseRegions.includes(item),
      )
    ) {
      return false;
    }
  }
  return true;
}

export function validateCompatibilityTags(
  tags: AssetCompatibilityTags,
): CompatibilityValidation {
  const findings: CompatibilityFinding[] = [];
  const error = (code: CompatibilityFindingCode, message: string) =>
    findings.push({ code, severity: "error", message });
  const warn = (code: CompatibilityFindingCode, message: string) =>
    findings.push({ code, severity: "warning", message });

  if (!ENVIRONMENT_CLASSES.includes(tags.environmentClass)) {
    error(
      "unknown-tag",
      `Unknown environment class '${tags.environmentClass}'.`,
    );
  }
  if (!ARCHITECTURAL_CHARACTERS.includes(tags.architecturalCharacter)) {
    error(
      "unknown-tag",
      `Unknown architectural character '${tags.architecturalCharacter}'.`,
    );
  }
  if (!INDOOR_OUTDOOR.includes(tags.indoorOutdoor)) {
    error("unknown-tag", `Unknown indoor/outdoor '${tags.indoorOutdoor}'.`);
  }
  for (const climate of tags.climate) {
    if (!CLIMATE_CLASSES.includes(climate)) {
      error("unknown-tag", `Unknown climate '${climate}'.`);
    }
  }
  for (const season of tags.seasons) {
    if (!SEASON_CLASSES.includes(season)) {
      error("unknown-tag", `Unknown season '${season}'.`);
    }
  }
  for (const region of tags.allowedReuseRegions) {
    if (!US_CENSUS_DIVISIONS.includes(region)) {
      error("unknown-tag", `Unknown reuse region '${region}'.`);
    }
  }

  if (
    tags.placeIdentity.kind === "exact-literal-site" &&
    tags.environmentClass !== "landmark-exterior" &&
    !tags.exclusions.includes("not-generic-scenery")
  ) {
    error(
      "exact-site-used-as-generic",
      "A named landmark cannot masquerade as unrelated generic scenery. Mark the environment class as landmark-exterior or exclude generic reuse.",
    );
  }
  if (
    tags.placeIdentity.kind === "generic-reusable" &&
    tags.placeIdentity.exactSiteName
  ) {
    error(
      "generic-carries-exact-site-name",
      "Generic reusable scenery must not carry a specific real site name.",
    );
  }
  if (
    tags.placeIdentity.kind === "exact-literal-site" &&
    !tags.placeIdentity.exactSiteName?.trim()
  ) {
    error(
      "exact-site-used-as-generic",
      "Exact-literal identity requires the named site. Unknown is not a replica.",
    );
  }

  if (tags.seasons.includes("winter") && tags.snowCoverPossible === true) {
    // Allowed, but winter alone must not be treated as snow everywhere.
  }
  if (
    tags.weatherLight.includes("snow-falling") &&
    tags.indoorOutdoor === "indoor"
  ) {
    error(
      "snow-without-outdoor",
      "Falling snow is an outdoor/threshold weather tag, not an interior texture.",
    );
  }
  if (
    tags.snowCoverPossible &&
    tags.seasons.length === 1 &&
    tags.seasons[0] === "winter" &&
    tags.exclusions.every((item) => item !== "winter-is-not-universal-snow")
  ) {
    warn(
      "winter-implies-snow",
      "Winter does not mean every local date has snow. Record snow as its own possibility and keep a snowless winter variant eligible.",
    );
  }

  if (
    tags.vegetation.includes("desert-scrub") &&
    tags.climate.some((climate) => WET_CLIMATES.includes(climate)) &&
    tags.climate.every((climate) => WET_CLIMATES.includes(climate))
  ) {
    error(
      "desert-vegetation-in-wet-climate",
      "Desert-scrub vegetation is not compatible with a solely wet-climate plate.",
    );
  }
  if (
    tags.indoorOutdoor === "indoor" &&
    tags.vegetation.some(
      (item) => item !== "none-interior" && item !== "urban-sparse",
    )
  ) {
    error(
      "interior-with-outdoor-vegetation",
      "Interior plates do not carry outdoor vegetation classes as if the room were a biome.",
    );
  }

  if (
    tags.sourceReferenceRegion !== "unspecified" &&
    tags.allowedReuseRegions.length === 1 &&
    tags.allowedReuseRegions[0] === tags.sourceReferenceRegion &&
    tags.placeIdentity.kind === "generic-reusable"
  ) {
    warn(
      "source-region-treated-as-sole-reuse",
      "The source-reference region is where the picture came from, not automatically the only climate/region that may reuse it. Broaden allowed reuse by climate class, or mark the plate exact-literal.",
    );
  }
  if (
    tags.placeIdentity.kind === "generic-reusable" &&
    tags.allowedReuseRegions.length === 0
  ) {
    error(
      "empty-reuse-regions-for-generic",
      "Generic scenery must name the census-division classes it may reuse, or it will be hand-labeled as every state.",
    );
  }

  const variant = tags.geometryVariant;
  if (tags.seasons.length === 1 && tags.seasons[0] !== "year-round-leaf") {
    if (!variant?.parentAssetId) {
      error(
        "seasonal-variant-missing-parent",
        "A seasonal variant must name its parent asset and geometry. Season is not a new park.",
      );
    }
  }
  if (
    variant &&
    !variant.geometryUnchanged &&
    !variant.invalidatesParentAnchors
  ) {
    error(
      "changed-geometry-reuses-anchors",
      "Changed geometry invalidates parent anchor reuse. Recalibrate; do not copy the parent's contacts.",
    );
  }

  for (const exclusion of tags.exclusions) {
    if (/%|percent|coverage quota/i.test(exclusion)) {
      error(
        "promised-coverage-percentage",
        "Director image-count and percentage examples are not generation quotas or factual geographic weights.",
      );
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

/** Humid-continental / east-south-central generic park, snow not implied. */
export const GENERIC_HUMID_PARK_TAGS: AssetCompatibilityTags = {
  environmentClass: "park-exterior",
  architecturalCharacter: "timber-pavilion",
  climate: ["humid-continental", "humid-subtropical"],
  terrain: ["inland-plain", "rolling-hills"],
  vegetation: ["deciduous-forest", "mixed-forest", "urban-sparse"],
  seasons: ["summer", "spring", "autumn"],
  weatherLight: ["clear-day", "overcast", "golden-hour"],
  indoorOutdoor: "outdoor",
  sourceReferenceRegion: "east-south-central",
  allowedReuseRegions: [
    "east-south-central",
    "east-north-central",
    "south-atlantic",
    "mid-atlantic",
  ],
  placeIdentity: { kind: "generic-reusable" },
  exclusions: ["not-a-named-city-park", "winter-is-not-universal-snow"],
  snowCoverPossible: false,
};

export const GENERIC_DOORSTEP_TAGS: AssetCompatibilityTags = {
  environmentClass: "threshold-exterior",
  architecturalCharacter: "stoop-and-sidewalk",
  climate: ["humid-continental", "humid-subtropical", "marine-west-coast"],
  terrain: ["inland-plain", "rolling-hills", "coastal-plain"],
  vegetation: ["urban-sparse"],
  seasons: ["year-round-leaf"],
  weatherLight: ["clear-day", "overcast"],
  indoorOutdoor: "threshold",
  sourceReferenceRegion: "unspecified",
  allowedReuseRegions: [...US_CENSUS_DIVISIONS],
  placeIdentity: { kind: "generic-reusable" },
  exclusions: ["not-a-named-address"],
  snowCoverPossible: false,
};

export function winterVariantOf(
  parent: AssetCompatibilityTags,
  parentAssetId: string,
  geometryUnchanged: boolean,
): AssetCompatibilityTags {
  return {
    ...parent,
    seasons: ["winter"],
    weatherLight: parent.weatherLight.filter((item) => item !== "snow-falling"),
    snowCoverPossible: false,
    exclusions: [
      ...parent.exclusions.filter(
        (item) => item !== "winter-is-not-universal-snow",
      ),
      "winter-is-not-universal-snow",
    ],
    geometryVariant: {
      parentAssetId,
      geometryUnchanged,
      invalidatesParentAnchors: !geometryUnchanged,
    },
  };
}
