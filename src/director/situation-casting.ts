/**
 * The director's casting records, read as they are: the situation types
 * (`data/situation-types.json`) and the arc variants by family
 * (`data/arc-variants.json`). The English engine's rules read who says a line
 * to whom and where from these (`src/english/spot-tags.ts`), through this
 * entry rather than the data files. No logic here.
 */
import situationFile from "./data/situation-types.json" with { type: "json" };
import variantFile from "./data/arc-variants.json" with { type: "json" };

/** The situation types, as the file holds them. */
export const SITUATION_TYPES: readonly unknown[] = (
  situationFile as unknown as { types: unknown[] }
).types;

/** The arc variants by family, as the file holds them. */
export const ARC_VARIANT_FAMILIES: Readonly<Record<string, unknown>> =
  (variantFile as unknown as { families?: Record<string, unknown> }).families ??
  {};
