import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  describeTownBusinesses,
  reviewTownBusinesses,
} from "../../src/simulation/living-world/town-businesses";
import {
  TOWN_ECONOMY_MEASURES,
  townBirths,
  townBusinessClosings,
  townBusinessOpenings,
  townJobCount,
  townJobsBySector,
  townMedianHourlyPay,
  townUnemploymentRate,
} from "../../src/simulation/living-world/town-economy-measures";
import {
  describeTownFamilies,
  reviewTownFamilies,
} from "../../src/simulation/living-world/town-families";
import { reviewTownJobs } from "../../src/simulation/living-world/town-labor-market";
import {
  startTownJobPay,
  townMinimumHourly,
} from "../../src/simulation/living-world/town-pay";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  OUTCOME_LINKS,
  drawnLinkSize,
  outcomeFactor,
} from "../../src/simulation/outcome-web";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { World } from "../../src/simulation";

function openAt(placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `economy-measures-${placeKey}`,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  let world = game.world;
  world = startTownJobPay(world, personId, world.currentDate);
  return { world, personId, town: world.people[personId]!.homeJurisdictionId };
}

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

describe("lane B's measures read from the town's records", () => {
  it("reads an Omaha town at the opening and after five years of reviews", () => {
    const opened = openAt("3137000");
    const { personId, town } = opened;
    let world: World = opened.world;
    const start = world.currentDate;

    const unemployment = townUnemploymentRate(world, town);
    expect(unemployment.basis).toBeGreaterThan(0);
    expect(unemployment.value).toBeGreaterThanOrEqual(0);
    expect(unemployment.value).toBeLessThan(25);

    const jobs = townJobCount(world, town).value!;
    expect(jobs).toBeGreaterThan(0);
    const sectors = townJobsBySector(world, town);
    expect([...sectors.values()].reduce((a, b) => a + b, 0)).toBe(jobs);

    const pay = townMedianHourlyPay(world, town);
    expect(pay.basis).toBeGreaterThan(0);
    expect((pay.value ?? 0) / 100).toBeGreaterThanOrEqual(
      (townMinimumHourly(town) ?? 0) - 0.01,
    );
    expect(townBirths(world, town, start)).toEqual({ value: 0, basis: 0 });

    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < 20; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownBusinesses(world, town, personId, `m-${round}`);
        world = reviewTownJobs(world, town, personId, `m-${round}`);
        world = reviewTownFamilies(world, town, personId, `m-${round}`);
      }
    });

    const businesses = describeTownBusinesses(world, town, start);
    expect(townBusinessOpenings(world, town, start).value).toBe(
      businesses.opened,
    );
    expect(townBusinessClosings(world, town, start).value).toBe(
      businesses.closed,
    );
    expect(businesses.opened + businesses.closed).toBeGreaterThan(0);
    const births = townBirths(world, town, start).value!;
    expect(births).toBe(describeTownFamilies(world, town).births);
    // A child comes only from a couple's recorded family plan; nobody in this
    // town raised one, so the reviews alone record no birth.
    expect(births).toBe(0);
    const later = townUnemploymentRate(world, town);
    expect(later.value).toBeGreaterThanOrEqual(0);
    console.log(
      `Omaha: unemployment ${unemployment.value!.toFixed(1)}% -> ${later.value!.toFixed(1)}%; ` +
        `${jobs} jobs; median $${(pay.value! / 100).toFixed(2)} an hour; ` +
        `5 years: ${businesses.opened} opened, ${businesses.closed} closed, ${births} births`,
    );
  }, 60_000);

  it("reads every one of the 50 states, D.C. and the 5 territories by one rule", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    const unpaid: string[] = [];
    for (const key of places) {
      const { world, town } = openAt(key);
      for (const [measure, read] of Object.entries(TOWN_ECONOMY_MEASURES)) {
        const reading = read(world, town, world.currentDate);
        // Unknown is null, never NaN and never a made-up zero.
        if (reading.value === null) expect(reading.basis, key).toBe(0);
        else
          expect(Number.isFinite(reading.value), `${key} ${measure}`).toBe(
            true,
          );
      }
      expect(townJobCount(world, town).value, key).toBeGreaterThan(0);
      if (townMedianHourlyPay(world, town).value === null) unpaid.push(key);
    }
    console.log(
      `No town pay on record, so wages read UNKNOWN: ${unpaid.join(", ") || "none"}`,
    );
  }, 240_000);
});

describe("births follow the outcome web", () => {
  function withNationalUnemployment(
    world: World,
    pct: number,
    recordedAt: string,
  ) {
    return {
      ...world,
      macroEconomy: {
        months: [{ scope: "national", recordedAt, unemploymentPct: pct }],
      },
    } as unknown as World;
  }

  it("each point of unemployment nine months before lowers births 1.4%, and names the link", () => {
    const { world, town } = openAt("3137000");
    const today = world.currentDate;
    const yearAgo = addDays(today, -365);
    // The births level (#885) is always read; at its base it changes nothing.
    // So is the law the state began with (Nebraska's abortion limit), which
    // moves births only once a later law changes it.
    const others = (causes: readonly { key: string; factor: number }[]) =>
      causes.filter(
        (cause) =>
          cause.key !== "births-level-to-births" &&
          !(cause.key === "abortion-ban-to-births" && cause.factor === 1),
      );
    const none = outcomeFactor(world, town, "births.rate", today);
    expect(none.multiplier).toBe(1);
    expect(others(none.causes)).toEqual([]);

    const atBaseline = outcomeFactor(
      withNationalUnemployment(world, 4, yearAgo),
      town,
      "births.rate",
      today,
    );
    expect(atBaseline.multiplier).toBeCloseTo(1, 10);

    const high = outcomeFactor(
      withNationalUnemployment(world, 8, yearAgo),
      town,
      "births.rate",
      today,
    );
    // Each world draws its own size from the link's range (#880).
    const link = OUTCOME_LINKS.find((l) => l.key === "unemployment-to-births")!;
    const size = drawnLinkSize(world, link, town);
    expect(size).toBeLessThan(0);
    expect(high.multiplier).toBeCloseTo(1 + size * 4, 10);
    expect(others(high.causes).map((cause) => cause.key)).toEqual([
      "unemployment-to-births",
    ]);

    // Recorded three months ago: not yet nine months before, so not read.
    const recent = outcomeFactor(
      withNationalUnemployment(world, 8, addDays(today, -90)),
      town,
      "births.rate",
      today,
    );
    expect(recent.multiplier).toBe(1);

    // The child tax credit is about zero on births: never a cause.
    expect(
      high.causes.some((cause) => cause.key === "child-tax-credit-to-births"),
    ).toBe(false);
  });
});
