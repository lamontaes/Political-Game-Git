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
import { addDays, makeIsoDate } from "../dates";
import { stateKeyForJurisdiction } from "../life-places";
import type { EntityId, IsoDate, World } from "../types";
import stateSessionCalendar from "../../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };

/**
 * The state governing due records the canonical clock keeps filled. Dates
 * come from the body's shared timetable; session-year admission stays separate.
 */

const STATE_GOVERNING_VERSION = "state-governing/v1";

type SessionWindow = {
  readonly conveneAt: string;
  readonly adjournAt: string | "full-year";
};

const REGULAR_SESSIONS = (
  stateSessionCalendar as unknown as {
    readonly regularSessions: Readonly<
      Record<string, readonly SessionWindow[]>
    >;
  }
).regularSessions;
const RECORDED_SESSION_YEAR = Number(stateSessionCalendar.asOf.slice(0, 4));

export const GOVERNING_SEASON = "governing:season" as const;

export type SeasonKind = "budget" | "bill";

/** Read only the calendar year the source actually records. */
export function recordedStateSessionWindows(
  jurisdictionKey: string,
  onDate: IsoDate,
): readonly SessionWindow[] | null {
  if (Number(onDate.slice(0, 4)) !== RECORDED_SESSION_YEAR) return null;
  return REGULAR_SESSIONS[jurisdictionKey] ?? null;
}

/** A per-jurisdiction session record applies to its recorded year. */
function recordedStateBillDate(
  world: World,
  jurisdictionId: EntityId,
):
  | { readonly covered: false }
  | { readonly covered: true; readonly dueAt: IsoDate | null } {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  const key = jurisdiction && stateKeyForJurisdiction(jurisdiction);
  const sessions = key
    ? recordedStateSessionWindows(key, world.currentDate)
    : null;
  if (sessions === null) return { covered: false };
  for (const session of sessions) {
    const opensAt = makeIsoDate(session.conveneAt);
    const closesAt =
      session.adjournAt === "full-year"
        ? makeIsoDate(`${session.conveneAt.slice(0, 4)}-12-31`)
        : makeIsoDate(session.adjournAt);
    const nextAt =
      world.currentDate < opensAt
        ? opensAt
        : world.currentDate < closesAt
          ? addDays(world.currentDate, 7)
          : null;
    if (nextAt && nextAt > world.currentDate && nextAt <= closesAt)
      return { covered: true, dueAt: nextAt };
  }
  return {
    covered: true,
    dueAt: nextSessionCalendarDate(
      LEGISLATIVE_SESSION_CALENDARS.state,
      world.currentDate,
      "bill",
      {
        notBefore: makeIsoDate(`${RECORDED_SESSION_YEAR + 1}-01-01`),
        eligibleYear: (year) =>
          regularSessionYearForWorld(world, jurisdictionId, year),
      },
    ),
  };
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
    const recordedBillDate =
      kind === "bill" && !municipal
        ? recordedStateBillDate(next, jurisdictionId)
        : { covered: false as const };
    if (recordedBillDate.covered && recordedBillDate.dueAt === null) continue;
    const dueAt =
      kind === "bill" && recordedBillDate.covered
        ? recordedBillDate.dueAt!
        : nextSessionCalendarDate(calendar, next.currentDate, kind, {
            eligibleYear:
              kind === "bill"
                ? (year) =>
                    regularSessionYearForWorld(next, jurisdictionId, year)
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
