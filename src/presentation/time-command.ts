import {
  addDays,
  compareSimulationMoments,
  currentLifeCutoff,
  formativeIntervalAt,
  futureDueItemStateAt,
  scheduledActivityState,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
  type EntityId,
  type IsoDate,
  type SimulationMoment,
  type World,
} from "../simulation";
import { letAdultTimePass } from "./adult-life";
import {
  advanceCalendarToActivity,
  type CalendarTimeResult,
} from "./calendar-time-control";
import { interruptionHandlers } from "./interruption-policy";
import { letStoryTimePass, quietStepDays } from "./life-story";
import { ORDINARY_DAY_START_MINUTE, passOrdinaryDays } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";
import {
  DEFAULT_INTERRUPTIONS,
  type InterruptionPreferences,
} from "./shell-navigation";

/**
 * The one command every "let time pass" control submits.
 *
 * The playtest found two faults in how time moved. A generic button jumped
 * 31, 47, 78 or 124 days without saying so, and a control rendered from an
 * older World could still commit its own advance on top of a newer one. A
 * request here carries the moment the player was looking at. If the World has
 * moved since, the request is stale and nothing happens, so one click can
 * never advance twice and a late callback can never rewind or repeat. The
 * target is disclosed before the click by `previewTimeCommand`.
 *
 * This is not a second clock. Every accepted command runs through
 * `passOrdinaryDays` / `advanceWorldMinutes`, which already stop for
 * commitments and answer due transitions in order.
 */

export type TimeCommand =
  /** An explicit number of mornings ahead: tomorrow, a week, a chosen long skip. */
  | { readonly kind: "days"; readonly days: number }
  /**
   * An unhurried stretch of ordinary life. Its length is presentation pacing,
   * but it never runs past the next thing already on the character's calendar,
   * and its end date is shown before the player commits.
   */
  | { readonly kind: "quiet-stretch" }
  /** Wait until a recorded calendar activity begins. */
  | { readonly kind: "until-activity"; readonly activityId: EntityId };

export interface TimeCommandRequest {
  /** Unique per click. Only used to identify the request in receipts. */
  readonly requestId: string;
  readonly personId: EntityId;
  /** The World moment the control was rendered from. */
  readonly sourceMoment: SimulationMoment;
  readonly command: TimeCommand;
  readonly interruptions?: InterruptionPreferences;
}

export type TimeCommandStatus = "accepted" | "stale" | "refused";

export interface TimeCommandReceipt {
  readonly requestId: string;
  readonly status: TimeCommandStatus;
  readonly command: TimeCommand;
  readonly sourceMoment: SimulationMoment;
  /** The moment the command asked for; null when it could not be planned. */
  readonly requestedTarget: SimulationMoment | null;
  readonly reached: SimulationMoment;
  /** True when the clock stopped before the requested target. */
  readonly stoppedEarly: boolean;
  /** Wall-clock processing time, for profiling long saves. Not World state. */
  readonly elapsedMs: number;
  readonly outcome: string;
}

export interface TimeCommandPreview {
  readonly target: SimulationMoment;
  readonly targetDate: IsoDate;
  readonly days: number;
  /** Why this target: the pacing length, or the calendar item that caps it. */
  readonly cappedBy: { readonly title: string; readonly date: IsoDate } | null;
}

