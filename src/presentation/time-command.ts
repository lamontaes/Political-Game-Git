import {
  openingNeighborhoodWalkOffer,
  walkOpeningNeighborhood,
} from "./life-scene-flow";
import { describePlacesOutcome } from "./player-places";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { projectCandidateGuidanceScene } from "./candidate-guidance-scene";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { campaignLifeActivityForScheduledActivity } from "../simulation/campaign-life-activities";
import {
  advanceWorldMinutes,
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  formativeIntervalAt,
  scheduledActivityState,
  simulationMinutesBetween,
  simulationMomentAtLocalTime,
  type EntityId,
  type IsoDate,
  type SimulationMoment,
  type World,
} from "../simulation";
import { venueActivities } from "./venue-activity";
import { letAdultTimePass } from "./adult-life";
import {
  advanceCalendarToActivity,
  playCalendarActivity,
  type CalendarTimeResult,
} from "./calendar-time-control";
import {
  advanceStoppingForPressRequests,
  interruptionHandlers,
} from "./interruption-policy";
import { deathNewsBetween } from "./death-news";
import { nextOwnElection, ownElectionResultsBetween } from "./own-election";
import { letStoryTimePass, quietStepDays } from "./life-story";
import {
  acceptedOfferStarts,
  advanceStoppingForOfferDeadlines,
  offerDeadlines,
} from "./offer-deadlines";
import { capQuietStretch, nextKnownCalendarItem } from "./quiet-stretch";
import { ORDINARY_DAY_START_MINUTE, passOrdinaryDays } from "./ordinary-life";
import {
  describeRoutineOutcome,
  formatRoutineElapsedMinutes,
} from "./routine-outcome";
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
  | { readonly kind: "until-activity"; readonly activityId: EntityId }
  | { readonly kind: "attend-activity"; readonly activityId: EntityId }
  | { readonly kind: "finish-meeting"; readonly activityId: EntityId }
  | { readonly kind: "walk"; readonly destination: "home" | "neighborhood" };

export interface TimeCommandRequest {
  /** Unique per click. Only used to identify the request in receipts. */
  readonly requestId: string;
  readonly personId: EntityId;
  /** The World moment the control was rendered from. */
  readonly sourceMoment: SimulationMoment;
  readonly command: TimeCommand;
  readonly interruptions?: InterruptionPreferences;
}

export { nextKnownCalendarItem } from "./quiet-stretch";

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

/** Bounded command diagnostics intentionally omit text nobody consumed. */
export type RecentTimeCommandReceipt = Omit<TimeCommandReceipt, "outcome">;

