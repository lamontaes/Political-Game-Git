import { makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import type { EntityId, IsoDate, World } from "../types";

/**
 * The state governing calendar the canonical clock keeps filled. Dependency
 * free on purpose: the clock's continuity step imports it.
 */

const STATE_GOVERNING_VERSION = "state-governing/v1";

/**
 * PROVISIONAL, and awaiting SOURCED RULES rather than anyone's sign-off. A
 * disclosed game calendar, not any state's law.
 *
 * overrideSucceedsPercent is the weakest of these: one national chance applied
 * without reference to the state's override threshold, the session calendar or
 * who holds the chamber. lamontae ruled against choosing a better number on
 * 2026-09-22 ("no hardcoding"); filed as
 * legislative-step-pacing-and-veto-override.
 */
export const STATE_GOVERNING_CALENDAR = {
  id: "ocd-state-governing-calendar/v1",
  /** Budget requests are prepared each year from this day. */
  budgetSeason: "12-01",
  /** Days in a year when the legislature sends the governor a bill. */
  billDays: ["02-15", "03-15", "04-15"],
  /** Chance a returned bill is passed again over the governor's objection. */
  overrideSucceedsPercent: 25,
} as const;

export const GOVERNING_SEASON = "governing:season" as const;

export type SeasonKind = "budget" | "bill";

function seasonDates(kind: SeasonKind): readonly string[] {
  return kind === "budget"
    ? [STATE_GOVERNING_CALENDAR.budgetSeason]
    : STATE_GOVERNING_CALENDAR.billDays;
}

function nextSeasonDate(kind: SeasonKind, after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  for (let y = year; y <= year + 1; y += 1)
    for (const monthDay of seasonDates(kind)) {
      const date = makeIsoDate(`${y}-${monthDay}`);
      if (date > after) return date;
    }
  throw new Error("No season date found.");
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
): World {
  let next = world;
  for (const kind of ["budget", "bill"] as const) {
    const dueAt = nextSeasonDate(kind, next.currentDate);
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
        note: `${STATE_GOVERNING_CALENDAR.id}: the game's ${kind === "budget" ? "budget season" : "bill presentment day"}, not a state's law.`,
      },
    });
  }
  return next;
}
