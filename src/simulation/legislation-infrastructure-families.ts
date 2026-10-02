import infrastructureData from "../../data/content/legislation-families/infrastructure.json";
import type { ProgramFamily } from "./legislation-content-contracts";
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

/** Existing registry order and keys survive; each clause uses the shared renderer. */
export const INFRASTRUCTURE_FAMILIES: readonly ProgramFamily[] =
  infrastructureData.families.map(({ variants, ...family }) => ({
    ...family,
    variants: variants.map((variant) =>
      programVariantFromData(variant as unknown as ProgramVariantData),
    ),
  })) as unknown as readonly ProgramFamily[];