export interface TimeCommandPreview {
  readonly elapsedMinutes?: number;
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

function unresolvedWorkNow(
  world: World,
  personId: EntityId,
): "offer" | "start" | null {
  if (
    offerDeadlines(world, personId).some(
      (deadline) => deadline.replyBy === world.currentDate,
    )
  )
    return "offer";
  if (
    acceptedOfferStarts(world, personId).some(
      (entry) => entry.startOn <= world.currentDate,
    )
  )
    return "start";
  return null;
}

export function quietStretchRefusal(
  world: World,
  personId: EntityId,
): string | null {
  const work = unresolvedWorkNow(world, personId);
  if (work === "offer")
    return "The work offer needs an answer under Work before another quiet stretch.";
  if (work === "start")
    return "Your accepted work can begin under Work before another quiet stretch.";
  const next = nextKnownCalendarItem(world, personId, { dueItems: false });
  if (
    next?.moment &&
    next.date === world.currentDate &&
    compareSimulationMoments(next.moment, world.currentMoment) <= 0
  )
    return `${next.title} is waiting on your calendar. Decide whether to attend or decline before another quiet stretch.`;
  return null;
}

export function previewTimeCommand(
  world: World,
  personId: EntityId,
  command: TimeCommand,
): TimeCommandPreview | null {
  // "Until something needs me" has already arrived. A further quiet stretch
  // must hand the choice back; explicit Day/Week can still pass it knowingly.
  if (command.kind === "quiet-stretch" && quietStretchRefusal(world, personId))
    return null;
  if (command.kind === "quiet-stretch") {
    const next = nextKnownCalendarItem(world, personId, { dueItems: false });
    if (next?.moment && next.date === world.currentDate) {
      const minutes = simulationMinutesBetween(
        world.currentMoment,
        next.moment,
      );
      if (minutes <= 0) return null;
      return {
        target: next.moment,
        elapsedMinutes: minutes,
        targetDate: next.date,
        days: 0,
        cappedBy: next,
      };
    }
  }
  if (command.kind === "walk") {
    const offer = openingNeighborhoodWalkOffer(
      world,
      personId,
      command.destination,
    );
    if (offer.unavailable) return null;
    const target = addSimulationMinutes(world.currentMoment, offer.minutes);
    return {
      target,
      elapsedMinutes: simulationMinutesBetween(world.currentMoment, target),
      targetDate: target.date,
      days: wholeDaysBetween(world.currentDate, target.date),
      cappedBy: null,
    };
  }
  if (command.kind === "attend-activity" || command.kind === "finish-meeting") {
    const entry = venueActivities(world, personId).find(
      (item) => item.activity.id === command.activityId,
    );
    if (!entry || entry.refusal) return null;
    if (
      command.kind === "finish-meeting" &&
      projectOrdinaryMeetingScene(world, personId)?.phase !== "active"
    )
      return null;
    const openingMeeting =
      entry.activity.stableKey === `${PUBLIC_MEETING_KEY}:activity` &&
      command.kind !== "finish-meeting";
    const openingGuidance =
      campaignLifeActivityForScheduledActivity(world, entry.activity.id)
        ?.form === "candidate-guidance" &&
      projectCandidateGuidanceScene(world, personId)?.activityId !==
        entry.activity.id;
    const lateMeetingJourney =
      openingMeeting &&
      !entry.journey &&
      entry.elapsedMinutes !== null &&
      world.history.scheduledActivities.some(
        (item) =>
          item.kind === "travel" &&
          item.location.locationKey === "ordinary-life:to-meeting-room" &&
          item.sourceEntityIds.includes(entry.activity.id) &&
          (scheduledActivityState(world, item.id).status === "cancelled" ||
            (scheduledActivityState(world, item.id).status === "scheduled" &&
              compareSimulationMoments(
                world.currentMoment,
                scheduledActivityState(world, item.id).start,
              ) > 0)),
      );
    const target =
      openingMeeting &&
      projectOrdinaryMeetingScene(world, personId)?.phase === "active"
        ? world.currentMoment
        : lateMeetingJourney
          ? addSimulationMinutes(world.currentMoment, entry.elapsedMinutes!)
          : openingMeeting &&
              !entry.journey &&
              projectOrdinaryMeetingScene(world, personId)?.phase === "active"
            ? world.currentMoment
            : openingMeeting && !entry.journey
              ? scheduledActivityState(world, entry.activity.id).start
              : (openingMeeting || openingGuidance) && entry.journey
                ? scheduledActivityState(world, entry.journey.activity.id).end
                : scheduledActivityState(world, entry.activity.id).end;
    return {
      target,
      elapsedMinutes: simulationMinutesBetween(world.currentMoment, target),
      targetDate: target.date,
      days: wholeDaysBetween(world.currentDate, target.date),
      cappedBy: null,
    };
  }
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
    ({ days, cappedBy } = capQuietStretch(
      world,
      personId,
      quietStepDays(world.currentDate),
    ));
  }
  // Every skip stops the morning after the player's own election, so the
  // result is met, not stepped over.
  const election = nextOwnElection(world, personId);
  if (election) {
    const until =
      wholeDaysBetween(world.currentDate, election.electionDate) + 1;
    if (until >= 1 && until < days) {
      days = until;
      cappedBy = {
        title: `Election day: ${election.title}`,
        date: election.electionDate,
      };
    }
  }
  const morningTarget = morningAfter(world, days);
  // A known appointment carries its exact departure moment. "Until needed"
  // should reach that need in one press, rather than stopping at the ordinary
  // 7 a.m. day boundary and asking the player to press the same control again.
  const target =
    command.kind === "quiet-stretch" &&
    cappedBy?.moment &&
    cappedBy.moment.date === morningTarget.date
      ? cappedBy.moment
      : morningTarget;
  return { target, targetDate: target.date, days, cappedBy };
}

