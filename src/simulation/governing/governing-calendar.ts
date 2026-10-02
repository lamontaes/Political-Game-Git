import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { scheduleFutureDueItem } from "../future-transitions";
import { legislativeProcedureForJurisdiction, regularSessionYearForWorld } from "../legislative-procedure-world";
import type { EntityId, World } from "../types";

/**
 * The state governing calendar the canonical clock keeps filled. Dependency
 * free on purpose: the clock's continuity step imports it.
 */

const STATE_GOVERNING_VERSION = "state-governing/v1";

export const GOVERNING_SEASON = "governing:season" as const;

export type SeasonKind = "budget" | "bill";

/**
 * Makes sure a governorship has its next budget season and bill day on the
 * calendar. Called from the clock's continuity step; writes only future due
 * items.
 */
export function scheduleGoverningSeasons(
  world: World,
  officeKey: string,
  jurisdictionId: EntityId,
): World {
  const calendar = legislativeProcedureForJurisdiction(world, jurisdictionId)
    ?.baselinePack.session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.state;
  let next = world;
  for (const kind of ["budget", "bill"] as const) {
    const dueAt = nextSessionCalendarDate(calendar, next.currentDate, kind, {
      eligibleYear: kind === "bill"
        ? (year) => regularSessionYearForWorld(next, jurisdictionId, year)
        : undefined,
    });
    const stableKey = `${STATE_GOVERNING_VERSION}:season:${officeKey}:${kind}:${dueAt}`;
    if (next.history.futureDueItems.some((due) => due.stableKey === stableKey))
      continue;
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt,
      transitionKey: GOVERNING_SEASON,
      entityIds: [jurisdictionId],
      jurisdictionId,
      provenance: {
        kind: "authored",
        note: `${calendar.id}: ${calendar.note}`,
      },
    });
  }
  return next;
}
