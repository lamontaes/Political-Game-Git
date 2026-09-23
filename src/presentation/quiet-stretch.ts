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
import { nextOwnElection } from "./own-election";
import { EARLIER_COMMITMENT_REFUSAL, venueActivities } from "./venue-activity";

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
  /**
   * Whether a dated matter that names the person stops the stretch. The world
   * names the player on many of them that ask nothing of the player: a local
   * development step, a weekly campaign evaluation, a party organizer's
   * outreach. Near an election in Nevada those stopped "Let the weeks run on"
   * every day or two, so the story's button leaves them to the story and
   * stops only for the calendar and the player's own election. Defaults to
   * true.
   */
  readonly dueItems?: boolean;
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
  if (options.dueItems === false)
    return best ? { title: best.title, date: best.date } : null;
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
  let days = pacingDays;
  let cappedBy: KnownCalendarItem | null = null;
  const next = nextKnownCalendarItem(world, personId, options);
  if (next) {
    const until = daysBetween(world.currentDate, next.date);
    if (until >= 1 && until <= days) {
      days = until;
      cappedBy = next;
    }
  }
  // The player's own election ends the stretch the morning after, when the
  // result is in (the Running for office lane's rule, shared here so both
  // quiet buttons keep it).
  const election = nextOwnElection(world, personId);
  if (election) {
    const until = daysBetween(world.currentDate, election.electionDate) + 1;
    if (until >= 1 && until < days) {
      days = until;
      cappedBy = {
        title: `Election day: ${election.title}`,
        date: election.electionDate,
      };
    }
  }
  return { days, cappedBy };
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

/**
 * Holds today the player could turn down to free a later one.
 *
 * An unanswered invitation at noon blocks an evening meeting, because the
 * venue list will not let anyone attend a later activity while an earlier one
 * is still open. Without a way to answer the noon one, the only choice left
 * was to let the weeks run on, which lapsed both. So when something later
 * today is blocked, each earlier open hold is offered as one to turn down.
 */
export function blockingHoldsToday(
  world: World,
  personId: EntityId,
): readonly ScheduledActivityRecord[] {
  const today = venueActivities(world, personId).filter((entry) => {
    if (entry.activity.kind === "travel") return false;
    const start = scheduledActivityState(world, entry.activity.id).start;
    return (
      start.date === world.currentDate &&
      compareSimulationMoments(start, world.currentMoment) >= 0
    );
  });
  const blocked = today.filter(
    (entry) => entry.refusal === EARLIER_COMMITMENT_REFUSAL,
  );
  if (blocked.length === 0) return [];
  const latest = blocked
    .map((entry) => scheduledActivityState(world, entry.activity.id).start)
    .reduce((a, b) => (compareSimulationMoments(a, b) >= 0 ? a : b));
  return today
    .filter(
      (entry) =>
        entry.activity.kind === "tentative" &&
        compareSimulationMoments(
          scheduledActivityState(world, entry.activity.id).start,
          latest,
        ) < 0,
    )
    .map((entry) => entry.activity);
}
