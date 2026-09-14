import { isoDateFromParts } from "../simulation";
import { CALENDAR_MONTH_NAMES } from "../presentation/date-display";
import { birthdayProblemForSetup } from "../presentation/new-game-birthday";
import type { NewGameSetup } from "../presentation/new-game";

function daysInMonth(month: number): number {
  if (month === 2) return 29;
  for (let day = 31; day >= 28; day -= 1) {
    try {
      isoDateFromParts(2001, month, day);
      return day;
    } catch {
      /* shorter month */
    }
  }
  return 30;
}

export function CreatorBirthdayFields({
  setup,
  problem,
  onChange,
}: {
  readonly setup: NewGameSetup;
  readonly problem: string | null;
  readonly onChange: (patch: Partial<NewGameSetup>) => void;
}) {
  const month = setup.birthMonth;
  const day = setup.birthDay;
  const maxDay = month ? daysInMonth(month) : 31;
  return (
    <fieldset className="creator-birthday" data-testid="creator-birthday">
      <legend>Birthday</legend>
      <p className="game-hint">
        Optional. Month and day complete the anniversary; age still sets how old
        you are when play starts.
      </p>
      <div className="creator-birthday-row">
        <label>
          Month
          <select
            data-testid="start-birth-month"
            value={month ?? ""}
            onChange={(event) => {
              const text = event.target.value;
              if (text === "") {
                onChange({ birthMonth: undefined, birthDay: undefined });
                return;
              }
              const nextMonth = Number(text);
              const nextDay =
                day && day > daysInMonth(nextMonth) ? undefined : day;
              onChange({ birthMonth: nextMonth, birthDay: nextDay });
            }}
          >
            <option value="">Leave blank</option>
            {CALENDAR_MONTH_NAMES.map((name, index) => (
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
                birthDay: text === "" ? undefined : Number(text),
              });
            }}
          >
            <option value="">Leave blank</option>
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
      {problem || birthdayProblemForSetup(setup) ? (
        <p role="alert" data-testid="creator-birthday-problem">
          {problem ?? birthdayProblemForSetup(setup)}
        </p>
      ) : null}
    </fieldset>
  );
}
