import localFiscalData from "../../data/content/legislation-families/local-fiscal.json";
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

export const LOCAL_FIX_IT_FIRST_PROPOSITION_KEY =
  localFiscalData.propositionKey;

/** Existing registry exports survive; wording and NPC tuples are authored rows. */
export const LOCAL_FIX_IT_FIRST_VARIANT = programVariantFromData(
  localFiscalData.variant as unknown as ProgramVariantData,
);
