import type { LifePlace } from "../simulation/life-places";
import type { OpeningRegionType } from "./opening-regional-plate";

/** Reviewed illustrative associations, never World industries or actual venues.
 * Evidence and scope: docs/reference/regional-opening/README.md.
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
];

/** A surrounding-region illustration does not depict the saved home or move its resident. */
export function openingRegionTypesForPlace(
  place: LifePlace,
): readonly OpeningRegionType[] {
  if (place.scope !== "locality" || !place.sourceGeoid) return [];
  return associations
    .filter(
      (entry) =>
        entry.sourceGeoid === place.sourceGeoid &&
        entry.stateJurisdictionKey === place.stateJurisdictionKey &&
        entry.displayName === place.displayName,
    )
    .map((entry) => entry.regionType);
}
