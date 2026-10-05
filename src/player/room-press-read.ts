import type { EntityId } from "../simulation";
import type { LivingSurfaceRecord } from "../presentation/living-scene-surfaces";
import {
  ROOM_PAPERS_SLOT_ID,
  ROOM_TELEVISION_SLOT_ID,
  type RoomMedia,
} from "../presentation/room-media";

/** Admit only the exact publication shown on the selected TV or newspaper. */
export function roomPressPublicationId(
  media: RoomMedia,
  slotId: string,
  record: LivingSurfaceRecord,
): EntityId | null {
  if (
    record.status !== "bound" ||
    record.kind !== "news" ||
    record.detail?.kind !== "article"
  )
    return null;
  const shown =
    slotId === ROOM_TELEVISION_SLOT_ID
      ? media.broadcast?.story?.publicationId
      : slotId === ROOM_PAPERS_SLOT_ID
        ? media.frontPage?.story?.publicationId
        : undefined;
  return shown && record.detail.article.id === shown ? shown : null;
}
