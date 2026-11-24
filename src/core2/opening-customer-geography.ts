import { corePlaceByJurisdictionId, corePlaceByKey } from "./place-lookup";
import {
  livingCostsRegionForState,
  type LivingCostsRegion,
} from "./reference/living-costs-data";
import type { EntityId } from "./kernel/brands";
import type { CoreInput, Source } from "./types";

/**
 * Saved outside-market record shape still read by the finance visitor
 * validator for previously recorded terms. The opening builds none.
 */
export interface OpeningCustomerOutsideMarket {
  id: string;
  destinationPlaceId: string;
  originPlaceId: string;
  originPlaceName: string;
  /** Population is geography evidence, never a customer demand multiplier. */
  originSourcePopulation: number;
  basisRecordIds: readonly string[];
  source: Source;
}

export interface OpeningCustomerPlaceContext {
  jurisdictionKey: string;
  region: LivingCostsRegion;
  source: Source;
}

export type OpeningCustomerGeographyProvider = (
  placeId: string,
  input: CoreInput,
) => OpeningCustomerPlaceContext | undefined;

/**
 * The place's state and living-costs region for opening customer priors.
 * Outside visitors' lodging spending is carried by the outside market.
 */
export function createOpeningCustomerGeographyProvider(): OpeningCustomerGeographyProvider {
  return (placeId, input) => {
    const metadataPlace = input.placeMetadata?.placeKey
      ? corePlaceByKey(input.placeMetadata.placeKey)
      : undefined;
    const place =
      corePlaceByJurisdictionId(placeId as EntityId) ??
      (metadataPlace?.context.jurisdiction.id === placeId
        ? metadataPlace
        : undefined);
    if (!place?.stateJurisdictionKey) return undefined;
    return {
      jurisdictionKey: place.stateJurisdictionKey,
      region: livingCostsRegionForState(place.stateJurisdictionKey),
      source: {
        tag: "ESTIMATED",
        asOf: input.startedAt,
        generationPriorVintage: "2025 canonical place directory",
        citation: `Canonical LifePlace ${place.key}; state ${place.stateJurisdictionKey}.`,
        estimatedFrom:
          "Directory identity supplies the state and living-costs region used for opening customer priors.",
      },
    };
  };
}
