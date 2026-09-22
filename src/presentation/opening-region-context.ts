import { openingRegionTypesForCountyProfile } from "./opening-region-profiles";
import type { LifePlace } from "../simulation/life-places";
import type { OpeningRegionType } from "./opening-regional-plate";

/** Reviewed illustrative associations, never World industries or actual venues.
 * Evidence and scope: docs/reference/regional-opening/README.md, WAVE2.md and WAVE3.md.
 * Owner review 755/756 authorizes reusable scene types; geographical evidence
 * supports only the bounded associations below, not every place in a state.
 */
const associations: readonly {
  readonly sourceGeoid: string;
  readonly stateJurisdictionKey: string;
  readonly displayName: string;
  readonly regionType: OpeningRegionType;
}[] = [
  {
    sourceGeoid: "4622260",
    stateJurisdictionKey: "US-SD",
    displayName: "Fort Pierre, South Dakota",
    regionType: "great-plains-grassland",
  },
  {
    sourceGeoid: "4649600",
    stateJurisdictionKey: "US-SD",
    displayName: "Pierre, South Dakota",
    regionType: "great-plains-grassland",
  },
  {
    sourceGeoid: "2160852",
    stateJurisdictionKey: "US-KY",
    displayName: "Pikeville, Kentucky",
    regionType: "appalachian-coal-region-town",
  },
  {
    sourceGeoid: "2135362",
    stateJurisdictionKey: "US-KY",
    displayName: "Hazard, Kentucky",
    regionType: "appalachian-coal-region-town",
  },
  {
    sourceGeoid: "4845000",
    stateJurisdictionKey: "US-TX",
    displayName: "Lubbock, Texas",
    regionType: "southern-high-plains",
  },
  {
    sourceGeoid: "4007300",
    stateJurisdictionKey: "US-OK",
    displayName: "Boise City, Oklahoma",
    regionType: "southern-high-plains",
  },
  {
    sourceGeoid: "4802104",
    stateJurisdictionKey: "US-TX",
    displayName: "Alpine, Texas",
    regionType: "trans-pecos-desert-mountain",
  },
  {
    sourceGeoid: "4850256",
    stateJurisdictionKey: "US-TX",
    displayName: "Nacogdoches, Texas",
    regionType: "southern-pine-hardwood",
  },
  {
    sourceGeoid: "4819972",
    stateJurisdictionKey: "US-TX",
    displayName: "Denton, Texas",
    regionType: "cross-timbers-oak-prairie",
  },
  {
    sourceGeoid: "4071350",
    stateJurisdictionKey: "US-OK",
    displayName: "Sulphur, Oklahoma",
    regionType: "cross-timbers-oak-prairie",
  },
  {
    sourceGeoid: "2719142",
    stateJurisdictionKey: "US-MN",
    displayName: "Ely, Minnesota",
    regionType: "northwoods-lake-forest",
  },
  {
    sourceGeoid: "2738564",
    stateJurisdictionKey: "US-MN",
    displayName: "Luverne, Minnesota",
    regionType: "upper-midwest-tallgrass-prairie",
  },
  {
    sourceGeoid: "5070450",
    stateJurisdictionKey: "US-VT",
    displayName: "Stowe, Vermont",
    regionType: "green-mountain-forest",
  },
  {
    sourceGeoid: "5010675",
    stateJurisdictionKey: "US-VT",
    displayName: "Burlington, Vermont",
    regionType: "champlain-lake-lowland",
  },
  {
    sourceGeoid: "5324810",
    stateJurisdictionKey: "US-WA",
    displayName: "Forks, Washington",
    regionType: "pacific-temperate-rainforest",
  },
  {
    sourceGeoid: "0477000",
    stateJurisdictionKey: "US-AZ",
    displayName: "Tucson, Arizona",
    regionType: "sonoran-desert",
  },
  {
    sourceGeoid: "4950700",
    stateJurisdictionKey: "US-UT",
    displayName: "Moab, Utah",
    regionType: "colorado-plateau-redrock",
  },
  {
    sourceGeoid: "0825115",
    stateJurisdictionKey: "US-CO",
    displayName: "Estes Park, Colorado",
    regionType: "rocky-mountain-montane",
  },
  {
    sourceGeoid: "1221425",
    stateJurisdictionKey: "US-FL",
    displayName: "Everglades, Florida",
    regionType: "subtropical-mangrove-wetland",
  },
  {
    sourceGeoid: "2302830",
    stateJurisdictionKey: "US-ME",
    displayName: "Bar Harbor, Maine",
    regionType: "north-atlantic-granite-coast",
  },
  {
    sourceGeoid: "2248785",
    stateJurisdictionKey: "US-LA",
    displayName: "Marrero, Louisiana",
    regionType: "lower-mississippi-delta-marsh",
  },
  {
    sourceGeoid: "5315080",
    stateJurisdictionKey: "US-WA",
    displayName: "Coulee City, Washington",
    regionType: "basalt-coulee-steppe",
  },
  {
    sourceGeoid: "4103150",
    stateJurisdictionKey: "US-OR",
    displayName: "Astoria, Oregon",
    regionType: "fishing-coast",
  },
  {
    sourceGeoid: "0132272",
    stateJurisdictionKey: "US-AL",
    displayName: "Gulf Shores, Alabama",
    regionType: "beach-coast",
  },
];

/** A surrounding-region illustration does not depict the saved home or move its resident. */
export function openingRegionTypesForPlace(
  place: LifePlace,
): readonly OpeningRegionType[] {
  if (place.scope !== "locality" || !place.sourceGeoid) return [];
  const direct = associations
    .filter(
      (entry) =>
        entry.sourceGeoid === place.sourceGeoid &&
        entry.stateJurisdictionKey === place.stateJurisdictionKey &&
        entry.displayName === place.displayName,
    )
    .map((entry) => entry.regionType);
  return direct.length > 0 || !place.stateJurisdictionKey
    ? direct
    : openingRegionTypesForCountyProfile(
        place.sourceGeoid,
        place.stateJurisdictionKey,
      );
}
