import {
  campaignLifeActivityForScheduledActivity,
  campaignLifeCatalogEntry,
  createCampaignElectionTransitionRegistry,
  type CampaignLifeAttendance,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import {
  attendPartyWork,
  partyWorkBlockedReason,
  partyWorkBlockingActivityId,
} from "./campaign-life-actions";
import { projectPartyAndCommunityWork } from "./campaign-life-surface";
import { venueActivities } from "./venue-activity";

/**
 * Attending a party or campaign activity from the Calendar.
 *
 * The Calendar's ordinary Attend button goes through the venue route, which
 * resolves an entry by its scene venue. A remote activity — the phone shift
 * worked from home — has no scene venue to travel to, so the venue route does
 * not recognise it and the button could only answer that the event "could not
 * be played now". The activity was on the calendar, the player could see it,
 * and there was no way to work it from there.
 *
 * This is the bridge, and only a bridge. It finds the party/campaign activity
 * behind a calendar entry, and hands the work to CAMPAIGN's own writer
 * (`attendPartyWork`), which waits out the hold, performs the scheduled
 * activity and records the attendance exactly once. No clock is added here and
 * no outcome is composed here: every sentence a player reads comes back out of
 * the lane's own projection.
 *
 * Reading is separate from doing. `calendarCampaignLifeEntry` is pure and is
 * what a result panel uses; it never records anything.
 */

/** What the Calendar can say and do about a party or campaign activity. */
export interface CalendarCampaignLifeEntry {
  /** CAMPAIGN's id for the activity, which is what its writers take. */
  readonly lifeActivityId: EntityId;
  /** True when the venue route cannot play this entry, so this route must. */
  readonly needsLaneRoute: boolean;
  /** The lane's state label, already in player words. */
  readonly stateLabel: string;
  /** Why it cannot be worked right now, from the lane. Null when it can. */
  readonly blockedReason: string | null;
  readonly blockingActivityId: EntityId | null;
  /** The calendar entry has passed and only the record is outstanding. */
  readonly awaitingRecord: boolean;
  /** Already worked and recorded. */
  readonly completed: boolean;
  /** What happened, in the lane's words. Empty until it has happened. */
  readonly outcomeLines: readonly string[];
}

/**
 * The party or campaign activity behind a calendar entry, or null when the
 * entry is not one. Pure: it only projects, so opening a panel with it cannot
 * record an attendance.
 */
export function calendarCampaignLifeEntry(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): CalendarCampaignLifeEntry | null {
  const record = campaignLifeActivityForScheduledActivity(world, activityId);
  if (!record) return null;
  if (record.subjectPersonId !== personId) return null;

  const row = projectPartyAndCommunityWork(world, personId, handlers).rows.find(
    (candidate) => candidate.lifeActivityId === record.id,
  );
  if (!row) return null;

  // The venue route recognises an entry only when its location is a scene
  // venue. Where it does not, this is the only route the player has.
  const playableAsVenue = venueActivities(world, personId, handlers).some(
    (candidate) => candidate.activity.id === activityId,
  );

  return {
    lifeActivityId: record.id,
    needsLaneRoute:
      campaignLifeCatalogEntry(record.form).presence === "remote" ||
      !playableAsVenue,
    stateLabel: row.stateLabel,
    blockedReason: partyWorkBlockedReason(world, personId, record.id, handlers),
    blockingActivityId: partyWorkBlockingActivityId(
      world,
      personId,
      record.id,
      handlers,
    ),
    awaitingRecord: row.awaitingRecord,
    completed: row.state === "completed" && row.outcomeLines.length > 0,
    outcomeLines: row.outcomeLines,
  };
}

/**
 * Works and records a party or campaign activity, shaped for the shared time
 * command's `perform`.
 *
 * The writer is CAMPAIGN's. It returns the same World when something already
 * on the calendar comes first, and the lane's own refusal sentence says why.
 * When time moved but the activity did not happen, the time that passed is
 * kept and the outcome says so — the same sentence the party and community
 * work panel gives, because it is read from the same projection.
 */
export function attendCalendarCampaignLifeActivity(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  attendance: CampaignLifeAttendance = "attended",
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): { readonly world: World; readonly outcome: string } {
  const entry = calendarCampaignLifeEntry(
    world,
    personId,
    activityId,
    handlers,
  );
  if (!entry) {
    return {
      world,
      outcome: "That calendar entry is not a party or campaign activity.",
    };
  }

  let next: World;
  try {
    next = attendPartyWork(
      world,
      personId,
      entry.lifeActivityId,
      attendance,
      handlers,
    );
  } catch (error) {
    // The lane throws one plain sentence. It is the player's answer.
    return {
      world,
      outcome: error instanceof Error ? error.message : String(error),
    };
  }

  if (next === world) {
    return {
      world,
      outcome:
        entry.blockedReason ??
        "Something already on the calendar has to happen first.",
    };
  }

  const after = calendarCampaignLifeEntry(next, personId, activityId, handlers);
  if (after && after.outcomeLines.length > 0) {
    return { world: next, outcome: after.outcomeLines.join(" ") };
  }
  // Time moved and nothing was recorded: the clock stopped for something real
  // on the way. The World keeps what did happen.
  return {
    world: next,
    outcome:
      "Something came up before you got there. The time that passed is kept; you can try again.",
  };
}
