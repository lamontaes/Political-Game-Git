import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../simulation";
import {
  applyFullBirthday,
  resolveCreatorBirthday,
  creatorBirthdayAgeRange,
  birthYearChoiceLabel,
  birthYearChoices,
  birthYearForSetup,
  randomFullBirthday,
  startAgeForBirthday,
} from "./creator-full-birthday";
import {
  DEFAULT_NEW_GAME_SETUP,
  MAXIMUM_START_AGE,
  MINIMUM_START_AGE,
} from "./new-game";

const START = makeIsoDate("2026-01-05");
const SETUP = { ...DEFAULT_NEW_GAME_SETUP, seed: "birthday-test" };

describe("full birthday with a derived starting age", () => {
  it("derives the age from the anniversary relative to the start day", () => {
    expect(startAgeForBirthday({ year: 1990, month: 1, day: 5 }, START)).toBe(
      36,
    );
    expect(startAgeForBirthday({ year: 1990, month: 1, day: 6 }, START)).toBe(
      35,
    );
    expect(
      startAgeForBirthday({ year: 1990, month: null, day: null }, START),
    ).toBe(36);
  });

  it("offers only years inside the age range and real dates", () => {
    const years = birthYearChoices(2, 29, START);
    expect(years.every((year) => year % 4 === 0)).toBe(true);
    for (const year of birthYearChoices(null, null, START)) {
      const range = creatorBirthdayAgeRange(
        { year, month: null, day: null },
        START,
      )!;
      expect(range).not.toBeNull();
      expect(range.minimum).toBeGreaterThanOrEqual(MINIMUM_START_AGE);
      expect(range.maximum).toBeLessThanOrEqual(MAXIMUM_START_AGE);
    }
  });

  it("labels fresh choices with playable ages and excludes partial boundary years", () => {
    const years = birthYearChoices(null, null, START);
    expect(years[0]).toBe(2020);
    expect(years.at(-1)).toBe(1956);
    expect(birthYearChoiceLabel(years[0]!, null, null, START)).toBe(
      "2020 (age 5–6)",
    );
    expect(
      years.every((year) => {
        const range = creatorBirthdayAgeRange(
          { year, month: null, day: null },
          START,
        );
        return (
          range !== null &&
          range.minimum >= MINIMUM_START_AGE &&
          range.maximum <= MAXIMUM_START_AGE
        );
      }),
    ).toBe(true);
  });

  it("starts at agency age five and excludes a birthday still aged four", () => {
    expect(MINIMUM_START_AGE).toBe(5);
    expect(birthYearChoices(1, 5, START)[0]).toBe(2021);
    expect(birthYearChoices(1, 6, START)[0]).toBe(2020);
    expect(
      applyFullBirthday(SETUP, { year: 2021, month: 1, day: 6 }),
    ).toBeNull();
    expect(
      applyFullBirthday(SETUP, { year: 2021, month: 1, day: 5 })!.startAge,
    ).toBe(5);
  });

  it("writes the derived age and round-trips the birth year", () => {
    const next = applyFullBirthday(SETUP, {
      year: 1991,
      month: 7,
      day: 14,
    })!;
    expect(next.birthMonth).toBe(7);
    expect(next.birthDay).toBe(14);
    expect(birthYearForSetup(next)).toBe(1991);
    expect(
      applyFullBirthday(SETUP, { year: 1800, month: 1, day: 1 }),
    ).toBeNull();
    const cleared = applyFullBirthday(next, {
      year: 1991,
      month: null,
      day: null,
    })!;
    expect(cleared.birthMonth).toBeUndefined();
    expect(cleared.birthDay).toBeUndefined();
  });

  it("randomizes deterministically to a usable adult birthday", () => {
    const first = randomFullBirthday("seed", 1, START);
    expect(randomFullBirthday("seed", 1, START)).toEqual(first);
    expect(birthYearChoices(first.month, first.day, START)).toContain(
      first.year,
    );
    expect(startAgeForBirthday(first, START)).toBeGreaterThanOrEqual(18);
  });
});

describe("PLAYTEST65 birthday completion", () => {
  it("requires both anniversary fields and preserves a complete chosen date", () => {
    const partial = applyFullBirthday(SETUP, {
      year: 1991,
      month: 7,
      day: null,
    })!;
    expect(resolveCreatorBirthday(partial, true)).toBeNull();
    const complete = applyFullBirthday(partial, {
      year: 1991,
      month: 7,
      day: 14,
    })!;
    const result = resolveCreatorBirthday(complete, true)!;
    expect(result.birthYear).toBe(1991);
    expect(result.birthMonth).toBe(7);
    expect(result.birthDay).toBe(14);
    expect(resolveCreatorBirthday(result, true)).toEqual(result);
    expect(resolveCreatorBirthday(complete, true)).toEqual(result);
    expect(
      resolveCreatorBirthday({ ...SETUP, birthDay: 31 }, false),
    ).toBeNull();
    expect(resolveCreatorBirthday(SETUP, false)).toBe(SETUP);
    const ageOnly = resolveCreatorBirthday(
      { ...SETUP, birthMonth: 7, birthDay: 14 },
      false,
    )!;
    expect(ageOnly.startAge).toBe(SETUP.startAge);
    expect(ageOnly.birthMonth).toBe(7);
    expect(ageOnly.birthDay).toBe(14);
  });
  it("rejects impossible chosen dates and reports a year-only age range", () => {
    expect(
      resolveCreatorBirthday(
        { ...SETUP, birthYear: 1991, birthMonth: 2, birthDay: 29 },
        true,
      ),
    ).toBeNull();
    expect(
      creatorBirthdayAgeRange({ year: 1990, month: null, day: null }, START),
    ).toEqual({ minimum: 35, maximum: 36 });
  });
});
