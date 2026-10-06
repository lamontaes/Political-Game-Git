import type { BrowserWorldSummary } from "./browser-world-repository";
import type { EntityId } from "../simulation/types";

/** Saved copies of this life that must be removed after its one slot is written. */
export function olderOneSaveSlots(
  saves: readonly BrowserWorldSummary[],
  worldId: EntityId,
  currentSaveId: EntityId,
): readonly EntityId[] {
  return saves
    .filter((save) => save.worldId === worldId && save.saveId !== currentSaveId)
    .map((save) => save.saveId);
}
