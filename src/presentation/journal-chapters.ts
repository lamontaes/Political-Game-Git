import type { EntityId, IsoDate, World } from "../simulation";
import { projectLifeRecord, type LifeRecordChapter } from "./life-record";

/**
 * Temporary chapter seam for B19. Session 7's shared prose composer has not
 * landed yet, so this deliberately reuses the canonical life-record chapters
 * without adding boundaries, titles or biography of its own.
 */
export function composeChapters(
  world: World,
  personId: EntityId,
  through: IsoDate,
): readonly LifeRecordChapter[] {
  const cutoff = through > world.currentDate ? world.currentDate : through;
  return projectLifeRecord({ ...world, currentDate: cutoff }, personId)
    .chapters;
}
