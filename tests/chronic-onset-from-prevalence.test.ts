import { describe, expect, it } from "vitest";
import { freshNewGameSetup } from "../src/presentation/new-game-geography";
import { createOpeningLifeController } from "../src/presentation/opening-life";
import {
  CONDITION_ONSET_KEY,
  CONDITION_PACK,
  conditionOnsetDay,
  conditionPrevalence,
  startingConditionKeys,
} from "../src/simulation/crisis/condition-pack";
import { conditionStrainInput } from "../src/simulation/crisis/mortality";
import { crisisRecords } from "../src/simulation/crisis/records";
import type {
  HealthEpisodeRecord,
  MortalityWindowRecord,
} from "../src/simulation/crisis/types";
import { addDays, daysBetween, makeIsoDate } from "../src/simulation/dates";
import type { IsoDate } from "../src/simulation/types";
import { drawRandomPlace } from "./support/random-place";

const DAY = makeIsoDate("2026-01-05");
const YEAR_DAYS = 365.25;

/** A person exactly `age` on DAY, by the same day count the record reads. */
function bornAt(age: number): IsoDate {
  return addDays(DAY, -Math.round(age * YEAR_DAYS));
}

describe("new chronic illness follows the pack's own prevalence (CTO ruling, October 2, 2026)", () => {
  it("begins in the share the pack's rise in prevalence gives, for every condition that begins during life", () => {
    // 4,000 people of 50 with no recorded cause. Among those who do not hold
    // a condition at 50, the share who begin it before 60 is the pack's rise
    // in prevalence from 50 to 60 among those without it.
    const seed = "chronic-onset-gradient";
    const birthDate = bornAt(50);
    const tenYears = addDays(DAY, Math.round(10 * YEAR_DAYS));
    for (const condition of CONDITION_PACK) {
      if (!condition.onsetScale) continue;
      let without = 0;
      let begun = 0;
      for (let index = 0; index < 4000; index += 1) {
        const personId = `person_gradient_${index}`;
        const age = daysBetween(birthDate, DAY) / YEAR_DAYS;
        if (
          startingConditionKeys(seed, personId, age, "equal-mixture").includes(
            condition.key,
          )
        )
          continue;
        without += 1;
        const day = conditionOnsetDay(
          {
            key: condition.key,
            seed,
            personId,
            birthDate,
            category: "equal-mixture",
            exposureStart: DAY,
            coverage: [],
          },
          DAY,
          tenYears,
        );
        if (day === null) continue;
        begun += 1;
        // The day is the one on which the share of people that age holding
        // it passes the person's own place: they would start with it now,
        // and would not have the day before.
        const ageThen = daysBetween(birthDate, day) / YEAR_DAYS;
        const ageBefore = daysBetween(birthDate, addDays(day, -1)) / YEAR_DAYS;
        expect(
          startingConditionKeys(seed, personId, ageThen, "equal-mixture"),
        ).toContain(condition.key);
        expect(
          startingConditionKeys(seed, personId, ageBefore, "equal-mixture"),
        ).not.toContain(condition.key);
      }
      const at50 = conditionPrevalence(condition, 50, "equal-mixture");
      const at60 = conditionPrevalence(
        condition,
        daysBetween(birthDate, tenYears) / YEAR_DAYS,
        "equal-mixture",
      );
      const expected = (at60 - at50) / (1 - at50);
      expect(expected, condition.key).toBeGreaterThan(0);
      expect(Math.abs(begun / without - expected), condition.key).toBeLessThan(
        0.015,
      );
    }
  });

  it("keeps rising past the last band's middle, at the rise between the last two middles", () => {
    for (const condition of CONDITION_PACK) {
      if (!condition.onsetScale) continue;
      const bands = condition.prevalence;
      const middle = (band: (typeof bands)[number]) =>
        (band.fromAge + band.toAge + 1) / 2;
      const last = bands.at(-1)!;
      const before = bands.at(-2)!;
      const rise =
        (last.percent - before.percent) /
        100 /
        (middle(last) - middle(before));
      const at = (age: number) =>
        conditionPrevalence(condition, age, "equal-mixture");
      expect(at(middle(last)), condition.key).toBeCloseTo(last.percent / 100, 6);
      expect(at(middle(last) + 10) - at(middle(last)), condition.key).toBeCloseTo(
        rise * 10,
        6,
      );
    }
  });

  it(
    "records a new life's existing conditions on Begin and puts the first new ones on the clock",
    () => {
      // A place drawn from all 56 for this run.
      const seed = "chronic-onset-begin";
      const place = drawRandomPlace(seed);
      const session = createOpeningLifeController({
        ...freshNewGameSetup(`${seed}:${place.key}`),
        placeKey: place.key,
      }).finishTransition();
      const world = session.game!.world;
      const begin = world.currentDate;
      const records = crisisRecords(world);
      const windows = records.filter(
        (record): record is MortalityWindowRecord =>
          record.kind === "mortality-window",
      );
      expect(windows, `${place.name}, seed ${seed}`).toHaveLength(1);
      expect(windows[0]!.effectiveAt).toBe(begin);
      expect(windows[0]!.dueItemId).toBeNull();
      // Everyone alive at Begin, the people the opening's last steps add
      // included, is tracked from Begin: nobody's health starts blank.
      const tracked = new Set(windows[0]!.newlyTrackedPersonIds);
      const dead = new Set(
        world.history.personDeaths.map((death) => death.personId),
      );
      const living = world.personOrder.filter((id) => !dead.has(id));
      expect(living.length).toBeGreaterThan(0);
      expect(living.filter((id) => !tracked.has(id))).toEqual([]);
      const conditions = records.filter(
        (record): record is HealthEpisodeRecord =>
          record.kind === "health-episode" && record.label === "condition",
      );
      expect(conditions.length).toBeGreaterThan(0);
      for (const episode of conditions)
        expect(episode.effectiveAt).toBe(begin);
      // The next window opens on the next quarter boundary, as before.
      expect(
        world.history.futureDueItems.some(
          (item) =>
            item.transitionKey === "crisis:mortality-window" &&
            item.dueAt > begin &&
            item.dueAt.endsWith("-01"),
        ),
      ).toBe(true);
      // Somebody who does not hold a condition has its first day on the
      // clock inside the first window, through the onset writer's due item.
      const onsets = world.history.futureDueItems.filter(
        (item) => item.transitionKey === CONDITION_ONSET_KEY,
      );
      expect(onsets.length).toBeGreaterThan(0);
      for (const item of onsets.slice(0, 20)) {
        const personId = item.entityIds[0]!;
        const strain = conditionStrainInput(world, personId)!;
        const key = item.stableKey.split(":")[2]!;
        expect(strain.held.has(key)).toBe(false);
      }
    },
    120_000,
  );
});
