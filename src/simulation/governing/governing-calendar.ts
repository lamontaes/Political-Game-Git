import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  legislativeProcedureForJurisdiction,
  regularSessionYearForWorld,
} from "../legislative-procedure-world";
import type { EntityId, World } from "../types";

/**
 * The state governing due records the canonical clock keeps filled. Dates
 * come from the body's shared timetable; session-year admission stays separate.
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
  municipal?: { readonly kind: "municipal"; readonly governmentKey: string },
): World {
  const government = municipal
    ? municipalGovernmentByKey(municipal.governmentKey)
    : null;
  const submission = government
    ? primaryReading(government).budget.submissionDeadline?.monthDay
    : null;
  const baseline =
    legislativeProcedureForJurisdiction(world, jurisdictionId)?.baselinePack
      .session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.state;
  const budgetCalendar = baseline.tasks?.budget
    ? baseline
    : LEGISLATIVE_SESSION_CALENDARS.state;
  const calendar = submission
    ? {
        ...baseline,
        id: `municipal-budget:${municipal!.governmentKey}`,
        note: "The recorded municipal budget submission date.",
        tasks: {
          ...baseline.tasks,
          budget: { kind: "annual" as const, monthDays: [submission] },
        },
      }
    : municipal
      ? budgetCalendar
      : baseline;
  let next = world;
  const kinds: readonly SeasonKind[] = municipal
    ? ["budget"]
    : ["budget", "bill"];
  for (const kind of kinds) {
    const dueAt = nextSessionCalendarDate(calendar, next.currentDate, kind, {
      eligibleYear:
        kind === "bill"
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
