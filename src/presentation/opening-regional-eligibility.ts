import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import type {
  OpeningRegionalPlateCandidate,
  OpeningRegionType,
} from "./opening-regional-plate";

/** Labels only: geography is still owned by the existing selector/profile data. */
export const OPENING_REGION_LABELS: Readonly<
  Record<OpeningRegionType, string>
> = {
  "great-plains-grassland": "Great Plains grassland",
  "appalachian-coal-region-town": "Appalachian coal-region towns",
  "fishing-coast": "Fishing coast",
  "beach-coast": "Beach coast",
  "northern-california-oak-woodland": "Northern California oak woodland",
  "southern-california-inland-bungalow":
    "Southern California inland neighborhoods",
  "southern-high-plains": "Southern High Plains",
  "trans-pecos-desert-mountain": "Trans-Pecos desert and mountains",
  "southern-pine-hardwood": "Southern pine and hardwood woodland",
  "cross-timbers-oak-prairie": "Cross Timbers oak and prairie",
  "northwoods-lake-forest": "Northwoods lakes and forest",
  "upper-midwest-tallgrass-prairie": "Upper Midwest tallgrass prairie",
  "green-mountain-forest": "Green Mountain forest",
  "champlain-lake-lowland": "Champlain lake lowlands",
  "pacific-temperate-rainforest": "Pacific temperate rainforest",
  "sonoran-desert": "Sonoran Desert",
  "colorado-plateau-redrock": "Colorado Plateau red rock",
  "rocky-mountain-montane": "Rocky Mountain montane forest",
  "subtropical-mangrove-wetland": "Subtropical mangrove wetlands",
  "north-atlantic-granite-coast": "North Atlantic granite coast",
  "lower-mississippi-delta-marsh": "Lower Mississippi delta marsh",
  "basalt-coulee-steppe": "Basalt coulee steppe",
};
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Declared eligibility, never an installed-use or approval receipt.
 * Region labels do not broaden exact qualified places in opening-region-context.
 */
export function openingRegionalEligibilityLabels(
  candidate: OpeningRegionalPlateCandidate,
) {
  const states = lifePlaceStateIdentities();
  return {
    regions: (candidate.coverage.regionTypes ?? []).map((key) => ({
      key,
      label: OPENING_REGION_LABELS[key],
    })),
    places: (candidate.coverage.placeKeys ?? []).map((key) => ({
      key,
      label: lifePlaceByKey(key)?.displayName ?? null,
    })),
    states: (candidate.coverage.stateJurisdictionKeys ?? []).map((key) => ({
      key,
      label:
        states.find((entry) => entry.jurisdictionKey === key)?.name ?? null,
    })),
    months:
      candidate.months === undefined
        ? null
        : candidate.months.map((month) => ({
            month,
            label: Number.isInteger(month) ? (months[month - 1] ?? null) : null,
          })),
    generic: candidate.coverage.generic === true,
    scopeNote:
      "Available only where the regional selector qualifies this setting and season; eligibility does not establish use in a saved life.",
  };
}
