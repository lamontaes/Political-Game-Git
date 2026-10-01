import { describe, expect, it } from "vitest";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, daysBetween, makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import type { EntityId, World } from "../types";
import {
  UNRESEARCHED_EPIDEMIC as U,
  epidemicCaseSeverity,
  epidemicSeasonOn,
  epidemicSeriousness,
  epidemicSusceptibilityAtAge,
} from "./epidemic";

/**
 * LIVES step 2b: the epidemic's susceptibility, seriousness and season slide
 * with age to the day and the date, keeping the old levels in the middle of
 * each old band. Where the old code jumped (a fifth birthday, an eightieth,
 * the first of a month), a day now moves the value by a hair. The place for
 * the world case is drawn from all 56 by the seed.
 */
const SEED = "lives-epidemic-sliding-1";
const STATES = lifePlaceStateIdentities();
const state =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const DAY = 1 / 365.25;

describe("the epidemic's scales slide", () => {
  it("keeps the old susceptibility levels at the middle of each old band", () => {
    expect(epidemicSusceptibilityAtAge(2)).toBeCloseTo(1.5, 1);
    expect(epidemicSusceptibilityAtAge(11)).toBeCloseTo(1.2, 2);
    expect(epidemicSusceptibilityAtAge(41)).toBeCloseTo(1, 2);
    expect(epidemicSusceptibilityAtAge(85)).toBeCloseTo(1.4, 2);
  });

  it("moves susceptibility by a hair in a day where the old bands jumped", () => {
    // Old: 1.5 on the day before a fifth birthday, 1.2 on the day itself.
    for (const birthday of [5, 18, 65]) {
      let largest = 0;
      for (let age = birthday - 1; age < birthday + 1; age += DAY)
        largest = Math.max(
          largest,
          Math.abs(
            epidemicSusceptibilityAtAge(age + DAY) -
              epidemicSusceptibilityAtAge(age),
          ),
        );
      expect(largest, `around ${birthday}`).toBeLessThan(0.003);
    }
  });

  it("keeps the old seriousness at the middle of each old band and slides between", () => {
    expect(epidemicSeriousness(0.5, false)).toBeGreaterThan(0.85);
    expect(epidemicSeriousness(2, false)).toBeLessThan(0.02);
    expect(epidemicSeriousness(40, false)).toBeLessThan(0.001);
    expect(epidemicSeriousness(90, false)).toBeGreaterThan(0.99);
    // Already fighting another illness is serious at any age, as before.
    expect(epidemicSeriousness(40, true)).toBe(1);
    // Old: acute the day before an eightieth birthday, serious on it.
    for (const at of [1, 80]) {
      let largest = 0;
      for (let age = at - 1; age < at + 1; age += DAY)
        largest = Math.max(
          largest,
          Math.abs(
            epidemicSeriousness(age + DAY, false) -
              epidemicSeriousness(age, false),
          ),
        );
      expect(largest, `around ${at}`).toBeLessThan(0.003);
    }
  });

  it("turns the season by the day, holding each month's level at its middle", () => {
    U.seasonalMultiplier.forEach((level, index) =>
      expect(
        epidemicSeasonOn(
          makeIsoDate(`2027-${String(index + 1).padStart(2, "0")}-15`),
        ),
      ).toBeCloseTo(level, 6),
    );
    // Old: the level jumped on the first of each month (2 on March 31, 1 on
    // April 1). Now a day moves it by a day's share, across New Year too.
    let date = makeIsoDate("2026-12-01");
    for (let day = 0; day < 430; day += 1) {
      const next = addDays(date, 1);
      expect(
        Math.abs(epidemicSeasonOn(next) - epidemicSeasonOn(date)),
        date,
      ).toBeLessThan(0.05);
      date = next;
    }
  });

  it(`gives the same resident nearly the same case a day later (${state.name}, ${state.jurisdictionKey}, one of ${STATES.length}, seed ${SEED})`, () => {
    const small = smallWorld({ place: state.usps, people: 6, seed: SEED });
    const none = new Set<EntityId>();
    for (const personId of small.world.personOrder) {
      const person = small.world.people[personId]!;
      // The day before and the day of their eightieth birthday, and of their
      // first: where the old code flipped from an ordinary to a serious case.
      for (const years of [1, 80]) {
        const birthday = makeIsoDate(
          `${Number(person.birthDate.slice(0, 4)) + years}${person.birthDate.slice(4)}`,
        );
        const at = (date: string): World => ({
          ...small.world,
          currentDate: makeIsoDate(date),
        });
        const before = epidemicCaseSeverity(
          at(addDays(birthday, -1)),
          personId,
          none,
        );
        const on = epidemicCaseSeverity(at(birthday), personId, none);
        expect(daysBetween(addDays(birthday, -1), birthday)).toBe(1);
        // Old: 1,500,000 against 8,000,000 millionths across that one day.
        expect(Math.abs(on.hazardMicros - before.hazardMicros)).toBeLessThan(
          (U.hazardMicros.serious - U.hazardMicros.acute) / 100,
        );
      }
    }
  });
});
