import { describe, expect, it } from "vitest";

import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { ageOnDate, makeIsoDate } from "../dates";
import { recordKinship } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import type { EntityId, World } from "../types";
import { advanceWithWorldIntegrityAtEnd, assertWorldIntegrity } from "../world";
import {
  causeReader,
  migrationTown,
  moverArrivalRate,
  moverDepartureRate,
  recordedMoves,
  relocateHousehold,
  reviewQuarter,
  reviewTown,
  startWave,
} from ".";

/**
 * A165: the quarterly migration review weighs each adult resident's leaving
 * by the share of people their age in their state who move away in a year
 * (American Community Survey 2024), in place of one flat chance for all.
 * The place is drawn by seed from all 56 (set A165_SEED to watch another).
 */

/** A seed set in the environment, to watch another place. */
const seedFromEnv = (name: string): string | undefined =>
  (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process?.env[name];

const SEED = seedFromEnv("A165_SEED") ?? "a165-mover-rates-3";
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
      // Nobody leaves on their age alone: an adult with no recorded cause
      // has nothing to weigh, so the review moves them nowhere (A135).
      const reader = causeReader(world, town);
      for (const id of byRate.values())
        if (reader.causesFor(id).length === 0) {
          const quarter = reviewQuarter(id);
          const reviewed = advanceWithWorldIntegrityAtEnd(() =>
            reviewTown(world, quarter, { arrivalsPerResidentPerYear: 0 }),
          );
          expect(reviewed.people[id]!.homeJurisdictionId, id).toBe(town);
          break;
        }
    },
  );
});

/**
 * A135 (CTO ruling (j)): moving away is a decision. A resident leaves only
 * when a recorded cause pushes them past their own bar, and goes to that
 * cause's place. The place is drawn by seed from all 56 (set A135_SEED to
 * watch another).
 */
const A135_SEED = seedFromEnv("A135_SEED") ?? "a135-migration-causes-1";
const a135Place = observerPlace(A135_SEED);

