import { useMemo } from "react";

import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import type { EntityId, World } from "../simulation";
import { projectWorldOrientation } from "../presentation/world-orientation-contract";
import {
  projectOrientationView,
  type OrientationView,
} from "../presentation/world-orientation";
import {
  regionalOpeningPlateFor,
  regionalPlaceQuery,
  type RegionalOpeningResult,
} from "../presentation/regional-opening-plate";

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
): {
  readonly view: OrientationView;
  readonly homeStateUsps: string | null;
  /**
   * The regional plate for this life's place, or the reason there is none.
   *
   * Resolved here rather than inside the orientation projection, which is a
   * pure reading of the saved World and must not learn about bundled files.
   */
  readonly regionalPlate: RegionalOpeningResult;
} {
  return useMemo(() => {
    const orientation = projectWorldOrientation(world, personId);
    const homeStateUsps = orientation.homeState?.stateUsps ?? null;
    return {
      view: projectOrientationView(orientation, stateNameForUsps),
      homeStateUsps,
      regionalPlate: regionalOpeningPlateFor(
        regionalPlaceQuery(
          world,
          homeStateUsps,
          orientation.locality?.jurisdictionId ?? null,
        ),
      ),
    };
  }, [world, personId]);
}
