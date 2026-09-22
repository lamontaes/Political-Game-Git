import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../simulation";
import {
  applyFullBirthday,
  resolveCreatorBirthday,
  creatorBirthdayAgeRange,
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
  it("preserves each chosen component and is stable after completion", () => {
    const partial = applyFullBirthday(SETUP, {
      year: 1991,
      month: 7,
      day: null,
    })!;
    const result = resolveCreatorBirthday(partial, true)!;
    expect(result.birthYear).toBe(1991);
    expect(result.birthMonth).toBe(7);
    expect(result.birthDay).toBeGreaterThan(0);
    expect(resolveCreatorBirthday(result, true)).toEqual(result);
    expect(resolveCreatorBirthday(partial, true)).toEqual(result);
    const dayOnly = resolveCreatorBirthday({ ...SETUP, birthDay: 31 }, false)!;
    expect(dayOnly.birthDay).toBe(31);
    expect(dayOnly.startAge).toBe(SETUP.startAge);
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
