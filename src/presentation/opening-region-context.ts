import { researchRuleTable } from "../simulation/research-rule-tables";
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
}[] = researchRuleTable("openingRegionAssociations") as readonly {
  readonly sourceGeoid: string;
  readonly stateJurisdictionKey: string;
  readonly displayName: string;
  readonly regionType: OpeningRegionType;
}[];

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
