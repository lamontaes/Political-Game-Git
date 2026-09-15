import { isoDateFromParts } from "../simulation";
import { birthdayProblemForSetup } from "../presentation/new-game-birthday";
import type { NewGameSetup } from "../presentation/new-game";
import "./creator-finish.css";

/**
 * Birthday as a month name and a day (UI FINISH, after UX #254).
 *
 * Two bare number boxes asked the player to know that 7 is July and let them
 * type 31 into February. These are native selects — keyboard, screen reader
 * and pointer all work the way the platform already does — and the day list is
 * never longer than the month. Storage is unchanged: `birthMonth` and
 * `birthDay` stay numbers, and clearing the month clears the day.
 */
export const BIRTHDAY_MONTH_NAMES: readonly string[] = [
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
];

/** Days a birthday in this month can have. February allows the 29th. */
export function birthdayDaysInMonth(month: number): number {
  if (month === 2) return 29;
  for (let day = 31; day >= 28; day -= 1) {
    try {
      isoDateFromParts(2001, month, day);
      return day;
    } catch {
      /* a shorter month */
    }
  }
  return 30;
}

export interface BirthdayPatch {
  readonly birthMonth: number | null;
  readonly birthDay: number | null;
}

export function CreatorBirthdayFields({
  setup,
  onChange,
}: {
  readonly setup: NewGameSetup;
  /** `null` means "leave this out of the setup", never zero. */
  readonly onChange: (patch: BirthdayPatch) => void;
}) {
  const month = setup.birthMonth;
  const day = setup.birthDay;
  const maxDay = month ? birthdayDaysInMonth(month) : 31;
  const problem = birthdayProblemForSetup(setup);
  return (
    <fieldset
      className="game-fieldset creator-birthday"
      data-testid="creator-birthday"
    >
      <legend>Birthday</legend>
      <div className="creator-birthday-row">
        <label>
          Month
          <select
            data-testid="start-birth-month"
            value={month ?? ""}
            onChange={(event) => {
              const text = event.target.value;
              if (text === "") {
                onChange({ birthMonth: null, birthDay: null });
                return;
              }
              const nextMonth = Number(text);
              onChange({
                birthMonth: nextMonth,
                birthDay:
                  day !== undefined && day <= birthdayDaysInMonth(nextMonth)
                    ? day
                    : null,
              });
            }}
          >
            <option value="">Not set</option>
            {BIRTHDAY_MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Day
          <select
            data-testid="start-birth-day"
            value={day ?? ""}
            disabled={month === undefined}
            onChange={(event) => {
              const text = event.target.value;
              onChange({
                birthMonth: month ?? null,
                birthDay: text === "" ? null : Number(text),
              });
            }}
          >
            <option value="">Not set</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <p className="game-hint">
        Optional. Your age still decides how old you are when play starts.
      </p>
      {problem ? (
        <p role="alert" data-testid="creator-birthday-problem">
          {problem}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Applies a birthday patch without writing `undefined` or zero into setup. */
export function applyBirthdayPatch(
  setup: NewGameSetup,
  patch: BirthdayPatch,
): NewGameSetup {
  const next: { -readonly [K in keyof NewGameSetup]: NewGameSetup[K] } = {
    ...setup,
  };
  if (patch.birthMonth === null) delete next.birthMonth;
  else next.birthMonth = patch.birthMonth;
  if (patch.birthDay === null) delete next.birthDay;
  else next.birthDay = patch.birthDay;
  return next;
}
