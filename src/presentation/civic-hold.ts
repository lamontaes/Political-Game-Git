import {
  CAMPAIGN_LIFE_CATALOG,
  type ScheduledActivityRecord,
} from "../simulation";

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
