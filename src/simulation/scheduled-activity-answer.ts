import type { EntityId, World } from "./types";

/**
 * What became of an optional hold, in three states rather than two.
 *
 * The game used to have one answer for two different things. Passing ordinary
 * time wrote `life.scheduled-activity-declined` for every optional hold the
 * clock ran past, with a fabricated `choice` of "Decline <title>" — for holds
 * the player was never shown and never saw a control for. Three systems then
 * read those records as refusals: an organizer followed up about a meeting the
 * player had supposedly turned down, a chapter invitation showed as declined,
 * and a campaign activity counted as refused. None of it had happened.
 *
 * So the two acts are now two records. A refusal is the player saying no, and
 * carries the `chosen` tag. A lapse is time passing over something nobody
 * answered, and says exactly that.
 *
 * The third state is for what is already written. Every
 * `life.scheduled-activity-declined` record made before the split could have
 * come from either path and there is no way to tell which, so it reads as
 * `unknown`. Those records keep loading and are not reinterpreted: the game
 * does not get to decide now what a player did then. A consumer that needs a
 * refusal treats `unknown` as not one, because asserting a refusal the world
 * cannot evidence is the error this whole split exists to undo.
 */

export const ACTIVITY_DECLINED_EVENT = "life.scheduled-activity-declined";
export const ACTIVITY_LAPSED_EVENT = "life.scheduled-activity-lapsed";
export const INVITATION_DECLINED_EVENT = "life.social-invitation-declined";

/** Marks a decline the player actually chose, as against one time wrote. */
export const CHOSEN_TAG = "chosen";

export type ScheduledActivityAnswer =
  /** Nothing has been written about this hold either way. */
  | "unanswered"
  /** The player said no. */
  | "refused"
  /** Time passed over it and nobody answered. */
  | "lapsed"
  /**
   * A record exists but predates the split between refusing and lapsing, so
   * which one it was is not knowable. Not a refusal and not a lapse.
   */
  | "unknown";

/**
 * What this world can say about these holds. Pure.
 *
 * `holdIds` is a set because one answer can release a hold and the travel to
 * it. A refusal anywhere in the set wins over a lapse, and a lapse over an
 * ambiguous record, because the most specific thing the world recorded is the
 * most it knows.
 */
export function scheduledActivityAnswer(
  world: World,
  holdIds: readonly EntityId[],
): ScheduledActivityAnswer {
  let seen: ScheduledActivityAnswer = "unanswered";
  for (const event of world.history.events) {
    if (!holdIds.some((id) => event.involvedEntityIds.includes(id))) continue;
    if (event.type === ACTIVITY_LAPSED_EVENT) {
      // A refusal returns immediately, so nothing here can already be one.
      seen = "lapsed";
      continue;
    }
    if (
      event.type !== ACTIVITY_DECLINED_EVENT &&
      event.type !== INVITATION_DECLINED_EVENT
    ) {
      continue;
    }
    if (event.tags.includes(CHOSEN_TAG)) return "refused";
    if (seen === "unanswered") seen = "unknown";
  }
  return seen;
}

/**
 * Whether the player refused. `unknown` is deliberately not a refusal: a
 * consumer asserting one on an ambiguous record is the defect this replaced.
 */
export function wasRefused(
  world: World,
  holdIds: readonly EntityId[],
): boolean {
  return scheduledActivityAnswer(world, holdIds) === "refused";
}
