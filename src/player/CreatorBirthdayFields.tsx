import { useState } from "react";

import { isoDateFromParts } from "../simulation";
import {
  applyFullBirthday,
  birthYearChoices,
  birthYearForSetup,
  creatorStartDate,
  creatorBirthdayAgeRange,
  randomFullBirthday,
} from "../presentation/creator-full-birthday";
import { birthdayProblemForSetup } from "../presentation/new-game-birthday";
import type { NewGameSetup } from "../presentation/new-game";
import { GameSelect } from "./controls/GameSelect";
import { world39Date } from "./World39News";
import "./creator-finish.css";

/**
 * Birthday as a month name, a day and a year (UI FINISH, after UX #254).
 *
 * Month names rather than numbers, and a day list never longer than the
 * month. Storage is unchanged: `birthMonth` and `birthDay` stay numbers,
 * clearing the month clears the day, and the year sets `startAge`.
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

/**
 * The whole birthday, and the age it makes (UI DECISION FOLLOW-THROUGH:
 * gender -> name -> full birthday -> derived age and start date).
 *
 * Month, day and year are the game's own selects. The year is what sets the
 * starting age; month and day stay optional, and without them the game picks
 * the anniversary as before. The age and the day play begins are shown, not
 * typed. Randomize draws a whole adult birthday from the life's seed.
 */
export function CreatorBirthdayFields({
  setup,
  yearChosen,
  onChange,
}: {
  readonly setup: NewGameSetup;
  /** False until the player has picked (or drawn) a birth year. */
  readonly yearChosen: boolean;
  readonly onChange: (next: NewGameSetup, yearChosen: boolean) => void;
}) {
  const [draws, setDraws] = useState(0);
  const month = setup.birthMonth ?? null;
  const day = setup.birthDay ?? null;
  const maxDay = month ? birthdayDaysInMonth(month) : 31;
  const startDate = creatorStartDate(setup);
  const year = yearChosen ? birthYearForSetup(setup) : null;
  const years = birthYearChoices(month, day, startDate);
  const problem = birthdayProblemForSetup(setup);
  const ageRange =
    year === null
      ? null
      : creatorBirthdayAgeRange({ year, month, day }, startDate);

  /** Keeps the chosen year when month or day changes, if it still works. */
  const withParts = (nextMonth: number | null, nextDay: number | null) => {
    if (year === null) {
      onChange(
        applyBirthdayPatch(setup, { birthMonth: nextMonth, birthDay: nextDay }),
        false,
      );
      return;
    }
    const choices = birthYearChoices(nextMonth, nextDay, startDate);
    const keptYear = choices.includes(year)
      ? year
      : choices.reduce(
          (best, candidate) =>
            Math.abs(candidate - year) < Math.abs(best - year)
              ? candidate
              : best,
          choices[0]!,
        );
    const next = applyFullBirthday(setup, {
      year: keptYear,
      month: nextMonth,
      day: nextDay,
    });
    if (next) onChange(next, true);
  };

  return (
    <fieldset
      className="game-fieldset creator-birthday"
      data-testid="creator-birthday"
    >
      <legend>Birthday</legend>
      <div className="creator-birthday-row">
        <label>
          Month
          <GameSelect
            data-testid="start-birth-month"
            value={month ?? ""}
            onChange={(event) => {
              const text = event.target.value;
              if (text === "") {
                withParts(null, null);
                return;
              }
              const nextMonth = Number(text);
              withParts(
                nextMonth,
                day !== null && day <= birthdayDaysInMonth(nextMonth)
                  ? day
                  : null,
              );
            }}
          >
            <option value="">Not set</option>
            {BIRTHDAY_MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </GameSelect>
        </label>
        <label>
          Day
          <GameSelect
            data-testid="start-birth-day"
            value={day ?? ""}
            disabled={month === null}
            onChange={(event) => {
              const text = event.target.value;
              withParts(month, text === "" ? null : Number(text));
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
          </GameSelect>
        </label>
        <label>
          Year
          <GameSelect
            data-testid="start-birth-year"
            value={year ?? ""}
            placeholder="Choose a year"
            onChange={(event) => {
              const text = event.target.value;
              if (text === "") return;
              const next = applyFullBirthday(setup, {
                year: Number(text),
                month,
                day,
              });
              if (next) onChange(next, true);
            }}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </GameSelect>
        </label>
        <button
          type="button"
          className="creator-birthday-random"
          data-testid="creator-randomize-birthday"
          onClick={() => {
            const salt = draws + 1;
            setDraws(salt);
            const next = applyFullBirthday(
              setup,
              randomFullBirthday(setup.seed, salt, startDate),
            );
            if (next) onChange(next, true);
          }}
        >
          Randomize birthday
        </button>
      </div>
      <p className="game-hint" data-testid="creator-derived-age">
        {yearChosen && month !== null && day !== null
          ? `You begin at age ${setup.startAge}, on ${world39Date(startDate)}.`
          : ageRange
            ? `Age ${ageRange.minimum === ageRange.maximum ? ageRange.minimum : `${ageRange.minimum}–${ageRange.maximum}`} on ${world39Date(startDate)}. Next fills the remaining birthday fields.`
            : `Play begins on ${world39Date(startDate)}. Next fills any blank birthday fields.`}
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
