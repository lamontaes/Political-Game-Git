import { useEffect, useRef, useState } from "react";
import {
  formatMinute,
  type CalendarDay,
} from "../presentation/player-calendar";
import {
  calendarDisplayDate,
  calendarMonthTitle,
  calendarPeriodDates,
  calendarShiftDate,
  calendarShiftPeriod,
  type CalendarDateOrder,
  type CalendarGridView,
} from "./ux39-calendar-dates";
import "./ux39-calendar.css";

const DATE_ORDER_KEY = "our-civic-duty.calendar-date-order";
/** A local display setting, independent of the saved life and its ISO dates. */
export function useCalendarDateOrder() {
  const [order, setOrder] = useState<CalendarDateOrder>(() => {
    try {
      return localStorage.getItem(DATE_ORDER_KEY) === "day-month"
        ? "day-month"
        : "month-day";
    } catch {
      return "month-day";
    }
  });
  function changeOrder(value: CalendarDateOrder) {
    setOrder(value);
    try {
      localStorage.setItem(DATE_ORDER_KEY, value);
    } catch {
      /* Available for this visit if storage is unavailable. */
    }
  }
  return [order, changeOrder] as const;
}

export function UX39CalendarGrid({
  today,
  days,
  dateOrder,
  selectedDate,
  onSelectDate,
}: {
  readonly today: string;
  readonly days: readonly CalendarDay[];
  readonly dateOrder: CalendarDateOrder;
  readonly selectedDate: string | null;
  readonly onSelectDate: (date: string | null) => void;
}) {
  const [view, setView] = useState<CalendarGridView>("month");
  const [anchor, setAnchor] = useState(today);
  const [focusDate, setFocusDate] = useState(today);
  const gridRef = useRef<HTMLTableElement>(null);
  useEffect(() => {
    setAnchor(today);
    setFocusDate(today);
  }, [today]);
  const dates = calendarPeriodDates(anchor, view);
  const title =
    view === "month"
      ? calendarMonthTitle(anchor)
      : `${calendarDisplayDate(dates[0]!, dateOrder)} – ${calendarDisplayDate(dates[6]!, dateOrder)}`;
  function moveFocus(date: string) {
    setFocusDate(date);
    if (!dates.includes(date)) setAnchor(date);
    requestAnimationFrame(() =>
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-calendar-date="${date}"]`)
        ?.focus(),
    );
  }
  return (
    <section
      className="ux39-calendar"
      aria-label="Calendar dates"
      data-testid="ux39-calendar"
    >
      <div className="ux39-calendar-toolbar">
        <div
          className="ux39-calendar-buttons"
          role="group"
          aria-label="Calendar layout"
        >
          {(["month", "week"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              className="pg-tab"
              aria-pressed={view === choice}
              data-testid={`calendar-layout-${choice}`}
              onClick={() => setView(choice)}
            >
              {choice === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>
        <div
          className="ux39-calendar-buttons"
          role="group"
          aria-label="Browse calendar"
        >
          <button
            type="button"
            className="pg-tab"
            aria-label={`Previous ${view}`}
            onClick={() => {
              const date = calendarShiftPeriod(anchor, view, -1);
              setAnchor(date);
              setFocusDate(date);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="pg-tab"
            onClick={() => {
              setAnchor(today);
              setFocusDate(today);
              onSelectDate(today);
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="pg-tab"
            aria-label={`Next ${view}`}
            onClick={() => {
              const date = calendarShiftPeriod(anchor, view, 1);
              setAnchor(date);
              setFocusDate(date);
            }}
          >
            ›
          </button>
        </div>
      </div>
      <div className="ux39-calendar-scroll">
        <table ref={gridRef} className="ux39-calendar-grid" data-layout={view}>
          <caption aria-live="polite" data-testid="calendar-grid-period">
            {title}
          </caption>
          <thead>
            <tr>
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day) => (
                <th scope="col" key={day}>
                  <abbr title={day}>{day.slice(0, 3)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: dates.length / 7 }, (_, row) => (
              <tr key={row}>
                {dates.slice(row * 7, row * 7 + 7).map((date) => {
                  const entries =
                    days.find((day) => day.date === date)?.entries ?? [];
                  return (
                    <td
                      key={date}
                      data-outside-month={
                        view === "month" &&
                        date.slice(0, 7) !== anchor.slice(0, 7)
                      }
                    >
                      <button
                        type="button"
                        data-calendar-date={date}
                        className="ux39-calendar-date"
                        aria-current={date === today ? "date" : undefined}
                        aria-pressed={selectedDate === date}
                        aria-label={`${calendarDisplayDate(date, dateOrder)}${date === today ? ", today" : ""}, ${entries.length} upcoming or ongoing ${entries.length === 1 ? "entry" : "entries"}`}
                        tabIndex={
                          date === focusDate ||
                          (!dates.includes(focusDate) && date === dates[0])
                            ? 0
                            : -1
                        }
                        onFocus={() => setFocusDate(date)}
                        onClick={() => onSelectDate(date)}
                        onKeyDown={(event) => {
                          const offsets: Record<string, number> = {
                            ArrowLeft: -1,
                            ArrowRight: 1,
                            ArrowUp: -7,
                            ArrowDown: 7,
                          };
                          if (event.key in offsets) {
                            event.preventDefault();
                            moveFocus(
                              calendarShiftDate(date, offsets[event.key]!),
                            );
                          }
                          if (event.key === "Home" || event.key === "End") {
                            event.preventDefault();
                            moveFocus(
                              dates[row * 7 + (event.key === "End" ? 6 : 0)]!,
                            );
                          }
                        }}
                      >
                        <span className="ux39-calendar-number">
                          {Number(date.slice(8))}
                          {date === today ? <small>Today</small> : null}
                        </span>
                        {entries.slice(0, 2).map((entry) => (
                          <span
                            className="ux39-calendar-entry"
                            key={entry.activityId}
                          >
                            <time>{formatMinute(entry.start.minuteOfDay)}</time>{" "}
                            {entry.title}
                          </span>
                        ))}
                        {entries.length > 2 ? (
                          <small>+{entries.length - 2} more</small>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="game-note ux39-calendar-hint">
        Select a date to see its upcoming and ongoing entries. Use arrow keys to
        browse dates.
      </p>
    </section>
  );
}
