import { workPendingEntriesFor } from "../simulation";
import type { EntityId, World, WorkFocusTarget } from "../simulation";
import { offersAwaitingAnswer, projectToday } from "./day-overview";

/**
 * The papers in the room, and where each one is answered.
 *
 * "What is waiting on me?" has had an answer in this codebase for a while:
 * `projectToday` reads it from records that already exist. What it has never
 * had is a way to DO anything about it. The day renders that list as plain
 * sentences, so a player who reads "an offer of work is waiting for your
 * answer" is told a true thing and left to go and find the screen that answers
 * it. That is the gap this module closes, and it closes it by resolving a
 * route rather than by writing a second list: every entry here is an entry
 * `projectToday` already returned, in the same order, with the same words.
 *
 * The route is DERIVED from the work item's own `focus`, which the writer that
 * created the item set at the time. Nothing here guesses. Where a record gives
 * no route, the entry says so in `kind: "none"` with the reason, because an
 * item that cannot be reached is a real thing to know about the game and a
 * fabricated destination is not.
 *
 * It reads. It writes nothing, it spends no time, and it has no state of its
 * own — which is the rule the room object built on it has to keep: hover
 * reveals, activation inspects, and only an explicit commitment on the surface
 * that owns the matter costs the player anything.
 */

/**
 * Where a paper is answered.
 *
 * A closed vocabulary, so a consumer handles every case or fails to compile.
 * Each value corresponds to a route the player runtime already has; none of
 * them is a new surface invented for this list.
 */
export type PaperDestination =
  /** A scheduled commitment, opened where the calendar shows it. */
  | { readonly kind: "commitment"; readonly activityId: EntityId }
  /** Somebody else. Opened as the person, because they are the matter. */
  | { readonly kind: "person"; readonly personId: EntityId }
  /** A surface the player runtime already navigates to by name. */
  | {
      readonly kind: "surface";
      readonly surface: "work" | "calendar";
      /** A section of that surface, when the answer lives in one. */
      readonly section?: "campaign";
    }
  /**
   * Answered where the player is already standing, with the time they have.
   * Not a missing route: an errand is done by doing it, and sending somebody
   * to another screen to be told that would be the hunting this replaces.
   */
  | { readonly kind: "here" }
  /** No route is on the record. The reason is stated, never papered over. */
  | { readonly kind: "none"; readonly reason: string };

export interface HouseholdPaper {
  /** The same key `projectToday` used, so the two lists can be compared. */
  readonly key: string;
  /** The same sentence. One copy of the words, written where they were. */
  readonly sentence: string;
  readonly destination: PaperDestination;
}

/**
 * An offer of work is answered where work is.
 *
 * `projectToday` writes these entries itself, from `offersAwaitingAnswer`,
 * rather than from a work item, so there is no `focus` to read and the key is
 * the only thing to match on. The prefix is the one it writes.
 */
const WORK_OFFER_PREFIX = "work-offer:";

function destinationForFocus(
  focus: WorkFocusTarget,
  playerPersonId: EntityId,
): PaperDestination {
  switch (focus.kind) {
    case "calendar-item":
      return { kind: "commitment", activityId: focus.scheduledActivityId };
    case "person":
      // An item focused on the player is not a route to the player. It is the
      // ordinary shape of an errand: the subject is the person doing it, and
      // it is done with the time they have, where they are.
      return focus.personId === playerPersonId
        ? { kind: "here" }
        : { kind: "person", personId: focus.personId };
    case "legislative-material":
      return { kind: "surface", surface: "work" };
    case "other":
      return {
        kind: "none",
        reason: `this is recorded against '${focus.targetKey}', which no surface opens by name yet`,
      };
  }
}

export function projectHouseholdPapers(
  world: World,
  personId: EntityId,
): readonly HouseholdPaper[] {
  const waiting = projectToday(world, personId).waiting;
  const offers = offersAwaitingAnswer(world, personId);
  // Keyed once, not searched per entry: a long-lived character accumulates
  // work items, and this is read on every render of the room.
  const byStableKey = new Map(
    workPendingEntriesFor(world, personId).map((entry) => [
      entry.item.stableKey,
      entry.item,
    ]),
  );

  return waiting.map((entry) => {
    if (entry.key.startsWith(WORK_OFFER_PREFIX)) {
      // A won executive term is answered by qualifying on Campaigns, not by
      // accepting on Work, so it opens the section that holds the control.
      const offer = offers.find(
        (candidate) =>
          `${WORK_OFFER_PREFIX}${candidate.relationshipId}` === entry.key,
      );
      return {
        key: entry.key,
        sentence: entry.sentence,
        destination:
          offer?.answer === "qualify"
            ? ({
                kind: "surface",
                surface: "work",
                section: "campaign",
              } as const)
            : ({ kind: "surface", surface: "work" } as const),
      };
    }
    const item = byStableKey.get(entry.key);
    return {
      key: entry.key,
      sentence: entry.sentence,
      destination: item
        ? destinationForFocus(item.focus, personId)
        : {
            kind: "none" as const,
            reason:
              "the day says it is waiting, and no work item this character can read carries that key",
          },
    };
  });
}