function morningAfter(world: World, days: number): SimulationMoment {
  return simulationMomentAtLocalTime({
    date: addDays(world.currentDate, days),
    minuteOfDay: ORDINARY_DAY_START_MINUTE,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function wholeDaysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * The earliest dated thing already waiting on this person after today: a
 * scheduled activity they take part in, or a due item that names them.
 */
export function nextKnownCalendarItem(
  world: World,
  personId: EntityId,
): { readonly title: string; readonly date: IsoDate } | null {
  let best: { title: string; date: IsoDate } | null = null;
  for (const activity of world.history.scheduledActivities) {
    if (!activity.participantPersonIds.includes(personId)) continue;
    const state = scheduledActivityState(world, activity.id);
    if (state.status !== "scheduled") continue;
    if (state.start.date <= world.currentDate) continue;
    if (!best || state.start.date < best.date)
      best = { title: activity.title, date: state.start.date };
  }
  const cutoff = currentLifeCutoff(world);
  for (const due of world.history.futureDueItems) {
    if (!due.entityIds.includes(personId)) continue;
    if (due.dueAt <= world.currentDate) continue;
    if (futureDueItemStateAt(world, due.id, cutoff)?.status !== "scheduled")
      continue;
    if (!best || due.dueAt < best.date)
      best = { title: "A dated matter", date: due.dueAt };
  }
  return best;
}

export function previewTimeCommand(
  world: World,
  personId: EntityId,
  command: TimeCommand,
): TimeCommandPreview | null {
  if (command.kind === "until-activity") {
    const activity = world.history.scheduledActivities.find(
      (record) => record.id === command.activityId,
    );
    if (!activity) return null;
    const state = scheduledActivityState(world, activity.id);
    if (compareSimulationMoments(state.start, world.currentMoment) <= 0)
      return null;
    return {
      target: state.start,
      targetDate: state.start.date,
      days: wholeDaysBetween(world.currentDate, state.start.date),
      cappedBy: null,
    };
  }
  let days: number;
  let cappedBy: TimeCommandPreview["cappedBy"] = null;
  if (command.kind === "days") {
    days = Math.max(1, Math.trunc(command.days));
  } else {
    days = quietStepDays(world.currentDate);
    const next = nextKnownCalendarItem(world, personId);
    if (next) {
      const until = wholeDaysBetween(world.currentDate, next.date);
      if (until >= 1 && until <= days) {
        days = until;
        cappedBy = next;
      }
    }
  }
  const target = morningAfter(world, days);
  return { target, targetDate: target.date, days, cappedBy };
}

function run(
  world: World,
  request: TimeCommandRequest,
  preview: TimeCommandPreview,
): CalendarTimeResult {
  const interruptions = request.interruptions ?? DEFAULT_INTERRUPTIONS;
  const command = request.command;
  if (command.kind === "until-activity")
    return advanceCalendarToActivity(
      world,
      request.personId,
      command.activityId,
      interruptions,
    );
  const advance = (current: World, days: number) =>
    passOrdinaryDays(current, days, {
      handlers: interruptionHandlers(interruptions),
      stopForTentativeHolds: interruptions.stopForTentativeHolds,
    });
  const next =
    command.kind === "quiet-stretch"
      ? formativeIntervalAt(world, request.personId) !== null
        ? letStoryTimePass(world, request.personId, advance)
        : letAdultTimePass(world, preview.days, advance)
      : advance(world, preview.days);
  return {
    world: next,
    reached: next.currentMoment,
    outcome: describeRoutineOutcome(
      world,
      next,
      request.personId,
      simulationMinutesBetween(world.currentMoment, preview.target),
    ),
  };
}

const RECENT_LIMIT = 50;
const recent: TimeCommandReceipt[] = [];

/** Recent receipts, newest last. Diagnostics only; never saved. */
export function recentTimeCommandReceipts(): readonly TimeCommandReceipt[] {
  return [...recent];
}

function remember(receipt: TimeCommandReceipt): TimeCommandReceipt {
  recent.push(receipt);
  if (recent.length > RECENT_LIMIT) recent.shift();
  return receipt;
}

export function submitTimeCommand(
  world: World,
  request: TimeCommandRequest,
  now: () => number = () => globalThis.performance?.now() ?? Date.now(),
): { readonly world: World; readonly receipt: TimeCommandReceipt } {
  const started = now();
  const base = {
    requestId: request.requestId,
    command: request.command,
    sourceMoment: request.sourceMoment,
  };
  if (compareSimulationMoments(world.currentMoment, request.sourceMoment) !== 0)
    return {
      world,
      receipt: remember({
        ...base,
        status: "stale",
        requestedTarget: null,
        reached: world.currentMoment,
        stoppedEarly: false,
        elapsedMs: now() - started,
        outcome:
          "Time had already moved since this was shown, so the request was not applied again.",
      }),
    };
  const preview = previewTimeCommand(world, request.personId, request.command);
  if (!preview)
    return {
      world,
      receipt: remember({
        ...base,
        status: "refused",
        requestedTarget: null,
        reached: world.currentMoment,
        stoppedEarly: false,
        elapsedMs: now() - started,
        outcome: "That event does not start later than now.",
      }),
    };
  const result = run(world, request, preview);
  return {
    world: result.world,
    receipt: remember({
      ...base,
      status: "accepted",
      requestedTarget: preview.target,
      reached: result.reached,
      stoppedEarly:
        compareSimulationMoments(result.reached, preview.target) < 0,
      elapsedMs: now() - started,
      outcome: result.outcome,
    }),
  };
}

/** A short, player-facing label for what a command will do. */
export function describeTimeCommandPreview(
  preview: TimeCommandPreview,
): string {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${preview.targetDate}T12:00:00Z`));
  const span =
    preview.days === 1
      ? "1 day"
      : preview.days < 14
        ? `${preview.days} days`
        : preview.days < 60
          ? `about ${Math.round(preview.days / 7)} weeks`
          : `about ${Math.round(preview.days / 30.4)} months`;
  return preview.cappedBy
    ? `${span}, to ${date}, when ${preview.cappedBy.title.toLowerCase()} is due`
    : `${span}, to ${date}`;
}
