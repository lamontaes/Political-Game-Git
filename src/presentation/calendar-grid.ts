import type { IsoDate, SimulationMoment } from "../simulation";
import { isoDateFromParts, makeIsoDate } from "../simulation";
import {
  CALENDAR_MONTH_NAMES,
  formatDisplayDate,
  formatDisplayDateShort,
  parseIsoDateParts,
  type DateDisplayOrder,
} from "./date-display";
import {
  type CalendarEntry,
  type PlayerCalendar,
  projectPlayerCalendar,
} from "./player-calendar";
import type { EntityId, World } from "../simulation";

export type CalendarGridMode = "month" | "week";

export interface CalendarGridCell {
  readonly date: IsoDate;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly weekdayIndex: number;
  readonly dayNumber: number;
  readonly label: string;
  readonly entries: readonly CalendarEntry[];
}

export interface CalendarGrid {
  readonly mode: CalendarGridMode;
  readonly today: SimulationMoment;
  readonly heading: string;
  readonly weekdayLabels: readonly string[];
  readonly cells: readonly CalendarGridCell[];
  readonly upcoming: readonly CalendarEntry[];
  readonly history: readonly CalendarEntry[];
  readonly selected: CalendarEntry | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function addDays(date: IsoDate, days: number): IsoDate {
  const { year, month, day } = parseIsoDateParts(date);
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  return makeIsoDate(
    `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`,
  );
}

function weekdayIndex(date: IsoDate): number {
  const { year, month, day } = parseIsoDateParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function monthLength(year: number, month: number): number {
  for (let day = 31; day >= 28; day -= 1) {
    try {
      isoDateFromParts(year, month, day);
      return day;
    } catch {
      /* try a shorter day */
    }
  }
  return 28;
}

function firstOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseIsoDateParts(date);
  return isoDateFromParts(year, month, 1);
}

function entriesByDate(
  calendar: PlayerCalendar,
): Map<IsoDate, CalendarEntry[]> {
  const map = new Map<IsoDate, CalendarEntry[]>();
  for (const day of calendar.days) {
    map.set(makeIsoDate(day.date), [...day.entries]);
  }
  return map;
}

function cell(
  date: IsoDate,
  today: IsoDate,
  inMonth: boolean,
  byDate: Map<IsoDate, CalendarEntry[]>,
  order: DateDisplayOrder,
): CalendarGridCell {
  const { day } = parseIsoDateParts(date);
  return {
    date,
    inMonth,
    isToday: date === today,
    weekdayIndex: weekdayIndex(date),
    dayNumber: day,
    label: formatDisplayDateShort(date, order),
    entries: byDate.get(date) ?? [],
  };
}

export function projectCalendarGrid(
  world: World,
  personId: EntityId,
  options: {
    readonly mode: CalendarGridMode;
    readonly dateOrder: DateDisplayOrder;
    readonly selectedActivityId?: EntityId | null;
  },
): CalendarGrid {
  const calendar = projectPlayerCalendar(world, personId);
  const byDate = entriesByDate(calendar);
  const today = calendar.today.date;
  const allEntries = calendar.days.flatMap((day) => day.entries);
  const upcoming = allEntries.filter((entry) => entry.start.date >= today);
  const history = allEntries.filter((entry) => entry.start.date < today);
  const selected =
    allEntries.find(
      (entry) => entry.activityId === options.selectedActivityId,
    ) ?? null;

  if (options.mode === "week") {
    const start = addDays(today, -weekdayIndex(today));
    const cells = Array.from({ length: 7 }, (_, index) =>
      cell(addDays(start, index), today, true, byDate, options.dateOrder),
    );
    return {
      mode: "week",
      today: calendar.today,
      heading: `Week of ${formatDisplayDate(start, options.dateOrder)}`,
      weekdayLabels: WEEKDAYS,
      cells,
      upcoming,
      history,
      selected,
    };
  }

  const monthStart = firstOfMonth(today);
  const { year, month } = parseIsoDateParts(today);
  const days = monthLength(year, month);
  const leading = weekdayIndex(monthStart);
  const cells: CalendarGridCell[] = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push(
      cell(
        addDays(monthStart, index - leading),
        today,
        false,
        byDate,
        options.dateOrder,
      ),
    );
  }
  for (let day = 1; day <= days; day += 1) {
    cells.push(
      cell(
        isoDateFromParts(year, month, day),
        today,
        true,
        byDate,
        options.dateOrder,
      ),
    );
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]!;
    cells.push(
      cell(addDays(last.date, 1), today, false, byDate, options.dateOrder),
    );
  }

  return {
    mode: "month",
    today: calendar.today,
    heading: `${CALENDAR_MONTH_NAMES[month - 1] ?? ""} ${year}`.trim(),
    weekdayLabels: WEEKDAYS,
    cells,
    upcoming,
    history,
    selected,
  };
}
