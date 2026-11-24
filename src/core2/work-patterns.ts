/**
 * The shape of each kind of working week: the shifts, the days and the
 * rotation. Moved from the old engine's work-schedules so the opening reads
 * them without the old world type. Every pattern is a GAME ASSUMPTION, not a
 * source (see docs/research/chatgpt-answers/2026-09-23-jobs-and-units-0311/).
 */

/** Sunday is 0, as in JavaScript dates. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WorkPatternKey =
  | "office"
  | "public-office"
  | "school"
  | "clergy"
  | "day-trade"
  | "farm"
  | "driver"
  | "factory"
  | "store"
  | "diner"
  | "hospital"
  | "police"
  | "fire"
  | "organizer";

/** One shift: its start and length in minutes, local time. */
export interface WorkShift {
  readonly startMinute: number;
  readonly minutes: number;
}

export interface WorkPattern {
  /** The shifts a job of this pattern can be given; staff take turns. */
  readonly shifts: readonly WorkShift[];
  /**
   * "week": the same weekdays every week, `days` of them.
   * "rotating": `days` a week, staff staggered so every day is covered.
   * "cycle": one shift every `cycleDays` days (firefighters).
   */
  readonly kind: "week" | "rotating" | "cycle";
  /** The weekdays worked for a "week" pattern, full-time. */
  readonly weekdays?: readonly Weekday[];
  readonly cycleDays?: number;
}

const hours = (from: number, length: number): WorkShift => ({
  startMinute: Math.round(from * 60),
  minutes: Math.round(length * 60),
});

const MON_FRI: readonly Weekday[] = [1, 2, 3, 4, 5];

/** GAME ASSUMPTION: the shape of each kind of working week. */
export const WORK_PATTERNS: Readonly<Record<WorkPatternKey, WorkPattern>> = {
  office: {
    kind: "week",
    weekdays: MON_FRI,
    shifts: [hours(8, 9), hours(9, 8)],
  },
  "public-office": { kind: "week", weekdays: MON_FRI, shifts: [hours(8, 8.5)] },
  school: { kind: "week", weekdays: MON_FRI, shifts: [hours(7.5, 8)] },
  // Sunday services, then the weekday office; Monday off.
  clergy: {
    kind: "week",
    weekdays: [0, 2, 3, 4, 5],
    shifts: [hours(8, 8)],
  },
  "day-trade": { kind: "week", weekdays: MON_FRI, shifts: [hours(7, 8.5)] },
  farm: {
    kind: "week",
    weekdays: [1, 2, 3, 4, 5, 6],
    shifts: [hours(6, 8)],
  },
  driver: { kind: "week", weekdays: MON_FRI, shifts: [hours(6, 9)] },
  factory: {
    kind: "week",
    weekdays: MON_FRI,
    shifts: [hours(7, 8.5), hours(15, 8.5), hours(23, 8.5)],
  },
  store: { kind: "rotating", shifts: [hours(8, 8), hours(13, 8.5)] },
  diner: { kind: "rotating", shifts: [hours(6, 8), hours(14, 8)] },
  hospital: { kind: "rotating", shifts: [hours(7, 12), hours(19, 12)] },
  police: {
    kind: "rotating",
    shifts: [hours(6, 10), hours(14, 10), hours(22, 10)],
  },
  fire: { kind: "cycle", cycleDays: 3, shifts: [hours(8, 24)] },
  organizer: {
    kind: "week",
    weekdays: [1, 2, 3, 4, 5, 6],
    shifts: [hours(10, 8)],
  },
};
