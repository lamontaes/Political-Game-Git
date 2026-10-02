import fiscalData from "../../data/content/legislation-families/fiscal.json";
import {
  STATE_TRANSIT_SERVICE_VARIANT,
  TRANSIT_SERVICE_VARIANT,
} from "./legislation-transit-families";
import { FEDERAL_PASSENGER_RAIL_VARIANT } from "./legislation-federal-rail-family";
import { LOCAL_FIX_IT_FIRST_VARIANT } from "./legislation-local-fiscal-families";
import type { ProgramFamily } from "./legislation-content-contracts";
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

const families = fiscalData.families.map(({ variants, ...family }) => ({
  ...family,
  variants: variants.map((variant) =>
    programVariantFromData(variant as unknown as ProgramVariantData),
  ),
})) as unknown as readonly ProgramFamily[];

/** The separate leaf variants keep their existing survivor order. */
export const FISCAL_INSTRUMENT_FAMILIES: readonly ProgramFamily[] = [
  {
    ...families[0]!,
    variants: [
      ...families[0]!.variants,
      TRANSIT_SERVICE_VARIANT,
      FEDERAL_PASSENGER_RAIL_VARIANT,
      LOCAL_FIX_IT_FIRST_VARIANT,
      STATE_TRANSIT_SERVICE_VARIANT,
    ],
  },
  ...families.slice(1),
];

export const STANDING_TRANSIT_AUTHORITY = families[0]!.standingAuthorities![0]!;
export const STANDING_NON_SPENDING_AUTHORITY =
  families[0]!.standingAuthorities![2]!;
