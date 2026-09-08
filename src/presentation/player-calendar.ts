import {
  canPersonAccess,
  personName,
  scheduledActivityState,
  type EntityId,
  type ScheduledActivityKind,
  type ScheduledActivityRecord,
  type ScheduledActivityStatus,
  type SimulationMoment,
  type World,
} from "../simulation";

/**
 * The player's calendar, and the chamber's, kept apart.
 *
 * The recorded defect was a floor calendar presented as though every item on it
 * were a personal appointment. A measure reaching the floor is the legislature's
 * agenda; it becomes the player's commitment only when the record puts the
 * player in it. So this reads the canonical scheduled activities once and sorts
 * them by that single question — are you a participant — and says which group an
 * entry is in rather than leaving the player to infer it from where it appears.
 *
 * Nothing here writes. Opening the calendar, reading an entry and coming back
 * cannot advance the clock, because this module has no way to: it takes a world
 * and returns a projection, and the only functions that move time live in the
 * simulation and are not called from here.
 */

export type CalendarGroup = "yours" | "chamber";

export interface CalendarEntry {
  readonly activityId: EntityId;
  readonly title: string;
  readonly summary: string;
  readonly kind: ScheduledActivityKind;
  /** "Confirmed", "Tentative hold", "Flexible work", "Travel". */
  readonly kindLabel: string;
  readonly group: CalendarGroup;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly status: ScheduledActivityStatus;
  readonly locationLabel: string;
  readonly participantNames: readonly string[];
  /** Who owns it, said plainly. The distinction the playtest asked for. */
  readonly ownershipNote: string;
}

export interface CalendarDay {
  readonly date: string;
  readonly entries: readonly CalendarEntry[];
}

export interface PlayerCalendar {
  readonly today: SimulationMoment;
  readonly days: readonly CalendarDay[];
  /** True when neither group has a single entry. */
  readonly empty: boolean;
  /** What is honestly absent, when something is. */
  readonly note: string | null;
}

const KIND_LABELS: Readonly<Record<ScheduledActivityKind, string>> = {
  confirmed: "Confirmed",
  tentative: "Tentative hold",
  flexible: "Flexible work",
  travel: "Travel",
};

export function calendarKindLabel(kind: ScheduledActivityKind): string {
  return KIND_LABELS[kind];
}

export function formatMinute(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function entryFor(
  world: World,
  personId: EntityId,
  activity: ScheduledActivityRecord,
): CalendarEntry {
  const state = scheduledActivityState(world, activity.id);
  const mine = activity.participantPersonIds.includes(personId);
  return {
    activityId: activity.id,
    title: activity.title,
    summary: activity.summary,
    kind: activity.kind,
    kindLabel: KIND_LABELS[activity.kind],
    group: mine ? "yours" : "chamber",
    start: state.start,
    end: state.end,
    status: state.status,
    locationLabel: activity.location.label,
    participantNames: activity.participantPersonIds
      .map((id) => world.people[id])
      .filter((person): person is NonNullable<typeof person> => Boolean(person))
      .map((person) => personName(person)),
    ownershipNote: mine
      ? "You are on this."
      : "On the chamber's agenda. Not an appointment of yours.",
  };
}

/**
 * Everything on the calendar this player is allowed to see, day by day.
 *
 * Access is the world's answer, not this module's: an activity the record does
 * not let this person see never reaches the projection, so the screen cannot
 * leak one by rendering it in a group.
 */
export function projectPlayerCalendar(
  world: World,
  personId: EntityId,
): PlayerCalendar {
  const visible = world.history.scheduledActivities
    .filter((activity) => canPersonAccess(activity.access, personId))
    .map((activity) => entryFor(world, personId, activity))
    .sort(
      (left, right) =>
        left.start.date.localeCompare(right.start.date) ||
        left.start.minuteOfDay - right.start.minuteOfDay ||
        left.activityId.localeCompare(right.activityId),
    );

  const byDate = new Map<string, CalendarEntry[]>();
  for (const entry of visible) {
    const bucket = byDate.get(entry.start.date);
    if (bucket) bucket.push(entry);
    else byDate.set(entry.start.date, [entry]);
  }

  const days = [...byDate.entries()].map(([date, entries]) => ({
    date,
    entries: entries as readonly CalendarEntry[],
  }));

  const mine = visible.filter((entry) => entry.group === "yours").length;
  return {
    /* The canonical clock, read and never set. */
    today: world.currentMoment,
    days,
    empty: visible.length === 0,
    note:
      visible.length === 0
        ? "Nothing is scheduled in this life yet. The calendar fills as commitments are made."
        : mine === 0
          ? "Nothing here is yours yet. What is listed belongs to the chamber's agenda."
          : null,
  };
}

/** One entry, for the detail surface and for opening a commitment from a pin. */
export function calendarEntryFor(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): CalendarEntry | null {
  const activity = world.history.scheduledActivities.find(
    (record) => record.id === activityId,
  );
  if (!activity) return null;
  if (!canPersonAccess(activity.access, personId)) return null;
  return entryFor(world, personId, activity);
}
