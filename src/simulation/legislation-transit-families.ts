import data from "../../data/content/legislation-families/transit.json" with { type: "json" };
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";
import type { ProgramParameterOption } from "./legislation-content-contracts";
import type { TransitFundingMandate } from "./transit-funding";

// Preserve existing import names and saved variant keys; wording lives in rows.
export const TRANSIT_FAMILY_KEY = data.familyKey;
export const TRANSIT_FAMILY_VERSION = data.familyVersion;
export const LEGACY_TRANSIT_COMPILED_STATE = data.legacyCompiledState;
export const TRANSIT_PROGRAM_KEY = data.programKey;
export const STATE_TRANSIT_SERVICE_QUESTION = data.serviceQuestion;
export const TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR =
  data.contractPriceMinorUnitsPerHour;
export const TRANSIT_SERVICE_CHOICES =
  data.serviceChoices as readonly (ProgramParameterOption & {
    readonly value: TransitFundingMandate["serviceWindow"];
  })[];
export const TRANSIT_VARIANT_KEY = data.variants[0]!.variantKey;
export const STATE_TRANSIT_VARIANT_KEY = data.variants[1]!.variantKey;
export const TRANSIT_SERVICE_VARIANT = programVariantFromData(
  data.variants[0] as unknown as ProgramVariantData,
);
export const STATE_TRANSIT_SERVICE_VARIANT = programVariantFromData(
  data.variants[1] as unknown as ProgramVariantData,
);
