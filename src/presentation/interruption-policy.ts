import {
  createCampaignElectionTransitionRegistry,
  scheduledActivityState,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";
import { addDays, daysBetween } from "../simulation/dates";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import { PRESS_DESK_SWEEP_TRANSITION_KEY } from "../simulation/press";
import {
  DEFAULT_INTERRUPTIONS,
  type InterruptionPreferences,
} from "./shell-navigation";

/**
 * The player's interruption checklist, applied to the existing clock.
 *
 * This is a thin policy adapter over the one advance contract the game has.
 * It never moves time itself and it never authorizes anything: a preference
 * here can only make a skip stop MORE often. What already stops a skip — a
 * confirmed commitment, a journey, a decision that needs the player — stays a
 * stop whatever the checklist says, because those are not preferences.
 *
 * Two categories have a real consumer today:
 *
 * - Work shifts. The routine hook lets an ordinary personal work window run on
 *   its own during a skip. Asking to be stopped for shifts makes that window
 *   a blocking commitment again, so the skip halts before the shift starts.
 *   The same answer gates "simulate attendance" on the calendar, so the
 *   player's standing preference and the calendar's gate cannot disagree.
 * - Tentative holds. Passing a day lets an optional hold lapse at its start,
 *   recorded as a decline. Asking to be stopped for holds halts the skip at
 *   the hold instead, with the hold still standing.
 */

export interface InterruptionCategory {
  readonly key: keyof InterruptionPreferences | "always";
  readonly label: string;
  readonly detail: string;
}

/** What the on-demand checklist offers, in the order it is read. */
export const INTERRUPTION_CATEGORIES: readonly InterruptionCategory[] = [
  {
    key: "always",
    label: "Confirmed commitments, journeys and decisions that need you",
    detail: "A skip always stops for these. Not a preference.",
  },
  {
    key: "stopForWorkShifts",
    label: "Ordinary work shifts",
    detail:
      "Off: routine shifts run on their own while time passes. On: the skip stops before each shift.",
  },
  {
    key: "stopForTentativeHolds",
    label: "Invitations and tentative holds",
    detail:
      "Off: a hold you never answered lapses when its time comes, recorded as declined. On: the skip stops at the hold.",
  },
];

export function interruptionHandlers(
  preferences: InterruptionPreferences = DEFAULT_INTERRUPTIONS,
): FutureTransitionHandlerRegistry {
  const base = createCampaignElectionTransitionRegistry();
  const routine = base.routine;
  if (!routine || !preferences.stopForWorkShifts) return base;
  return {
    ...base,
    routine: {
      ...routine,
      isAutoResolvableActivity: () => false,
      projectWindows: (world, target) =>
        routine
          .projectWindows(world, target)
          .map((window) => ({ ...window, autoResolvable: false })),
    },
  };
}

/**
 * A tentative hold of the controlled person that starts exactly now.
 *
 * Used by the day skip to decide whether it has reached a hold the player
 * asked to be stopped for. Null when nothing optional is due at this minute.
 */
export function tentativeHoldDueNow(
  world: World,
  personId: EntityId,
): EntityId | null {
  for (const activity of world.history.scheduledActivities) {
    if (activity.kind !== "tentative") continue;
    if (!activity.participantPersonIds.includes(personId)) continue;
    const state = scheduledActivityState(world, activity.id);
    if (state.status !== "scheduled") continue;
    if (
      state.start.date === world.currentMoment.date &&
      state.start.minuteOfDay === world.currentMoment.minuteOfDay
    )
      return activity.id;
  }
  return null;
}

/** How many times a reporter has asked this person to respond before print. */
function pressRequestsTo(world: World, personId: EntityId): number {
  let count = 0;
  for (const event of world.history.events) {
    if (event.type !== "press.response-requested") continue;
    if (
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "focus:story-subject",
      )
    )
      count += 1;
  }
  return count;
}

/**
 * A reporter asking the player to respond before print stops the clock.
 *
 * The response window is two days and the desk decides once a week, so a
 * skip of a week or more used to carry the player straight past the question
 * and the story ran with "did not respond". A longer skip now stops at each
 * weekly desk review, and ends there when a reporter has just asked the
 * player something. This is not a preference: a question with a deadline is
 * a decision that needs the player.
 */
export function advanceStoppingForPressRequests(
  world: World,
  personId: EntityId,
  days: number,
  advance: (current: World, days: number) => World,
): World {
  const target = addDays(world.currentDate, Math.max(1, Math.trunc(days)));
  let current = world;
  while (current.currentDate < target) {
    const sweep = scheduledFutureDueItemsThrough(
      current,
      addDays(current.currentDate, 1),
      target,
    ).find((item) => item.transitionKey === PRESS_DESK_SWEEP_TRANSITION_KEY);
    const stepTo = sweep && sweep.dueAt < target ? sweep.dueAt : target;
    const before = pressRequestsTo(current, personId);
    const next = advance(current, daysBetween(current.currentDate, stepTo));
    // Stopped for something else (a commitment, a hold): that stop stands.
    if (next === current || next.currentDate < stepTo) return next;
    if (pressRequestsTo(next, personId) > before) return next;
    current = next;
  }
  return current;
}