function run(
  world: World,
  request: TimeCommandRequest,
  preview: TimeCommandPreview,
): CalendarTimeResult {
  const interruptions = request.interruptions ?? DEFAULT_INTERRUPTIONS;
  const command = request.command;
  if (command.kind === "walk") {
    const next = walkOpeningNeighborhood(
      world,
      request.personId,
      command.destination,
    );
    return {
      world: next,
      reached: next.currentMoment,
      outcome: describePlacesOutcome(world, next, request.personId),
    };
  }
  if (command.kind === "attend-activity" || command.kind === "finish-meeting")
    return playCalendarActivity(
      world,
      request.personId,
      command.activityId,
      command.kind === "finish-meeting",
    );
  if (command.kind === "quiet-stretch" && preview.days === 0) {
    const next = advanceWorldMinutes(
      world,
      preview.elapsedMinutes ?? 0,
      interruptionHandlers(),
    );
    return {
      world: next,
      reached: next.currentMoment,
      outcome: `It is time for ${preview.cappedBy?.title ?? "your next commitment"}.`,
    };
  }
  if (command.kind === "until-activity")
    return advanceCalendarToActivity(
      world,
      request.personId,
      command.activityId,
    );
  const advance = (current: World, days: number) =>
    advanceStoppingForOfferDeadlines(current, request.personId, days, (at, d) =>
      advanceStoppingForPressRequests(at, request.personId, d, (from, n) =>
        passOrdinaryDays(from, n, {
          handlers: interruptionHandlers(),
          stopForTentativeHolds: interruptions.stopForTentativeHolds,
          // A chosen day count must not carry the player past a posted civic
          // occasion. The ordinary clock already owns this stop boundary.
          stopForCivicHolds: true,
        }),
      ),
    );
  let next =
    command.kind === "quiet-stretch"
      ? formativeIntervalAt(world, request.personId) !== null
        ? letStoryTimePass(world, request.personId, advance)
        : letAdultTimePass(world, preview.days, advance)
      : advance(world, preview.days);
  if (
    command.kind === "quiet-stretch" &&
    preview.cappedBy?.moment &&
    next.currentMoment.date === preview.target.date &&
    compareSimulationMoments(next.currentMoment, preview.target) < 0
  ) {
    next = advanceWorldMinutes(
      next,
      simulationMinutesBetween(next.currentMoment, preview.target),
      interruptionHandlers(),
    );
  }
  return {
    world: next,
    reached: next.currentMoment,
    get outcome() {
      return [
        ...ownElectionResultsBetween(world, next, request.personId),
        ...deathNewsBetween(
          next,
          request.personId,
          world.currentDate,
          next.currentDate,
        ).map((news) => news.sentence),
        ...offerDeadlines(next, request.personId)
          .filter((deadline) => deadline.replyBy === next.currentDate)
          .map(
            (deadline) =>
              `Today is the last day to answer. ${deadline.sentence}`,
          ),
        describeRoutineOutcome(
          world,
          next,
          request.personId,
          simulationMinutesBetween(world.currentMoment, preview.target),
        ),
      ].join(" ");
    },
  };
}

const RECENT_LIMIT = 50;
const recent: RecentTimeCommandReceipt[] = [];

/** Recent receipts, newest last. Diagnostics only; never saved. */
export function recentTimeCommandReceipts(): readonly RecentTimeCommandReceipt[] {
  return [...recent];
}

function remember(
  receipt: RecentTimeCommandReceipt,
  outcome: () => string,
): TimeCommandReceipt {
  let materialized: string | undefined;
  let resolveOutcome: (() => string) | null = outcome;
  const diagnostic = { ...receipt };
  const returned = { ...receipt } as TimeCommandReceipt;
  Object.defineProperty(returned, "outcome", {
    enumerable: true,
    get() {
      if (materialized === undefined) {
        const resolve = resolveOutcome;
        resolveOutcome = null;
        materialized = resolve?.() ?? "";
      }
      return materialized;
    },
  });
  recent.push(diagnostic);
  if (recent.length > RECENT_LIMIT) recent.shift();
  return returned;
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
      receipt: remember(
        {
          ...base,
          status: "stale",
          requestedTarget: null,
          reached: world.currentMoment,
          stoppedEarly: false,
          elapsedMs: now() - started,
        },
        () =>
          "Time had already moved since this was shown, so the request was not applied again.",
      ),
    };
  const preview = previewTimeCommand(world, request.personId, request.command);
  if (!preview) {
    const waiting =
      request.command.kind === "quiet-stretch"
        ? quietStretchRefusal(world, request.personId)
        : null;
    return {
      world,
      receipt: remember(
        {
          ...base,
          status: "refused",
          requestedTarget: null,
          reached: world.currentMoment,
          stoppedEarly: false,
          elapsedMs: now() - started,
        },
        () => waiting ?? "That event does not start later than now.",
      ),
    };
  }
  const result = run(world, request, preview);
  return {
    world: result.world,
    receipt: remember(
      {
        ...base,
        status: result.world === world ? "refused" : "accepted",
        requestedTarget: preview.target,
        reached: result.reached,
        stoppedEarly:
          compareSimulationMoments(result.reached, preview.target) < 0,
        elapsedMs: now() - started,
      },
      () => result.outcome,
    ),
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
  if (preview.elapsedMinutes !== undefined) {
    const hour = Math.floor(preview.target.minuteOfDay / 60);
    const minute = preview.target.minuteOfDay % 60;
    const clock = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
    return `${formatRoutineElapsedMinutes(preview.elapsedMinutes)}, to ${date} at ${clock}`;
  }
  const span =
    preview.days === 1
      ? "1 day"
      : preview.days < 14
        ? `${preview.days} days`
        : preview.days < 60
          ? `about ${Math.round(preview.days / 7)} weeks`
          : `about ${Math.round(preview.days / 30.4)} months`;
  return preview.cappedBy
    ? // The title as recorded: lowercasing it turned "Saturday afternoon at
      // Ray Curtis's" into "saturday afternoon at ray curtis's".
      `${span}, to ${date}: ${preview.cappedBy.title}`
    : `${span}, to ${date}`;
}
