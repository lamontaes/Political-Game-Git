/**
 * Named source adapter for place demography. Matching lives with life-place
 * identity so the player runtime can import it without the source substrate.
 */
export {
  readPlaceDemography,
  type PlaceDemographyBeaObservation,
  type PlaceDemographyEconomicInput,
  type PlaceDemographyOmission,
  type PlaceDemographyOmissionReason,
  type PlaceDemographyReadModel,
  type PlacePopulationObservation,
} from "../../simulation/place-demography";
