import { backdropFor, orgPlace } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import type { CoreState } from "../core2/types";
import type { JournalChapter } from "../director/journal";

/** Noon: the light the picture of a place in the journal is shown in. */
const MIDDAY_MINUTE = 12 * 60;

/**
 * The picture of the place a chapter's lead lines happened in, from the
 * records the lines were written from: the first line that cites
 * an organization (a job held, a school attended) is pictured at that
 * organization's workplace or school, the same picture a scene there draws. A
 * chapter whose lines name no such place has none, and the screen draws no
 * slot for it.
 */
export function chapterPicture(
  core: CoreState,
  personId: string,
  chapter: JournalChapter,
): { url: string; recordId: string } | null {
  for (const line of chapter.lines)
    for (const recordId of line.sourceRecordIds) {
      // A line cites the organization it tells of (the employer, the school) by its record id.
      const place = core.organizations.has(recordId)
        ? orgPlace(core, recordId)
        : null;
      if (place && hasBackdrop(place))
        return {
          url: backdropFor(core, place, MIDDAY_MINUTE, personId).url,
          recordId,
        };
    }
  return null;
}
