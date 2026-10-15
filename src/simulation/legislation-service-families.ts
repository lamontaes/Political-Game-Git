import serviceData from "../../data/content/legislation-families/services.json" with { type: "json" };
import type { ProgramFamily } from "./legislation-content-contracts";
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

/** Existing registry order and keys survive; each clause uses the shared renderer. */
export const SERVICE_FAMILIES: readonly ProgramFamily[] =
  serviceData.families.map(({ variants, ...family }) => ({
    ...family,
    variants: variants.map((variant) =>
      programVariantFromData(variant as unknown as ProgramVariantData),
    ),
  })) as unknown as readonly ProgramFamily[];
