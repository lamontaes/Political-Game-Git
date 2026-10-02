import administrationData from "../../data/content/legislation-families/administration.json";
import type { ProgramFamily } from "./legislation-content-contracts";
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

/** Existing family, variant and clause order survive through the shared renderer. */
export const PUBLIC_ADMINISTRATION_FAMILIES = administrationData.families.map(
  ({ variants, ...family }) => ({
    ...family,
    variants: variants.map((variant) =>
      programVariantFromData(variant as unknown as ProgramVariantData),
    ),
  }),
) as unknown as readonly ProgramFamily[];

export const STANDING_ASSISTANCE_AUTHORITY =
  PUBLIC_ADMINISTRATION_FAMILIES[0]!.standingAuthorities![0]!;
