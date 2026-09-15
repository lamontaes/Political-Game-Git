import { useMemo } from "react";

import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import type { EntityId, World } from "../simulation";
import { projectWorldOrientation } from "../presentation/world-orientation-contract";
import {
  projectOrientationView,
  type OrientationView,
} from "../presentation/world-orientation";

const STATE_NAMES: Readonly<Record<string, string>> = US_STATE_NAMES;

export function stateNameForUsps(usps: string): string | null {
  return STATE_NAMES[usps] ?? null;
}

/**
 * The world introduction for this saved life, read from W's projection.
 *
 * Recomputed only when the World value changes. Reading it writes nothing,
 * materializes nobody and moves no clock, so opening, closing and reopening
 * the panels cannot change who holds office or how a portrait looks.
 */
export function useWorldOrientation(
  world: World,
  personId: EntityId,
): { readonly view: OrientationView; readonly homeStateUsps: string | null } {
  return useMemo(() => {
    const orientation = projectWorldOrientation(world, personId);
    return {
      view: projectOrientationView(orientation, stateNameForUsps),
      homeStateUsps: orientation.homeState?.stateUsps ?? null,
    };
  }, [world, personId]);
}
