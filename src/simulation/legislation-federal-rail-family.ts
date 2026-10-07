import federalRailData from "../../data/content/legislation-families/federal-rail.json" with { type: "json" };
import {
  programVariantFromData,
  type ProgramVariantData,
} from "./legislation-family-data";

export const FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY =
  federalRailData.propositionKey;

/** Existing registry exports survive; wording and NPC tuples are authored rows. */
export const FEDERAL_PASSENGER_RAIL_VARIANT = programVariantFromData(
  federalRailData.variant as unknown as ProgramVariantData,
);
