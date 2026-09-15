import { useMemo } from "react";

import type { ShellState } from "../presentation/shell-navigation";
import {
  projectWorldRecap,
  type WorldRecap,
} from "../presentation/world-recap";
import type { EntityId, World } from "../simulation";

/**
 * The recap for the world as it now stands, or null.
 *
 * Only a read. It is recomputed from the saved World and the shell's frontier;
 * it never dispatches, so rendering, reopening menus or reloading cannot mark
 * anything as seen. Before the frontier is known (the first render of a life)
 * there is nothing to compare against and so nothing to show.
 */
export function useWorldRecap(
  world: World,
  personId: EntityId,
  shell: ShellState,
): WorldRecap | null {
  const frontier = shell.progress.recapFrontier;
  return useMemo(
    () =>
      frontier === null ? null : projectWorldRecap(world, personId, frontier),
    [world, personId, frontier],
  );
}
