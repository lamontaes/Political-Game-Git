import { useId } from "react";

import { GameSelect } from "./GameSelect";

/**
 * The game's date field (UI DECISION FOLLOW-THROUGH: no system date popups).
 *
 * Month, day and year as three game selects, reading and writing the same
 * `YYYY-MM-DD` string an `<input type="date">` would, so a call site only
 * swaps the element. The day list never offers a date the month does not
 * have; changing month or year keeps the day when it still exists and
 * otherwise moves it to the month's last day. With no value, each part shows
 * its name until one is chosen, and the rest are filled with the first choice.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parse(value: string): {
  year: number | null;
  month: number | null;
  day: number | null;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: null, month: null, day: null };
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function format(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function GameDateField({
  value,
  onChange,
  minYear,
  maxYear,
  disabled,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: {
  /** `YYYY-MM-DD`, or "" when not set. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly minYear: number;
  readonly maxYear: number;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly "data-testid"?: string;
}) {
  const id = useId();
  const { year, month, day } = parse(value);
  const years: number[] = [];
  for (let each = maxYear; each >= minYear; each -= 1) years.push(each);
  const maxDay =
    year !== null && month !== null ? daysInMonth(year, month) : 31;

  const commit = (
    nextYear: number | null,
    nextMonth: number | null,
    nextDay: number | null,
  ) => {
    const filledYear = nextYear ?? years[0]!;
    const filledMonth = nextMonth ?? 1;
    const filledDay = Math.min(
      nextDay ?? 1,
      daysInMonth(filledYear, filledMonth),
    );
    onChange(format(filledYear, filledMonth, filledDay));
  };

  return (
    <span
      className="pg-date-field"
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
      data-value={value}
    >
      <GameSelect
        aria-label="Month"
        id={`${id}-month`}
        data-testid={testId ? `${testId}-month` : undefined}
        value={month ?? ""}
        placeholder="Month"
        disabled={disabled}
        onChange={(event) => commit(year, Number(event.target.value), day)}
      >
        {MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </GameSelect>
      <GameSelect
        aria-label="Day"
        id={`${id}-day`}
        data-testid={testId ? `${testId}-day` : undefined}
        value={day ?? ""}
        placeholder="Day"
        disabled={disabled}
        onChange={(event) => commit(year, month, Number(event.target.value))}
      >
        {Array.from({ length: maxDay }, (_, index) => index + 1).map((each) => (
          <option key={each} value={each}>
            {each}
          </option>
        ))}
      </GameSelect>
      <GameSelect
        aria-label="Year"
        id={`${id}-year`}
        data-testid={testId ? `${testId}-year` : undefined}
        value={year ?? ""}
        placeholder="Year"
        disabled={disabled}
        onChange={(event) => commit(Number(event.target.value), month, day)}
      >
        {years.map((each) => (
          <option key={each} value={each}>
            {each}
          </option>
        ))}
      </GameSelect>
    </span>
  );
}
