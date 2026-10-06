import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { scheduleFutureDueItem } from "../future-transitions";
import { scheduleNextLegislativeSessionCompletion } from "./legislative-session-completion";
import {
  legislativeProcedureForJurisdiction,
  regularSessionYearForWorld,
} from "../legislative-procedure-world";
import { chiefExecutiveJurisdictionId } from "../nationwide-world/government-jurisdiction";
import {
  stateExecutiveIdentity,
  US_STATE_USPS,
} from "../nationwide-world/state-executive-candidacy-packs";
import type { EntityId, World } from "../types";

/**
 * The state governing due records the canonical clock keeps filled. Dates
 * come from the body's shared timetable; session-year admission stays separate.
 */

const STATE_GOVERNING_VERSION = "state-governing/v1";

export const GOVERNING_SEASON = "governing:season" as const;

export type SeasonKind = "budget" | "bill";

/** Seed the same rolling bill-season queue for every opened statehouse. */
export function scheduleNationwideStateBillSeasons(
  world: World,
  states: readonly string[] = US_STATE_USPS,
): World {
  let next = world;
  for (const stateUsps of states) {
    const identity = stateExecutiveIdentity(stateUsps);
    const jurisdictionId = chiefExecutiveJurisdictionId(stateUsps);
    if (!identity || !jurisdictionId || !next.jurisdictions[jurisdictionId])
      continue;
    next = scheduleNextStateBillSeason(
      next,
      identity.officeKey,
      jurisdictionId,
    );
  }
  return next;
}

function scheduleNextStateBillSeason(
  world: World,
  officeKey: string,
  jurisdictionId: EntityId,
): World {
  const calendar =
    legislativeProcedureForJurisdiction(world, jurisdictionId)?.baselinePack
      .session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.state;
  const dueAt = nextSessionCalendarDate(calendar, world.currentDate, "bill", {
    eligibleYear: (year) =>
      regularSessionYearForWorld(world, jurisdictionId, year),
  });
  const stableKey = `${STATE_GOVERNING_VERSION}:season:${officeKey}:bill:${dueAt}`;
  let next = world;
  if (!world.history.futureDueItems.some((due) => due.stableKey === stableKey))
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
  const stateUsps = US_STATE_USPS.find(
    (code) => stateExecutiveIdentity(code)?.officeKey === officeKey,
  );
  if (stateUsps)
    next = scheduleNextLegislativeSessionCompletion(
      next,
      `US-${stateUsps}`,
    );
  return next;
}

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
    if (kind === "bill") {
      next = scheduleNextStateBillSeason(next, officeKey, jurisdictionId);
      continue;
    }
    const dueAt = nextSessionCalendarDate(calendar, next.currentDate, kind);
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