describe(`leaving town is a decision from a recorded cause (A135), in ${a135Place.displayName} (${a135Place.key}, seed ${A135_SEED})`, () => {
  it(
    "a young woman follows her sister to the state the sister moved to; a neighbor with no cause stays",
    { timeout: 240_000 },
    () => {
      console.log(
        `A135 place: ${a135Place.displayName} (${a135Place.key}, ${a135Place.stateJurisdictionKey}), seed ${A135_SEED}`,
      );
      const opened = openObserverWorld(
        observerSetup(A135_SEED, a135Place.key),
      ).world;
      const town = migrationTown(opened)!;
      expect(town).not.toBeNull();
      // The sister's new home: the first other state the world holds.
      const ownState = stateJurisdictionForKey(
        a135Place.stateJurisdictionKey!,
      )?.id;
      const elsewhere = opened.jurisdictionOrder.find(
        (id) =>
          opened.jurisdictions[id]!.kind === "state-placeholder" &&
          id !== ownState,
      )!;
      const people = [
        ["a135:rosa", "Rosa", "2001-03-14"],
        ["a135:lucia", "Lucia", "1998-07-02"],
        ["a135:ana", "Ana", "2001-05-20"],
      ] as const;
      let world: World = createCharacterHistoryContextPeople(
        opened,
        people.map(([stableKey, givenName, birthDate]) => ({
          stableKey,
          givenName,
          familyName: givenName === "Ana" ? "Ferris" : "Delgado",
          birthDate: makeIsoDate(birthDate),
          homeJurisdictionId: town,
        })),
      );
      const [rosa, lucia, ana] = people.map(([key]) =>
        characterHistoryContextPersonId(world, key),
      ) as [EntityId, EntityId, EntityId];
      world = recordKinship(world, {
        stableKey: "a135:sisters",
        personIds: [rosa, lucia],
        establishedAt: "2001-03-14",
        kind: "collateral:sibling",
        provenance: { kind: "authored", note: "A135 test" },
      });
      expect(causeReader(world, town).causesFor(rosa)).toEqual([]);
      // Lucia takes a transfer to another state: the recorded cause.
      world = relocateHousehold(world, {
        stableKey: "a135:lucia-transfer",
        personId: lucia,
        toJurisdictionId: elsewhere,
        reason: "work:transfer",
        waveKey: null,
      });
      const luciaMove = recordedMoves(world).at(-1)!;
      const causes = causeReader(world, town).causesFor(rosa);
      expect(causes.map((cause) => [cause.kind, cause.placeId])).toEqual([
        ["kin-moved", elsewhere],
      ]);
      expect(causeReader(world, town).causesFor(ana)).toEqual([]);

      // A wave covering the town is named on the move a cause made.
      world = startWave(world, "jobs-gone-exodus", town, "A135 test.");
      const quarters = [...new Set([reviewQuarter(rosa), reviewQuarter(ana)])];
      let reviewed = world;
      for (const quarter of quarters)
        reviewed = advanceWithWorldIntegrityAtEnd(() =>
          reviewTown(reviewed, quarter, { arrivalsPerResidentPerYear: 0 }),
        );
      assertWorldIntegrity(reviewed);
      const rosaMove = recordedMoves(reviewed).find((move) =>
        move.personIds.includes(rosa),
      )!;
      expect(rosaMove, "Rosa follows her sister").toBeDefined();
      expect(rosaMove.toJurisdictionId).toBe(elsewhere);
      expect(rosaMove.reason).toBe("family:followed-kin");
      expect(rosaMove.causeId).toBe(luciaMove.eventId);
      expect(rosaMove.waveKey).toBe("jobs-gone-exodus");
      const event = reviewed.history.events.find(
        (row) => row.id === rosaMove.eventId,
      )!;
      console.log(`A135 recorded: ${event.summary}`);
      expect(event.summary).toContain("a sibling, Lucia Delgado, moved to");
      // Ana, the same age with nothing on record pushing her, stays.
      expect(reviewed.people[ana]!.homeJurisdictionId).toBe(town);
      expect(
        recordedMoves(reviewed).some((move) => move.personIds.includes(ana)),
      ).toBe(false);

      // The same reviews on the same world decide the same thing: no draw.
      let again = world;
      for (const quarter of quarters)
        again = advanceWithWorldIntegrityAtEnd(() =>
          reviewTown(again, quarter, { arrivalsPerResidentPerYear: 0 }),
        );
      expect(recordedMoves(again)).toEqual(recordedMoves(reviewed));

      // The check, not a target: the share of the town's adults who left in a
      // year of reviews on the opening day, against the survey's rate for them.
      let year = opened;
      for (let quarter = 0; quarter < 4; quarter += 1)
        year = advanceWithWorldIntegrityAtEnd(() =>
          reviewTown(year, quarter, { arrivalsPerResidentPerYear: 0 }),
        );
      const adults = opened.personOrder.filter((id) => {
        const person = opened.people[id]!;
        return (
          person.homeJurisdictionId === town &&
          ageOnDate(person.birthDate, opened.currentDate) >= 18
        );
      });
      const left = adults.filter(
        (id) => year.people[id]!.homeJurisdictionId !== town,
      ).length;
      const expected =
        adults.reduce(
          (sum, id) =>
            sum +
            moverDepartureRate(
              a135Place.stateJurisdictionKey,
              ageOnDate(opened.people[id]!.birthDate, opened.currentDate),
            ),
          0,
        ) / adults.length;
      console.log(
        `A135 check, ${a135Place.displayName}: ${left} of ${adults.length} adults left in a year of reviews (${((100 * left) / adults.length).toFixed(1)} percent) against the survey's ${(100 * expected).toFixed(1)} percent for their ages`,
      );
      expect(left).toBeLessThanOrEqual(adults.length);
    },
  );
});
