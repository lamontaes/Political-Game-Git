import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../simulation";
import {
  applyFullBirthday,
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
      const age = startAgeForBirthday({ year, month: null, day: null }, START);
      expect(age).toBeGreaterThanOrEqual(MINIMUM_START_AGE);
      expect(age).toBeLessThanOrEqual(MAXIMUM_START_AGE);
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
