/// <reference types="node" />
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  hudRentRowFor,
  marketRentLevel,
  marketRentMinor,
  startTownLeases,
  townLeases,
} from "../../src/simulation/living-world/town-rent";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { createWorld } from "../../src/simulation/world";
import { makeIsoDate } from "../../src/simulation/dates";
import { SeededRng } from "../../src/simulation/rng";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { personName } from "../../src/simulation/people";

// Optional pristine-main route used by the parity runner before retiring the draws.
let baseline:
  | Pick<
      typeof import("../../src/simulation/living-world/town-rent"),
      "startTownLeases"
    >
  | undefined;
beforeAll(async () => {
  const path = process.env.TEAM4_RENT_PARITY_BASELINE;
  if (path) baseline = await import(/* @vite-ignore */ path);
});

const SEED = "team4-m11-rent-from-market-20260930";
const largest = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((largest.get(state)?.[1] ?? -1) < Number(population))
    largest.set(state, [key, Number(population)]);
}
largest.set("15", ["1571550", 0]);
largest.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!largest.has(usps)) largest.set(usps, [key, 0]);
const places = [...largest.values()].map(([key]) => key);
const supported = places.filter((key) =>
  hudRentRowFor(lifePlaceByKey(key)!.context.jurisdiction.id),
);
const rng = new SeededRng(SEED);
const watched: string[] = [];
while (watched.length < 5)
  watched.push(...supported.splice(rng.integer(0, supported.length), 1));

describe("market rent is HUD rent times the recorded level", () => {
  it("uses the same bedroom table rule across all 56 jurisdictions, with no seeded price level", () => {
    expect(places).toHaveLength(56);
    let priced = 0;
    for (const key of places) {
      const place = lifePlaceByKey(key)!;
      const row = hudRentRowFor(place.context.jurisdiction.id);
      // A missing HUD table remains unsupported; it is never zero rent.
      if (!row) {
        expect(row).toBeNull();
        continue;
      }
      priced++;
      const world = createWorld({
        seed: SEED,
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [place.context.jurisdiction],
        people: [],
      });
      const differentlySeeded = { ...world, seed: `${SEED}:another-world` };
      for (let bedrooms = 0; bedrooms <= 4; bedrooms++) {
        const expected =
          Math.round(
            row.rents[bedrooms]! *
              marketRentLevel(
                world,
                place.context.jurisdiction.id,
                world.currentDate,
              ),
          ) * 100;
        expect(
          marketRentMinor(
            world,
            place.context.jurisdiction.id,
            row,
            bedrooms,
            world.currentDate,
          ),
          `${key}:${bedrooms}`,
        ).toBe(expected);
        expect(
          marketRentMinor(
            differentlySeeded,
            place.context.jurisdiction.id,
            row,
            bedrooms,
            world.currentDate,
          ),
        ).toBe(expected);
      }
    }
    expect(priced).toBeGreaterThanOrEqual(51);
  });
  it.each(watched)(
    "writes a named person's market lease once and canonically reopens it in %s",
    (key) => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: key,
          seed: `${SEED}:${key}`,
          startAge: 30,
          questionnaire: "skipped",
        }),
      ).game!;
      const initial = game.world;
      const world = startTownLeases(initial, initial.currentDate);
      if (baseline) {
        const oldRoute = baseline.startTownLeases(initial, initial.currentDate);
        const withoutPrice = (
          record: (typeof world.history.resourceFlowTerms)[number],
        ) => ({ ...record, amount: null });
        expect({
          ...world.history,
          resourceFlowTerms: world.history.resourceFlowTerms.map(withoutPrice),
        }).toEqual({
          ...oldRoute.history,
          resourceFlowTerms:
            oldRoute.history.resourceFlowTerms.map(withoutPrice),
        });
        expect(world.people).toEqual(oldRoute.people);
        const changes = world.history.resourceFlowTerms.filter(
          (terms, index) =>
            terms.amount.minorUnits !==
            oldRoute.history.resourceFlowTerms[index]?.amount.minorUnits,
        ).length;
        console.log(
          `M11 parity ${key} seed=${SEED}:${key}: ${changes} price amounts changed; other history bytes equal.`,
        );
      }
      const lease = townLeases(world).find(
        (lease) => lease.regime === "market" && !lease.ended,
      )!;
      expect(lease).toBeDefined();
      const row = hudRentRowFor(lease.town)!;
      const terms = resourceFlowTermsAt(world, lease.flow.id)!;
      expect(terms.amount.minorUnits).toBe(
        Math.round(
          row.rents[lease.bedrooms]! *
            marketRentLevel(world, lease.town, world.currentDate),
        ) * 100,
      );
      expect(personName(world.people[lease.leaseholderId]!)).toBeTruthy();
      expect(startTownLeases(world, world.currentDate)).toBe(world);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(resourceFlowTermsAt(reopened, lease.flow.id)).toEqual(terms);
      expect(startTownLeases(reopened, reopened.currentDate)).toBe(reopened);
      expect(world.people).toBe(initial.people);
    },
  );
});
