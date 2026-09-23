import {
  CAMPAIGN_LIFE_CATALOG,
  compareSimulationMoments,
  currentLifeCutoff,
  daysBetween,
  futureDueItemStateAt,
  scheduledActivityState,
  type EntityId,
  type IsoDate,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import { venueActivities } from "./venue-activity";

/**
 * How far a quiet stretch may run, whichever control asked for it.
 *
 * There were two quiet stretches and only one of them looked at the calendar.
 * "Let time pass" stopped at the next thing on it; "Let the weeks run on",
 * which the story offers when it has nothing else to say, ran the full pacing
 * length regardless. A Nevada life measured on September 22 took that second
 * button about forty times and lost five years to it, walking past party
 * meetings, posted public meetings and door canvasses it had been invited to,
 * each recorded afterwards as having passed without an answer. Both controls
 * now ask this module, so neither can step over a date the other would stop at.
 */

export interface KnownCalendarItem {
  readonly title: string;
  readonly date: IsoDate;
}

/**
 * Where civic life happens on the calendar: the community room that posted
 * public meetings, party chapter meetings and in-person campaign shifts share,
 * and the phone shift worked from home. Read from the campaign activity
 * catalog so a new form of civic activity brings its own location with it.
 */
const CIVIC_LOCATION_KEYS: ReadonlySet<string> = new Set(
  Object.values(CAMPAIGN_LIFE_CATALOG).map((entry) => entry.locationKey),
);

/**
 * A tentative hold for a public, party or campaign occasion, as against a
 * social one. An unanswered social invitation may lapse during a quiet
 * stretch, which the interruption checklist lets the player change; a civic
 * one is always a stop, because walking past it is the political game
 * deciding for the player.
 */
export function isCivicHold(activity: ScheduledActivityRecord): boolean {
  return (
    activity.kind === "tentative" &&
    CIVIC_LOCATION_KEYS.has(activity.location.locationKey)
  );
}

export interface KnownCalendarOptions {
  /**
   * Whether an unanswered social invitation stops the stretch too. "Let time
   * pass" has always stopped at every hold; "Let the weeks run on" is offered
   * when nothing needs the player, so it stops for civic holds and for
   * commitments but lets a social invitation lapse. Defaults to true.
   */
  readonly socialHolds?: boolean;
}

/**
 * The earliest dated thing already waiting on this person after today: a
 * scheduled activity they take part in, or a due item that names them.
 *
 * When a journey and the thing it leads to fall on the same day, the thing
 * itself names the stop, because "Journey to the community room" says less
 * than the meeting it is a journey to.
 */
export function nextKnownCalendarItem(
  world: World,
  personId: EntityId,
  options: KnownCalendarOptions = {},
): KnownCalendarItem | null {
  const socialHolds = options.socialHolds ?? true;
  let best: { title: string; date: IsoDate; travel: boolean } | null = null;
  for (const activity of world.history.scheduledActivities) {
    if (!activity.participantPersonIds.includes(personId)) continue;
    if (!socialHolds && activity.kind === "tentative" && !isCivicHold(activity))
      continue;
    const state = scheduledActivityState(world, activity.id);
    if (state.status !== "scheduled") continue;
    if (state.start.date <= world.currentDate) continue;
    // A journey is a stop only for what it leads to. One leading to a social
    // hold this stretch lets lapse would otherwise stop it on that day anyway.
    if (!socialHolds && activity.kind === "travel") {
      const destination = world.history.scheduledActivities.find(
        (candidate) =>
          activity.sourceEntityIds.includes(candidate.id) &&
          candidate.kind === "tentative",
      );
      if (destination && !isCivicHold(destination)) continue;
    }
    const travel = activity.kind === "travel";
    if (
      !best ||
      state.start.date < best.date ||
      (state.start.date === best.date && best.travel && !travel)
    )
      best = { title: activity.title, date: state.start.date, travel };
  }
  const cutoff = currentLifeCutoff(world);
  for (const due of world.history.futureDueItems) {
    if (!due.entityIds.includes(personId)) continue;
    if (due.dueAt <= world.currentDate) continue;
    if (futureDueItemStateAt(world, due.id, cutoff)?.status !== "scheduled")
      continue;
    if (!best || due.dueAt < best.date)
      best = { title: "A dated matter", date: due.dueAt, travel: false };
  }
  return best ? { title: best.title, date: best.date } : null;
}

/**
 * The pacing length, cut short at the next known calendar item.
 *
 * The stretch ends on the morning of that item's day, so an evening meeting is
 * still ahead when the player gets the clock back and can be gone to.
 */
export function capQuietStretch(
  world: World,
  personId: EntityId,
  pacingDays: number,
  options: KnownCalendarOptions = {},
): { readonly days: number; readonly cappedBy: KnownCalendarItem | null } {
  const next = nextKnownCalendarItem(world, personId, options);
  if (next) {
    const until = daysBetween(world.currentDate, next.date);
    if (until >= 1 && until <= pacingDays)
      return { days: until, cappedBy: next };
  }
  return { days: pacingDays, cappedBy: null };
}

/**
 * Something on today's calendar the player can go to from here.
 *
 * Read from the same venue list the Places and Calendar screens use, so the
 * refusals are theirs: a hold with a refusal (too late, too far, a conflict)
 * is not offered. Journeys are not offered on their own; going to the event
 * makes its journey.
 */
export function goableToday(
  world: World,
  personId: EntityId,
): readonly ScheduledActivityRecord[] {
  return venueActivities(world, personId)
    .filter((entry) => {
      if (entry.refusal) return false;
      if (entry.activity.kind === "travel") return false;
      const start = scheduledActivityState(world, entry.activity.id).start;
      return (
        start.date === world.currentDate &&
        compareSimulationMoments(start, world.currentMoment) >= 0
      );
    })
    .map((entry) => entry.activity);
}
