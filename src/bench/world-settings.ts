// Custom world (M6-04): the new-game settings, applied to the opening by the
// core's own settings step (src/core2/tooling/generated-world.ts).
import {
  applyOpeningSettings,
  checkSettings,
  scaleOutsideSales,
  type WorldSettings,
} from "../core2/tooling/generated-world";
import type { CoreInput } from "../core2/types";

export type { WorldSettings };

/** The bounds the core's generated world checks. */
export const checkWorldSettings = checkSettings;

/** Wages and household cash, recorded on the world as the player's choice. */
export function applyWorldSettings(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  if (!Object.keys(settings).length) return input;
  return applyOpeningSettings(input, settings);
}

/** Outside buyers' demand for the town's firms, on the two-level flows. */
export function scaleOutsideDemand(
  input: CoreInput,
  settings: WorldSettings,
): CoreInput {
  return scaleOutsideSales(settings.economy?.outsideDemand ?? 1, input);
}
