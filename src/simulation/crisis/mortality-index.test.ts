import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../campaigns";
import { createCharacterHistoryContextPeople } from "../character-history";
import { addDays } from "../dates";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import type { World } from "../types";
import {
  cumulativeHazardUnits,
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
} from "./hazard";
import { FIXED_LN2 } from "./fixed-point";
import { beginHealthEpisode } from "./health";
import {
  conditionStrainInput,
  crisisMortalityWindowAt,
  ensureCrisisMortality,
  hazardMultipliersOf,
  mortalityCalibrationOf,
  mortalityExposureStarts,
  strainDrivers,
} from "./mortality";

/*
 * The mortality index follows the record list as it grows: every read after
 * each write must equal the read a fresh build from the whole list gives. The
 * place is drawn from all 56 by the seed.
 */
const SEED = "mortality-index-1";
const STATES = lifePlaceStateIdentities();
const STATE =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const small = smallWorld({ place: STATE.usps, people: 4, seed: SEED });
const HANDLERS = composeWorldTimeHandlers();

/** The same World with a copied record list, which no index has followed. */
function fresh(world: World): World {
  return {
    ...world,
    history: {
      ...world.history,
      crisisRecords: [...(world.history.crisisRecords ?? [])],
    },
  };
}

function reads(world: World) {
  const day = world.currentDate;
  return world.personOrder.map((personId) => {
    const strain = conditionStrainInput(world, personId);
    return {
      personId,
      start: mortalityExposureStarts(world).get(personId) ?? null,
      category: mortalityCalibrationOf(world, personId),
      multipliers: hazardMultipliersOf(world, personId),
      drivers: strainDrivers(world, personId, day),
      strain: strain && { ...strain, held: [...strain.held].sort() },
      window: crisisMortalityWindowAt(world, day)?.id ?? null,
    };
  });
}

describe(`the mortality index follows appended records (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("reads after every write as a fresh build of the whole list does", () => {
    const date = small.world.currentDate;
    let world = createCharacterHistoryContextPeople(
      small.world,
      Array.from({ length: 40 }, (_, index) => ({
        stableKey: `mortality-index:${index}`,
        givenName: "Index",
        familyName: `Person-${index}`,
        birthDate: addDays(date, -Math.round((60 + index) * 365.25) - index),
        homeJurisdictionId: small.jurisdictionId,
      })),
    );
    world = ensureCrisisMortality(world);
    const firstWindow = world.history.futureDueItems.find(
      (item) => item.transitionKey === "crisis:mortality-window",
    )!.dueAt;
    world = resolveFutureDueItemsThrough(world, firstWindow, HANDLERS);
    expect(reads(world)).toEqual(reads(fresh(world)));
    // A recorded episode for one person changes only what is read for them.
    const ill = world.personOrder.at(-5)!;
    const before = reads(world);
    world = beginHealthEpisode(world, {
      stableKey: "mortality-index:episode",
      personId: ill,
      severity: "serious",
      initialLimitation: "limited",
      origin: { kind: "authored", note: "Mortality index test episode" },
      causalParentIds: [],
      hazard: { micros: 3 * MULTIPLIER_ONE, basis: "Mortality index test" },
    });
    const after = reads(world);
    expect(after).toEqual(reads(fresh(world)));
    expect(after.filter((row) => row.personId !== ill)).toEqual(
      before.filter((row) => row.personId !== ill),
    );
    expect(after.find((row) => row.personId === ill)!.multipliers).not.toEqual(
      before.find((row) => row.personId === ill)!.multipliers,
    );
    // A year of the clock: onsets, conditions, deaths and episodes ending.
    for (let month = 1; month <= 12; month += 1) {
      world = resolveFutureDueItemsThrough(
        world,
        addDays(firstWindow, month * 30),
        HANDLERS,
      );
      expect(reads(world), `month ${month}`).toEqual(reads(fresh(world)));
    }
    expect(world.history.personDeaths.length).toBeGreaterThan(0);
  }, 60_000);

  it("finds the crossing day a full scan finds, for any span asked", () => {
    const date = small.world.currentDate;
    const profile = {
      birthDate: addDays(date, -Math.round(101.3 * 365.25)),
      category: "equal-mixture" as const,
      exposureStart: date,
      multipliers: [
        { effectiveAt: addDays(date, 40), micros: 2 * MULTIPLIER_ONE },
      ],
    };
    const threshold = thresholdUnits(FIXED_LN2);
    // The day by definition: the first whose end reaches the threshold.
    let day = date;
    while (cumulativeHazardUnits(profile, addDays(day, 1)) < threshold)
      day = addDays(day, 1);
    for (const [from, to] of [
      [date, addDays(date, 90)],
      [addDays(date, 90), addDays(date, 180)],
      [date, addDays(date, 3650)],
      [day, addDays(day, 1)],
      [addDays(day, 1), addDays(day, 30)],
      [addDays(day, -1), day],
    ] as const) {
      const expected = day < from ? from : day < to ? day : null;
      expect(
        firstThresholdDay(profile, threshold, from, to),
        `${from}..${to}`,
      ).toBe(expected);
    }
  });
});
