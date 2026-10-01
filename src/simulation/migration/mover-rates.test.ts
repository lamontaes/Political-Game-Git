import { describe, expect, it } from "vitest";

import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { ageOnDate } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import type { EntityId } from "../types";
import {
  migrationTown,
  moverArrivalRate,
  moverDepartureRate,
  residentDepartureChance,
} from ".";

/**
 * A165: the quarterly migration review weighs each adult resident's leaving
 * by the share of people their age in their state who move away in a year
 * (American Community Survey 2024), in place of one flat chance for all.
 * The place is drawn by seed from all 56 (set A165_SEED to watch another).
 */

const SEED = process.env.A165_SEED ?? "a165-mover-rates-3";
const place = observerPlace(SEED);
const stateKey = place.stateJurisdictionKey;

type PlaceRates = {
  readonly basis: string;
  readonly method?: string;
  readonly departurePerYearByAge: Readonly<Record<string, number>>;
  readonly arrivalsPerResidentPerYear: number;
};
const PLACES = moverRates.places as Readonly<Record<string, PlaceRates>>;

describe("measured mover rates (A165)", () => {
  it("every one of the 56 places has rates by age: its own survey figures, or the nation's marked as an estimate", () => {
    const keys = Object.keys(PLACES).sort();
    expect(keys).toHaveLength(56);
    for (const identity of lifePlaceStateIdentities())
      expect(keys).toContain(identity.jurisdictionKey);
    for (const [key, row] of Object.entries(PLACES)) {
      if (row.basis === "ESTIMATED FROM AVERAGE") {
        expect(row.method, key).toContain("ESTIMATED FROM AVERAGE");
        expect(row.departurePerYearByAge).toEqual(
          moverRates.national.departurePerYearByAge,
        );
      } else expect(row.basis, key).toBe("SOURCED");
      for (const band of moverRates.ageBands) {
        const rate = row.departurePerYearByAge[band];
        expect(rate, `${key} ${band}`).toBeGreaterThan(0);
        expect(rate, `${key} ${band}`).toBeLessThan(1);
      }
      expect(row.arrivalsPerResidentPerYear, key).toBeGreaterThan(0);
    }
  });

  it(
    `in ${place.displayName} (${place.key}, seed ${SEED}) each resident's chance of leaving follows their age`,
    { timeout: 600_000 },
    () => {
      console.log(
        `A165 place: ${place.displayName} (${place.key}, ${stateKey}), seed ${SEED}`,
      );
      expect(stateKey).not.toBeNull();
      const young = moverDepartureRate(stateKey, 22);
      const settled = moverDepartureRate(stateKey, 47);
      const old = moverDepartureRate(stateKey, 72);
      console.log(
        `A165 ${place.displayName}: leaves a year at 22 ${young}, at 47 ${settled}, at 72 ${old}; newcomers per resident ${moverArrivalRate(stateKey)}`,
      );
      expect(young).toBe(PLACES[stateKey!]!.departurePerYearByAge["20-24"]);
      expect(young).toBeGreaterThan(settled);
      expect(settled).toBeGreaterThan(old);

      // The review's own weighing, read for the town's actual residents.
      const world = openObserverWorld(observerSetup(SEED, place.key)).world;
      const town = migrationTown(world)!;
      expect(town).not.toBeNull();
      const byRate = new Map<number, EntityId>();
      for (const id of world.personOrder) {
        const person = world.people[id]!;
        if (person.homeJurisdictionId !== town) continue;
        const age = ageOnDate(person.birthDate, world.currentDate);
        if (age >= 18) byRate.set(moverDepartureRate(stateKey, age), id);
      }
      console.log(
        `A165 ${place.displayName}: ${byRate.size} distinct departure chances among the town's adults`,
      );
      expect(byRate.size).toBeGreaterThan(1);
      const push = 1.5;
      const chances = [...byRate].map(([rate, id]) => {
        const chance = residentDepartureChance(
          world,
          stateKey,
          id,
          push,
          false,
        );
        expect(chance, id).toBeCloseTo(rate * push, 12);
        return chance;
      });
      expect(new Set(chances).size).toBe(byRate.size);
      // A scenario's flat rate still replaces the age weighing.
      const [someone] = byRate.values();
      expect(
        residentDepartureChance(world, stateKey, someone!, 1, false, {
          departureChancePerYear: 0.2,
        }),
      ).toBe(0.2);
    },
  );
});
