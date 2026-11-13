import { coreAPI } from "../core2/state";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import type { CoreState } from "../core2/types";

/**
 * Whether a person is at work at this minute of the game's date, from their
 * own work records (the ones that decide who is there now). With an
 * organization, only that employer's shift counts. The one reader both the
 * workplace visit and the home scene use, so nobody is in both rooms.
 */
export function isOnShift(
  core: CoreState,
  personId: string,
  minute: number,
  organizationId?: string,
): boolean {
  try {
    return workSpansOnDateV1(coreAPI(core), {
      controlledPersonId: personId,
      date: core.date,
    }).owners.some(
      (owner) =>
        (organizationId === undefined ||
          owner.organizationId === organizationId) &&
        owner.spans.some(
          (span) => span.startMinute <= minute && minute < span.endMinute,
        ),
    );
  } catch {
    return false;
  }
}
